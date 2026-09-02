# MEZZI MRS — Backend API

Backend ASP.NET Core 9 per la gestione dei mezzi aziendali MRS.

## Stack
- **.NET 9** — ASP.NET Core Web API
- **Entity Framework Core 9** — accesso al database
- **SQL Server 2022** (SQLEXPRESS) — database esistente
- **JWT** — autenticazione stateless
- **Swagger UI** — documentazione interattiva delle API

---

## Setup in 5 passi

### 1. Prerequisiti
- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- SQL Server 2022 Express già installato con il DB `MEZZI_MRS`

### 2. Struttura della soluzione

Il backend e' diviso in due progetti (`Api` espone il web, `Core` contiene
modelli, accesso dati e logica applicativa):

```
GestionaleMezzi_Web/
├── Api/                       — ASP.NET Core Web API + hosting del frontend
│   ├── Controllers/
│   ├── Hubs/                  — SignalR (realtime) e background service
│   ├── Properties/
│   ├── deploy/                — script servizio Windows
│   ├── wwwroot/               — frontend compilato (generato da web/)
│   ├── Program.cs
│   ├── appsettings.json
│   ├── MezziMRS.Api.csproj
│   └── MezziMRS.Api.sln       — soluzione da aprire in Visual Studio
├── Core/                      — class library, nessuna dipendenza da ASP.NET
│   ├── Models/
│   ├── Data/                  — DbContext EF Core
│   ├── Dtos/
│   ├── Services/
│   └── MezziMRS.Core.csproj
└── web/                       — frontend React + Vite
```

### 3. Configura la connection string
Apri `appsettings.json` e verifica:
```json
"ConnectionStrings": {
  "DefaultConnection": "Server=.\\SQLEXPRESS;Database=MEZZI_MRS;Trusted_Connection=True;TrustServerCertificate=True;"
}
```
Se il tuo SQL Server ha un nome diverso (es. istanza default), usa:
```
Server=localhost;Database=MEZZI_MRS;Trusted_Connection=True;TrustServerCertificate=True;
```

### 4. Cambia la chiave JWT
In `appsettings.json`, sostituisci la chiave con una stringa lunga e casuale:
```json
"Jwt": {
  "Key": "LA_TUA_CHIAVE_SEGRETA_ALMENO_32_CARATTERI"
}
```

### 5. Avvia il progetto
```bash
cd Api
dotnet restore
dotnet run
```

L'API parte su `http://localhost:5000`.
Swagger UI disponibile su `http://localhost:5000` (root).

---

## Accesso: cosa serve il login e cosa no

L'app e' consultabile **senza autenticazione**. Il token JWT serve solo per le azioni
che impegnano un mezzo a un utente.

| Senza login (`[AllowAnonymous]`) | Richiede token |
|---|---|
| `GET /api/mezzi`, `/api/mezzi/{id}`, `/api/mezzi/dashboard` | `POST /api/mezzi/{id}/prendi` |
| `POST /api/mezzi/{id}/deposita` (restituzione) | `POST /api/prenotazioni` |
| `POST /api/mezzi/converti-prenotazioni` | `DELETE /api/prenotazioni/{id}` |
| `GET /api/prenotazioni` | `/api/storico`, `/api/utenti`, `/api/manutenzioni` |
| `GET /api/lookup/fasce-orarie` | resto di `/api/lookup` |
| `GET /api/immagini/mezzo/{id}` | gestione mezzi e utenti (admin) |

La restituzione non richiede il login perche' l'utente a cui viene attribuita e' quello
della riga attiva in `MezziPresi`, non il chiamante: il campo `idUtente` del body e' solo
un fallback usato se quella riga non ha un utente associato.

---

## Endpoint principali

### Auth
| Metodo | URL | Descrizione |
|--------|-----|-------------|
| POST | `/api/auth/login` | Login, ritorna JWT token |

### Mezzi
| Metodo | URL | Descrizione |
|--------|-----|-------------|
| GET | `/api/mezzi` | Lista mezzi con stato (free/occupied/booked) |
| GET | `/api/mezzi/{id}` | Dettaglio mezzo |
| GET | `/api/mezzi/dashboard` | Contatori stato |
| POST | `/api/mezzi` | Crea mezzo (solo admin) |
| PATCH | `/api/mezzi/{id}` | Modifica mezzo (solo admin) |
| POST | `/api/mezzi/{id}/prendi` | Prendi mezzo |
| POST | `/api/mezzi/{id}/deposita` | Restituisci mezzo |

### Prenotazioni
| Metodo | URL | Descrizione |
|--------|-----|-------------|
| GET | `/api/prenotazioni` | Lista prenotazioni attive |
| POST | `/api/prenotazioni` | Nuova prenotazione |
| DELETE | `/api/prenotazioni/{id}` | Elimina prenotazione |

### Storico
| Metodo | URL | Descrizione |
|--------|-----|-------------|
| GET | `/api/storico` | Storico depositi (filtri: idMezzo, idUtente, da, a) |

### Utenti
| Metodo | URL | Descrizione |
|--------|-----|-------------|
| GET | `/api/utenti` | Lista utenti |
| POST | `/api/utenti` | Crea utente (solo admin) |
| DELETE | `/api/utenti/{id}` | Elimina utente (solo admin) |

### Manutenzioni
| Metodo | URL | Descrizione |
|--------|-----|-------------|
| GET | `/api/manutenzioni` | Lista interventi |
| POST | `/api/manutenzioni` | Nuovo intervento |
| DELETE | `/api/manutenzioni/{id}` | Elimina intervento |

### Lookup
| Metodo | URL | Descrizione |
|--------|-----|-------------|
| GET | `/api/lookup/fasce-orarie` | Fasce orarie |
| GET | `/api/lookup/tipologie-mezzo` | Tipi mezzo |
| GET | `/api/lookup/tipi-manutenzione` | Tipi manutenzione |

---

## Uso del token JWT
1. Chiama `POST /api/auth/login` con `{ "codice": "IL_TUO_CODICE", "password": "" }`
2. Copia il `token` dalla risposta
3. In ogni richiesta successiva aggiungi l'header:
   ```
   Authorization: Bearer IL_TOKEN_RICEVUTO
   ```

In Swagger UI puoi usare il pulsante **Authorize** in alto a destra.

---

## Livelli utente
- **Livello 1** — Admin: può creare/modificare mezzi e utenti
- **Livello 2** — Utente normale: può prendere, restituire, prenotare
