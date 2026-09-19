using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Models.Auth;
using FamilyEventPlanner.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ITokenService _tokenService;
        private readonly PasswordHasher<User> _passwordHasher = new();

        public AuthController(AppDbContext context, ITokenService tokenService)
        {
            _context = context;
            _tokenService = tokenService;
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

                var email = request.Email.Trim().ToLowerInvariant();
                var exists = await _context.Users.AnyAsync(u => u.Email == email);
                if (exists)
                {
                    return Conflict(new { message = "An account with this email already exists." });
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

            var verification = user.PasswordHash is null
                ? PasswordVerificationResult.Failed
                : _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);

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

        private static bool FixedTimeEquals(string left, string right)
        {
            var leftBytes = Encoding.UTF8.GetBytes(left);
            var rightBytes = Encoding.UTF8.GetBytes(right);
            return leftBytes.Length == rightBytes.Length &&
                   CryptographicOperations.FixedTimeEquals(leftBytes, rightBytes);
        }
    }
}
