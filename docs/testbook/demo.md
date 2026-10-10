# Demo (`TB-DEMO`) · gruppo D

`/demo` («Modalità presentazione»): «Orologio simulato» («Data», «Ora», «Imposta l'orologio»), «Stato del viaggio», «Ripristina i viaggi demo», «Scenari», «Copione della demo» con «Copia».

### TB-DEMO-001 · Impostare l'orologio simulato

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì (e2e `ca6-presentazione`)
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. Imposta «Data» `2026-06-13` e «Ora» `15:30`, premi «Imposta l'orologio».
  2. Ricarica la pagina, poi apri «Oggi».
- **Atteso**: «Adesso nel viaggio» mostra 13 giugno 15:30 anche dopo il ricaricamento; «Oggi» del viaggio demo è sul secondo giorno alle 15:30.

### TB-DEMO-002 · Orologio, scenario o proposta non validi

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. Apri `/demo?errore=orologio`, `/demo?errore=scenario`, `/demo?errore=proposta`.
  2. Apri `/demo/proposte/non-esiste`.
- **Atteso**: messaggi «Orologio non impostato: indica la data come AAAA-MM-GG e l'ora come HH:mm.», «Scenario sconosciuto.», «La proposta non è più disponibile: avvia di nuovo lo scenario.»; la proposta inesistente mostra «Proposta non disponibile».

### TB-DEMO-003 · Tutti gli scenari si avviano

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: stato pulito prima di ciascuno scenario.
- **Azioni**:
  1. Per ciascuno degli 8 scenari premi «Avvia lo scenario <titolo>», leggi la proposta e torna con «Ripristina i viaggi demo».
- **Atteso**: ogni scenario apre una proposta con testi in italiano e senza errori; «Foratura con castello irrinunciabile» non toglie il castello; «Ritardo verso l'aeroporto» tiene il volo.

### TB-DEMO-004 · Stato salvato non valido

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: stato salvato corrotto nella cartella dati di prova.
- **Azioni**:
  1. Apri `/demo` e premi «Ripristina».
- **Atteso**: prima «Lo stato salvato non è valido» con «Con "Ripristina" riparti dall'itinerario di riferimento.»; dopo «Ripristina» la pagina torna normale con la sola versione 1; i viaggi dell'utente non sono toccati.

### TB-DEMO-005 · Copione e prompt copiabili

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì (e2e `ca6-presentazione`)
- **Precondizioni**: nessuna.
- **Azioni**:
  1. Premi «Vai al copione della demo».
  2. Premi «Copia» sul primo prompt dell'«Atto 1 — Raccontami il viaggio».
- **Atteso**: si vedono i quattro atti; il pulsante diventa «Copiato» e negli appunti c'è il testo del prompt.
