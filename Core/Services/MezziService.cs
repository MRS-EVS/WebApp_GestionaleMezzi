using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Globalization;
using MezziMRS.Core.Data;
using MezziMRS.Core.Dtos;
using MezziMRS.Core.Models;

namespace MezziMRS.Core.Services;

public class MezziService
{
    private readonly MezziMrsContext _db;

    public MezziService(MezziMrsContext db) => _db = db;

    // ── HELPER: mezzi attualmente in uso ──
    // Un mezzo è "in uso" semplicemente se è presente in MezziPresi.
    // La proiezione evita di leggere i campi time(7) e resta compatibile con
    // le transazioni EF usate dalla riconciliazione automatica.
    private async Task<Dictionary<int, int>> GetMezziInUsoConUtente(CancellationToken cancellationToken = default)
    {
        var result = new Dictionary<int, int>();
        var righe = await _db.MezziPresi
            .Where(p => p.IdMezzo.HasValue && p.IdUtente.HasValue)
            .OrderBy(p => p.Id)
            .Select(p => new { p.IdMezzo, p.IdUtente })
            .ToListAsync(cancellationToken);

        foreach (var riga in righe)
        {
            result[riga.IdMezzo!.Value] = riga.IdUtente!.Value;
        }
        return result;
    }

    // ── DASHBOARD ──
    public async Task<DashboardDto> GetDashboard()
    {
        var tutti = await _db.Mezzi.ToListAsync();
        var abilitati = tutti.Where(m => m.Abilitazione == true).Select(m => m.Id).ToList();
        var oggi = DateOnly.FromDateTime(DateTime.Today);

        var inUso = await GetMezziInUsoConUtente();
        var inUsoAbilitati = inUso.Keys.Intersect(abilitati).ToHashSet();
        var prenotati = await _db.PrenotazioniMezzi
            .Where(p => p.Data >= oggi && abilitati.Contains(p.IdMezzo ?? 0))
            .Select(p => p.IdMezzo!.Value).Distinct().ToListAsync();

        return new DashboardDto(
            TotaleMezzi: abilitati.Count,
            MezziLiberi: abilitati.Count - inUsoAbilitati.Count,
            MezziInUso: inUsoAbilitati.Count,
            MezziPrenotati: prenotati.Count,
            MezziDisabilitati: tutti.Count(m => m.Abilitazione != true)
        );
    }

    // ── LISTA MEZZI CON STATO ──
    public async Task<List<MezzoDto>> GetMezzi(bool soloAbilitati = true)
    {
        var mezzi = await _db.Mezzi
            .Where(m => !soloAbilitati || m.Abilitazione == true)
            .OrderBy(m => m.NumeroAutoMezzo)
            .ToListAsync();

        var tipi = await _db.TipologiaMezzi.ToListAsync();
        var utenti = await _db.Utenti.ToListAsync();
        var fasce = await _db.FasceOrarie.ToListAsync();
        var oggi = DateOnly.FromDateTime(DateTime.Today);
        var inUso = await GetMezziInUsoConUtente();
        var prenotazioni = await _db.PrenotazioniMezzi
            .Where(p => p.Data >= oggi && p.IdMezzo.HasValue)
            .OrderBy(p => p.Data)
            .ThenBy(p => p.FasciaOraria)
            .ThenBy(p => p.Id)
            .ToListAsync();

        return mezzi.Select(m =>
        {
            string stato;
            string? utenteCorrente = null;
            var prenotazioniMezzo = prenotazioni.Where(p => p.IdMezzo == m.Id).ToList();
            var prossima = prenotazioniMezzo.FirstOrDefault();

            if (inUso.TryGetValue(m.Id, out int idU))
            {
                stato = "occupied";
                var u = utenti.FirstOrDefault(u => u.Id == idU);
                utenteCorrente = u != null ? $"{u.Nome?.Trim()} {u.Cognome?.Trim()}" : null;
            }
            else if (prenotazioniMezzo.Any(p => p.Data == oggi))
                stato = "booked";
            else
                stato = "free";

            return new MezzoDto(
                Id: m.Id,
                NumeroAutoMezzo: m.NumeroAutoMezzo,
                Descrizione: m.Descrizione,
                Targa: m.Targa,
                Posti: m.Posti,
                Abilitazione: m.Abilitazione,
                Tipo: m.Tipo,
                TipoDescrizione: tipi.FirstOrDefault(t => t.Id == m.Tipo)?.Tipo?.Trim(),
                TesseriniFerrero: m.TesseriniFerrero,
                Stato: stato,
                UtenteCorrente: utenteCorrente,
                HasImmagine: m.IDImmagine.HasValue,
                ProssimaPrenotazione: prossima?.Data is DateOnly dataPrenotazione
                    ? new PrenotazioneSintesiDto(
                        prossima.Id,
                        dataPrenotazione,
                        prossima.IdUtente,
                        utenti.FirstOrDefault(u => u.Id == prossima.IdUtente) is { } utentePrenotazione
                            ? $"{utentePrenotazione.Nome?.Trim()} {utentePrenotazione.Cognome?.Trim()}".Trim()
                            : null,
                        prossima.FasciaOraria,
                        fasce.FirstOrDefault(f => f.Id == prossima.FasciaOraria)?.Descrizione?.Trim())
                    : null,
                NumeroPrenotazioniAttive: prenotazioniMezzo.Count
            );
        }).ToList();
    }

