# REQ-EDIT-002 — CR su REQ-EDIT-001: modifiche richieste ampliate

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Ondata | 2 — Prodotto (CR-001) |
| Tipo | **CR su REQ-EDIT-001**: requisito nuovo che ne modifica il comportamento; REQ-EDIT-001 e la sua storia restano invariati |
| Dipende da | REQ-EDIT-001 (ST-EDIT-001, ondata 1), REQ-PLAN-001 (ST-PLAN-001) |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md`, `modello-dominio-estensioni.md`, `dati-di-riferimento-estensioni.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-EDIT-002`, una pull request |
| Origine | `docs/CR-001-travelops-prodotto-demo.md` §9.11 |

> I rimandi §7.x sono a `modello-dominio-estensioni.md`, i rimandi §8.x a `dati-di-riferimento-estensioni.md`, gli altri alla CR-001.

## Aggiunge a REQ-EDIT-001

(le operazioni e i risultati M1–M6 restano identici):
- **R2-PRO Prolunga il soggiorno** di N giorni dopo una data: si inseriscono N giorni liberi (generabili con "Riempi questo giorno" tramite REQ-PLAN-001) dopo quella data; i giorni successivi slittano di N giorni con gli stessi elementi; la data di fine del viaggio cresce di N. Gli elementi a orario fisso nei giorni slittati restano nella loro data e ora originale, sono a rischio, la proposta è non fattibile e propone le alternative (gestione prenotazione, ricerca voli o treni per la nuova data). Scenari M7 e M8.
- **R2-ACC Accorcia il viaggio** di N giorni: si tolgono gli ultimi N giorni tranne gli elementi a orario fisso, che restano a rischio con le alternative.
- **R2-RIT Cambia ritmo di un giorno** (più leggero / più pieno), con le regole di PLAN-002 come proposta.
- **R2-RIG Rigenera un giorno** come proposta (livello "giornata" della §7.6).
- Tutte le modifiche dopo la conferma sono proposte da accettare o rifiutare.

## Criteri di accettazione

- **CA-1** I criteri CA-1…CA-11 di REQ-EDIT-001 restano soddisfatti.
- **CA-2** Per M7 e M8 la proposta coincide con il risultato fissato nel contratto della storia applicando la regola R2-PRO; in M8 gli elementi a orario fisso restano nella data originale, sono a rischio e la proposta, non fattibile, offre la gestione della prenotazione e la ricerca voli per la nuova data.
- **CA-3** Accorciare di 1 giorno V-VOLO lascia D3-E8 e D3-E9 a rischio con le alternative.
- **CA-4** Cambia ritmo di un giorno e Rigenera un giorno producono proposte che dichiarano il livello di ripianificazione.
- **CA-5** Ogni nuova operazione ha una spiegazione in parole semplici.
- **CA-6** Dopo la conferma del viaggio tutte le modifiche sono proposte da accettare o rifiutare.

## Campi per il plugin

- **Sintesi** (`--summary`): Modifica di REQ-EDIT-001: nuove operazioni richieste dal viaggiatore come proposte (prolunga il soggiorno, accorcia il viaggio, cambia ritmo di un giorno, rigenera un giorno), nel rispetto degli orari fissi e delle prenotazioni.
- **Criteri** (`--acceptance`): CA-1…CA-6.
- **Fuori perimetro** (`--non-goal`): Prenotazioni, pagamenti, modifiche o cancellazioni presso fornitori. Interpretazione del linguaggio naturale (REQ-ORCH-001, REQ-IMPR-001).
- **Vincoli** (`--constraint`): Regole comuni del motore (modello-dominio.md §3): TypeScript strict, determinismo, nessuna chiamata di rete nel motore, messaggi in italiano, ogni criterio coperto da test automatici. Non cambia i risultati M1…M6 di REQ-EDIT-001.
- **Percorsi** (`--write-path`): `packages/engine/src/editing`, `packages/engine/src/replanning`, `packages/engine/src/planning`, `packages/engine/src/demo`, `packages/engine/src/model`, `packages/engine/src/index.ts`, `packages/engine/test/editing`, `packages/engine/data`, `packages/engine/package.json`, `package-lock.json`, `docs`, `evidence`.
