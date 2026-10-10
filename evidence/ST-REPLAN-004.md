# Prove di consegna: ST-REPLAN-004

## Cosa è stato chiesto

Il requisito REQ-REPLAN-004 "CR su REQ-REPLAN-002: ripianificazione dei nuovi imprevisti, con preferenze" (ondata 2, CR-001 §9.13): la ripianificazione minima del motore gestisce anche i sei imprevisti della `modello-dominio-estensioni.md` §7.4 (salute, volo o treno perso, sciopero, bagaglio smarrito, documenti smarriti, stanchezza) con le regole R2-SAL, R2-VOL, R2-SCI, R2-BAG, R2-DOC e R2-STA; se il viaggio ha un profilo, la scelta dei sostituti segue il punteggio delle preferenze (R2-PREF, §7.7); ogni proposta dichiara il livello di ripianificazione e, quando il livello minimo non è fattibile, offre "Rigenera questa giornata" (R2-LIV, §7.6). REQ-REPLAN-002 e la sua storia restano invariati.

Criteri di accettazione CA-1…CA-9. Story `ST-REPLAN-004`, una pull request da `feature/ST-REPLAN-004`. I risultati esatti di S12, S13 e S14 (CA-5) sono fissati nel contratto `contract-ST-REPLAN-004-implementation`, approvato prima di scrivere il codice.

## Perimetro ed esclusioni

- **Comprende:**
  - le proposte di ripianificazione per i sei imprevisti della §7.4, con spiegazione, elementi a rischio e alternative;
  - la scelta dei sostituti secondo il profilo (opzione `{ profilo }` di `proponiRipianificazione`);
  - il livello dichiarato (`Proposta.livello`, `LivelloRipianificazione`) e l'offerta di "Rigenera questa giornata";
  - le alternative nuove (farmacie, pronto soccorso, Polizia di Stato) costruite senza aprirle né chiamare la rete;
  - i dati della §8.5 in un file separato, il tempo della variante `V-BUS` in un file a parte;
  - la demo a terminale con S9–S14 e i test di ogni criterio CA-1…CA-9.
- **Esclude** (fuori perimetro del requisito): prenotazioni, pagamenti, modifiche o cancellazioni presso fornitori; apertura dei link; più imprevisti nella stessa proposta.
- **Lasciato fuori di proposito:**
  - Causa della versione e reimportazione dello storico per gli imprevisti S9–S14 (src/history) restano fuori: richiedono una CR su REQ-ITIN-002, annunciata sul canale da PC2. Per questo i test non accettano con `applicaProposta` le proposte degli imprevisti nuovi: verificano solo la proposta.
  - La rigenerazione vera della giornata (livello "giornata", con il generatore di REQ-PLAN-001): R2-LIV chiede solo che la spiegazione la offra.
  - Il viaggio demo completo TRIP-DEMO-GARDA della §8.3 (voli e trekking): lo costruisce REQ-DEMO-001. Per CA-6 si usa la bozza di PR-1 sull'istantanea del Garda (vedi "Perché").
  - Nessun file fuori dai percorsi della story: `apps/`, `src/history`, `src/editing` non sono cambiati; nessuna dipendenza nuova.
- **Deviazioni:** nessuna dai criteri. Le interpretazioni sono quelle approvate con il contratto e spiegate in "Perché".

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| `LivelloRipianificazione` e `Proposta.livello` (definizione concordata con ST-EDIT-002); `TipoAlternativaEstesa`, `AlternativaEstesa`; `ImprevistoSalute.intensitaMassima` accetta `nessuna` (riposo) | `packages/engine/src/model/index.ts` |
| `proponiRipianificazione` con un sovraccarico per gli imprevisti della §7.4 (`PropostaRipianificazioneEstesa`), opzione `profilo`, livello, problemi e alternative delle regole nuove, offerta di "Rigenera questa giornata" | `packages/engine/src/replanning/proposta.ts`, `spiegazione.ts`, `lavoro.ts`, `index.ts` |
| Regole R2-SAL, R2-VOL, R2-SCI, R2-BAG, R2-DOC, R2-STA | `packages/engine/src/replanning/ondata2.ts` (nuovo) |
| Sostituzione R-SOS con il filtro di salute e il punteggio del profilo (R2-PREF); collocazione e sostituta riusabili | `packages/engine/src/replanning/sostituzione.ts` |
| R-CAN-1 riusata per lo sciopero; spostamenti cancellati per le alternative | `packages/engine/src/replanning/cancellazione.ts` |
| Link "Farmacie vicine", "Pronto soccorso vicino", "Polizia di Stato — denuncia" | `packages/engine/src/replanning/alternative.ts` |
| Impatto del riposo (intensità massima `nessuna`); descrizione e sorgente arricchita per gli imprevisti estesi | `packages/engine/src/replanning/impatto.ts`, `contesto.ts` |
| Dati della §8.5 e tempo della variante `V-BUS` | `packages/engine/data/reference/estensioni/servizi-ondata2.json`, `contesto-v-bus.json`, `README.md` |
| Demo con S9–S14 e livello | `packages/engine/src/demo/scenari.ts`, `comune.ts`, `main.ts` |
| Test di CA-1…CA-9 e delle regole | `packages/engine/test/replanning/ripianificazione-ondata2.test.ts`, `supporto-ondata2.ts`, `demo.test.ts` |
| Prove di consegna | `evidence/ST-REPLAN-004.md` |

