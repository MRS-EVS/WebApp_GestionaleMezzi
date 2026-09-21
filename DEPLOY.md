# Guida: generare il publish e metterlo in produzione

Riferimento operativo per aggiornare **Mezzi MRS**. Stessa impostazione del
progetto "Gestione Personale": un unico eseguibile self-contained, installato
come Servizio Windows, con il frontend React compilato dentro `wwwroot` e
servito dallo stesso processo delle API (una sola porta, niente Node.js sul
server).

| | |
|---|---|
| PC di sviluppo | `C:\_MRS\Gestione Mezzi\GestionaleMezzi_Web` |
| PC server (produzione) | `C:\WebApp_GestionaleMezzi` |
| Nome servizio Windows | `GestionaleMezzi` (visualizzato: *Gestionale Mezzi*) |
| Indirizzo in produzione | `http://IP-SERVER:5000` |
| Database | SQL Server, `MEZZI_MRS` |

---

# PARTE A — Generare il publish (sul PC di sviluppo)

Il "publish" è una cartella **autosufficiente**: contiene l'app, l'interfaccia
web e il **runtime .NET incluso**. Sul server non serve installare nulla (né
.NET né Node.js).

## A1. Prerequisiti (una tantum)
- .NET SDK 9
- Node.js 18+
- La prima volta, installa le dipendenze del frontend:
  ```powershell
  cd "C:\_MRS\Gestione Mezzi\GestionaleMezzi_Web\web"
  npm install
  ```

## A2. Compila il frontend

> ⚠️ **Va fatto SEMPRE prima del publish.** Il publish impacchetta la UI già
> compilata: se salti questo passo, pubblichi l'interfaccia vecchia.

```powershell
cd "C:\_MRS\Gestione Mezzi\GestionaleMezzi_Web\web"
npm run build
```
Il risultato finisce in `Api\wwwroot\`.

## A3. Pubblica il backend

> ⚠️ Chiudi prima eventuali istanze in esecuzione, altrimenti i file sono bloccati:
> ```powershell
> Get-Process GestionaleMezzi -ErrorAction SilentlyContinue | Stop-Process -Force
> ```

```powershell
cd "C:\_MRS\Gestione Mezzi\GestionaleMezzi_Web\Api"
dotnet publish MezziMRS.Api.csproj -c Release -r win-x64 --self-contained true -o publish
```

> ⚠️ **Indica sempre `MezziMRS.Api.csproj`.** Nella stessa cartella c'è anche
> `MezziMRS.Api.sln`: senza il nome del progetto `dotnet publish` prende la
> solution, `--output` su una solution non è supportato (warning NETSDK1194) e
> il risultato finisce annidato in `publish\publish\publish` con un errore
> MSB3030. Se è già successo, cancella la cartella `publish` e rilancia il
> comando corretto: è tutto output rigenerabile, non committato.

Al termine la cartella `publish` contiene:

| Elemento | Cos'è |
|---|---|
| `GestionaleMezzi.exe` | l'applicazione |
| `wwwroot\` | l'interfaccia web compilata |
| `appsettings.json` | configurazione **di sviluppo** (porta 5000, DB di sviluppo) — sul server la connection string va sostituita |
| `installa-servizio.ps1` / `disinstalla-servizio.ps1` | installazione del servizio (dalla cartella `deploy\`) |
| centinaia di `.dll` | il runtime .NET incluso |

## A4. Collaudo locale (consigliato)
```powershell
Start-Process "C:\_MRS\Gestione Mezzi\GestionaleMezzi_Web\Api\publish\GestionaleMezzi.exe"
```
Apri `http://localhost:5000`, controlla che tutto funzioni (parco mezzi, login,
prendi/restituisci), poi chiudi:
```powershell
Get-Process GestionaleMezzi | Stop-Process -Force
```

---

# PARTE B — Aggiornare la produzione (sul server)

## B1. Backup del database (prima di ogni aggiornamento)

Sul server, **PowerShell come amministratore**. Cambia solo le prime 3 variabili:

```powershell
$srv="NOME-SERVER\SQLEXPRESS"; $user="sa"; $pwd="LA_TUA_PASSWORD"; $db="MEZZI_MRS"
$conn = New-Object System.Data.SqlClient.SqlConnection("Server=$srv;Database=master;User Id=$user;Password=$pwd;TrustServerCertificate=True;Connect Timeout=15;")
$conn.Open()
$cmd = $conn.CreateCommand(); $cmd.CommandTimeout = 900
$cmd.CommandText = "SELECT CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS nvarchar(500))"
$dir = $cmd.ExecuteScalar()
$file = Join-Path $dir ("{0}_{1:yyyyMMdd_HHmm}.bak" -f $db, (Get-Date))
$cmd.CommandText = "BACKUP DATABASE [$db] TO DISK = N'$file' WITH INIT, STATS = 25"
$cmd.ExecuteNonQuery() | Out-Null
$conn.Close()
"Backup creato: $file"
```

