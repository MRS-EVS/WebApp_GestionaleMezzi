using Microsoft.AspNetCore.SignalR;
using MezziMRS.Core.Services;

namespace MezziMRS.Api.Hubs;

public sealed class PrenotazioniBackgroundService(
    IServiceScopeFactory scopeFactory,
    IHubContext<MezziHub> hub,
    ILogger<PrenotazioniBackgroundService> logger) : BackgroundService
{
    private static readonly TimeSpan Intervallo = TimeSpan.FromSeconds(15);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Elabora(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Errore durante l'elaborazione automatica delle prenotazioni");
            }

            try
            {
                await Task.Delay(Intervallo, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }

    private async Task Elabora(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<MezziService>();
        var risultato = await service.ConvertisciPrenotazioniAttive(cancellationToken);

        if (!risultato.HaModifiche) return;

        logger.LogInformation(
            "Prenotazioni aggiornate: {Scadute} scadute eliminate, {GiaAssegnate} già assegnate eliminate, {Assegnate} convertite",
            risultato.EliminateScadute,
            risultato.EliminateGiaAssegnate,
            risultato.PrenotazioniAssegnate.Count);

        await hub.Clients.All.SendAsync(MezziHub.StatoAggiornato, cancellationToken);
    }
}
