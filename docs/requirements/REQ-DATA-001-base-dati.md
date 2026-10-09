# REQ-DATA-001 — Base dati

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Ondata | 2 — Prodotto (CR-001) |
| Tipo | Nuovo |
| Dipende da | REQ-ITIN-002 (ST-ITIN-002, ondata 1) |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md`, `modello-dominio-estensioni.md`, `dati-di-riferimento-estensioni.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-DATA-001`, una pull request |
| Origine | `docs/CR-001-travelops-prodotto-demo.md` §9.4 |

> I rimandi §7.x sono a `modello-dominio-estensioni.md`, i rimandi §8.x a `dati-di-riferimento-estensioni.md`, gli altri alla CR-001.

## Obiettivo

Salvare viaggi, profili, revisioni della bozza, storici, proposte, conversazioni della chat e impostazioni della modalità presentazione in SQLite.

## Regole

File in `apps/web/.data/travelops.db` (escluso da Git); migrazioni numerate e ripetibili; uno strato di accesso unico (nessuna query sparsa nelle pagine); il primo avvio crea il database e carica i viaggi demo (§8.3); "Ripristina i viaggi demo" li ricarica senza toccare gli altri viaggi.

## Criteri di accettazione

- **CA-1** Il primo avvio su un clone pulito crea il database con i viaggi demo.
- **CA-2** Lo stato sopravvive al riavvio della web app.
- **CA-3** Un viaggio esportato e reimportato è identico (stesso JSON del motore).
- **CA-4** Le migrazioni applicate due volte non cambiano nulla.
- **CA-5** Il file JSON locale di REQ-WEB-002, se presente, viene importato una volta e poi non è più usato.

## Campi per il plugin

- **Sintesi** (`--summary`): Viaggi, profili, revisioni della bozza, storici, proposte, conversazioni, istantanee delle destinazioni e impostazioni della modalità presentazione salvati in SQLite, con migrazioni ripetibili e viaggi demo caricati al primo avvio.
- **Criteri** (`--acceptance`): CA-1…CA-5.
- **Fuori perimetro** (`--non-goal`): Più utenti, server di database, sincronizzazione.
- **Vincoli** (`--constraint`): Nessuna logica del motore duplicata nella web app: proposte, controlli e versioni vengono dal motore. Nessun segreto nel codice o nei log. SQLite con better-sqlite3 in apps/web/.data/travelops.db, escluso da Git; un unico strato di accesso ai dati.
- **Percorsi** (`--write-path`): `apps/web`, `package.json`, `package-lock.json`, `.gitignore`, `docs`, `evidence`.
