# REQ-WEB-003 — CR su REQ-WEB-001: consultazione con il nuovo design

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Ondata | 2 — Prodotto (CR-001) |
| Tipo | **CR su REQ-WEB-001**: requisito nuovo che ne modifica il comportamento; REQ-WEB-001 e la sua storia restano invariati |
| Dipende da | REQ-UX-001 (ST-UX-001), REQ-WEB-001 (ST-WEB-001, ondata 1) |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md`, `modello-dominio-estensioni.md`, `dati-di-riferimento-estensioni.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-WEB-003`, una pull request |
| Origine | `docs/CR-001-travelops-prodotto-demo.md` §9.2 |

> I rimandi §7.x sono a `modello-dominio-estensioni.md`, i rimandi §8.x a `dati-di-riferimento-estensioni.md`, gli altri alla CR-001.

## Cambia rispetto a REQ-WEB-001

Le stesse funzioni (scelta del viaggio, vista viaggio, vista giorno, mappa, dettaglio) rifatte con i componenti di REQ-UX-001:
- vista giorno come **linea del tempo** con schede attività (immagine, nome, orario, durata, stile colorato, costo, icona all'aperto o al coperto) e spostamenti come connettori sottili con icona del mezzo e durata;
- mappa con indicatori numerati colorati per stile e linee del colore del giorno; al passaggio o tocco su una scheda si evidenzia il punto sulla mappa e viceversa;
- dettaglio in pannello laterale (desktop) o dal basso (telefono), con descrizione, orari di apertura in linguaggio naturale, prenotazione con pulsante "Gestisci prenotazione".

## Criteri di accettazione

- **CA-1** I criteri di accettazione di REQ-WEB-001 restano soddisfatti con il nuovo aspetto.
- **CA-2** La vista giorno è una linea del tempo con schede attività (immagine, nome, orario, durata, stile colorato, costo, all'aperto o al coperto) e spostamenti come connettori con icona del mezzo e durata.
- **CA-3** Scheda attività e punto sulla mappa si evidenziano a vicenda al passaggio o al tocco.
- **CA-4** Il dettaglio si apre in un pannello laterale su desktop e dal basso su telefono, con descrizione, orari di apertura in linguaggio naturale e il pulsante Gestisci prenotazione quando c'è un link.
- **CA-5** Nessun codice tecnico a vista, come in REQ-UX-001 CA-6.
- **CA-6** Il layout su desktop e su telefono segue REQ-UX-001.

## Campi per il plugin

- **Sintesi** (`--summary`): Modifica di REQ-WEB-001: le stesse funzioni di consultazione (viaggio, giorno, mappa, dettaglio) rifatte con il design system, con linea del tempo del giorno, mappa e schede che si evidenziano a vicenda e dettaglio in pannello.
- **Criteri** (`--acceptance`): CA-1…CA-6.
- **Fuori perimetro** (`--non-goal`): Modifiche all'itinerario dall'interfaccia (REQ-PLAN-002, REQ-EDIT-002). Cambiare il comportamento di REQ-WEB-001 oltre all'aspetto.
- **Vincoli** (`--constraint`): Nessuna logica del motore duplicata nella web app: proposte, controlli e versioni vengono dal motore. Testi in italiano e in linguaggio semplice; nessun codice tecnico a vista per il viaggiatore. Usa solo i componenti e i token di REQ-UX-001.
- **Percorsi** (`--write-path`): `apps/web`, `docs`, `evidence`.