    public async Task<MezzoDto?> GetMezzo(int id)
        => (await GetMezzi(soloAbilitati: false)).FirstOrDefault(m => m.Id == id);

    public async Task<Mezzo> CreaMezzo(MezzoCreateRequest req)
    {
        var m = new Mezzo
        {
            NumeroAutoMezzo = req.NumeroAutoMezzo, Descrizione = req.Descrizione,
            Targa = req.Targa, Posti = req.Posti, Abilitazione = req.Abilitazione,
            Tipo = req.Tipo, TesseriniFerrero = req.TesseriniFerrero
        };
        _db.Mezzi.Add(m);
        await _db.SaveChangesAsync();
        return m;
    }

    public async Task<bool> AggiornaMezzo(int id, MezzoUpdateRequest req)
    {
        var m = await _db.Mezzi.FindAsync(id);
        if (m == null) return false;
        if (req.Descrizione != null) m.Descrizione = req.Descrizione;
        if (req.Targa != null) m.Targa = req.Targa;
        if (req.Posti != null) m.Posti = req.Posti;
        if (req.Abilitazione.HasValue) m.Abilitazione = req.Abilitazione;
        if (req.Tipo.HasValue) m.Tipo = req.Tipo;
        if (req.TesseriniFerrero.HasValue) m.TesseriniFerrero = req.TesseriniFerrero.Value;
        await _db.SaveChangesAsync();
        return true;
    }

    // ── PRENDI MEZZO ──
    // Regola originale: un utente non può prendere un secondo mezzo.
    // Se c'è una prenotazione futura, avvisa di riportarlo in tempo.
    public async Task<(bool ok, string msg, MezzoPreso? presa)> PrendiMezzo(int idMezzo, int idUtente)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var inUso = await GetMezziInUsoConUtente();

        if (inUso.ContainsKey(idMezzo))
            return (false, "Questo mezzo è già in uso.", null);

        if (inUso.Values.Contains(idUtente))
            return (false, "Hai già un mezzo in uso. Depositalo prima di prenderne un altro.", null);

        var oggi = DateOnly.FromDateTime(DateTime.Today);
        string avviso = "";
        var prenotazioneOggi = await _db.PrenotazioniMezzi
            .Where(p => p.IdMezzo == idMezzo && p.Data == oggi)
            .OrderBy(p => p.Id)
            .FirstOrDefaultAsync();

        if (prenotazioneOggi?.IdUtente is int idPrenotante && idPrenotante != idUtente)
        {
            var u = await _db.Utenti.FindAsync(idPrenotante);
            var nome = u != null ? $" da {u.Nome?.Trim()} {u.Cognome?.Trim()}" : "";
            return (false, $"Questo mezzo è prenotato per oggi{nome}.", null);
        }

        var prossimaPrenotazione = await _db.PrenotazioniMezzi
            .Where(p => p.IdMezzo == idMezzo && p.Data > oggi)
            .OrderBy(p => p.Data)
            .ThenBy(p => p.FasciaOraria)
            .FirstOrDefaultAsync();

        if (prossimaPrenotazione?.Data is DateOnly dataFutura)
            avviso = $"Il mezzo è prenotato per il {dataFutura:dd/MM/yyyy}. Riportalo in tempo!";

