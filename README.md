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
cd mezzi-mrs-frontend
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
I file statici vengono generati in `dist/`. Puoi servirli con qualsiasi web server (Nginx, IIS, ecc.).

---

## Struttura
```
src/
├── api/
│   └── client.js        — tutte le chiamate al backend
├── context/
│   └── AuthContext.jsx  — stato globale autenticazione
├── hooks/
│   └── useToast.js      — notifiche toast
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
1. Utente apre l'app → reindirizzato a `/login` se non autenticato
2. Inserisce il **codice** (stesso dell'app Windows Forms)
3. Il backend restituisce un **token JWT** valido 12 ore
4. Il token viene salvato in `localStorage` e iniettato automaticamente in ogni richiesta
5. Se il token scade → logout automatico e redirect a `/login`
6. Clicca sull'avatar in alto a destra per fare logout manuale

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
