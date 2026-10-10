# REQ-003 — Consultazione, modifica e versioni dell'itinerario

| Campo | Valore |
|---|---|
| Stato | Bozza per `requirement propose` |
| Versione | 0.2 (PoC) |
| Dipende da | REQ-002 |
| Tetto di autonomia proposto | `checkpointed` |
| Fase | 1 — Pianifica |

## 1. Sintesi (→ `--summary`)

L'utente consulta l'itinerario per giorno e su mappa e lo modifica direttamente: sposta, aggiunge, rimuove o fissa attività. Ogni modifica, manuale o proposta dall'assistente e accettata, crea una versione con autore e motivazione; l'utente può annullare l'ultima modifica.

## 2. Funzionalità

### 2.1 Viste
- **Viaggio:** tappe, date, prenotazioni.
- **Giorno:** attività in ordine con orari, spostamenti, meteo previsto (se disponibile).
- **Mappa del giorno:** attività numerate.
- **Dettaglio attività:** informazioni, piano B, fonte, link utili.

### 2.2 Modifiche dirette
- Spostare un'attività di orario o giorno, aggiungerla, rimuoverla, cambiarne durata o priorità.
- **Fissare** un'attività.
- Ricalcolo degli spostamenti e avvisi su sovrapposizioni, chiusure e conflitti con prenotazioni.

### 2.3 Versioni
- Ogni modifica confermata crea una versione con data/ora, autore (*utente* / *assistente su richiesta* / *assistente autonomo*) e motivazione.
- Elenco delle versioni del viaggio.
- **Annulla ultima modifica.**

## 3. Criteri di accettazione (→ `--acceptance`)

1. Vista giorno e mappa mostrano le stesse attività per lo stesso giorno.
2. Dopo lo spostamento di un'attività gli spostamenti adiacenti sono ricalcolati e i conflitti segnalati.
3. Un'attività fissata non viene mai modificata da funzioni automatiche (verificato da test su REQ-004 e REQ-006).
4. Ogni modifica confermata crea esattamente una versione con autore e motivazione.
5. "Annulla ultima modifica" ripristina esattamente lo stato precedente.

## 4. Fuori perimetro (→ `--non-goal`)

- Confronto visivo tra versioni arbitrarie.
- Condivisione ed esportazione.
- Trascinamento come unico modo di modifica (basta un modulo).

## 5. Vincoli (→ `--constraint`)

- Le prenotazioni non si spostano dall'itinerario: si modificano solo nei dati del viaggio (REQ-001).

## 6. Requisiti non funzionali (→ `--nfr`)

- Nessuno oltre al funzionamento nella demo.

## 7. Integrazioni (→ `--integration`)

- Mappa: Leaflet con tile OpenStreetMap.

## 8. Percorsi modificabili (→ `--write-path`)

`src/app`, `src/components`, `src/lib/itinerary`, `src/lib/versions`, `db`, `test/itinerary`, `test/versions`, `package.json`, `package-lock.json`, `docs`, `evidence`

## 9. Decisioni prese

1. Mappa: Leaflet + OpenStreetMap, senza chiavi.

## 10. Storie suggerite

| Storia | Contenuto | Dipende da |
|---|---|---|
| ST-007 | Viste viaggio, giorno, dettaglio e mappa | ST-006 |
| ST-008 | Modifiche dirette, attività fissate, controlli dei conflitti | ST-007 |
| ST-009 | Versioni e annullamento dell'ultima modifica | ST-008 |
