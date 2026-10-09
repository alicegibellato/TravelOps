# REQ-REPLAN-001 — Impatto degli imprevisti

| Campo | Valore |
|---|---|
| Stato | Bozza per `requirement propose` |
| Versione | 1.0 |
| Ondata | 1 — Motore |
| Area suggerita | C |
| Dipende da | REQ-FOUND-001 |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-REPLAN-001`, una pull request |

## Obiettivo

Dato un imprevisto, sapere quali elementi colpisce e perché, e solo quelli. Il calcolo non usa il controllo di fattibilità né i dati di contesto, quindi non dipende da REQ-FEAS-001.

## Operazioni

| Operazione | Input | Output |
|---|---|---|
| Calcola impatto | viaggio, catalogo, imprevisto | elenco degli elementi colpiti, ciascuno con il motivo e, per i ritardi, l'orario a cui slitterebbe |

## Regole

- **R-1** Per `METEO_AVVERSO`, `CHIUSURA_LUOGO` e `CANCELLAZIONE_SPOSTAMENTO` valgono le definizioni di `modello-dominio.md` §2.4.
- **R-RIT-1** Per `RITARDO` si simula lo slittamento della giornata indicata, senza cambiare l'ordine né le durate:
  - se un elemento è in corso (inizio ≤ momento < fine), la sua fine slitta dei minuti di ritardo;
  - altrimenti il viaggiatore è disponibile da momento + minuti;
  - ogni elemento successivo inizia al più tardi tra il suo inizio previsto e la fine dell'elemento precedente slittato, e mantiene la durata.

  Sono colpiti l'elemento in corso e ogni elemento che inizierebbe dopo l'orario previsto; lo slittamento si ferma al primo elemento che resta in orario. I giorni successivi non sono mai colpiti da un ritardo. Gli elementi a orario fisso si simulano come gli altri: l'impatto dice dove slitterebbero; è la ripianificazione (REQ-REPLAN-002) a tenerli fermi.
- **R-2** Un imprevisto fuori dalle date del viaggio, o che non tocca nessun elemento, ha impatto vuoto.
- **R-3** Il motivo di ogni elemento colpito indica il tipo di imprevisto e un messaggio in italiano. Gli elementi colpiti sono in ordine di data e di inizio.

## Criteri di accettazione

Scenari e dati in `dati-di-riferimento.md`.

- **CA-1** S1 pioggia: colpito solo `D2-E2`, motivo meteo avverso.
- **CA-2** S2 ritardo breve: colpiti `D3-E1` (09:00–10:20), `D3-E2` (10:20–12:20), `D3-E3` (12:20–12:30), `D3-E4` (12:30–13:30); `D3-E5`…`D3-E7` non colpiti.
- **CA-3** S3 foratura: colpiti `D3-E1` (09:00–11:50), `D3-E2` (11:50–13:50), `D3-E3` (13:50–14:00), `D3-E4` (14:00–15:00), `D3-E5` (15:00–15:15), `D3-E6` (15:15–17:45), `D3-E7` (17:45–18:35); nessun elemento dei giorni 1 e 2.
- **CA-4** S4 chiusura del MUSE: colpito solo `D3-E6`.
- **CA-5** S5 cancellazione: colpito solo `D3-E1`.
- **CA-6** S6: impatto identico a S3; la priorità non cambia l'impatto.
- **CA-7** S7 volo cancellato: colpito solo `D3-E9`.
- **CA-8** S8 ritardo verso l'aeroporto: colpiti `D3-E8` (17:30–19:45) e `D3-E9`, che slitterebbe a 19:45–20:50 anche se è a orario fisso.
- **CA-9** Una pioggia in zona `TRENTO` il 2026-06-13, o qualsiasi imprevisto del 2026-06-20, dà impatto vuoto.

## Campi per il plugin

- **Sintesi** (`--summary`): calcolo degli elementi colpiti da un imprevisto (meteo avverso, ritardo, chiusura, cancellazione), con motivo e, per i ritardi, l'orario a cui slitterebbero.
- **Criteri** (`--acceptance`): CA-1…CA-9.
- **Fuori perimetro** (`--non-goal`): proposta di modifiche (REQ-REPLAN-002); rilevamento automatico degli imprevisti (ondata 3).
- **Vincoli** (`--constraint`): regole comuni del motore (`modello-dominio.md` §3).
- **Percorsi** (`--write-path`): `packages/engine/src/replanning`, `packages/engine/src/model`, `packages/engine/src/index.ts`, `packages/engine/test/replanning`, `packages/engine/package.json`, `package-lock.json`, `docs`, `evidence`.
