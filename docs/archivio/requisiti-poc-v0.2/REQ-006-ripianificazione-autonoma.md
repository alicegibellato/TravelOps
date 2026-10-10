# REQ-006 — Ripianificazione autonoma e avvisi in app

| Campo | Valore |
|---|---|
| Stato | Bozza per `requirement propose` |
| Versione | 0.2 (PoC) |
| Dipende da | REQ-004, REQ-005 |
| Tetto di autonomia proposto | `checkpointed` |
| Fase | 2 — Adatta |

## 1. Sintesi (→ `--summary`)

Quando arriva un evento esterno (REQ-005) che rende un'attività impraticabile o sconsigliata, TravelOps prepara da solo una **proposta** di modifica dell'itinerario, motivata, e mostra un **avviso in app**. Non applica nulla da solo. Se l'evento tocca una prenotazione (es. volo cancellato), TravelOps **avvisa** e **propone alternative con link utili**, senza mai modificare, cancellare o rifare la prenotazione.

## 2. Funzionalità

### 2.1 Regole
| Evento | Condizione (configurabile) | Proposta |
|---|---|---|
| Pioggia | Attività *all'aperto*, probabilità ≥ 70% nella sua fascia, entro 48 h | Piano B o spostamento in giorno/fascia migliore |
| Ritardo volo | ≥ 60 min | Riallineamento delle attività del giorno |
| Cancellazione volo | Qualsiasi | Riorganizzazione dei giorni coinvolti + alternative e link (vedi 2.3) |
| Chiusura luogo | Nel giorno dell'attività | Piano B o spostamento in altro giorno |
| Ritardo dell'utente | Dichiarato in REQ-007, rende impossibili attività successive | Riorganizzazione del resto della giornata |

### 2.2 Proposte
- Riusa il motore di REQ-004: differenze, effetti a catena, validazione.
- Preferenza: piano B → spostamento nello stesso giorno → spostamento in altro giorno → attività simile.
- Mai spostare attività fissate o prenotazioni; per le *irrinunciabili* solo spostamenti, mai rimozioni.
- Contenuto: evento, fonte e orario del dato, attività coinvolte, modifica proposta, motivazione in una frase.
- L'utente accetta, rifiuta o accetta in parte. Più eventi sullo stesso giorno producono un'unica proposta.
- Una proposta non decisa scade all'inizio dell'attività coinvolta; se l'evento rientra prima della decisione, la proposta viene ritirata.

### 2.3 Eventi che toccano prenotazioni
- Avviso con: cosa è successo, quale prenotazione è coinvolta, cosa fare.
- Alternative suggerite con link: pagina di gestione della prenotazione (se l'utente l'ha inserita), ricerca di voli alternativi sulla tratta su **Google Flights**, di treni su **Trainline**, contatti del fornitore se noti.
- L'itinerario proposto tiene conto dello scenario più probabile (es. partenza il giorno dopo) e lo dichiara come ipotesi.

### 2.4 Avvisi in app
- Area avvisi nella web app con contatore dei non letti.
- Ogni avviso porta alla proposta o al dettaglio dell'evento.
- Gravità visibile; gli avvisi *critici* sono in evidenza.

## 3. Criteri di accettazione (→ `--acceptance`)

1. Per ogni regola della tabella 2.1, lo scenario corrispondente del simulatore produce un avviso e una proposta con evento, fonte, orario e motivazione.
2. Nessuna modifica all'itinerario viene applicata senza accettazione dell'utente.
3. Nessuna proposta sposta attività fissate o prenotazioni, né rimuove attività *irrinunciabili* (verificato su tutti gli scenari).
4. Con lo scenario "volo cancellato" l'avviso contiene almeno un link di alternative e, se presente, il link di gestione della prenotazione; nessuna azione viene eseguita sulla prenotazione.
5. Più eventi sullo stesso giorno producono un'unica proposta.
6. Una proposta scade all'inizio dell'attività coinvolta; se l'evento rientra viene ritirata con avviso.
7. Il contatore degli avvisi non letti è corretto dopo lettura, accettazione e rifiuto.

## 4. Fuori perimetro (→ `--non-goal`)

- Applicazione automatica di qualsiasi modifica.
- Prenotazione, modifica o cancellazione presso fornitori.
- Notifiche fuori dall'app.

## 5. Vincoli (→ `--constraint`)

- TravelOps non esegue mai azioni su prenotazioni: solo avvisi, proposte e link.
- Ogni proposta autonoma registra evento, regola applicata e dati usati.

## 6. Requisiti non funzionali (→ `--nfr`)

- Proposta disponibile entro 1 minuto dall'evento nella demo.

## 7. Integrazioni (→ `--integration`)

- Eventi esterni (REQ-005).
- Motore di proposta (REQ-004).
- Modello linguistico (Claude) per le motivazioni.

## 8. Percorsi modificabili (→ `--write-path`)

`src/app`, `src/components`, `src/lib/autonomous`, `src/lib/replanning`, `src/lib/alerts`, `src/lib/llm`, `config`, `db`, `test/autonomous`, `test/alerts`, `test/fixtures/scenarios`, `package.json`, `package-lock.json`, `docs`, `evidence`

## 9. Decisioni prese

1. Link alternative: Google Flights per i voli, Trainline per i treni, più il link di gestione della prenotazione se inserito dall'utente. I link sono costruiti con tratta e data precompilate quando possibile.

## 10. Storie suggerite

| Storia | Contenuto | Dipende da |
|---|---|---|
| ST-014 | Regole evento → attività coinvolte → strategia, proposte autonome con scadenza e ritiro | ST-010, ST-012 |
| ST-015 | Eventi su prenotazioni: avvisi con alternative e link | ST-014 |
| ST-016 | Area avvisi in app con contatore | ST-014 |

Review del codice consigliata: **ST-014**, **ST-015**.
