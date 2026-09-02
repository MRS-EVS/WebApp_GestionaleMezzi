# MEZZI MRS — Frontend React

Frontend React per la gestione dei mezzi aziendali, collegato al backend ASP.NET Core.

## Stack
- **React 18** + **Vite** — build tool veloce
- **React Router v6** — navigazione SPA
- **Axios** — chiamate HTTP al backend
- **JWT** — autenticazione stateless

---

## Setup

### 1. Prerequisiti
- [Node.js 18+](https://nodejs.org/)
- Backend ASP.NET Core in esecuzione

### 2. Installa le dipendenze
```bash
cd web
npm install
```

### 3. Configura l'IP del server
Crea un file `.env` nella cartella del progetto:
```
VITE_API_URL=http://192.168.1.50:5000
```
Sostituisci `192.168.1.50` con l'IP del PC dove gira il backend.

Per trovare l'IP del server su Windows:
```
ipconfig
```
Cerca "Indirizzo IPv4" sotto la scheda di rete attiva.

### 4. Avvia in sviluppo
```bash
npm run dev
```
L'app parte su `http://0.0.0.0:3000` — accessibile da tutti i dispositivi in rete locale.

Su ogni telefono o PC della rete apri: `http://IP-SERVER:3000`

### 5. Build per produzione
```bash
npm run build
```
I file statici vengono generati direttamente in `../Api/wwwroot/`, cosi' il backend
li serve dalla stessa porta delle API. Per il pacchetto di produzione vedi
[DEPLOY.md](../DEPLOY.md).

---

## Struttura

Questa cartella (`web/`) e' il frontend; il backend sta in `../Api` e `../Core`.

```
src/
├── api/
│   └── client.js        — tutte le chiamate al backend
├── components/
│   ├── LoginForm.jsx    — form di accesso condiviso
│   └── LoginModal.jsx   — login contestuale sopra la pagina corrente
├── context/
│   └── AuthContext.jsx  — stato globale autenticazione + requireAuth()
├── hooks/
│   ├── useToast.jsx           — notifiche toast
│   └── useMezziRealtime.js    — aggiornamenti live via SignalR
├── pages/
│   ├── LoginPage.jsx
│   ├── HomePage.jsx        — griglia mezzi con presa/deposito/prenotazione
│   ├── PrenotazioniPage.jsx
│   ├── StoricoPage.jsx
│   ├── ConfigurazionePage.jsx
│   └── ManutenzioniPage.jsx
├── App.jsx              — routing e layout
├── main.jsx             — entry point
└── index.css            — stili globali
```

---

## Flusso autenticazione

L'app **si apre direttamente sul Parco Mezzi**, senza login.

Sono libere: consultare i mezzi e il loro stato, vedere le prenotazioni e **restituire**
un mezzo. Richiedono l'accesso solo **prendere** e **prenotare** un mezzo (piu' annullare
una prenotazione e le pagine riservate: Storico, Configurazione, Utenti, Manutenzioni).

1. L'utente apre l'app → vede subito il parco mezzi
2. Al click su **Prendi** o **Prenota** compare la modale di login, con il motivo
   della richiesta (es. "Accedi per prendere Ford Transit Custom")
3. Inserisce il **codice** (stesso dell'app Windows Forms) e il backend restituisce
   un **token JWT** valido 12 ore
4. Ad accesso avvenuto la modale si chiude e **l'azione prosegue da sola**
5. Il token viene salvato in `localStorage` e iniettato automaticamente in ogni richiesta
6. Se il token scade → si torna anonimi **restando sulla pagina corrente**, nessun
   redirect forzato
7. Il pulsante **Accedi** in alto a destra permette il login esplicito; da loggati,
   un click sull'avatar fa il logout

L'implementazione sta in `context/AuthContext.jsx`: `requireAuth(motivo)` restituisce
una Promise che si risolve con l'utente (subito, se gia' loggato) oppure con `null`
se il login viene annullato.

---

## Configurazione rete locale
Per usare l'app da telefoni/tablet sulla stessa rete WiFi:

1. Assicurati che il firewall di Windows permetta le porte `3000` (frontend) e `5000` (backend)
2. Sul backend in `appsettings.json` verifica che CORS sia abilitato (già configurato)
3. Apri `http://IP-SERVER:3000` dal browser del dispositivo

Per aprire la porta nel firewall Windows:
```
netsh advfirewall firewall add rule name="MezziMRS Frontend" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="MezziMRS Backend" dir=in action=allow protocol=TCP localport=5000
```
