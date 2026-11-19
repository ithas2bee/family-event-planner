using FamilyEventPlanner.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Services;

public sealed class ActiveAccountTokenValidator
{
    private readonly AppDbContext _context;

    public ActiveAccountTokenValidator(AppDbContext context)
    {
        _context = context;
    }

    public Task<bool> IsActiveAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return _context.Users.AnyAsync(user => user.Id == userId, cancellationToken);
    }
}
