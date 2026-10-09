# REQ-REPLAN-004 — CR su REQ-REPLAN-002: ripianificazione dei nuovi imprevisti, con preferenze

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Ondata | 2 — Prodotto (CR-001) |
| Tipo | **CR su REQ-REPLAN-002**: requisito nuovo che ne modifica il comportamento; REQ-REPLAN-002 e la sua storia restano invariati |
| Dipende da | REQ-REPLAN-002 (ST-REPLAN-002, ondata 1), REQ-REPLAN-003 (ST-REPLAN-003), REQ-PREF-001 (ST-PREF-001), REQ-PLAN-001 (ST-PLAN-001) |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md`, `modello-dominio-estensioni.md`, `dati-di-riferimento-estensioni.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-REPLAN-004`, una pull request |
| Origine | `docs/CR-001-travelops-prodotto-demo.md` §9.13 |

> I rimandi §7.x sono a `modello-dominio-estensioni.md`, i rimandi §8.x a `dati-di-riferimento-estensioni.md`, gli altri alla CR-001.

## Aggiunge a REQ-REPLAN-002

- **R2-PREF** Se il viaggio ha un profilo, nella scelta dei sostituti (R-SOS-4) il punteggio della §7.7 viene prima della categoria; le attività escluse dal profilo non sono candidate. Senza profilo i risultati S1–S8 sono identici.
- **R2-SAL** `SALUTE`: le attività colpite si sostituiscono con R-SOS (filtro intensità e accessibilità al posto di "al coperto"); con "riposo" (intensità massima nessuna) il giorno resta solo con pasti, elementi a orario fisso e irrinunciabili (questi ultimi a rischio). Alternative: link "Farmacie vicine" e "Pronto soccorso vicino" (ricerca Google Maps con il nome della zona), costruiti senza aprirli.
- **R2-VOL** `VOLO_PERSO`: come R-CAN-2 con le alternative di R-ALT; se è indicato un arrivo previsto, gli elementi prima dell'arrivo si trattano come un ritardo che inizia all'orario originale dello spostamento (R-RIT-2…R-RIT-4), anche sul giorno successivo.
- **R2-SCI** `SCIOPERO`: R-CAN-1 su ogni spostamento colpito, in ordine di inizio.
- **R2-BAG** `BAGAGLIO_SMARRITO`: serve una finestra libera di 90 minuti entro le 13:00 del giorno vicino all'alloggio; se non c'è, si rimuove l'attività `opzionale`, poi `desiderata`, col punteggio più basso che la libera (R-RIT-3 per le parità); si aggiunge l'attività "Acquisti essenziali" nel `negozio` più vicino. Alternativa: link alla gestione della prenotazione del volo di arrivo, se c'è.
- **R2-DOC** `DOCUMENTI_SMARRITI`: come R2-BAG con 180 minuti e l'attività "Denuncia e documenti provvisori"; alternativa: link "Polizia di Stato — denuncia" (`https://www.poliziadistato.it`). Gli elementi a orario fisso dei giorni successivi sono a rischio con la spiegazione "serve un documento valido".
- **R2-STA** `STANCHEZZA`: si rimuovono le attività colpite fino a lasciare il numero del ritmo `lento`, partendo dalle `opzionali` e dall'intensità più alta; pasti, irrinunciabili e orari fissi restano.
- **R2-LIV** Ogni proposta dichiara il livello (§7.6); quando il livello minimo è non fattibile, la spiegazione offre "Rigenera questa giornata".

## Criteri di accettazione

- **CA-1** Senza profilo, i criteri CA-1…CA-14 di REQ-REPLAN-002 restano soddisfatti e S1–S8 danno le stesse proposte.
- **CA-2** S9 produce le modifiche di P-S1 con una spiegazione che cita l'infortunio; fattibile.
- **CA-3** S10: itinerario invariato, D3-E9 a rischio, alternative come in S7; fattibile.
- **CA-4** S11: D3-E1 diventa auto 08:40–09:30 e il resto resta invariato; fattibile.
- **CA-5** S12, S13 e S14 coincidono con i risultati fissati nel contratto della storia applicando R2-BAG, R2-DOC e R2-STA.
- **CA-6** Con il profilo PR-1 su TRIP-DEMO-GARDA, lo scenario pioggia sceglie un sostituto con stile gastronomia o romantico se collocabile.
- **CA-7** Ogni proposta dichiara il livello di ripianificazione; se il livello minimo non è fattibile, la spiegazione offre Rigenera questa giornata.
- **CA-8** Le alternative per SALUTE e DOCUMENTI_SMARRITI (farmacie, pronto soccorso, Polizia di Stato) sono costruite senza aprirle né chiamare la rete.
- **CA-9** npm run demo mostra anche gli scenari S9–S14.

## Campi per il plugin

- **Sintesi** (`--summary`): Modifica di REQ-REPLAN-002: ripianificazione minima dei nuovi imprevisti, scelta dei sostituti secondo le preferenze del viaggiatore, livello di ripianificazione dichiarato e proposta di rigenerare la giornata quando il livello minimo non basta.
- **Criteri** (`--acceptance`): CA-1…CA-9.
- **Fuori perimetro** (`--non-goal`): Prenotazioni, pagamenti, modifiche o cancellazioni presso fornitori. Apertura dei link. Più imprevisti nella stessa proposta.
- **Vincoli** (`--constraint`): Regole comuni del motore (modello-dominio.md §3): TypeScript strict, determinismo, nessuna chiamata di rete nel motore, messaggi in italiano, ogni criterio coperto da test automatici. Non cambia i risultati S1…S8 di REQ-REPLAN-002 per i viaggi senza profilo.
- **Percorsi** (`--write-path`): `packages/engine/src/replanning`, `packages/engine/src/planning`, `packages/engine/src/demo`, `packages/engine/src/model`, `packages/engine/src/index.ts`, `packages/engine/test/replanning`, `packages/engine/data`, `packages/engine/package.json`, `package-lock.json`, `docs`, `evidence`.
