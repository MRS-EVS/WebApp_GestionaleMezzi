using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using MezziMRS.Core.Data;
using MezziMRS.Core.Dtos;
using MezziMRS.Core.Services;

namespace MezziMRS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly MezziMrsContext _db;
    private readonly AuthService _auth;

    public AuthController(MezziMrsContext db, AuthService auth)
    {
        _db = db;
        _auth = auth;
    }

    /// <summary>Lista utenti per la selezione nel login (senza auth)</summary>
    [HttpGet("utenti-login")]
    public async Task<IActionResult> GetUtentiLogin()
    {
        var utenti = new List<object>();

        var conn = _db.Database.GetDbConnection();
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT ID, Nome, Cognome, CAST(Codice AS varchar(200)), Livello FROM Utenti WHERE Nome IS NOT NULL ORDER BY Cognome, Nome";

        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            utenti.Add(new
            {
                id      = reader.GetInt32(0),
                nome    = reader.IsDBNull(1) ? "" : reader.GetString(1).Trim(),
                cognome = reader.IsDBNull(2) ? "" : reader.GetString(2).Trim(),
                codice  = reader.IsDBNull(3) ? "" : reader.GetString(3).Trim(),
                livello = reader.IsDBNull(4) ? 100 : reader.GetInt32(4)
            });
        }

        await conn.CloseAsync();
        return Ok(utenti);
    }

    /// <summary>Login con codice utente</summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Codice))
            return BadRequest(new { message = "Inserisci il codice" });

        int? userId       = null;
        string? nomeCompleto = null;
        int     livello      = 100;
        string? codiceDb     = null;
        string? passwordHash = null;

        // Tutto via ADO.NET — evita EF Core su tabella Utenti (colonna Codice è TEXT)
        var conn = _db.Database.GetDbConnection();
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT ID, Nome, Cognome, CAST(Codice AS varchar(200)), Livello, Password FROM Utenti";

        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var codice = reader.IsDBNull(3) ? "" : reader.GetString(3).Trim();
            if (!string.Equals(codice, req.Codice.Trim(), StringComparison.OrdinalIgnoreCase))
                continue;

            userId       = reader.GetInt32(0);
            var nome     = reader.IsDBNull(1) ? "" : reader.GetString(1).Trim();
            var cognome  = reader.IsDBNull(2) ? "" : reader.GetString(2).Trim();
            nomeCompleto = $"{nome} {cognome}".Trim();
            livello      = reader.IsDBNull(4) ? 100 : reader.GetInt32(4);
            codiceDb     = codice;
            passwordHash = reader.IsDBNull(5) ? null : reader.GetString(5);
            break;
        }

        await conn.CloseAsync();

        if (userId == null)
            return Unauthorized(new { message = "Codice non valido" });

        // Gestione password per utenti privilegiati (livello >= 201)
        int livelloEffettivo = livello;
        if (livelloEffettivo >= 201)
        {
            var passwordFornita = req.Password?.Trim();

            if (string.IsNullOrEmpty(passwordHash))
            {
                // Nessuna password impostata → accesso completo (primo accesso, può impostarla)
                livelloEffettivo = livello;
            }
            else if (!string.IsNullOrEmpty(passwordFornita))
            {
                // Password fornita: verifica
                bool ok = false;
                try { ok = BCrypt.Net.BCrypt.Verify(passwordFornita, passwordHash); }
                catch (BCrypt.Net.SaltParseException) { ok = false; }

                if (!ok)
                    return Unauthorized(new { message = "Password non corretta" });
            }
            else
            {
                // Password impostata ma non fornita → accesso limitato (solo home)
                livelloEffettivo = 100;
            }
        }

        // Costruisce entity minimale per GeneraToken (senza query EF Core)
        var utenteEntity = new MezziMRS.Core.Models.Utente
        {
            Id      = userId.Value,
            Nome    = nomeCompleto?.Split(' ').FirstOrDefault(),
            Cognome = nomeCompleto?.Contains(' ') == true ? nomeCompleto[(nomeCompleto.IndexOf(' ') + 1)..] : null,
            Livello = livello,
            Codice  = codiceDb
        };

        var token = _auth.GeneraToken(utenteEntity, livelloEffettivo);

        return Ok(new LoginResponse(
            Token: token,
            NomeCompleto: nomeCompleto!,
            Livello: livelloEffettivo
        ));
    }
}
