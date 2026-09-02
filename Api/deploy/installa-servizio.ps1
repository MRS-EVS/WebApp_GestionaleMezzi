<#
  Installa "Gestionale Mezzi" come Servizio Windows su questo PC server.

  ESEGUIRE COME AMMINISTRATORE.
  (tasto destro sul file > "Esegui con PowerShell" da un account admin, oppure
   apri PowerShell come amministratore, vai in questa cartella e lancia:
       .\installa-servizio.ps1 )

  Opzionale ma consigliato: passa la connection string del SQL Server di questo
  server, cosi' viene scritta automaticamente in appsettings.json:

      .\installa-servizio.ps1 -ConnectionString "Server=NOMEPC\ISTANZA;Database=MEZZI_MRS;User Id=sa;Password=LA_TUA_PASSWORD;TrustServerCertificate=True"
#>
param(
  [string]$ConnectionString,
  [string]$JwtKey,
  [string]$ServiceName = "GestionaleMezzi",
  [string]$DisplayName = "Gestionale Mezzi",
  [int]$Port = 5000
)

$ErrorActionPreference = "Stop"

# 1) Verifica privilegi amministratore
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { Write-Error "Devi eseguire questo script come Amministratore."; exit 1 }

$exe = Join-Path $PSScriptRoot "GestionaleMezzi.exe"
if (-not (Test-Path $exe)) { Write-Error "Eseguibile non trovato: $exe"; exit 1 }

# 2) (Opzionale) imposta connection string / chiave JWT in appsettings.json
if ($ConnectionString -or $JwtKey) {
  $cfgPath = Join-Path $PSScriptRoot "appsettings.json"
  $cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
  if ($ConnectionString) {
    $cfg.ConnectionStrings.DefaultConnection = $ConnectionString
    Write-Host "Connection string aggiornata in appsettings.json."
  }
  if ($JwtKey) {
    $cfg.Jwt.Key = $JwtKey
    Write-Host "Chiave JWT aggiornata in appsettings.json."
  }
  ($cfg | ConvertTo-Json -Depth 20) | Set-Content $cfgPath -Encoding UTF8
}

# 3) Rimuovi un eventuale servizio precedente
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Rimuovo il servizio esistente..."
  if ($existing.Status -ne 'Stopped') { Stop-Service $ServiceName -Force }
  sc.exe delete $ServiceName | Out-Null
  Start-Sleep -Seconds 2
}

# 4) Crea e avvia il servizio (avvio automatico al boot)
New-Service -Name $ServiceName -BinaryPathName "`"$exe`"" -DisplayName $DisplayName `
  -Description "Gestione parco mezzi aziendali: presa, restituzione, prenotazioni." -StartupType Automatic | Out-Null

# Riavvio automatico in caso di crash
sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/5000/restart/5000 | Out-Null

Start-Service $ServiceName

# 5) Regola firewall in ingresso per la porta
if (-not (Get-NetFirewallRule -DisplayName "Gestionale Mezzi $Port" -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName "Gestionale Mezzi $Port" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow | Out-Null
  Write-Host "Regola firewall creata per la porta $Port."
}

Start-Sleep -Seconds 3
$svc = Get-Service $ServiceName
Write-Host ""
Write-Host "============================================================"
Write-Host " Servizio '$ServiceName' -> stato: $($svc.Status)"
Write-Host " App:        http://$($env:COMPUTERNAME):$Port"
Write-Host " Pagina API: http://$($env:COMPUTERNAME):$Port/swagger"
Write-Host "============================================================"
if ($svc.Status -ne 'Running') {
  Write-Warning "Il servizio non risulta in esecuzione. Controlla la connection string in appsettings.json e il Visualizzatore Eventi di Windows."
}
