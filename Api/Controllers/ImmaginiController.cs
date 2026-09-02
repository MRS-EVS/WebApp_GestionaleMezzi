using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MezziMRS.Core.Data;

namespace MezziMRS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ImmaginiController : ControllerBase
{
    private readonly MezziMrsContext _db;

    public ImmaginiController(MezziMrsContext db) => _db = db;

    [HttpGet("mezzo/{idMezzo:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetFotoMezzo(int idMezzo)
    {
        var mezzo = await _db.Mezzi.FindAsync(idMezzo);
        if (mezzo?.IDImmagine == null) return NotFound();

        byte[]? imageBytes = null;
        var conn = _db.Database.GetDbConnection();
        var shouldClose = conn.State != System.Data.ConnectionState.Open;
        if (shouldClose) await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = $"SELECT [Image] FROM [Image] WHERE ID = {mezzo.IDImmagine}";
        var result = await cmd.ExecuteScalarAsync();
        if (result != null && result != DBNull.Value)
            imageBytes = (byte[])result;

        if (shouldClose) await conn.CloseAsync();
        if (imageBytes == null || imageBytes.Length == 0) return NotFound();
        return File(imageBytes, DetectContentType(imageBytes));
    }

    [HttpPost("mezzo/{idMezzo:int}")]
    public async Task<IActionResult> UploadFotoMezzo(int idMezzo, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Nessun file ricevuto" });

        var mezzo = await _db.Mezzi.FindAsync(idMezzo);
        if (mezzo == null) return NotFound(new { message = "Mezzo non trovato" });

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var imageBytes = ms.ToArray();

        var conn = _db.Database.GetDbConnection();
        var shouldClose = conn.State != System.Data.ConnectionState.Open;
        if (shouldClose) await conn.OpenAsync();

        long idImmagine;

        if (mezzo.IDImmagine.HasValue)
        {
            using var cmdUpd = conn.CreateCommand();
            cmdUpd.CommandText = "UPDATE [Image] SET [Image] = @img, [Name] = @name WHERE ID = @id";
            var p1 = cmdUpd.CreateParameter(); p1.ParameterName = "@img"; p1.Value = imageBytes; cmdUpd.Parameters.Add(p1);
            var p2 = cmdUpd.CreateParameter(); p2.ParameterName = "@name"; p2.Value = file.FileName; cmdUpd.Parameters.Add(p2);
            var p3 = cmdUpd.CreateParameter(); p3.ParameterName = "@id"; p3.Value = mezzo.IDImmagine.Value; cmdUpd.Parameters.Add(p3);
            await cmdUpd.ExecuteNonQueryAsync();
            idImmagine = mezzo.IDImmagine.Value;
        }
        else
        {
            using var cmdIns = conn.CreateCommand();
            cmdIns.CommandText = "INSERT INTO [Image] ([Image], [Name]) OUTPUT INSERTED.ID VALUES (@img, @name)";
            var p1 = cmdIns.CreateParameter(); p1.ParameterName = "@img"; p1.Value = imageBytes; cmdIns.Parameters.Add(p1);
            var p2 = cmdIns.CreateParameter(); p2.ParameterName = "@name"; p2.Value = file.FileName; cmdIns.Parameters.Add(p2);
            idImmagine = Convert.ToInt64(await cmdIns.ExecuteScalarAsync());

            using var cmdUpd = conn.CreateCommand();
            cmdUpd.CommandText = $"UPDATE [Mezzi] SET [IDImmagine] = {idImmagine} WHERE ID = {idMezzo}";
            await cmdUpd.ExecuteNonQueryAsync();
            mezzo.IDImmagine = idImmagine;
        }

        if (shouldClose) await conn.CloseAsync();
        return Ok(new { message = "Foto caricata", idImmagine });
    }

    [HttpDelete("mezzo/{idMezzo:int}")]
    public async Task<IActionResult> EliminaFotoMezzo(int idMezzo)
    {
        var mezzo = await _db.Mezzi.FindAsync(idMezzo);
        if (mezzo == null) return NotFound();

        if (mezzo.IDImmagine.HasValue)
        {
            var conn = _db.Database.GetDbConnection();
            var shouldClose = conn.State != System.Data.ConnectionState.Open;
            if (shouldClose) await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = $"DELETE FROM [Image] WHERE ID = {mezzo.IDImmagine.Value}; UPDATE [Mezzi] SET IDImmagine = NULL WHERE ID = {idMezzo}";
            await cmd.ExecuteNonQueryAsync();

            if (shouldClose) await conn.CloseAsync();
            mezzo.IDImmagine = null;
        }

        return NoContent();
    }

    private static string DetectContentType(byte[] bytes)
    {
        if (bytes.Length >= 2)
        {
            if (bytes[0] == 0x89 && bytes[1] == 0x50) return "image/png";
            if (bytes[0] == 0xFF && bytes[1] == 0xD8) return "image/jpeg";
            if (bytes[0] == 0x52 && bytes[1] == 0x49) return "image/webp";
        }
        return "image/jpeg";
    }
}