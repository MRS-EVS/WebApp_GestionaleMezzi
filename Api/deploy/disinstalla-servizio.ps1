<#
  Rimuove il Servizio Windows "Gestionale Mezzi".
  ESEGUIRE COME AMMINISTRATORE.
#>
param(
  [string]$ServiceName = "GestionaleMezzi",
  [int]$Port = 5000
)

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { Write-Error "Devi eseguire questo script come Amministratore."; exit 1 }

try { Stop-Service $ServiceName -Force -ErrorAction Stop } catch {}
sc.exe delete $ServiceName | Out-Null
Get-NetFirewallRule -DisplayName "Gestionale Mezzi $Port" -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
Write-Host "Servizio '$ServiceName' rimosso (la regola firewall e i dati nel database restano: il DB non viene toccato)."
