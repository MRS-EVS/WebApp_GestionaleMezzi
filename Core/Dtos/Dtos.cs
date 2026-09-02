namespace MezziMRS.Core.Dtos;

// ── AUTH ──
public record LoginRequest(string Codice, string? Password = null);
public record LoginResponse(string Token, string NomeCompleto, int Livello);

// ── MEZZI ──
public record PrenotazioneSintesiDto(
    int Id,
    DateOnly Data,
    int? IdUtente,
    string? NomeUtente,
    int? FasciaOraria,
    string? FasciaOrariaDescrizione
);

public record MezzoDto(
    int Id,
    int? NumeroAutoMezzo,
    string? Descrizione,
    string? Targa,
    string? Posti,
    bool? Abilitazione,
    int? Tipo,
    string? TipoDescrizione,
    bool TesseriniFerrero,
    string Stato,
    string? UtenteCorrente,
    bool HasImmagine,
    PrenotazioneSintesiDto? ProssimaPrenotazione,
    int NumeroPrenotazioniAttive
);

public record MezzoCreateRequest(
    int? NumeroAutoMezzo,
    string? Descrizione,
    string? Targa,
    string? Posti,
    bool Abilitazione,
    int? Tipo,
    bool TesseriniFerrero
);

public record MezzoUpdateRequest(
    string? Descrizione,
    string? Targa,
    string? Posti,
    bool? Abilitazione,
    int? Tipo,
    bool? TesseriniFerrero
);

// ── PRESA / DEPOSITO ──
public record PrendiMezzoRequest(int IdMezzo, int IdUtente);
public record DepositaMezzoRequest(int IdMezzo, int IdUtente);

public record MezzoPresoDto(
    int Id,
    int IdMezzo,
    string? DescrizioneMezzo,
    string? Targa,
    int IdUtente,
    string? NomeUtente,
    string DataPreso,
    string OraPreso
);

// ── STORICO ──
public record StoricoDto(
    int Id,
    int? IdMezzo,
    string? DescrizioneMezzo,
    string? Targa,
    int? IdUtente,
    string? NomeUtente,
    string? DataPreso,
    string? OraPreso,
    string? DataDeposito,
    string? OraDeposito,
    string? DurataOre
);

// ── PRENOTAZIONI ──
public record PrenotazioneDto(
    int Id,
    int? IdMezzo,
    string? DescrizioneMezzo,
    string? Targa,
    string? Data,
    int? IdUtente,
    string? NomeUtente,
    int? FasciaOraria,
    string? FasciaOrariaDescrizione
);

public record PrenotazioneCreateRequest(
    int IdMezzo,
    int IdUtente,
    DateOnly Data,
    int FasciaOraria
);

// ── UTENTI ──
public record UtenteDto(
    int Id,
    string? Nome,
    string? Cognome,
    string NomeCompleto,
    int? Livello,
    string? Codice
);

public record UtenteCreateRequest(
    string Nome,
    string Cognome,
    string Codice,
    int Livello,
    string? Password = null
);

public record UtenteUpdateRequest(
    string Nome,
    string Cognome,
    string Codice,
    int Livello,
    string? Password = null
);

public record CambiaPasswordRequest(string? PasswordCorrente, string NuovaPassword);

// ── INTERVENTI ──
public record InterventoDto(
    int IdIntervento,
    int IdMezzo,
    string? DescrizioneMezzo,
    string DataIntervento,
    string? AziendaManutentore,
    string? TipoIntervento,
    string? Descrizione,
    string? TipoManutenzione,
    string? Fattura,
    string? StatoReport
);

public record InterventoCreateRequest(
    int IdMezzo,
    DateOnly DataIntervento,
    string? AziendaManutentore,
    string? TipoInterventoId,
    string? DescrizioneIntervento,
    string? TipoManutenzioneId,
    string? Fattura
);

// ── DASHBOARD ──
public record DashboardDto(
    int TotaleMezzi,
    int MezziLiberi,
    int MezziInUso,
    int MezziPrenotati,
    int MezziDisabilitati
);
