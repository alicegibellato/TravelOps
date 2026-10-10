# Prove di consegna: ST-QA-001A

Testbook di collaudo concordato.

## Cosa è stato chiesto

Scrivere il testbook di collaudo di REQ-QA-001 (CA-1, CA-2) in `docs/testbook/`, almeno 60 casi divisi per area, includere i difetti segnalati da Alice e i casi proposti da Valerio, condividere la bozza con Alice sul canale e registrare il suo ok esplicito.

## Perimetro ed esclusioni

- Dentro: `docs/testbook/` (indice + 14 file per area) e questo file di prove.
- Fuori: esecuzione dei casi (ST-QA-001B/C/D), automazione e2e (ST-QA-001E), correzioni del codice dell'app (story `ST-QA-FIX-*`), larghezze diverse da 1280 px.

## Cosa è cambiato

| Campo | Valore |
|---|---|
| Requisito | REQ-QA-001 (CA-1, CA-2) |
| Branch | `feature/ST-QA-001A` |
| Prodotto | `docs/testbook/` (indice + 14 file per area) |
| Casi | 107 (gruppo B = 46, gruppo C = 35, gruppo D = 26) |

## Perché

I collaudi di oggi hanno trovato difetti non coperti dagli e2e; un testbook unico, diviso per gruppi (B Alice, C Valerio, D Antonio) e concordato con chi lo esegue, rende ripetibile la regressione prima di ogni rilascio e dà a ogni difetto un caso TB che lo riproduce.

## Verifica

### Criteri di accettazione

| Criterio | Esito | Prova |
|---|---|---|
| `docs/testbook/` contiene almeno 60 casi nel formato CA-1, organizzati per area | superato | 107 intestazioni `### TB-<AREA>-NNN`, ognuna con priorità, modalità, automatizzabile, precondizioni, azioni numerate, atteso; ID unici |
| La bozza è condivisa con Alice (PC1) sul canale | superato | bozza spinta su `feature/ST-QA-001A` (commit `cffdd93`); richiesta #6097747092 del 2026-10-10 14:58 a Alice e Valerio |
| L'ok esplicito di Alice è registrato nelle evidenze prima della chiusura | superato | risposta #6097865702 (vedi sotto) |
| I problemi segnalati da Alice sono inclusi come casi | superato | tabella «Copertura delle segnalazioni» |

### Ok di Alice (PC1)

Messaggio #6097865702 del 2026-10-10 15:13, in risposta a #6097747092:

> Alice · PC1 -> Antonio: ok al gruppo B del testbook (PREF 8, PLAN 18, SURP 4, CHAT 7), ok al metodo (#6097682223). Aggiungi questi casi, poi per me è concordato: TB-CHAT-008 … TB-CHAT-014, TB-SURP-005, TB-SURP-006. Esecuzione B: la faccio io (ST-QA-001B) appena chiudo ST-CHAT-003A.

Casi richiesti aggiunti: TB-CHAT-008, 009, 010, 011, 012, 013, 014, TB-SURP-005, 006. Con l'aggiunta il testbook è concordato con Alice.

Valerio (PC2), gruppo C: nessuna risposta entro la chiusura; i suoi 16 casi proposti (#6097568533) sono tutti inclusi.

### Copertura delle segnalazioni

| Segnalazione | Caso |
|---|---|
| [P1] senza chiave «Crea la mia bozza» resta su «Preparo la bozza…» | TB-PREF-005 |
| [P1] servizi reali: Garda «non raggiungibile» ma nasce `chat-N` senza istantanea | TB-REAL-003, TB-CHAT-009 |
| [P2] «Scambia con…» perde un'attività e cambia ristoranti | TB-PLAN-005 |
| [P2] spostamento staccato dall'attività | TB-PLAN-004 |
| [P2] stesso ristorante pranzo e cena, 1 attività a ritmo lento | TB-PLAN-007 |
| [P2] doppio clic applica due volte | TB-PLAN-008 |
| [P2] operazioni 3-6 s senza indicatore | TB-PLAN-009 |
| [P2] menu che restano aperti | TB-PLAN-010 |
| [P2] «Scambia con…» col mouse non fa nulla | TB-PLAN-006 |
| [P2] risposta chat mostrata solo dopo ricarica | TB-CHAT-002 |
| [P2] percorso non segna i passi compilati | TB-PREF-008 |
| [P2] Pianifica usa l'orologio Demo | TB-PLAN-002 |
| [P3] mese + durata parte sempre il 1° | TB-PREF-006 |
| [P3] durata diversa tra filtri e chat | TB-CHAT-006 |
| [P3] aggiunta oltre il ritmo senza avviso | TB-PLAN-011 |
| [P3] confronto conta spostamenti non cambiati | TB-PLAN-012 |
| [P3] testi della bozza | TB-PLAN-016 |
| home con solo i viaggi di riferimento | TB-TRIP-003 |
| `/viaggi/<id>` «Pagina non trovata» | TB-TRIP-002 |
| Oggi, Itinerario corrente, Versioni, Imprevisti agganciati alla presentazione | TB-TODAY-008, TB-VER-005, TB-IMPR-013 |
| viaggio confermato resta in `/bozza` senza «Ho un imprevisto» | TB-PLAN-014 |
| versione 1 senza data | TB-VER-001 |
| `<main>` con solo «Caricamento…» | TB-A11Y-001 |
| `.env.example` incompleto | TB-REAL-006 |
| `npm test` instabile sotto carico | TB-QUAL-005 |
| Valerio, casi 1-16 | TB-TRIP-001…003, 005; TB-TODAY-001…004; TB-VER-001…003; TB-IMPR-010…012; TB-PLAN-001; TB-PREF-002 |
| «Ho un imprevisto» / «Oggi sono stanco» in Oggi puntano a `/demo` | TB-TODAY-006, TB-TODAY-007 |
| `/imprevisti` non nel menu | TB-IMPR-001 |
| `/qualita` senza report | TB-QUAL-002 |
| 12 schede degli imprevisti | TB-IMPR-002…009 |

### Controlli eseguiti

- Conteggio casi: `grep -h '^### TB-' docs/testbook/*.md | wc -l` → 107; nessun ID duplicato.
- Formato: `node .sdlc/stories/ST-QA-001A/evidence/verifica-testbook.mjs docs/testbook` → 107 casi, 14 aree, tutti i campi CA-1 presenti, esito superato.
- Il testbook non contiene chiavi né valori di segreti (scansione dei segreti della story).

## Collegamenti

- Requisito: `docs/requirements/REQ-QA-001-testbook-collaudo.md`
- Testbook: `docs/testbook/README.md`
- Messaggi: #6097568533 (Valerio), #6097616774 e #6097618537 (collaudo di Alice), #6097747092 (richiesta di revisione), #6097865702 (ok di Alice), #6097876625 (conferma delle aggiunte)
