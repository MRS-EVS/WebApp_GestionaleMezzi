using Microsoft.EntityFrameworkCore;
using MezziMRS.Core.Models;

namespace MezziMRS.Core.Data;

public class MezziMrsContext : DbContext
{
    public MezziMrsContext(DbContextOptions<MezziMrsContext> options) : base(options) { }

    public DbSet<Mezzo> Mezzi => Set<Mezzo>();
    public DbSet<Utente> Utenti => Set<Utente>();
    public DbSet<MezzoPreso> MezziPresi => Set<MezzoPreso>();
    public DbSet<MezzoDepositato> MezziDepositati => Set<MezzoDepositato>();
    public DbSet<PrenotazioneMezzo> PrenotazioniMezzi => Set<PrenotazioneMezzo>();
    public DbSet<Intervento> Interventi => Set<Intervento>();
    public DbSet<MezzoManutenzione> MezziManutenzioni => Set<MezzoManutenzione>();
    public DbSet<TipologiaMezzo> TipologiaMezzi => Set<TipologiaMezzo>();
    public DbSet<FasciaOraria> FasceOrarie => Set<FasciaOraria>();
    public DbSet<TipoManutenzione> TipiManutenzione => Set<TipoManutenzione>();
    public DbSet<TipoIntervento> TipiIntervento => Set<TipoIntervento>();
    public DbSet<Image> Images => Set<Image>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Mezzo>(e =>
        {
            e.ToTable("Mezzi");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("ID");
            e.Property(x => x.NumeroAutoMezzo).HasColumnName("NumeroAutoMezzo");
            e.Property(x => x.Descrizione).HasColumnName("Descrizione");
            e.Property(x => x.Targa).HasColumnName("Targa");
            e.Property(x => x.Posti).HasColumnName("Posti");
            e.Property(x => x.Abilitazione).HasColumnName("Abilitazione");
            e.Property(x => x.Tipo).HasColumnName("Tipo");
            e.Property(x => x.TesseriniFerrero).HasColumnName("Tesserino_Ferrero");
            e.Property(x => x.IDImmagine).HasColumnName("IDImmagine");
        });

        modelBuilder.Entity<Utente>(e =>
        {
            e.ToTable("Utenti");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("ID");
            e.Property(x => x.Codice).HasColumnName("Codice").HasColumnType("text");
            e.Property(x => x.Nome).HasColumnName("Nome");
            e.Property(x => x.Cognome).HasColumnName("Cognome");
            e.Property(x => x.Livello).HasColumnName("Livello");
            e.Property(x => x.Password).HasColumnName("Password");
        });

        modelBuilder.Entity<MezzoPreso>(e =>
        {
            e.ToTable("MezziPresi");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("ID");
            e.Property(x => x.IdMezzo).HasColumnName("IDMezzo");
            e.Property(x => x.IdUtente).HasColumnName("IDUtente");
            e.Property(x => x.DataPreso).HasColumnName("DataPreso");
            e.Property(x => x.OraPreso).HasColumnName("OraPreso");
        });

        modelBuilder.Entity<MezzoDepositato>(e =>
        {
            e.ToTable("MezziDepositati");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("ID");
            e.Property(x => x.IdUtente).HasColumnName("IDUtente");
            e.Property(x => x.IdMezzo).HasColumnName("IDMezzo");
            e.Property(x => x.DataDeposito).HasColumnName("DataDeposito");
            e.Property(x => x.DataPreso).HasColumnName("DataPreso");
            e.Property(x => x.OraPreso).HasColumnName("OraPreso");
            e.Property(x => x.OraDepositato).HasColumnName("OraDepositato");
        });

        modelBuilder.Entity<PrenotazioneMezzo>(e =>
        {
            e.ToTable("PrenotazioniMezzi");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("ID");
            e.Property(x => x.IdMezzo).HasColumnName("IDMezzo");
            e.Property(x => x.Data).HasColumnName("Data");
            e.Property(x => x.IdUtente).HasColumnName("IDUtente");
            e.Property(x => x.FasciaOraria).HasColumnName("FasciaOraria");
        });

        modelBuilder.Entity<Intervento>(e =>
        {
            e.ToTable("Interventi");
            e.HasKey(x => x.IdIntervento);
            e.Property(x => x.IdIntervento).HasColumnName("IDIntervento");
            e.Property(x => x.IdMezzo).HasColumnName("IDMezzo");
            e.Property(x => x.DataIntervento).HasColumnName("DataIntervento");
            e.Property(x => x.AziendaManutentore).HasColumnName("AziendaManutentore");
            e.Property(x => x.TipoInterventoId).HasColumnName("TipoIntervento");
            e.Property(x => x.DescrizioneIntervento).HasColumnName("DescrizioneIntervento");
            e.Property(x => x.TipoManutenzioneId).HasColumnName("TipoManutenzione");
            e.Property(x => x.Fattura).HasColumnName("Fattura");
            e.Property(x => x.ReportManutenzione).HasColumnName("ReportManutenzione");
        });

        modelBuilder.Entity<MezzoManutenzione>(e =>
        {
            e.ToTable("MezziManutenzioni");
            e.HasKey(x => x.IdMezzo);
            e.Property(x => x.IdMezzo).HasColumnName("IDMezzo");
        });

        modelBuilder.Entity<TipologiaMezzo>(e =>
        {
            e.ToTable("TipologiaMezzo");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("ID");
            e.Property(x => x.Tipo).HasColumnName("Tipo");
        });

        modelBuilder.Entity<FasciaOraria>(e =>
        {
            e.ToTable("FasceOrarie");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("ID");
            e.Property(x => x.Descrizione).HasColumnName("Descrizione");
        });

        modelBuilder.Entity<TipoManutenzione>(e =>
        {
            e.ToTable("TipoManutenzione");
            e.HasKey(x => x.IdTipo);
            e.Property(x => x.IdTipo).HasColumnName("IDTipo");
        });

        modelBuilder.Entity<TipoIntervento>(e =>
        {
            e.ToTable("TipoIntervento");
            e.HasKey(x => x.IdTipo);
            e.Property(x => x.IdTipo).HasColumnName("IDTipo");
        });

        modelBuilder.Entity<Image>(e =>
        {
            e.ToTable("Image");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("ID");
        });
    }
}