## Perché

### Interfaccia

- `Proposta.origine` resta del tipo `Imprevisto` dell'ondata 1, e `TipoAlternativa` resta quello dell'ondata 1: li usano storico (`src/history`) e web app (`apps/web`), fuori dai percorsi della story, con `switch` e tabelle complete per tipo. Per gli imprevisti della §7.4 `proponiRipianificazione` ha un sovraccarico che restituisce `PropostaRipianificazioneEstesa` (origine `ImprevistoEsteso`, alternative `AlternativaEstesa` con `elementoId` facoltativo). È la stessa scelta di compatibilità di ST-REPLAN-003 (`ImprevistoEsteso`) e ST-CAT-001 (`CatalogoEsteso`).
- Il profilo arriva come opzione (`{ profilo }`): il `Viaggio` del motore non ha ancora il campo profilo della §7.1. Senza profilo, e con opzioni vuote, le proposte S1–S8 sono identiche a prima.
- `LivelloRipianificazione` e `Proposta.livello` hanno la definizione concordata sul canale con ST-EDIT-002 (allineata a `apps/web/src/testi-ui.ts`), così chi unisce per secondo ha un conflitto banale.

### Risultati fissati nel contratto (CA-5)

- **S12** bagaglio smarrito il 2026-06-13 alle 08:00: nessuno spazio libero di 90 minuti entro le 13:00 (prima di `D2-E1` c'è solo 08:00–08:40 e il negozio apre alle 09:00); l'unica attività rimovibile che inizia prima delle 13:00 è `D2-E2`. Si toglie `D2-E2` e nella sua finestra (R-SOS-1: 08:40–13:20 da `HOTEL` a `RIST-RIVA`) si colloca `N1` `A-ACQUISTI` 09:00–10:30 (irrinunciabile) a `NEGOZIO-RIVA`; `D2-E1` diventa a piedi `HOTEL` → `NEGOZIO-RIVA` 08:55–09:00, `D2-E3` a piedi `NEGOZIO-RIVA` → `RIST-RIVA` 10:30–10:35. Fattibile, nessun elemento a rischio, nessuna alternativa (nessun volo di arrivo).
- **S13** documenti rubati il 2026-06-14 alle 08:30: nessuno spazio libero di 180 minuti entro le 13:00 e nemmeno togliendo `D3-E2` o il pranzo `D3-E4`, perché da `COMMISSARIATO-RIVA` non c'è un percorso noto verso `RIST-TRENTO`. Itinerario invariato, non fattibile con il problema bloccante `FINESTRA_NON_TROVATA`, nessun elemento a rischio, alternativa "Polizia di Stato — denuncia", offerta di "Rigenera questa giornata" per il 2026-06-14.
- **S14** stanchezza il 2026-06-14: pasti esclusi la giornata ha già 2 attività, quante ne prevede il ritmo lento: nulla da togliere. Itinerario invariato, fattibile.

### Scelte

- **R2-BAG / R2-DOC:** prima si cerca uno spazio libero dopo il momento dell'imprevisto (spostamenti nuovi di andata e ritorno col mezzo più veloce); se non c'è si prova a togliere una sola attività non irrinunciabile e non a orario fisso che inizia prima delle 13:00, in ordine opzionale → desiderata, punteggio più basso (con profilo), poi R-RIT-3, e al suo posto si colloca il servizio come in R-SOS-1/R-SOS-3. Il servizio è l'attività di categoria `servizio` con il nome della regola nel luogo più vicino all'alloggio. Il "volo di arrivo" è il volo del primo giorno.
- **R2-SAL:** le candidate devono avere intensità nota non superiore alla massima e, con mobilità ridotta, essere accessibili (un dato assente non si presume favorevole). Il riposo è l'intensità massima `nessuna`: colpite tutte le attività che non sono pasti; si tolgono con R-SOS-5, irrinunciabili e orari fissi restano a rischio. I link sono ricerche Google Maps con il nome della zona dell'alloggio del primo giorno.
- **R2-VOL:** lo spostamento perso resta com'è (R-CAN-2), a rischio, con le alternative di R-ALT; con l'arrivo previsto gli elementi colpiti si ripianificano come un ritardo (R-RIT-2…R-RIT-4) giorno per giorno: dall'orario dello spostamento perso fino all'arrivo, e il giorno dopo da mezzanotte all'arrivo.
- **R2-SCI:** R-CAN-1 su ogni spostamento colpito, in ordine di inizio, con la spiegazione "è colpito dallo sciopero".
- **R2-STA:** si tolgono le attività colpite (con R-SOS-5 per gli spostamenti) finché le attività non pasto sono 2, partendo dalle opzionali e dall'intensità più alta; a parità, R-RIT-3 (inizio più presto, id).
- **R2-PREF:** con il profilo le candidate escluse dalla §7.7 spariscono e il punteggio viene prima della categoria; la spiegazione mostra il punteggio di ogni candidata.
- **R2-LIV:** tutte le proposte sono di livello `minimo`. Quando non sono fattibili la spiegazione offre "Rigenera questa giornata" per le giornate coinvolte (S6, S8 e S13); quelle fattibili restano identiche a prima (CA-1).
- **CA-6:** TRIP-DEMO-GARDA, finché REQ-DEMO-001 non costruisce il viaggio demo completo, è la bozza di `generaBozza` con PR-1 sull'istantanea `packages/sources/snapshots/garda-2026-10-09.json`; la pioggia è `METEO_AVVERSO` in `GARDA_DINTORNI` il 2026-06-13 per tutta la giornata.

## Verifica

Comandi eseguiti dalla radice della copia di lavoro, dopo `npm ci`:

| Comando | Esito |
| --- | --- |
| `npm run build` | superato: motore compilato con `tsc`, web app compilata da Next.js |
| `npm run test --workspace @travelops/engine` | superato: 34 file, 681 test (i test esistenti invariati tranne `demo.test.ts`, esteso a S9–S14) |
| `npm run demo` | superato: mostra S1–S14 con il livello |

| Criterio | Test (`packages/engine/test/replanning/`) | Esito |
| --- | --- | --- |
| **CA-1** Senza profilo i criteri di REQ-REPLAN-002 restano soddisfatti e S1–S8 danno le stesse proposte | I test di REQ-REPLAN-002 (`ripianificazione.test.ts`, `demo.test.ts`, `../editing/modifiche.test.ts`) passano; in `ripianificazione-ondata2.test.ts` "CA-1 …": S1 coincide con P-S1, ogni S1–S8 è identica senza opzioni e con opzioni vuote, e uguale (modifiche, itinerario, esito, problemi, rischi, alternative) sui dati dell'ondata 2 | superato |
| **CA-2** S9 dà le modifiche di P-S1, cita l'infortunio, fattibile | "CA-2 S9 …" (più mobilità ridotta e riposo con `V-IRR`) | superato |
| **CA-3** S10 itinerario invariato, D3-E9 a rischio, alternative come S7 | "CA-3 S10 …" (più arrivo previsto lo stesso giorno e il giorno dopo) | superato |
| **CA-4** S11 D3-E1 auto 08:40–09:30, resto invariato | "CA-4 S11 …" (più sciopero con zona e di un altro mezzo) | superato |
| **CA-5** S12, S13, S14 come fissati nel contratto | "CA-5 …" con i risultati esatti; "R2-BAG, R2-DOC e R2-STA …" per spazio libero, volo di arrivo, documenti con volo di ritorno a rischio, stanchezza con tre attività, opzionali, irrinunciabili e orari fissi | superato |
| **CA-6** Con PR-1 su TRIP-DEMO-GARDA la pioggia sceglie un sostituto gastronomia o romantico | "CA-6 …": ogni sostituta ha lo stile, candidate in ordine di punteggio; su S1 PR-1 sceglie la cantina invece del MAG; PR-3 (bambini) esclude la cantina | superato |
| **CA-7** Ogni proposta dichiara il livello; se il minimo non è fattibile offre Rigenera | "CA-7 …": S1–S14 di livello `minimo`, S6, S8 e S13 (non fattibili) offrono "Rigenera questa giornata", le altre no | superato |
| **CA-8** Alternative di salute e documenti senza aprirle né chiamare la rete | "CA-8 …": indirizzi esatti con `fetch` sostituito da una funzione che fallisce (mai chiamata); i sorgenti di `src/replanning` non usano rete, processi o file | superato |
| **CA-9** `npm run demo` mostra anche S9–S14 | `demo.test.ts` "CA-9 …" e "mostra gli scenari S1–S14 in ordine" | superato |

Oltre ai criteri: le proposte S9–S14 sono deterministiche e non modificano il viaggio; i dati della §8.5 non entrano nei dati di riferimento esistenti.

## Collegamenti

- Requisito: [REQ-REPLAN-004](../docs/requirements/REQ-REPLAN-004-cr-ripianificazione-preferenze.md)
- Story: `ST-REPLAN-004`
- Contratto: `contract-ST-REPLAN-004-implementation`
- Profilo di autonomia: `AUT-PR-REPLAN-004`
- Branch: `feature/ST-REPLAN-004`
- Fonti: [modello-dominio-estensioni.md](../docs/requirements/modello-dominio-estensioni.md) §7.4, §7.6, §7.7; [dati-di-riferimento-estensioni.md](../docs/requirements/dati-di-riferimento-estensioni.md) §8.2–§8.5; [CR-001](../docs/CR-001-travelops-prodotto-demo.md) §9.13
