using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;

namespace FamilyEventPlanner.Api
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);
            var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException("ConnectionStrings:DefaultConnection must be configured.");
            }

            if (builder.Environment.IsProduction() &&
                (connectionString.Contains("(localdb)", StringComparison.OrdinalIgnoreCase) ||
                 connectionString.Contains("Trusted_Connection", StringComparison.OrdinalIgnoreCase) ||
                 connectionString.Contains("Integrated Security", StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException("Production must use a server-side SQL Server connection string.");
            }

            var jwtSettings = builder.Configuration.GetSection("Jwt");
            var secret = jwtSettings["Secret"];
            var issuer = jwtSettings["Issuer"];
            var audience = jwtSettings["Audience"];
            if (string.IsNullOrWhiteSpace(secret) || Encoding.UTF8.GetByteCount(secret) < 32)
            {
                throw new InvalidOperationException("Jwt:Secret must contain at least 32 UTF-8 bytes.");
            }

            if (string.IsNullOrWhiteSpace(issuer) || string.IsNullOrWhiteSpace(audience))
            {
                throw new InvalidOperationException("Jwt:Issuer and Jwt:Audience must be configured.");
            }

            var key = Encoding.UTF8.GetBytes(secret);
            var configuredCorsOrigins = builder.Configuration["Cors:AllowedOrigins"]?
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) ?? [];

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowExpo",
                    policy =>
                    {
                        if (builder.Environment.IsDevelopment())
                        {
                            policy.AllowAnyOrigin();
                        }
                        else if (configuredCorsOrigins.Length > 0)
                        {
                            policy.WithOrigins(configuredCorsOrigins);
                        }

                        policy.AllowAnyHeader().AllowAnyMethod();
                    });
            });

            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(connectionString));

            // Register token service
            builder.Services.AddScoped<ITokenService, JwtTokenService>();
            builder.Services.AddScoped<ContentExpirationProcessor>();
            builder.Services.AddHostedService<ContentExpirationHostedService>();
            builder.Services.AddHttpClient<IEmailSender, ResendEmailSender>();
            builder.Services.AddHttpClient<IGooglePlacesService, GooglePlacesService>();
            builder.Services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
                options.AddPolicy("password-recovery", context =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 5,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0,
                            AutoReplenishment = true
                        }));
            });

            // Add services to the container with JSON camelCase naming
            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
                });

            // Configure JWT
            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = issuer,
                    ValidateAudience = true,
                    ValidAudience = audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };
                options.Events = new JwtBearerEvents
                {
                    OnAuthenticationFailed = context =>
                    {
                        System.Diagnostics.Debug.WriteLine($"[JWT] Authentication failed: {context.Exception.Message}");
                        return Task.CompletedTask;
                    },
                    OnTokenValidated = context =>
                    {
                        System.Diagnostics.Debug.WriteLine($"[JWT] Token validated for user: {context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value}");
                        return Task.CompletedTask;
                    }
                };
            })
            // Keep MemberId scheme for direct member authentication (for testing/internal use)
            .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, FamilyEventPlanner.Api.Auth.MemberAuthenticationHandler>("MemberId", options => { });

            builder.Services.AddAuthorization();

            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(c =>
            {
                // Add JWT Bearer to Swagger
                c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Description = "JWT Authorization header using the Bearer scheme.",
                    Name = "Authorization",
                    In = Microsoft.OpenApi.Models.ParameterLocation.Header
                });

                c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
                {
                    {
                        new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                        {
                            Reference = new Microsoft.OpenApi.Models.OpenApiReference
                            {
                                Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        new string[] { }
                    }
                });

                // Keep X-Member-Id for backwards compatibility
                c.AddSecurityDefinition("X-Member-Id", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    In = Microsoft.OpenApi.Models.ParameterLocation.Header,
                    Name = "X-Member-Id",
                    Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
                    Description = "Member id GUID to authenticate as that group member (for testing/internal use only)."
                });

                // Include XML comments if generated
                var xmlFile = System.IO.Path.ChangeExtension(System.Reflection.Assembly.GetExecutingAssembly().Location, ".xml");
                if (System.IO.File.Exists(xmlFile))
                {
                    c.IncludeXmlComments(xmlFile);
                }
            });

            var app = builder.Build();

            using (var scope = app.Services.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await dbContext.Database.MigrateAsync();
            }

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            // TEMPORARILY DISABLED FOR EXPO MOBILE DEV
            // Expo running on HTTP cannot follow HTTPS redirects properly
            // Re-enable for production with proper SSL certificates
            // app.UseHttpsRedirection();

            app.UseRouting();
            app.UseCors("AllowExpo");
            app.UseRateLimiter();
            app.UseAuthentication();
            app.UseAuthorization();

            app.MapGet("/health/live", () => Results.Ok(new { status = "live" })).AllowAnonymous();
            app.MapGet("/health/ready", async (AppDbContext dbContext, CancellationToken cancellationToken) =>
            {
                var isReady = await dbContext.Database.CanConnectAsync(cancellationToken);
                return Results.Json(new { status = isReady ? "ready" : "unavailable" },
                    statusCode: isReady ? StatusCodes.Status200OK : StatusCodes.Status503ServiceUnavailable);
            }).AllowAnonymous();

            app.MapControllers();

            await app.RunAsync();
        }
    }
}
