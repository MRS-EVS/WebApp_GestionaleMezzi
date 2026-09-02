using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MezziMRS.Core.Data;
using MezziMRS.Core.Dtos;
using MezziMRS.Api.Hubs;
using MezziMRS.Core.Models;
using MezziMRS.Core.Services;

namespace MezziMRS.Api.Controllers;

// ── PRENOTAZIONI ──
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PrenotazioniController : ControllerBase
{
    private readonly MezziService _svc;
    private readonly IHubContext<MezziHub> _hub;

    public PrenotazioniController(MezziService svc, IHubContext<MezziHub> hub)
    {
        _svc = svc;
        _hub = hub;
    }

    private Task NotificaAggiornamento()
        => _hub.Clients.All.SendAsync(MezziHub.StatoAggiornato);

    /// <summary>Lista prenotazioni (da oggi in poi per default)</summary>
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] DateOnly? da = null)
        => Ok(await _svc.GetPrenotazioni(da));

    /// <summary>Crea nuova prenotazione</summary>
    [HttpPost]
    public async Task<IActionResult> Crea([FromBody] PrenotazioneCreateRequest req)
    {
        if (req.Data < DateOnly.FromDateTime(DateTime.Today))
            return BadRequest(new { message = "Non puoi creare una prenotazione per una data già trascorsa." });
        if (req.FasciaOraria is < 1 or > 3)
            return BadRequest(new { message = "Fascia oraria non valida." });

        var p = await _svc.CreaPrenotazione(req);
        var risultato = await _svc.ConvertisciPrenotazioniAttive();
        await NotificaAggiornamento();

        if (risultato.PrenotazioniAssegnate.Contains(p.Id))
            return Ok(new { prenotazione = p, assegnataAutomaticamente = true });

        return CreatedAtAction(nameof(GetAll), new { id = p.Id }, p);
    }

    /// <summary>Elimina prenotazione</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Elimina(int id)
    {
        var ok = await _svc.EliminaPrenotazione(id);
        if (ok) await NotificaAggiornamento();
        return ok ? NoContent() : NotFound();
    }
}

// ── STORICO ──
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StoricoController : ControllerBase
{
    private readonly MezziService _svc;

    public StoricoController(MezziService svc)
    {
        _svc = svc;
    }

    /// <summary>Storico depositi con filtri opzionali</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? idMezzo = null,
        [FromQuery] int? idUtente = null,
        [FromQuery] DateOnly? da = null,
        [FromQuery] DateOnly? a = null)
        => Ok(await _svc.GetStorico(idMezzo, idUtente, da, a));
}

// ── UTENTI ──
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UtentiController : ControllerBase
{
    private readonly MezziMrsContext _db;

    public UtentiController(MezziMrsContext db)
    {
        _db = db;
    }

    /// <summary>Lista utenti</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var raw = await _db.Utenti
            .OrderBy(u => u.Cognome).ThenBy(u => u.Nome)
            .ToListAsync();
        var utenti = raw.Select(u => new UtenteDto(
            u.Id, u.Nome, u.Cognome,
            $"{u.Nome} {u.Cognome}".Trim(),
            u.Livello, u.Codice
        )).ToList();
        return Ok(utenti);
    }

    /// <summary>Crea utente</summary>
    [HttpPost]
    [Authorize(Policy = "GestioneUtenti")]
    public async Task<IActionResult> Crea([FromBody] UtenteCreateRequest req)
    {
        // Codice è tipo 'text' in SQL Server — confronto in memoria
        var tutti = await _db.Utenti.ToListAsync();
        if (tutti.Any(u => string.Equals(u.Codice?.Trim(), req.Codice?.Trim(), StringComparison.OrdinalIgnoreCase)))
            return Conflict(new { message = "Codice già in uso da un altro utente." });
        var utente = new Utente { Nome = req.Nome, Cognome = req.Cognome, Codice = req.Codice, Livello = req.Livello };
        if (req.Livello >= 201 && !string.IsNullOrWhiteSpace(req.Password))
            utente.Password = BCrypt.Net.BCrypt.HashPassword(req.Password.Trim());
        _db.Utenti.Add(utente);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = utente.Id }, utente);
    }

    /// <summary>Aggiorna utente</summary>
    [HttpPatch("{id:int}")]
    [Authorize(Policy = "GestioneUtenti")]
    public async Task<IActionResult> Aggiorna(int id, [FromBody] UtenteUpdateRequest req)
    {
        try
        {
            var u = await _db.Utenti.FindAsync(id);
            if (u == null) return NotFound();
            // Codice è tipo 'text' in SQL Server — confronto in memoria
            var tutti = await _db.Utenti.ToListAsync();
            if (tutti.Any(x => string.Equals(x.Codice?.Trim(), req.Codice?.Trim(), StringComparison.OrdinalIgnoreCase) && x.Id != id))
                return Conflict(new { message = "Codice già in uso da un altro utente." });
            u.Nome    = req.Nome;
            u.Cognome = req.Cognome;
            u.Codice  = req.Codice;
            u.Livello = req.Livello;
            // Aggiorna password solo se fornita e utente privilegiato
            if (req.Livello >= 201 && !string.IsNullOrWhiteSpace(req.Password))
                u.Password = BCrypt.Net.BCrypt.HashPassword(req.Password.Trim());
            // Se livello scende a 100, rimuovi la password
            if (req.Livello < 201)
                u.Password = null;
            await _db.SaveChangesAsync();
            return Ok(new UtenteDto(u.Id, u.Nome, u.Cognome, $"{u.Nome} {u.Cognome}", u.Livello, u.Codice));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message, inner = ex.InnerException?.Message });
        }
    }

    /// <summary>Elimina utente</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = "GestioneUtenti")]
    public async Task<IActionResult> Elimina(int id)
    {
        var u = await _db.Utenti.FindAsync(id);
        if (u == null) return NotFound();
        _db.Utenti.Remove(u);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Cambia la propria password (livello >= 201)</summary>
    [HttpPost("me/password")]
    [Authorize]
    public async Task<IActionResult> CambiaPasswordMia([FromBody] CambiaPasswordRequest req)
    {
        var livelloClaim = User.FindFirst("livello")?.Value;
        if (!int.TryParse(livelloClaim, out var liv) || liv < 201)
            return Forbid();

        if (string.IsNullOrWhiteSpace(req.NuovaPassword) || req.NuovaPassword.Trim().Length < 4)
            return BadRequest(new { message = "La nuova password deve essere di almeno 4 caratteri" });

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId)) return Unauthorized();

        var u = await _db.Utenti.FindAsync(userId);
        if (u == null) return NotFound();

        // Se ha già una password, verifica quella corrente
        if (!string.IsNullOrEmpty(u.Password))
        {
            if (string.IsNullOrWhiteSpace(req.PasswordCorrente))
                return BadRequest(new { message = "Inserisci la password corrente" });
            bool ok = false;
            try { ok = BCrypt.Net.BCrypt.Verify(req.PasswordCorrente.Trim(), u.Password); }
            catch (BCrypt.Net.SaltParseException) { ok = false; }
            if (!ok) return Unauthorized(new { message = "Password corrente non corretta" });
        }

        u.Password = BCrypt.Net.BCrypt.HashPassword(req.NuovaPassword.Trim());
        await _db.SaveChangesAsync();
        return Ok(new { message = "Password aggiornata" });
    }
}

