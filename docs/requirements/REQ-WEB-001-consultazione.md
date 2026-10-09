# REQ-WEB-001 — Web app: consultazione dell'itinerario

| Campo | Valore |
|---|---|
| Stato | Bozza per `requirement propose` |
| Versione | 1.0 |
| Ondata | Filone web, in parallelo all'ondata 1 |
| Area suggerita | W (web) |
| Dipende da | REQ-ITIN-001 |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-WEB-001`, una pull request |

## Obiettivo

Prima versione della web app: consultare un viaggio (giorni, elementi, mappa, dettagli) usando il motore come pacchetto, senza duplicarne la logica. Dà qualcosa di visibile mentre l'ondata 1 è ancora in corso.

## Funzionalità

- **Scelta del viaggio**: versione 1 di riferimento e varianti `V-IRR`, `V-FISSO`, `V-VOLO`.
- **Vista viaggio**: titolo, date, per ogni giorno il luogo di partenza, l'alloggio e il numero di elementi.
- **Vista giorno**: elementi in ordine con orari, tipo, attività o tratta, mezzo, priorità, orario fisso, prenotazione (codice e link di gestione).
- **Mappa del giorno**: un indicatore numerato per ogni attività, nell'ordine dell'itinerario, e una linea per ogni spostamento; i luoghi senza coordinate sono elencati sotto la mappa.
- **Dettaglio elemento**: tutti i campi; per un'attività anche categoria, all'aperto o al coperto, durata tipica e orari di apertura del luogo.

## Criteri di accettazione

- **CA-1** La web app si avvia in sviluppo dalla radice del repository; `npm run build` compila anche la web app e la CI la compila a ogni push.
- **CA-2** La vista giorno del 2026-06-13 mostra `D2-E1`…`D2-E5` in ordine, con gli orari dei dati di riferimento (test automatico).
- **CA-3** La mappa del 2026-06-14 riceve 3 indicatori numerati, nell'ordine castello, pranzo, MUSE, con le coordinate dei dati di riferimento (test sui dati passati alla mappa).
- **CA-4** Con la variante `V-VOLO` la vista giorno del 2026-06-14 mostra `D3-E9` a orario fisso, con il codice `XY123` e il link di gestione della prenotazione.
- **CA-5** I dati si caricano e si validano con il motore (REQ-ITIN-001): con dati non validi la web app mostra gli errori invece della vista.
- **CA-6** La web app non fa chiamate di rete oltre alle tessere della mappa di OpenStreetMap.

## Campi per il plugin

- **Sintesi** (`--summary`): web app Next.js in `apps/web` per consultare un viaggio di riferimento: vista viaggio, vista giorno, mappa Leaflet con OpenStreetMap e dettaglio degli elementi, usando il motore `@travelops/engine`.
- **Criteri** (`--acceptance`): CA-1…CA-6.
- **Fuori perimetro** (`--non-goal`): proposte, versioni e pagina Demo (REQ-WEB-002); modifiche dall'interfaccia; chat (ondata 2); accesso e utenti.
- **Vincoli** (`--constraint`): Next.js con TypeScript; mappa Leaflet con tessere OpenStreetMap; un solo utente senza accesso; nessuna logica del motore duplicata nella web app.
- **Integrazioni** (`--integration`): tessere della mappa OpenStreetMap.
- **Percorsi** (`--write-path`): `apps/web`, `package.json`, `package-lock.json`, `.github`, `README.md`, `docs`, `evidence`.
