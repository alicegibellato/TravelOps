# REQ-EDIT-001 — Modifiche richieste dal viaggiatore

| Campo | Valore |
|---|---|
| Stato | Bozza per `requirement propose` |
| Versione | 1.0 |
| Ondata | 1 — Motore |
| Area suggerita | B |
| Dipende da | REQ-ITIN-002, REQ-FEAS-001, REQ-REPLAN-002 |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-EDIT-001`, una pull request |

## Obiettivo

Trasformare una modifica chiesta dal viaggiatore ("aggiungi una degustazione sabato alle 16", "togli il pranzo") in una proposta, con le stesse garanzie degli imprevisti: controllo di fattibilità, spiegazione, accettazione. È il motore su cui si appoggerà la chat dell'ondata 2. La rimozione riusa la regola R-SOS-5 di REQ-REPLAN-002, perciò questo requisito viene dopo.

## Operazioni

Ogni operazione restituisce una proposta oppure un errore. Input comuni: viaggio (versione corrente) e numero della versione, catalogo, sorgente dei dati di contesto.

| Operazione | Input specifici | Descrizione della modifica (per la causa della versione) |
|---|---|---|
| Aggiungi attività | data, attività del catalogo, inizio, priorità (facoltativa) | "aggiungi `<attività>` il `<data>` alle `<inizio>`" |
| Rimuovi attività | `id` | "rimuovi `<id>` (`<attività>`)" |
| Sposta attività | `id`, nuova data, nuovo inizio | "sposta `<id>` (`<attività>`) al `<data>` alle `<inizio>`" |
| Cambia priorità | `id`, priorità | "priorità di `<id>` (`<attività>`) a `<priorità>`" |
| Imposta orario fisso | `id`, sì/no | "orario fisso su `<id>`" / "orario non più fisso su `<id>`" |

## Regole

- **R-ED-1** *Errori* (nessuna proposta): `GIORNO_INESISTENTE` (data fuori dal viaggio), `ATTIVITA_INESISTENTE` (non nel catalogo), `ELEMENTO_INESISTENTE`, `NON_ATTIVITA` (rimuovi, sposta o cambia priorità su uno spostamento), `ORARIO_FISSO` (rimuovi o sposta un elemento a orario fisso), `ORARIO_NON_VALIDO` (inizio non in formato `HH:mm`), `PERCORSO_SCONOSCIUTO` (manca il tempo per uno spostamento necessario), `FUORI_GIORNATA` (un elemento creato inizierebbe prima delle 00:00 o finirebbe dopo le 24:00).
- **R-ED-2** *Aggiungi.* L'attività dura quanto la sua durata tipica e ha la priorità indicata (`desiderata` se assente).
  - Luogo di partenza: dove si trova il viaggiatore alla fine dell'ultimo elemento del giorno che termina entro l'inizio richiesto; se non c'è, il luogo di partenza del giorno.
  - Luogo di destinazione: il luogo di partenza del primo elemento del giorno che inizia dall'inizio richiesto in poi; se non c'è, l'alloggio della notte; se manca anche quello (ultimo giorno), nessuno.
  - Se il luogo di partenza è diverso da quello dell'attività, si crea uno spostamento di andata con il mezzo più veloce, che termina all'inizio dell'attività. Se esiste una destinazione diversa dal luogo dell'attività, si crea uno spostamento di ritorno che parte alla fine dell'attività.
  - Gli elementi esistenti non cambiano: sovrapposizioni o luoghi incoerenti li segnala il controllo di fattibilità (R-ED-6).
- **R-ED-3** *Rimuovi.* Si applica R-SOS-5 di REQ-REPLAN-002: lo spostamento di andata è l'elemento immediatamente precedente, se è uno spostamento; quello di ritorno è l'elemento immediatamente successivo, se è uno spostamento. È ammessa anche la rimozione di un'attività irrinunciabile: la chiede il viaggiatore.
- **R-ED-4** *Sposta* = rimuovi (R-ED-3) e poi aggiungi (R-ED-2) nella nuova data e ora. L'attività mantiene `id` e priorità.
- **R-ED-5** *Cambia priorità* e *imposta orario fisso* cambiano solo quel campo di quell'elemento. L'orario fisso si può impostare anche su uno spostamento.
- **R-ED-6** *Fattibilità.* La proposta passa dal controllo di REQ-FEAS-001 e riporta esito, problemi ed elementi a rischio. TravelOps non sposta altri elementi per far posto alla modifica: se non sta in piedi, la proposta è non fattibile e decide il viaggiatore.
- **R-ED-7** *Spiegazione e accettazione* come R-4 e R-5 di REQ-REPLAN-002; la causa della versione è "Modifica richiesta: `<descrizione>`" (REQ-ITIN-002 R-3). Gli elementi creati ricevono gli id nuovi (`modello-dominio.md` §2.1).

## Risultati attesi

| Scenario | Proposta attesa | Esito |
|---|---|---|
| M1 aggiungi | Partenza `HOTEL` (dopo `D2-E5`), destinazione l'alloggio `HOTEL`. Aggiunti `N1` auto `HOTEL` → `CANTINA` 15:45–16:00, `N2` `A-CANTINA` 16:00–17:30 (opzionale), `N3` auto `CANTINA` → `HOTEL` 17:30–17:45. Nessun altro elemento cambia. | fattibile |
| M2 rimuovi | `D2-E3` diventa piedi `PONALE` → `HOTEL` 13:00–13:20; `D2-E4` e `D2-E5` rimossi. | fattibile |
| M3 sposta | `D1-E1` e `D1-E3` rimossi (partenza e uscita coincidono: `HOTEL`); `D1-E2` 17:00–19:00; aggiunti `N1` piedi `HOTEL` → `LUNGOLAGO` 16:50–17:00 e `N2` piedi `LUNGOLAGO` → `HOTEL` 19:00–19:10. | fattibile |
| M4 sovrapposizione | Partenza e destinazione `RIST-RIVA`. Aggiunti `N1` piedi `RIST-RIVA` → `MAG` 13:25–13:30, `N2` `A-MAG` 13:30–15:30, `N3` piedi `MAG` → `RIST-RIVA` 15:30–15:35; nessun elemento esistente cambia. | non fattibile: tra gli altri, `SOVRAPPOSIZIONE` tra `D2-E4` e `N2` |
| M5 priorità | Cambia solo la priorità di `D3-E2`: il risultato coincide con `V-IRR`. | fattibile |
| M6 orario fisso | Cambia solo `D2-E4`: il risultato coincide con `V-FISSO`. | fattibile |

## Criteri di accettazione

- **CA-1…CA-6** Per ciascuno degli scenari M1…M6 la proposta coincide con quella attesa: modifiche, orari, id nuovi ed esito.
- **CA-7** Errori, senza proposta: rimuovi `D2-E3` → `NON_ATTIVITA`; aggiungi `A-MAG` il 2026-06-13 alle 11:00 → `PERCORSO_SCONOSCIUTO` (il viaggiatore è al `PONALE`); aggiungi `A-MAG` il 2026-06-15 → `GIORNO_INESISTENTE`; rimuovi `D2-E4` in `V-FISSO` → `ORARIO_FISSO`; aggiungi `A-INESISTENTE` → `ATTIVITA_INESISTENTE`; rimuovi `X-99` → `ELEMENTO_INESISTENTE`; aggiungi `A-LUNGOLAGO` il 2026-06-12 alle 23:00 → `FUORI_GIORNATA`.
- **CA-8** Accettando la proposta di M1 si ottiene una versione con causa "Modifica richiesta: aggiungi A-CANTINA il 2026-06-13 alle 16:00".
- **CA-9** Ogni proposta ha una spiegazione che nomina la richiesta, ogni elemento cambiato con l'orario prima e dopo, e gli eventuali problemi.
- **CA-10** I test di REQ-REPLAN-002 continuano a passare: il riuso della regola di rimozione non cambia i suoi risultati.
- **CA-11** `npm run demo` mostra anche gli scenari M1–M6.

## Campi per il plugin

- **Sintesi** (`--summary`): modifiche richieste dal viaggiatore (aggiungi, rimuovi, sposta un'attività, cambia priorità, imposta orario fisso) trasformate in proposte con controllo di fattibilità, spiegazione ed errori espliciti.
- **Criteri** (`--acceptance`): CA-1…CA-11.
- **Fuori perimetro** (`--non-goal`): interpretazione del linguaggio naturale (ondata 2); spostamento automatico di altri elementi per far posto alla modifica.
- **Vincoli** (`--constraint`): regole comuni del motore (`modello-dominio.md` §3).
- **Percorsi** (`--write-path`): `packages/engine/src/editing`, `packages/engine/src/replanning`, `packages/engine/src/demo`, `packages/engine/src/model`, `packages/engine/src/index.ts`, `packages/engine/test/editing`, `packages/engine/package.json`, `package-lock.json`, `docs`, `evidence`.
