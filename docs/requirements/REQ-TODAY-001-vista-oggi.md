# REQ-TODAY-001 — Vista Oggi

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Ondata | 2 — Prodotto (CR-001) |
| Tipo | Nuovo |
| Dipende da | REQ-UX-001 (ST-UX-001), REQ-DATA-001 (ST-DATA-001), REQ-REPLAN-004 (ST-REPLAN-004) |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md`, `modello-dominio-estensioni.md`, `dati-di-riferimento-estensioni.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-TODAY-001`, una pull request |
| Origine | `docs/CR-001-travelops-prodotto-demo.md` §9.15 |

> I rimandi §7.x sono a `modello-dominio-estensioni.md`, i rimandi §8.x a `dati-di-riferimento-estensioni.md`, gli altri alla CR-001.

## Funzionalità

Per un viaggio `in_corso` (orologio reale o simulato): scheda "Adesso" con l'attività in corso e il tempo rimanente, scheda "Dopo" con la prossima e quando partire, mappa del giorno con la posizione prevista, pulsanti rapidi "Sono in ritardo di 15 / 30 / 60 minuti" (imprevisto `RITARDO`), "Ho un imprevisto", "Oggi sono stanco". Fuori dal viaggio: conto alla rovescia alla partenza o riepilogo del viaggio concluso.

## Criteri di accettazione

- **CA-1** Con l'orologio simulato al 2026-06-13 alle 10:30 su TRIP-DEMO-GARDA, le schede Adesso e Dopo sono corrette.
- **CA-2** Sono in ritardo di 30 minuti produce la stessa proposta di un RITARDO di 30 minuti in quel momento.
- **CA-3** Su telefono Oggi è la scheda iniziale di un viaggio in corso.

## Campi per il plugin

- **Sintesi** (`--summary`): Per un viaggio in corso, con orologio reale o simulato: cosa sta succedendo adesso e cosa viene dopo, mappa del giorno e pulsanti rapidi per ritardi, imprevisti e stanchezza.
- **Criteri** (`--acceptance`): CA-1…CA-3.
- **Fuori perimetro** (`--non-goal`): Posizione reale del viaggiatore (GPS). Notifiche fuori dall'app.
- **Vincoli** (`--constraint`): Nessuna logica del motore duplicata nella web app: proposte, controlli e versioni vengono dal motore. Testi in italiano e in linguaggio semplice; nessun codice tecnico a vista per il viaggiatore.
- **Percorsi** (`--write-path`): `apps/web`, `docs`, `evidence`.