// ── MANUTENZIONI ──
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ManutenzioniController : ControllerBase
{
    private readonly MezziMrsContext _db;

    public ManutenzioniController(MezziMrsContext db)
    {
        _db = db;
    }

    /// <summary>Lista interventi con filtro mezzo opzionale</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? idMezzo = null)
    {
        var query = _db.Interventi.AsQueryable();
        if (idMezzo.HasValue) query = query.Where(i => i.IdMezzo == idMezzo);

        var interventi = await query
            .OrderByDescending(i => i.DataIntervento)
            .ToListAsync();

        var mezzi = await _db.Mezzi.ToListAsync();
        var tipiManutenzione = await _db.TipiManutenzione.ToListAsync();
        var tipiIntervento = await _db.TipiIntervento.ToListAsync();

        var result = interventi.Select(i =>
        {
            var mezzo = mezzi.FirstOrDefault(m => m.Id == i.IdMezzo);
            var tm = tipiManutenzione.FirstOrDefault(t => t.IdTipo == i.TipoManutenzioneId);
            var ti = tipiIntervento.FirstOrDefault(t => t.IdTipo == i.TipoInterventoId);
            return new InterventoDto(
                IdIntervento: i.IdIntervento,
                IdMezzo: i.IdMezzo,
                DescrizioneMezzo: mezzo?.Descrizione,
                DataIntervento: i.DataIntervento.ToString("dd/MM/yyyy"),
                AziendaManutentore: i.AziendaManutentore,
                TipoIntervento: ti?.Descrizione,
                Descrizione: i.DescrizioneIntervento,
                TipoManutenzione: tm?.Descrizione,
                Fattura: i.Fattura,
                StatoReport: i.ReportManutenzione
            );
        }).ToList();

        return Ok(result);
    }

    /// <summary>Crea nuovo intervento</summary>
    [HttpPost]
    public async Task<IActionResult> Crea([FromBody] InterventoCreateRequest req)
    {
        var intervento = new Intervento
        {
            IdMezzo = req.IdMezzo,
            DataIntervento = req.DataIntervento,
            AziendaManutentore = req.AziendaManutentore,
            TipoInterventoId = req.TipoInterventoId,
            DescrizioneIntervento = req.DescrizioneIntervento,
            TipoManutenzioneId = req.TipoManutenzioneId,
            Fattura = req.Fattura
        };
        _db.Interventi.Add(intervento);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = intervento.IdIntervento }, intervento);
    }

    /// <summary>Elimina intervento</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Elimina(int id)
    {
        var i = await _db.Interventi.FindAsync(id);
        if (i == null) return NotFound();
        _db.Interventi.Remove(i);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

// ── LOOKUP ──
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LookupController : ControllerBase
{
    private readonly MezziMrsContext _db;

    public LookupController(MezziMrsContext db)
    {
        _db = db;
    }

    [AllowAnonymous]
    [HttpGet("fasce-orarie")]
    public async Task<IActionResult> FasceOrarie()
        => Ok(await _db.FasceOrarie.OrderBy(f => f.Id).ToListAsync());

    [HttpGet("tipologie-mezzo")]
    public async Task<IActionResult> TipologieMezzo()
        => Ok(await _db.TipologiaMezzi.OrderBy(t => t.Tipo).ToListAsync());

    [HttpGet("tipi-manutenzione")]
    public async Task<IActionResult> TipiManutenzione()
        => Ok(await _db.TipiManutenzione.ToListAsync());

    [HttpGet("tipi-intervento")]
    public async Task<IActionResult> TipiIntervento()
        => Ok(await _db.TipiIntervento.ToListAsync());
}
