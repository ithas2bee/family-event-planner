using FamilyEventPlanner.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowExpo",
                    policy =>
                    {
                        policy
                            .AllowAnyOrigin()
                            .AllowAnyHeader()
                            .AllowAnyMethod();
                    });
            });

            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

            // Add services to the container.

            builder.Services.AddControllers();
            // Authentication: simple member header scheme for development/testing
            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = "MemberId";
                options.DefaultChallengeScheme = "MemberId";
            })
            .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, FamilyEventPlanner.Api.Auth.MemberAuthenticationHandler>("MemberId", options => { });

            builder.Services.AddAuthorization();
            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(c =>
            {
                // Add X-Member-Id header to Swagger so callers can authenticate
                c.AddSecurityDefinition("X-Member-Id", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    In = Microsoft.OpenApi.Models.ParameterLocation.Header,
                    Name = "X-Member-Id",
                    Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
                    Description = "Member id GUID to authenticate as that group member."
                });

                c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
                {
                    {
                        new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                        {
                            Reference = new Microsoft.OpenApi.Models.OpenApiReference { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "X-Member-Id" }
                        },
                        new string[] { }
                    }
                });
                // Include XML comments if generated
                var xmlFile = System.IO.Path.ChangeExtension(System.Reflection.Assembly.GetExecutingAssembly().Location, ".xml");
                if (System.IO.File.Exists(xmlFile))
                {
                    c.IncludeXmlComments(xmlFile);
                }
            });

            var app = builder.Build();

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

            app.UseCors("AllowExpo");
            app.UseAuthentication();
            app.UseAuthorization();


            app.MapControllers();

            app.Run();
        }
    }
}
