# REQ-REPLAN-003 — CR su REQ-REPLAN-001: impatto dei nuovi imprevisti

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Ondata | 2 — Prodotto (CR-001) |
| Tipo | **CR su REQ-REPLAN-001**: requisito nuovo che ne modifica il comportamento; REQ-REPLAN-001 e la sua storia restano invariati |
| Dipende da | REQ-REPLAN-001 (ST-REPLAN-001, ondata 1), REQ-CAT-001 (ST-CAT-001) |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md`, `modello-dominio-estensioni.md`, `dati-di-riferimento-estensioni.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-REPLAN-003`, una pull request |
| Origine | `docs/CR-001-travelops-prodotto-demo.md` §9.12 |

> I rimandi §7.x sono a `modello-dominio-estensioni.md`, i rimandi §8.x a `dati-di-riferimento-estensioni.md`, gli altri alla CR-001.

## Aggiunge a REQ-REPLAN-001

il calcolo dell'impatto per i tipi della §7.4, compresi gli imprevisti su più giorni (`VOLO_PERSO`, `SALUTE`).

## Criteri di accettazione

- **CA-1** I criteri di REQ-REPLAN-001 restano soddisfatti.
- **CA-2** L'impatto di S9 colpisce solo D2-E2, quello di S10 solo D3-E9, quello di S11 solo D3-E1.
- **CA-3** L'impatto di S12, S13 e S14 rispetta le definizioni di modello-dominio-estensioni.md §7.4.
- **CA-4** Un imprevisto SALUTE di 3 giorni colpisce solo le attività non compatibili in quei 3 giorni.
- **CA-5** Un VOLO_PERSO con arrivo previsto il giorno dopo colpisce gli elementi che iniziano prima dell'arrivo previsto, anche nel giorno successivo.

## Campi per il plugin

- **Sintesi** (`--summary`): Modifica di REQ-REPLAN-001: calcolo dell'impatto per volo perso, salute o infortunio, sciopero, bagaglio smarrito, documenti smarriti e stanchezza, compresi gli imprevisti su più giorni.
- **Criteri** (`--acceptance`): CA-1…CA-5.
- **Fuori perimetro** (`--non-goal`): Più imprevisti nella stessa proposta. Rilevamento automatico degli imprevisti (ondata 3).
- **Vincoli** (`--constraint`): Regole comuni del motore (modello-dominio.md §3): TypeScript strict, determinismo, nessuna chiamata di rete nel motore, messaggi in italiano, ogni criterio coperto da test automatici.
- **Percorsi** (`--write-path`): `packages/engine/src/replanning`, `packages/engine/src/model`, `packages/engine/src/index.ts`, `packages/engine/test/replanning`, `packages/engine/data`, `docs`, `evidence`.
