# REQ-002 — Generazione dell'itinerario

| Campo | Valore |
|---|---|
| Stato | Bozza per `requirement propose` |
| Versione | 0.2 (PoC) |
| Dipende da | REQ-001 |
| Tetto di autonomia proposto | `checkpointed` |
| Fase | 1 — Pianifica |

## 1. Sintesi (→ `--summary`)

Dal profilo del viaggio confermato, il sistema genera un itinerario giorno per giorno: attività con orari, durate e spostamenti, coerente con prenotazioni, orari di apertura, ritmo e vincoli. Per le attività all'aperto prepara un **piano B**.

## 2. Funzionalità

- Inserimento delle esperienze *irrinunciabili*, poi *desiderate*, poi *opzionali* fino al ritmo scelto; aggiunta di attività *suggerite* coerenti con gli interessi.
- Ogni attività ha: luogo, orario, durata, tipo (*all'aperto* / *al chiuso* / *misto*), priorità, fonte delle informazioni.
- Regole: rispetto di voli/treni con margini (es. 2 h prima per voli internazionali), check-in/check-out, prenotazioni, orari di apertura; pasti nelle fasce preferite; giorno di arrivo e partenza alleggeriti; raggruppamento geografico; distanza a piedi entro il limite.
- Spostamenti tra attività con mezzo e durata stimata.
- Piano B per ogni attività *all'aperto* (al chiuso, vicina, stesso interesse).
- Breve spiegazione delle scelte per ogni giorno ed elenco di ciò che non è stato inserito e perché.

## 3. Criteri di accettazione (→ `--acceptance`)

1. Su 5 profili di viaggio di esempio, nessun itinerario contiene sovrapposizioni orarie, attività fuori orario di apertura o conflitti con prenotazioni.
2. Tutte le esperienze *irrinunciabili* compatibili con i vincoli sono presenti; le altre sono elencate con il motivo.
3. Il numero di attività al giorno rispetta il ritmo (rilassato ≤ 3, medio ≤ 5, intenso ≤ 7, pasti esclusi).
4. Ogni spostamento ha mezzo e durata stimata.
5. Ogni attività *all'aperto* ha un piano B.
6. L'itinerario generato è salvato come prima versione (REQ-003).

## 4. Fuori perimetro (→ `--non-goal`)

- Scelta o prenotazione di voli, alloggi, visite.
- Ottimizzazione dei costi.

## 5. Vincoli (→ `--constraint`)

- Le prenotazioni e le attività fissate non vengono mai spostate.
- Dove orari o informazioni pratiche mancano, l'attività è marcata *da verificare*.

## 6. Requisiti non funzionali (→ `--nfr`)

- Generazione di un viaggio di 7 giorni entro 90 secondi.

## 7. Integrazioni (→ `--integration`)

- Luoghi e orari di apertura: mock con un set di luoghi di 1–2 città demo.
- Tempi di percorrenza: stimati dalla distanza in linea d'aria e dal mezzo.
- Modello linguistico (Claude) per proporre l'itinerario, i suggerimenti e le spiegazioni.

## 8. Percorsi modificabili (→ `--write-path`)

`src/lib/itinerary`, `src/lib/planner`, `src/lib/places`, `src/lib/llm`, `src/app`, `db`, `test/itinerary`, `test/planner`, `test/fixtures/places`, `package.json`, `package-lock.json`, `docs`, `evidence`

## 9. Decisioni prese

1. Luoghi e orari: solo mock (1–2 città demo); tempi di percorrenza stimati dalla distanza.
2. Generazione: Claude propone l'itinerario; un validatore a regole verifica sovrapposizioni, orari di apertura, prenotazioni e ritmo, e in caso di violazioni chiede a Claude una correzione (massimo 2 tentativi, poi mostra l'itinerario con le violazioni segnalate).

## 10. Storie suggerite

| Storia | Contenuto | Dipende da |
|---|---|---|
| ST-004 | Modello itinerario (giorni, attività, spostamenti) e validazione dei vincoli | ST-001 |
| ST-005 | Dati di luoghi e tempi di percorrenza (mock e adattatori) | ST-004 |
| ST-006 | Pianificatore: selezione, ordine, orari, spostamenti, piano B, spiegazioni | ST-005 |
