# Servizi reali (`TB-REAL`) · gruppo D

Servizi esterni in modalità `reale` (`TRAVELOPS_METEO`, `TRAVELOPS_PERCORSI`, `TRAVELOPS_GEOCODING`, `TRAVELOPS_VOLI`, `TRAVELOPS_EVENTI`), timeout `TRAVELOPS_SERVIZI_TIMEOUT_MS`. Si eseguono solo sui computer autorizzati e mai nelle prove automatiche (che usano sempre gli adattatori finti). Vedi `docs/servizi-esterni.md`.

### TB-REAL-001 · Meteo reale

- **Priorità** P2 · **Modalità** reale (`TRAVELOPS_METEO=reale`) · **Automatizzabile** no (rete esterna)
- **Precondizioni**: un viaggio confermato con date nei prossimi 7 giorni.
- **Azioni**:
  1. Apri «Oggi» e la pagina di un giorno del viaggio.
- **Atteso**: le previsioni sono quelle del servizio reale per il luogo e la data; le attività «All'aperto» con pioggia prevista sono segnalate.

### TB-REAL-002 · Percorsi reali

- **Priorità** P2 · **Modalità** reale (`TRAVELOPS_PERCORSI=reale`) · **Automatizzabile** no (rete esterna)
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. Crea una bozza di 2 giorni a Trento e guarda gli spostamenti.
- **Atteso**: i tempi degli spostamenti sono plausibili (a piedi/auto) e diversi da quelli finti; nessuna sovrapposizione di orari.

### TB-REAL-003 · Destinazione non raggiungibile: niente viaggio a metà

- **Priorità** P1 · **Modalità** reale (`TRAVELOPS_GEOCODING=reale`, chat con modello vero) · **Automatizzabile** no (rete esterna)
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7` (Garda «non raggiungibile» ma nasce il viaggio `chat-N` senza istantanea; Overpass 504; istantanee precaricate ignorate con `GEOCODING=reale`).
- **Precondizioni**: un servizio di luoghi lento o in errore (es. risposta 504).
- **Azioni**:
  1. In `/pianifica` chiedi un viaggio sul Lago di Garda.
- **Atteso**: se esiste l'istantanea precaricata del Garda viene usata e la bozza nasce completa; se nessun dato è disponibile, il messaggio dice che la destinazione non è disponibile e **non** nasce un viaggio vuoto in «I miei viaggi».

### TB-REAL-004 · Servizio irraggiungibile: degrado «non disponibile»

- **Priorità** P2 · **Modalità** reale · **Automatizzabile** sì (con `TRAVELOPS_METEO_URL` verso un indirizzo locale chiuso e `TRAVELOPS_SERVIZI_TIMEOUT_MS=1000`)
- **Precondizioni**: `TRAVELOPS_METEO=reale` con URL irraggiungibile.
- **Azioni**:
  1. Apri «Oggi» e un giorno del viaggio.
- **Atteso**: entro circa il timeout la pagina mostra che il meteo non è disponibile; il resto della pagina funziona; nessun errore generico; nel log un avviso senza segreti.

### TB-REAL-005 · Voli: solo link di ricerca

- **Priorità** P3 · **Modalità** reale (`TRAVELOPS_VOLI=reale`) · **Automatizzabile** no (rete esterna)
- **Precondizioni**: itinerario «Volo di ritorno»; scenario «Volo cancellato» avviato.
- **Azioni**:
  1. Apri le «Alternative» della proposta.
- **Atteso**: le alternative sono link di ricerca verso siti esterni; TravelOps non prenota, non paga e non chiede dati personali.

### TB-REAL-006 · Variabili documentate in `.env.example`

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì (confronto tra variabili lette dal codice e `.env.example`)
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7`; lettura del codice.
- **Precondizioni**: nessuna.
- **Azioni**:
  1. Confronta `apps/web/.env.example` con le variabili lette dall'app.
- **Atteso**: sono documentate, con valore di esempio vuoto o predefinito, anche `OPENAI_API_KEY`, `TRAVELOPS_MODEL`, `TRAVELOPS_ASSISTENTE`, `TRAVELOPS_DATI`, `MONITOR_ATTIVO`, `MONITOR_INTERVALLO_S`, `MONITOR_ORIZZONTE_GIORNI`, `MONITOR_FINTO`; nessun valore reale di chiave.
