namespace MezziMRS.Core.Models;

public class Mezzo
{
    public int Id { get; set; }
    public int? NumeroAutoMezzo { get; set; }
    public string? Descrizione { get; set; }
    public string? Targa { get; set; }
    public string? Posti { get; set; }
    public bool? Abilitazione { get; set; }
    public int? Tipo { get; set; }
    public bool TesseriniFerrero { get; set; }
    public long? IDImmagine { get; set; }
}

public class Utente
{
    public int Id { get; set; }
    public string? Codice { get; set; }
    public string? Nome { get; set; }
    public string? Cognome { get; set; }
    public int? Livello { get; set; }
    // Livello: 100 = Utente, 201 = Supervisore, 999 = Admin
    public string? Password { get; set; }
}

public class MezzoPreso
{
    public int Id { get; set; }
    public int? IdMezzo { get; set; }
    public int? IdUtente { get; set; }
    public DateOnly? DataPreso { get; set; }
    public TimeOnly? OraPreso { get; set; }
}

public class MezzoDepositato
{
    public int Id { get; set; }
    public int? IdUtente { get; set; }
    public int? IdMezzo { get; set; }
    public DateOnly? DataDeposito { get; set; }
    public string? DataPreso { get; set; }
    public string? OraPreso { get; set; }
    public TimeOnly? OraDepositato { get; set; }
}

public class PrenotazioneMezzo
{
    public int Id { get; set; }
    public int? IdMezzo { get; set; }
    public DateOnly? Data { get; set; }
    public int? IdUtente { get; set; }
    public int? FasciaOraria { get; set; }
    // FasciaOraria: 1=Mattino, 2=Pomeriggio, 3=Tutto il giorno
}

public class Intervento
{
    public int IdIntervento { get; set; }
    public int IdMezzo { get; set; }
    public DateOnly DataIntervento { get; set; }
    public string? AziendaManutentore { get; set; }
    public string? TipoInterventoId { get; set; }
    public string? DescrizioneIntervento { get; set; }
    public string? TipoManutenzioneId { get; set; }
    public string? Fattura { get; set; }
    public string? ReportManutenzione { get; set; }
}

public class MezzoManutenzione
{
    public int IdMezzo { get; set; }
    public string Targa { get; set; } = "";
    public string? Modello { get; set; }
    public DateOnly? DataImmatricolazione { get; set; }
}

public class TipologiaMezzo
{
    public int Id { get; set; }
    public string? Tipo { get; set; }
}

public class FasciaOraria
{
    public int Id { get; set; }
    public string? Descrizione { get; set; }
}

public class TipoManutenzione
{
    public string IdTipo { get; set; } = "";
    public string Descrizione { get; set; } = "";
}

public class TipoIntervento
{
    public string IdTipo { get; set; } = "";
    public string Descrizione { get; set; } = "";
}

public class Image
{
    public long Id { get; set; }
    public byte[] ImageData { get; set; } = [];
    public string? Name { get; set; }
}
