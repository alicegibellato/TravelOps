# REQ-CHAT-002 — Chat rifinita dopo il collaudo con il modello vero

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-10 |
| Ondata | 2 — Prodotto (CR-001), collaudo |
| Tipo | Correzione e rifinitura |
| Dipende da | REQ-CHAT-001 (ST-CHAT-001C), REQ-ORCH-001 (ST-ORCH-001C), REQ-PLAN-002 (ST-PLAN-002, ST-PLAN-003) |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-CHAT-002`, una pull request |
| Origine | Collaudo di usabilità con il modello vero (PC1, 10/10/2026), punti 1, 2, 3, 7 e g |

## Obiettivo

Correggere i difetti della chat trovati nel collaudo con il modello vero, perché la chat sia affidabile e leggibile come il resto dell'app.

## Funzionalità

- **Crea la mia bozza dai filtri**: quando il viaggio non esiste ancora, gli agenti vedono il profilo condiviso compilato con il percorso guidato (lettura del viaggio e situazione del messaggio), e il messaggio inviato da «Crea la mia bozza» riassume le preferenze; l'agente prepara la destinazione e crea la bozza senza chiedere di nuovo i filtri.
- **Niente codici del motore nelle schede**: le schede di proposta in chat mostrano solo testo per il viaggiatore (che cosa cambia, che cosa è a rischio, avvisi in parole semplici), mai identificativi, codici dei problemi o date in formato tecnico.
- **Sostituisci su un viaggio confermato**: «sostituisci X con qualcosa all'aperto» diventa una sola proposta che toglie l'attività e ne mette un'altra, con testo e scheda coerenti.
- **Date in italiano corretto** nel riepilogo delle preferenze («da venerdì 16 ottobre a domenica 18 ottobre»).
- **Bolle più corte**: quando la bozza è visibile accanto alla chat, la risposta riassume in poche frasi invece di ripetere il programma giorno per giorno.

## Criteri di accettazione

- **CA-1** Con il profilo compilato dai filtri e nessun viaggio, «Crea la mia bozza» porta a una bozza (client del modello finto con conversazione registrata).
- **CA-2** Nessuna scheda di proposta della chat contiene identificativi del motore, codici dei problemi o date in formato AAAA-MM-GG.
- **CA-3** «Sostituisci» su un viaggio confermato produce una sola proposta con l'attività tolta e quella nuova.
- **CA-4** Il riepilogo delle preferenze scrive le date con la preposizione corretta.
- **CA-5** Le istruzioni degli agenti chiedono risposte brevi quando la bozza è a lato, e il controllo verifica che la scheda della bozza non ripeta il programma nella bolla.

## Campi per il plugin

- **Sintesi** (`--summary`): Correzioni della chat dal collaudo con il modello vero: profilo dei filtri visto dagli agenti, schede senza codici del motore, sostituzione in una sola proposta, date in italiano corretto, risposte brevi accanto alla bozza.
- **Criteri** (`--acceptance`): CA-1…CA-5.
- **Fuori perimetro** (`--non-goal`): Ridisegno grafico della pagina Pianifica e della bozza (REQ-UX-003).
- **Vincoli** (`--constraint`): Nessuna logica del motore duplicata nella web app. Testi in italiano semplice, nessun codice tecnico a vista. Nessuna chiamata di rete nei test.
- **Percorsi** (`--write-path`): `packages/agents`, `apps/web`, `docs`, `evidence`.
