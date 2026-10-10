# REQ-004 — Ripianificazione su richiesta dell'utente

| Campo | Valore |
|---|---|
| Stato | Bozza per `requirement propose` |
| Versione | 0.2 (PoC) |
| Dipende da | REQ-003 |
| Tetto di autonomia proposto | `checkpointed` |
| Fase | 2 — Adatta |

## 1. Sintesi (→ `--summary`)

Durante il viaggio l'utente chiede modifiche in linguaggio naturale ("domani voglio riposare", "aggiungi una cena di pesce stasera"). L'assistente produce una **proposta** con le differenze rispetto al piano attuale e gli effetti sui giorni successivi; l'utente la accetta, la rifiuta o ne accetta solo una parte. Questo motore di proposta è riusato dalla ripianificazione autonoma (REQ-006).

## 2. Funzionalità

- Richieste su giorno, fascia oraria, singola attività, ritmo o tipo di attività; riferimenti relativi ("dopo pranzo", "domani") risolti rispetto a data e ora correnti del viaggio.
- Domanda di chiarimento solo se la richiesta è ambigua.
- Proposta con: attività aggiunte, rimosse, spostate; effetti sui giorni successivi; avviso se tocca attività *irrinunciabili*, fissate o prenotazioni.
- Decisione: accetta tutto, rifiuta, accetta in parte (con ricalcolo).
- Le modifiche accettate creano una versione (REQ-003) con la richiesta come motivazione.

## 3. Criteri di accettazione (→ `--acceptance`)

1. Su 15 richieste di esempio, la proposta soddisfa la richiesta senza conflitti con prenotazioni né sovrapposizioni in almeno 12 casi.
2. Nessuna proposta rimuove attività *irrinunciabili* o fissate, né sposta prenotazioni, senza segnalarlo e chiedere conferma esplicita.
3. Ogni proposta mostra tutte le differenze e gli effetti sui giorni successivi.
4. L'accettazione parziale produce un itinerario senza sovrapposizioni.
5. Una proposta rifiutata non modifica l'itinerario.

## 4. Fuori perimetro (→ `--non-goal`)

- Richieste vocali.
- Ricerca di disponibilità o prenotazione di ristoranti e attività.

## 5. Vincoli (→ `--constraint`)

- Nessuna proposta viene applicata senza accettazione dell'utente.

## 6. Requisiti non funzionali (→ `--nfr`)

- Proposta pronta entro 30 secondi nei casi di esempio.

## 7. Integrazioni (→ `--integration`)

- Modello linguistico (Claude) per comprensione e spiegazione.
- Pianificatore (REQ-002) per il ricalcolo.

## 8. Percorsi modificabili (→ `--write-path`)

`src/app`, `src/components`, `src/lib/replanning`, `src/lib/clock`, `src/lib/llm`, `db`, `test/replanning`, `test/fixtures/requests`, `package.json`, `package-lock.json`, `docs`, `evidence`

## 9. Decisioni prese

1. "Data e ora correnti del viaggio" vengono da un orologio simulato per la demo (modulo `src/lib/clock`, condiviso con REQ-005), con possibilità di usare l'ora reale.

## 10. Storie suggerite

| Storia | Contenuto | Dipende da |
|---|---|---|
| ST-010 | Motore di proposta: differenze, effetti a catena, validazione, accettazione parziale | ST-009 |
| ST-011 | Comprensione delle richieste in linguaggio naturale e interfaccia di proposta | ST-010 |
