using Microsoft.AspNetCore.SignalR;

namespace MezziMRS.Api.Hubs;

/// <summary>
/// Canale realtime usato per avvisare i browser quando cambia lo stato del parco mezzi.
/// </summary>
public sealed class MezziHub : Hub
{
    public const string StatoAggiornato = "MezziAggiornati";
}
