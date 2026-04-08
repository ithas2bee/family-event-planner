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
            // Expect header X-Member-Id with GUID value
            if (!Request.Headers.TryGetValue("X-Member-Id", out var memberIdValues))
                return AuthenticateResult.NoResult();

            var memberIdRaw = memberIdValues.FirstOrDefault();
            if (string.IsNullOrEmpty(memberIdRaw) || !Guid.TryParse(memberIdRaw, out var memberId))
                return AuthenticateResult.Fail("Invalid member id header.");

            // Validate member exists using scoped DbContext
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var member = await db.GroupMembers.FirstOrDefaultAsync(m => m.Id == memberId);
            if (member == null)
                return AuthenticateResult.Fail("Member not found.");

            var claims = new[] { new Claim("memberId", member.Id.ToString()), new Claim(ClaimTypes.Name, member.Name ?? string.Empty) };
            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);

            return AuthenticateResult.Success(ticket);
        }
    }
}
