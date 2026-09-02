namespace MezziMRS.Core.Services;

public sealed record ElaborazionePrenotazioniResult(
    int EliminateScadute,
    int EliminateGiaAssegnate,
    IReadOnlyCollection<int> PrenotazioniAssegnate)
{
    public bool HaModifiche =>
        EliminateScadute > 0 ||
        EliminateGiaAssegnate > 0 ||
        PrenotazioniAssegnate.Count > 0;
}
