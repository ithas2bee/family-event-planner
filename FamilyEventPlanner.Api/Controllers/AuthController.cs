using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using FamilyEventPlanner.Api.Constants;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Models.Auth;
using FamilyEventPlanner.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ITokenService _tokenService;
        private readonly IEmailSender _emailSender;
        private readonly string _passwordResetUrl;
        private readonly int _maxRegisteredAccounts;
        private readonly PasswordHasher<User> _passwordHasher = new();

        public AuthController(
            AppDbContext context,
            ITokenService tokenService,
            IEmailSender emailSender,
            IConfiguration configuration)
        {
            _context = context;
            _tokenService = tokenService;
            _emailSender = emailSender;
            _passwordResetUrl = configuration["PasswordReset:DeepLinkUrl"] ??
                "familyeventplannermobile://reset-password";
            _maxRegisteredAccounts = configuration.GetValue<int?>("Registration:MaxAccounts") ?? 100;
            if (_maxRegisteredAccounts < 1)
            {
                throw new InvalidOperationException("Registration:MaxAccounts must be greater than zero.");
            }
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                await using var transaction = _context.Database.IsSqlServer()
                    ? await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable)
                    : null;

                var registeredAccountCount = _context.Database.IsSqlServer()
                    ? await _context.Database.SqlQueryRaw<int>(
                        "SELECT COUNT(*) AS [Value] FROM [Users] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] <> {0}",
                        SystemConstants.UnknownGuestUserId).SingleAsync()
                    : await _context.Users.CountAsync(user =>
                        user.Id != SystemConstants.UnknownGuestUserId);

                var email = request.Email.Trim().ToLowerInvariant();
                var exists = await _context.Users.AnyAsync(u => u.Email == email);
                if (exists)
                {
                    return Conflict(new { message = "An account with this email already exists." });
                }

                if (registeredAccountCount >= _maxRegisteredAccounts)
                {
                    return Conflict(new { message = "Huddle Up is currently in limited early access. Registration is full." });
                }

                var user = new User
                {
                    Id = Guid.NewGuid(),
                    Email = email,
                    DisplayName = request.DisplayName.Trim(),
                    CreatedAt = DateTime.UtcNow
                };
                user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
                _context.Users.Add(user);
                await _context.SaveChangesAsync();
                if (transaction is not null)
                {
                    await transaction.CommitAsync();
                }

                var token = _tokenService.GenerateToken(user.Id, user.Email, user.DisplayName);

                return CreatedAtAction(nameof(Register), new
                {
                    userId = user.Id,
                    email = user.Email,
                    displayName = user.DisplayName,
                    authToken = token
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Unable to create the account right now." });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var email = request.Email.Trim().ToLowerInvariant();
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
                return Unauthorized(new { message = "Invalid email or password." });

            var verification = user.PasswordHash is { } storedPassword &&
                               IsIdentityPasswordHash(storedPassword)
                ? _passwordHasher.VerifyHashedPassword(user, storedPassword, request.Password)
                : PasswordVerificationResult.Failed;

            // Legacy accounts stored the password directly. Upgrade them after a successful
            // login so existing users keep their account and group memberships.
            if (verification == PasswordVerificationResult.Failed &&
                user.PasswordHash is { } legacyHash &&
                FixedTimeEquals(legacyHash, request.Password))
            {
                user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
                verification = PasswordVerificationResult.SuccessRehashNeeded;
            }

            if (verification == PasswordVerificationResult.Failed)
                return Unauthorized(new { message = "Invalid email or password." });

            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var token = _tokenService.GenerateToken(user.Id, user.Email, user.DisplayName);

            return Ok(new
            {
                userId = user.Id,
                email = user.Email,
                displayName = user.DisplayName,
                authToken = token
            });
        }

        [HttpPost("forgot-password")]
        [EnableRateLimiting("password-recovery")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            const string confirmation = "If an account exists for that email, a password reset link will be sent.";
            if (!ModelState.IsValid)
            {
                return Ok(new { message = confirmation });
            }

            if (!_emailSender.IsConfigured || string.IsNullOrWhiteSpace(_passwordResetUrl))
            {
                return Ok(new { message = confirmation });
            }

            var email = request.Email.Trim().ToLowerInvariant();
            var user = await _context.Users.FirstOrDefaultAsync(candidate => candidate.Email == email);
            if (user == null || string.IsNullOrWhiteSpace(user.PasswordHash))
            {
                return Ok(new { message = confirmation });
            }

            var now = DateTime.UtcNow;
            var previousTokens = await _context.PasswordResetTokens
                .Where(token => token.UserId == user.Id && token.UsedAtUtc == null)
                .ToListAsync();
            foreach (var previousToken in previousTokens)
            {
                previousToken.UsedAtUtc = now;
            }

            if (previousTokens.Count > 0)
            {
                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateConcurrencyException)
                {
                    return Ok(new { message = confirmation });
                }
            }

            var resetToken = CreateResetToken();
            var resetRecord = new PasswordResetToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TokenHash = HashResetToken(resetToken),
                ExpiresAtUtc = now.AddMinutes(30)
            };
            _context.PasswordResetTokens.Add(resetRecord);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Ok(new { message = confirmation });
            }

            var resetLink = $"{_passwordResetUrl}?token={Uri.EscapeDataString(resetToken)}";
            try
            {
                await _emailSender.SendAsync(
                    user.Email,
                    "Reset your Huddle Up password",
                    $"Use this link within 30 minutes to reset your Huddle Up password:\n\n{resetLink}\n\nIf you did not request a password reset, you can ignore this email.");
            }
            catch
            {
                resetRecord.UsedAtUtc = DateTime.UtcNow;
                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateConcurrencyException)
                {
                }
            }

            return Ok(new { message = confirmation });
        }

        [HttpPost("reset-password")]
        [EnableRateLimiting("password-recovery")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { message = "Please check your password and try again." });
            }

            if (request.Password != request.ConfirmPassword)
            {
                return BadRequest(new { message = "Passwords do not match." });
            }

            var tokenHash = HashResetToken(request.Token);
            var resetRecord = await _context.PasswordResetTokens.FirstOrDefaultAsync(token =>
                token.TokenHash == tokenHash &&
                token.UsedAtUtc == null &&
                token.ExpiresAtUtc > DateTime.UtcNow);

            if (resetRecord == null)
            {
                return BadRequest(new { message = "This reset link is invalid or expired. Please request a new link." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(candidate => candidate.Id == resetRecord.UserId);
            if (user == null)
            {
                return BadRequest(new { message = "This reset link is invalid or expired. Please request a new link." });
            }

            user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
            resetRecord.UsedAtUtc = DateTime.UtcNow;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return BadRequest(new { message = "This reset link is invalid or expired. Please request a new link." });
            }

            return Ok(new { message = "Password reset. You can now sign in with your new password." });
        }

        private static string CreateResetToken()
        {
            return Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');
        }

        private static string HashResetToken(string token)
        {
            return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
        }

        private static bool FixedTimeEquals(string left, string right)
        {
            var leftBytes = Encoding.UTF8.GetBytes(left);
            var rightBytes = Encoding.UTF8.GetBytes(right);
            return leftBytes.Length == rightBytes.Length &&
                   CryptographicOperations.FixedTimeEquals(leftBytes, rightBytes);
        }

        private static bool IsIdentityPasswordHash(string value)
        {
            byte[] decoded;
            try
            {
                decoded = Convert.FromBase64String(value);
            }
            catch (FormatException)
            {
                return false;
            }

            if (decoded.Length == 49 && decoded[0] == 0)
                return true;

            if (decoded.Length < 14 || decoded[0] != 1)
                return false;

            var saltLength = ReadNetworkOrderInt32(decoded, 9);
            var prf = ReadNetworkOrderInt32(decoded, 1);
            var iterationCount = ReadNetworkOrderInt32(decoded, 5);
            var subkeyLength = decoded.Length - 13 - saltLength;

            return (prf is 0 or 1 or 2) &&
                   iterationCount > 0 &&
                   saltLength > 0 &&
                   subkeyLength > 0;
        }

        private static int ReadNetworkOrderInt32(byte[] bytes, int offset)
        {
            return (bytes[offset] << 24) |
                   (bytes[offset + 1] << 16) |
                   (bytes[offset + 2] << 8) |
                   bytes[offset + 3];
        }
    }
}
