# REQ-ITIN-002 — Versioni e storico

| Campo | Valore |
|---|---|
| Stato | Bozza per `requirement propose` |
| Versione | 1.0 |
| Ondata | 1 — Motore |
| Dipende da | REQ-ITIN-001 |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-ITIN-002`, una pull request |

## Obiettivo

Ogni proposta accettata produce una nuova versione dell'itinerario; le precedenti restano consultabili e confrontabili. Vale sia per le proposte nate da un imprevisto (REQ-REPLAN-002) sia per quelle nate da una modifica richiesta (REQ-EDIT-001). Nei test la proposta di riferimento P-S1 si legge dai dati di riferimento, quindi questo requisito non aspetta la ripianificazione.

## Operazioni

| Operazione | Input | Output |
|---|---|---|
| Crea storico | viaggio | storico con la versione 1 |
| Applica proposta | storico, proposta accettata, nome di chi accetta, momento (data e ora) | storico con una nuova versione |
| Elenca versioni | storico | numero, momento, causa e autore di ogni versione |
| Leggi versione | storico, numero | viaggio di quella versione |
| Confronta | storico, versione A, versione B | elementi aggiunti, rimossi, modificati (con i campi prima e dopo) |
| Esporta / importa | storico | JSON / storico |

## Regole

- **R-1** La versione 1 ha causa "Itinerario iniziale".
- **R-2** Una versione, una volta creata, non cambia più.
- **R-3** Ogni versione registra numero, momento, causa, origine (imprevisto o modifica richiesta, se c'è), chi l'ha accettata e l'elenco delle modifiche. La causa si scrive così:
  - `METEO_AVVERSO`: "Meteo avverso: `<condizione>` in `<zona>` il `<data>` `<inizio>`–`<fine>`"
  - `RITARDO`: "Ritardo di `<minuti>` minuti il `<data>` alle `<momento>`: `<motivo>`"
  - `CHIUSURA_LUOGO`: "Chiusura di `<luogo>` il `<data>` `<inizio>`–`<fine>`"
  - `CANCELLAZIONE_SPOSTAMENTO`: "Cancellazione dello spostamento `<id>`"
  - modifica richiesta: "Modifica richiesta: `<descrizione della modifica>`" (la descrizione arriva con la proposta, vedi REQ-EDIT-001)
- **R-4** Il confronto usa gli `id` degli elementi: stesso `id` con campi diversi = modificato; `id` presente solo nella versione B = aggiunto; solo nella A = rimosso.
- **R-5** Una proposta si applica solo se è stata costruita sulla versione corrente; altrimenti viene rifiutata con il codice `PROPOSTA_SUPERATA`.
- **R-6** Una proposta rifiutata o non ancora accettata non crea versioni.
- **R-7** Una proposta il cui itinerario risultante è identico a quello corrente non crea versioni: l'accettazione restituisce l'avviso `NESSUNA_MODIFICA`.
- **R-8** Si può accettare anche una proposta non fattibile: la decisione è del viaggiatore. La versione registra che la proposta non era fattibile.

## Criteri di accettazione

- **CA-1** Creato lo storico della versione 1 di riferimento, esiste solo la versione 1, con causa "Itinerario iniziale".
- **CA-2** Applicando la proposta P-S1 accettata da "Alice" il 2026-06-13 alle 07:30 si ottiene la versione 2 con causa "Meteo avverso: pioggia in GARDA_NORD il 2026-06-13 08:00–13:00", autore "Alice" e quel momento; la versione 1 è identica a prima.
- **CA-3** Il confronto tra le versioni 1 e 2 del CA-2 restituisce: modificati `D2-E1` (arrivo e orario) e `D2-E3` (partenza e orario), rimosso `D2-E2`, aggiunto `N1` con l'attività `A-MAG`; nient'altro.
- **CA-4** Una proposta costruita sulla versione 1, applicata quando la corrente è la 2, viene rifiutata con `PROPOSTA_SUPERATA` e lo storico non cambia.
- **CA-5** Esportare e reimportare lo storico restituisce le stesse versioni.
- **CA-6** Una proposta con itinerario identico a quello corrente non crea versioni e restituisce `NESSUNA_MODIFICA`.
- **CA-7** Dopo il CA-2 il prossimo numero per gli id nuovi del viaggio corrente è 2.

## Campi per il plugin

- **Sintesi** (`--summary`): storico delle versioni dell'itinerario: ogni proposta accettata crea una versione immutabile con causa e autore; versioni consultabili, confrontabili per `id`, esportabili; le proposte superate vengono rifiutate.
- **Criteri** (`--acceptance`): CA-1…CA-7.
- **Fuori perimetro** (`--non-goal`): costruzione delle proposte (REQ-REPLAN-002, REQ-EDIT-001); salvataggio persistente in un database (ondata 2).
- **Vincoli** (`--constraint`): regole comuni del motore (`modello-dominio.md` §3).
- **Percorsi** (`--write-path`): `packages/engine/src/history`, `packages/engine/src/model`, `packages/engine/src/index.ts`, `packages/engine/test/history`, `packages/engine/package.json`, `package-lock.json`, `docs`, `evidence`.
