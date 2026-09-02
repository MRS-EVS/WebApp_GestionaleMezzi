using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using MezziMRS.Core.Models;

namespace MezziMRS.Core.Services;

public class AuthService
{
    private readonly IConfiguration _config;

    public AuthService(IConfiguration config)
    {
        _config = config;
    }

    public string GeneraToken(Utente utente, int? livelloOverride = null)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));

        var livello = livelloOverride ?? utente.Livello ?? 100;

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, utente.Id.ToString()),
            new Claim(ClaimTypes.Name, $"{utente.Nome} {utente.Cognome}"),
            new Claim("livello", livello.ToString()),
            new Claim("codice", utente.Codice ?? "")
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(12),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // Il login nell'app originale avviene solo tramite Codice (niente password).
    // Il Codice viene confrontato direttamente con quello in DB.
    public bool VerificaCodice(Utente utente, string codiceInserito)
    {
        return string.Equals(utente.Codice?.Trim(), codiceInserito?.Trim(),
            StringComparison.OrdinalIgnoreCase);
    }
}
