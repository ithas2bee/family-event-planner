using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;

namespace FamilyEventPlanner.Api.Auth
{
    public class MemberAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        private readonly IServiceScopeFactory _scopeFactory;

        public MemberAuthenticationHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder,
            ISystemClock clock,
            IServiceScopeFactory scopeFactory)
            : base(options, logger, encoder, clock)
        {
            _scopeFactory = scopeFactory;
        }

        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            // TEMPORARY DEBUG LOGGING - Remove in production
            System.Diagnostics.Debug.WriteLine($"[AUTH HANDLER] HandleAuthenticateAsync called at {DateTime.UtcNow}");
            
            // Expect header X-Member-Id with GUID value
            if (!Request.Headers.TryGetValue("X-Member-Id", out var memberIdValues))
            {
                System.Diagnostics.Debug.WriteLine("[AUTH HANDLER] X-Member-Id header not found in request");
                return AuthenticateResult.NoResult();
            }

            var memberIdRaw = memberIdValues.FirstOrDefault();
            System.Diagnostics.Debug.WriteLine($"[AUTH HANDLER] Raw X-Member-Id header value: '{memberIdRaw}'");
            
            if (string.IsNullOrEmpty(memberIdRaw))
            {
                System.Diagnostics.Debug.WriteLine("[AUTH HANDLER] X-Member-Id header is empty or null");
                return AuthenticateResult.Fail("X-Member-Id header is empty.");
            }

            if (!Guid.TryParse(memberIdRaw, out var memberId))
            {
                System.Diagnostics.Debug.WriteLine($"[AUTH HANDLER] Failed to parse '{memberIdRaw}' as GUID");
                return AuthenticateResult.Fail("Invalid member id header - not a valid GUID.");
            }

            System.Diagnostics.Debug.WriteLine($"[AUTH HANDLER] Successfully parsed GUID: {memberId}");

            // Validate member exists using scoped DbContext
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            System.Diagnostics.Debug.WriteLine($"[AUTH HANDLER] Querying GroupMembers table for Id = {memberId}");
            var member = await db.GroupMembers.Include(m => m.User).FirstOrDefaultAsync(m => m.Id == memberId);
            
            if (member == null)
            {
                System.Diagnostics.Debug.WriteLine($"[AUTH HANDLER] No GroupMember found with Id: {memberId}");
                return AuthenticateResult.Fail($"Member not found in GroupMembers table (Id: {memberId}).");
            }

            System.Diagnostics.Debug.WriteLine($"[AUTH HANDLER] Found GroupMember: Id={member.Id}, DisplayName={member.User?.DisplayName}, GroupId={member.FamilyGroupId}");

            // Create claims with the authenticated member's information
            var claims = new[] 
            { 
                new Claim("memberId", member.Id.ToString()),
                new Claim(ClaimTypes.Name, member.User?.DisplayName ?? string.Empty),
                new Claim("groupId", member.FamilyGroupId.ToString())
            };
            
            System.Diagnostics.Debug.WriteLine($"[AUTH HANDLER] Created claims: memberId={member.Id}, displayName={member.User?.DisplayName}, groupId={member.FamilyGroupId}");
            
            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);

            System.Diagnostics.Debug.WriteLine($"[AUTH HANDLER] Authentication successful for member: {member.Id}");
            return AuthenticateResult.Success(ticket);
        }
    }
}
