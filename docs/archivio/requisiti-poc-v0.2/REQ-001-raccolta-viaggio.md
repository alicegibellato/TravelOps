# REQ-001 — Raccolta conversazionale del viaggio

| Campo | Valore |
|---|---|
| Stato | Bozza per `requirement propose` |
| Versione | 0.2 (PoC) |
| Dipende da | – |
| Tetto di autonomia proposto | `checkpointed` |
| Fase | 1 — Pianifica |

## 1. Sintesi (→ `--summary`)

L'utente descrive il viaggio dialogando con l'assistente nella web app. L'assistente estrae date, tappe, trasporti, alloggi e altre prenotazioni, partecipanti, esperienze desiderate con priorità e preferenze del viaggio (ritmo, interessi, vincoli), chiede solo ciò che manca o è ambiguo e produce un **profilo del viaggio** che l'utente conferma.

## 2. Funzionalità

### 2.1 Dialogo
- L'utente può iniziare con una frase libera ("8 giorni in Giappone ad aprile, Tokyo e Kyoto, amo il cibo").
- L'assistente chiede solo le informazioni mancanti, una o due domande alla volta.
- L'utente può correggere qualsiasi dato durante il dialogo.

### 2.2 Dati del viaggio
- Date di inizio e fine.
- Tappe in ordine, con notti per tappa (anche "decidi tu").
- Prenotazioni già fatte, inserite a mano o descritte nel dialogo: voli/treni (numero, tratta, orari), alloggi (nome, indirizzo, date, check-in/out), biglietti e visite (data, ora), con codice e link facoltativi.
- Partecipanti (adulti, bambini con età).
- Esperienze desiderate con priorità (*irrinunciabile* / *desiderata* / *opzionale*), con data o ora se vincolate.
- Preferenze del viaggio: ritmo (*rilassato* / *medio* / *intenso*), interessi, vincoli (mobilità, alimentazione), orari di sveglia e pasti, distanza massima a piedi.

### 2.3 Profilo del viaggio
- Riepilogo strutturato modificabile anche da modulo.
- Segnalazione delle incoerenze evidenti (es. "5 tappe in 3 giorni", volo che atterra dopo l'orario massimo di check-in).
- Conferma esplicita prima della generazione dell'itinerario (REQ-002).

## 3. Criteri di accettazione (→ `--acceptance`)

1. Da una frase iniziale con destinazione, durata e almeno un interesse, l'assistente non richiede nessuna di queste informazioni.
2. Su 10 conversazioni di esempio, il profilo estratto coincide con quello atteso per date, tappe, prenotazioni e priorità delle esperienze in almeno 8 casi.
3. Le incoerenze di un insieme di 5 casi di esempio vengono tutte segnalate.
4. Ogni campo del profilo è modificabile da dialogo e da modulo con lo stesso risultato.
5. La generazione dell'itinerario non parte senza conferma esplicita del profilo.

## 4. Fuori perimetro (→ `--non-goal`)

- Account e profilo utente persistente tra viaggi.
- Suggerimento della destinazione.
- Ricerca di prezzi di voli o alloggi.
- Import di conferme da email o PDF.

## 5. Vincoli (→ `--constraint`)

- L'assistente non inventa dati: ciò che l'utente non fornisce è marcato *da definire* o *proposto*.
- Più viaggi possono esistere, ma senza utenti né accesso.
- Un viaggio dura al massimo 14 giorni e ha al massimo 5 tappe; oltre, l'assistente lo segnala e chiede di ridurlo.
- Web app TypeScript su Next.js con dati in SQLite.

## 6. Requisiti non funzionali (→ `--nfr`)

- Risposta dell'assistente nel dialogo entro 10 secondi nei casi di esempio.

## 7. Integrazioni (→ `--integration`)

- Modello linguistico (Claude) per dialogo ed estrazione strutturata.

## 8. Percorsi modificabili (→ `--write-path`)

Include i file di base del progetto, perché ST-001 crea lo scheletro della web app:

`src/app`, `src/components`, `src/lib/trips`, `src/lib/intake`, `src/lib/llm`, `db`, `test/trips`, `test/intake`, `test/fixtures/conversations`, `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `eslint.config.mjs`, `vitest.config.ts`, `public`, `README.md`, `.env.example`, `.gitignore`, `docs`, `evidence`

## 9. Decisioni prese

1. Stack: TypeScript, Next.js, SQLite (vedi `visione.md`, sezione 7).
2. Limiti del PoC: viaggi fino a 14 giorni e 5 tappe.

## 10. Storie suggerite

| Storia | Contenuto | Dipende da |
|---|---|---|
| ST-001 | Scheletro della web app e modello dati del viaggio (tappe, prenotazioni, partecipanti, esperienze, preferenze) | – |
| ST-002 | Dialogo guidato ed estrazione strutturata con conversazioni di esempio | ST-001 |
| ST-003 | Riepilogo, modulo di modifica, controlli di coerenza e conferma | ST-002 |
