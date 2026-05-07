using System.Threading.Tasks;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Models.Auth;
using FamilyEventPlanner.Api.Services;
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

        public AuthController(AppDbContext context, ITokenService tokenService)
        {
            _context = context;
            _tokenService = tokenService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            System.Diagnostics.Debug.WriteLine($"[REGISTER] Called with email: {request?.Email}, displayName: {request?.DisplayName}");
            try
            {
                if (!ModelState.IsValid)
                {
                    System.Diagnostics.Debug.WriteLine("[REGISTER] ModelState invalid");
                    return BadRequest(ModelState);
                }

                var exists = await _context.Users.AnyAsync(u => u.Email == request.Email);
                if (exists)
                {
                    System.Diagnostics.Debug.WriteLine($"[REGISTER] Email already registered: {request.Email}");
                    return Conflict(new { message = "An account with this email already exists." });
                }

                var user = new User
                {
                    Id = Guid.NewGuid(),
                    Email = request.Email,
                    DisplayName = request.DisplayName,
                    PasswordHash = request.Password, // TEMP: plain text for now
                    CreatedAt = DateTime.UtcNow
                };
                _context.Users.Add(user);
                await _context.SaveChangesAsync();
                System.Diagnostics.Debug.WriteLine($"[REGISTER] User created: {user.Id}");

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
                System.Diagnostics.Debug.WriteLine($"[REGISTER] Exception: {ex.Message}");
                return StatusCode(500, new { error = "Internal server error", message = ex.Message });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user == null)
            {
                System.Diagnostics.Debug.WriteLine($"[LOGIN] User not found for email: {request.Email}");
                return Unauthorized(new { message = "Invalid email or password." });
            }

            if (user.PasswordHash != request.Password)
            {
                System.Diagnostics.Debug.WriteLine($"[LOGIN] Invalid password for user: {request.Email}");
                return Unauthorized(new { message = "Invalid email or password." });
            }

            System.Diagnostics.Debug.WriteLine($"[LOGIN] User authenticated: {user.Id}");

            var token = _tokenService.GenerateToken(user.Id, user.Email, user.DisplayName);

            return Ok(new
            {
                userId = user.Id,
                email = user.Email,
                displayName = user.DisplayName,
                authToken = token
            });
        }
    }
}