        var presa = new MezzoPreso
        {
            IdMezzo = idMezzo, IdUtente = idUtente,
            DataPreso = oggi, OraPreso = TimeOnly.FromDateTime(DateTime.Now)
        };
        _db.MezziPresi.Add(presa);
        if (prenotazioneOggi?.IdUtente == idUtente)
            _db.PrenotazioniMezzi.Remove(prenotazioneOggi);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return (true, avviso, presa);
    }

    // ── DEPOSITA MEZZO ──
    // Logica originale:
    // INSERT in MezziDepositati con DataPreso/OraPreso dalla riga MezziPresi
    // DELETE da MezziPresi
    public async Task<(bool ok, string msg, MezzoDepositato? deposito)> DepositaMezzo(int idMezzo, int idUtente)
    {
        var presa = await _db.MezziPresi
            .Where(p => p.IdMezzo == idMezzo)
            .OrderByDescending(p => p.Id)
            .FirstOrDefaultAsync();

        if (presa == null)
            return (false, "Nessuna presa attiva trovata per questo mezzo.", null);

        var deposito = new MezzoDepositato
        {
            IdMezzo = idMezzo,
            IdUtente = presa.IdUtente ?? idUtente,
            DataDeposito = DateOnly.FromDateTime(DateTime.Today),
            DataPreso = presa.DataPreso?.ToString("dd/MM/yyyy"),
            OraPreso = presa.OraPreso?.ToString("HH:mm"),
            OraDepositato = TimeOnly.FromDateTime(DateTime.Now)
        };

        _db.MezziDepositati.Add(deposito);
        _db.MezziPresi.Remove(presa);
        await _db.SaveChangesAsync();

        return (true, "Mezzo restituito! Ricorda di lasciare le chiavi nell'apposito supporto.", deposito);
    }

    // ── RICONCILIAZIONE AUTOMATICA PRENOTAZIONI ──
    // Elimina le prenotazioni passate. Quelle di oggi diventano prese appena
    // mezzo e utente sono liberi; se uno dei due è occupato restano in attesa
    // e saranno riprovate dal processo periodico.
    public async Task<ElaborazionePrenotazioniResult> ConvertisciPrenotazioniAttive(
        CancellationToken cancellationToken = default)
    {
        var oggi = DateOnly.FromDateTime(DateTime.Today);
        var transaction = _db.Database.CurrentTransaction is null
            ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken)
            : null;

        try
        {
            var inUso = await GetMezziInUsoConUtente(cancellationToken);
            var assegnate = new List<int>();
            var eliminateScadute = 0;
            var eliminateGiaAssegnate = 0;

            var prenotazioni = await _db.PrenotazioniMezzi
                .Where(p => p.Data <= oggi)
                .OrderBy(p => p.Data)
                .ThenBy(p => p.FasciaOraria)
                .ThenBy(p => p.Id)
                .ToListAsync(cancellationToken);

            foreach (var p in prenotazioni)
            {
                if (p.Data < oggi)
                {
                    _db.PrenotazioniMezzi.Remove(p);
                    eliminateScadute++;
                    continue;
                }

                if (!p.IdMezzo.HasValue || !p.IdUtente.HasValue) continue;

                var idMezzo = p.IdMezzo.Value;
                var idUtente = p.IdUtente.Value;
                bool mezzoPreso = inUso.TryGetValue(idMezzo, out var utenteAssegnato);
                bool utenteHaGiaMezzo = inUso.Values.Contains(idUtente);

                // Prenotazione già soddisfatta: rimuove soltanto la riga prenotazione.
                if (mezzoPreso && utenteAssegnato == idUtente)
                {
                    _db.PrenotazioniMezzi.Remove(p);
                    eliminateGiaAssegnate++;
                    continue;
                }

                if (!mezzoPreso && !utenteHaGiaMezzo)
                {
                    _db.MezziPresi.Add(new MezzoPreso
                    {
                        IdMezzo = idMezzo, IdUtente = idUtente,
                        DataPreso = oggi, OraPreso = TimeOnly.FromDateTime(DateTime.Now)
                    });
                    _db.PrenotazioniMezzi.Remove(p);
                    inUso[idMezzo] = idUtente;
                    assegnate.Add(p.Id);
                }
            }

            if (eliminateScadute > 0 || eliminateGiaAssegnate > 0 || assegnate.Count > 0)
                await _db.SaveChangesAsync(cancellationToken);

            if (transaction is not null)
                await transaction.CommitAsync(cancellationToken);

            return new ElaborazionePrenotazioniResult(
                eliminateScadute, eliminateGiaAssegnate, assegnate);
        }
        catch
        {
            if (transaction is not null)
                await transaction.RollbackAsync(cancellationToken);
            throw;
        }
        finally
        {
            if (transaction is not null)
                await transaction.DisposeAsync();
        }
    }

    private static string? CalcolaDurata(MezzoDepositato deposito)
    {
        if (!deposito.DataDeposito.HasValue ||
            !deposito.OraDepositato.HasValue ||
            !TryParseDataStorico(deposito.DataPreso, out var dataPreso) ||
            !TryParseOraStorico(deposito.OraPreso, out var oraPreso))
        {
            return null;
        }

        var inizio = dataPreso.ToDateTime(oraPreso);
        var fine = deposito.DataDeposito.Value.ToDateTime(deposito.OraDepositato.Value);
        var durata = fine - inizio;

        if (durata < TimeSpan.Zero)
            return null;

        return durata.Days > 0
            ? $"{durata.Days}g {durata.Hours}h {durata.Minutes}m"
            : $"{durata.Hours}h {durata.Minutes}m";
    }

    private static bool TryParseDataStorico(string? valore, out DateOnly data)
    {
        var formati = new[] { "dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd" };

        return DateOnly.TryParseExact(
                   valore,
                   formati,
                   CultureInfo.InvariantCulture,
                   DateTimeStyles.None,
                   out data)
               || DateOnly.TryParse(
                   valore,
                   CultureInfo.GetCultureInfo("it-IT"),
                   DateTimeStyles.None,
                   out data)
               || DateOnly.TryParse(
                   valore,
                   CultureInfo.InvariantCulture,
                   DateTimeStyles.None,
                   out data);
    }

    private static bool TryParseOraStorico(string? valore, out TimeOnly ora)
    {
        return TimeOnly.TryParse(
                   valore,
                   CultureInfo.GetCultureInfo("it-IT"),
                   DateTimeStyles.None,
                   out ora)
               || TimeOnly.TryParse(
                   valore,
                   CultureInfo.InvariantCulture,
                   DateTimeStyles.None,
                   out ora);
    }

    // ── STORICO ──
    public async Task<List<StoricoDto>> GetStorico(int? idMezzo = null, int? idUtente = null, DateOnly? da = null, DateOnly? a = null)
    {
        var q = _db.MezziDepositati.AsQueryable();
        if (idMezzo.HasValue) q = q.Where(d => d.IdMezzo == idMezzo);
        if (idUtente.HasValue) q = q.Where(d => d.IdUtente == idUtente);
        if (da.HasValue) q = q.Where(d => d.DataDeposito >= da);
        if (a.HasValue) q = q.Where(d => d.DataDeposito <= a);

        var depositi = await q.OrderByDescending(d => d.DataDeposito).ThenByDescending(d => d.OraDepositato).ToListAsync();
        var mezzi = await _db.Mezzi.ToListAsync();
        var utenti = await _db.Utenti.ToListAsync();

        return depositi.Select(d =>
        {
            var mezzo = mezzi.FirstOrDefault(m => m.Id == d.IdMezzo);
            var u = utenti.FirstOrDefault(u => u.Id == d.IdUtente);
            var durata = CalcolaDurata(d);
            return new StoricoDto(d.Id, d.IdMezzo, mezzo?.Descrizione, mezzo?.Targa, d.IdUtente,
                u != null ? $"{u.Nome?.Trim()} {u.Cognome?.Trim()}" : null,
                d.DataPreso, d.OraPreso, d.DataDeposito?.ToString("dd/MM/yyyy"),
                d.OraDepositato?.ToString("HH:mm"), durata);
        }).ToList();
    }

    // ── PRENOTAZIONI ──
    public async Task<List<PrenotazioneDto>> GetPrenotazioni(DateOnly? da = null)
    {
        var oggi = da ?? DateOnly.FromDateTime(DateTime.Today);
        var list = await _db.PrenotazioniMezzi.Where(p => p.Data >= oggi).OrderBy(p => p.Data).ToListAsync();
        var mezzi = await _db.Mezzi.ToListAsync();
        var utenti = await _db.Utenti.ToListAsync();
        var fasce = await _db.FasceOrarie.ToListAsync();

        return list.Select(p =>
        {
            var m = mezzi.FirstOrDefault(m => m.Id == p.IdMezzo);
            var u = utenti.FirstOrDefault(u => u.Id == p.IdUtente);
            var f = fasce.FirstOrDefault(f => f.Id == p.FasciaOraria);
            return new PrenotazioneDto(p.Id, p.IdMezzo, m?.Descrizione, m?.Targa,
                p.Data?.ToString("dd/MM/yyyy"), p.IdUtente,
                u != null ? $"{u.Nome?.Trim()} {u.Cognome?.Trim()}" : null,
                p.FasciaOraria, f?.Descrizione);
        }).ToList();
    }

    public async Task<PrenotazioneMezzo> CreaPrenotazione(PrenotazioneCreateRequest req)
    {
        var p = new PrenotazioneMezzo { IdMezzo = req.IdMezzo, IdUtente = req.IdUtente, Data = req.Data, FasciaOraria = req.FasciaOraria };
        _db.PrenotazioniMezzi.Add(p);
        await _db.SaveChangesAsync();
        return p;
    }

    public async Task<bool> EliminaPrenotazione(int id)
    {
        var p = await _db.PrenotazioniMezzi.FindAsync(id);
        if (p == null) return false;
        _db.PrenotazioniMezzi.Remove(p);
        await _db.SaveChangesAsync();
        return true;
    }
}
