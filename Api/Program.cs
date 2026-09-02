using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MezziMRS.Core.Data;
using MezziMRS.Api.Hubs;
using MezziMRS.Core.Services;

var builder = WebApplication.CreateBuilder(args);

// Se lanciato dal Service Control Manager, gira come Servizio Windows;
// se lanciato a mano (dotnet run, doppio click) si comporta da console normale.
builder.Host.UseWindowsService();

// ── DATABASE ──
builder.Services.AddDbContext<MezziMrsContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── SERVICES ──
builder.Services.AddScoped<MezziService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddHostedService<PrenotazioniBackgroundService>();

// ── JWT AUTH ──
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

// Policy: 100=Utente, 201=Supervisore, 999=Admin
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireClaim("livello", "999"));

    // Solo livello 999 — gestione completa utenti (configurabile solo da DB)
    options.AddPolicy("GestioneUtenti", policy =>
        policy.RequireClaim("livello", "999"));
});

// ── CORS (per il frontend React Native / web) ──
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

// ── CONTROLLERS + SWAGGER ──
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 15 * 1024 * 1024); // 15MB max upload
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "MEZZI MRS API",
        Version = "v1",
        Description = "API per la gestione dei mezzi aziendali MRS"
    });

    // Abilita JWT in Swagger UI
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Inserisci: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            []
        }
    });
});

var app = builder.Build();

// ── MIDDLEWARE PIPELINE ──
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "MEZZI MRS API v1");
        c.RoutePrefix = string.Empty; // Swagger sulla root /
    });
}

app.UseCors("AllowAll");

// Frontend React compilato (npm run build -> wwwroot): un solo processo/porta
// serve sia le API sia l'interfaccia web.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<MezziHub>("/hubs/mezzi");

// SPA fallback: qualunque rotta non-API (es. /prenotazioni) restituisce
// index.html e lascia fare il routing a React Router.
app.MapFallbackToFile("index.html");

app.Run();
