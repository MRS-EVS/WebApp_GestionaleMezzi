using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Mvc;
using MezziMRS.Core.Dtos;
using MezziMRS.Api.Hubs;
using MezziMRS.Core.Services;

namespace MezziMRS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MezziController : ControllerBase
{
    private readonly MezziService _svc;
    private readonly IHubContext<MezziHub> _hub;

    public MezziController(MezziService svc, IHubContext<MezziHub> hub)
    {
        _svc = svc;
        _hub = hub;
    }

    private Task NotificaAggiornamento()
        => _hub.Clients.All.SendAsync(MezziHub.StatoAggiornato);

    /// <summary>Dashboard con contatori stato mezzi — consultabile senza login</summary>
    [AllowAnonymous]
    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
        => Ok(await _svc.GetDashboard());

    /// <summary>Lista tutti i mezzi con stato (free/occupied/booked) — consultabile senza login</summary>
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool soloAbilitati = true)
        => Ok(await _svc.GetMezzi(soloAbilitati));

    /// <summary>Dettaglio singolo mezzo — consultabile senza login</summary>
    [AllowAnonymous]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var mezzo = await _svc.GetMezzo(id);
        return mezzo == null ? NotFound() : Ok(mezzo);
    }

    /// <summary>Crea nuovo mezzo</summary>
    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Crea([FromBody] MezzoCreateRequest req)
    {
        var mezzo = await _svc.CreaMezzo(req);
        await NotificaAggiornamento();
        return CreatedAtAction(nameof(GetById), new { id = mezzo.Id }, mezzo);
    }

    /// <summary>Modifica mezzo esistente</summary>
    [HttpPatch("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Aggiorna(int id, [FromBody] MezzoUpdateRequest req)
    {
        var ok = await _svc.AggiornaMezzo(id, req);
        if (ok) await NotificaAggiornamento();
        return ok ? NoContent() : NotFound();
    }

    /// <summary>Prendi un mezzo (segna come in uso) — richiede login</summary>
    [HttpPost("{id:int}/prendi")]
    public async Task<IActionResult> Prendi(int id, [FromBody] PrendiMezzoRequest req)
    {
        if (req.IdMezzo != id)
            return BadRequest(new { message = "ID mezzo non corrisponde" });

        var (ok, msg, presa) = await _svc.PrendiMezzo(id, req.IdUtente);

        if (!ok)
            return Conflict(new { message = msg });

        await NotificaAggiornamento();
        return Ok(new { presa, avviso = msg });
    }

    /// <summary>Deposita (restituisce) un mezzo — consentito senza login:
    /// l'utente a cui viene attribuita la restituzione è quello della presa attiva.</summary>
    [AllowAnonymous]
    [HttpPost("{id:int}/deposita")]
    public async Task<IActionResult> Deposita(int id, [FromBody] DepositaMezzoRequest req)
    {
        if (req.IdMezzo != id)
            return BadRequest(new { message = "ID mezzo non corrisponde" });

        var (ok, msg, deposito) = await _svc.DepositaMezzo(id, req.IdUtente);

        if (!ok)
            return NotFound(new { message = msg });

        // Se esiste una prenotazione odierna rimasta in attesa, il mezzo appena
        // liberato viene assegnato subito senza attendere il controllo periodico.
        await _svc.ConvertisciPrenotazioniAttive();
        await NotificaAggiornamento();
        return Ok(new { deposito, messaggio = msg });
    }

    /// <summary>Conversione automatica prenotazioni attive (chiamata all'avvio app, anche da anonimo)</summary>
    [AllowAnonymous]
    [HttpPost("converti-prenotazioni")]
    public async Task<IActionResult> ConvertisciPrenotazioni()
    {
        var risultato = await _svc.ConvertisciPrenotazioniAttive();
        if (risultato.HaModifiche)
            await NotificaAggiornamento();
        return Ok(new
        {
            message = "Prenotazioni verificate e aggiornate.",
            risultato.EliminateScadute,
            risultato.EliminateGiaAssegnate,
            assegnate = risultato.PrenotazioniAssegnate.Count
        });
    }
}