- Scrive nella cartella di backup predefinita dell'istanza: è l'unica su cui SQL
  Server ha sempre i permessi (scegliendone una a mano si rischia *Access denied*,
  perché a scrivere è il servizio SQL, non l'utente).
- Niente `WITH COMPRESSION`: su SQL Server **Express** non è supportato.
- **Copia il file `.bak` fuori dal server** (NAS, disco esterno): un backup sullo
  stesso PC non protegge da un guasto del disco.

In alternativa con SSMS: tasto destro sul database → *Attività* → *Esegui backup…*

## B2. Porta la cartella `publish` sul server
Copiala (rete, chiavetta…) in una cartella temporanea, es. `C:\_pacchetto-nuovo`.

## B3. Sostituisci i file e riavvia

```powershell
Stop-Service GestionaleMezzi
robocopy "C:\_pacchetto-nuovo" "C:\WebApp_GestionaleMezzi" /MIR /XF appsettings.json
Start-Service GestionaleMezzi
Get-Service GestionaleMezzi | Select-Object Status, StartType
```

> ⚠️ **`/XF appsettings.json` è la parte cruciale.** Sul server quel file contiene
> la **connection string** e la **chiave JWT** di produzione. Se lo sovrascrivi
> con quello di sviluppo, l'app torna a puntare al database di sviluppo e tutti i
> token già emessi diventano invalidi.
>
> `/MIR` allinea la cartella (rimuove anche i file vecchi non più necessari, es.
> asset del frontend con hash cambiato).

## B4. Verifica
- Il servizio deve risultare **Running**.
- Da un altro dispositivo in rete (anche telefono): `http://IP-SERVER:5000` —
  deve aprirsi subito sul Parco Mezzi, senza login.
- Pagina API: `http://IP-SERVER:5000/swagger`

Le eventuali **modifiche allo schema del database** (nuove colonne/tabelle)
vanno gestite come già previsto dal progetto — Mezzi MRS non ha una migrazione
automatica all'avvio, quindi se lo schema cambia va applicata a mano prima di
riavviare il servizio.

## B5. Se qualcosa va storto (rollback)
1. `Stop-Service GestionaleMezzi`
2. Rimetti la versione precedente della cartella (o ripubblica la build precedente).
3. Se serve, ripristina il database dal `.bak`:
   ```sql
   ALTER DATABASE [MEZZI_MRS] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
   RESTORE DATABASE [MEZZI_MRS] FROM DISK = N'PERCORSO\FILE.bak' WITH REPLACE;
   ALTER DATABASE [MEZZI_MRS] SET MULTI_USER;
   ```
4. `Start-Service GestionaleMezzi`

---

# PARTE C — Prima installazione su un server nuovo

1. Copia la cartella `publish` in `C:\WebApp_GestionaleMezzi`.
2. **PowerShell come amministratore**:
   ```powershell
   cd C:\WebApp_GestionaleMezzi
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
   .\installa-servizio.ps1 `
     -ConnectionString "Server=NOME-PC\ISTANZA;Database=MEZZI_MRS;User Id=sa;Password=LA_TUA_PASSWORD;TrustServerCertificate=True" `
     -JwtKey "una-chiave-lunga-e-casuale-almeno-32-caratteri"
   ```
   Lo script crea il servizio (avvio automatico + riavvio in caso di crash),
   scrive connection string e chiave JWT in `appsettings.json`, apre la porta
   nel firewall e avvia tutto.

   - `Set-ExecutionPolicy -Scope Process` serve perché Windows blocca gli script:
     vale **solo per quella finestra**.
   - Gli script vanno lanciati con `.\` davanti al nome.
   - Nella connection string il backslash va **singolo**: `NOME-PC\SQLEXPRESS`.
   - **Non saltare `-JwtKey`** al primo deploy: la chiave nel repo è quella di
     sviluppo (`MezziMRS_SuperSecretKey_Cambiami...`), va sempre sostituita in
     produzione.
3. Il database `MEZZI_MRS` deve già esistere sul server (non viene creato
   automaticamente): ripristinalo da un backup o creane uno vuoto con lo
   schema del progetto prima di avviare il servizio.
4. Per cambiare porta rispetto al default 5000: `.\installa-servizio.ps1 -Port 8080 ...`
   e aggiorna anche `"Urls"` in `appsettings.json` di conseguenza.

---

# PARTE D — Gestione e diagnostica

## Comandi del servizio
```powershell
Get-Service GestionaleMezzi | Select-Object Status, StartType
Restart-Service GestionaleMezzi
Stop-Service GestionaleMezzi
Start-Service GestionaleMezzi
```
Oppure dall'app **Servizi** di Windows (`services.msc`), voce *Gestionale Mezzi*.

## Il servizio non parte
1. Esegui l'app a mano per **leggere l'errore vero**:
   ```powershell
   cd C:\WebApp_GestionaleMezzi
   .\GestionaleMezzi.exe
   ```
   (Ctrl+C per fermarla.) Le cause tipiche sono **porta occupata** o
   **connection string sbagliata**.
2. Chi occupa la porta:
   ```powershell
   Get-NetTCPConnection -LocalPort 5000 -State Listen | ForEach-Object { Get-Process -Id $_.OwningProcess }
   ```
3. Log completo: **Visualizzatore eventi** → *Registri di Windows* → *Applicazione*.

## Note importanti
- Non deve mai girare **una copia manuale insieme al servizio**: litigano sulla
  stessa porta. Verifica che ci sia un solo processo, di proprietà di SYSTEM:
  ```powershell
  Get-Process GestionaleMezzi -IncludeUserName | Select-Object Name, Id, UserName
  ```
- L'app si mette in ascolto su **tutte le interfacce di rete** (`0.0.0.0`):
  funziona quindi sia con l'IP sia con il nome del PC. Conviene dare al server
  un **IP fisso**.
- Con tutto servito da un'unica porta, **non serve più** aprire anche la 3000
  né tenere un server Node.js acceso sul server: quella modalità (due porte,
  `npm run dev` esposto in LAN) resta utile solo in sviluppo — vedi il README
  del frontend.
- L'app è una PWA (installabile su telefono): dopo un aggiornamento, il service
  worker scarica la nuova versione in background e la applica al refresh
  successivo — non serve disinstallare/reinstallare nulla sui dispositivi.
- I dati stanno **tutti** nel database `MEZZI_MRS`: è l'unica cosa da includere
  nei backup periodici.
