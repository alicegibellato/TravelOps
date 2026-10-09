# Prove di consegna: ST-EDIT-001

## Cosa è stato chiesto

Il requisito REQ-EDIT-001 "Modifiche richieste dal viaggiatore": trasformare una modifica chiesta dal viaggiatore (aggiungi, rimuovi o sposta un'attività, cambia priorità, imposta orario fisso) in una proposta con le stesse garanzie degli imprevisti: controllo di fattibilità (REQ-FEAS-001), spiegazione, accettazione con lo storico (REQ-ITIN-002). La rimozione riusa la regola R-SOS-5 di REQ-REPLAN-002. Ogni operazione restituisce una proposta oppure un errore esplicito (R-ED-1). La demo a terminale (`npm run demo`) mostra anche gli scenari M1–M6. Story `ST-EDIT-001`, una pull request da `feature/ST-EDIT-001` verso `main`.

## Perimetro ed esclusioni

- **Comprende:** l'operazione `proponiModifica` con le regole R-ED-1…R-ED-7; gli errori `GIORNO_INESISTENTE`, `ATTIVITA_INESISTENTE`, `ELEMENTO_INESISTENTE`, `NON_ATTIVITA`, `ORARIO_FISSO`, `ORARIO_NON_VALIDO`, `PERCORSO_SCONOSCIUTO`, `FUORI_GIORNATA`; la spiegazione in italiano; l'accettazione e il rifiuto con le funzioni dello storico già esistenti (`applicaProposta`, `rifiutaProposta`), con causa "Modifica richiesta: `<descrizione>`"; l'estrazione della regola di rimozione R-SOS-5 dal modulo replanning per riusarla senza cambiarne i risultati; la demo degli scenari M1–M6 con la versione 2 dopo l'accettazione di M1 e gli errori di CA-7; i test di CA-1…CA-11.
- **Esclude:** interpretazione del linguaggio naturale (ondata 2); spostamento automatico di altri elementi per far posto alla modifica; prenotazioni e pagamenti; la web app (`apps/`, in sviluppo in parallelo con WEB-002); i dati di riferimento (`packages/engine/data/`), letti e mai modificati.
- **Deviazioni:** nessuna dal requisito. Non sono stati toccati `src/model/index.ts` (tutti i tipi necessari esistevano: `ModificaRichiesta`, `Proposta`, `OrigineProposta`; l'origine con la descrizione è un tipo del modulo editing compatibile con `OrigineProposta`), `package.json`, `package-lock.json`, i test di altri moduli. In `src/index.ts` è cambiata solo la riga del modulo editing (`export { MODULO_EDITING }` → `export *`). Nessuna dipendenza nuova.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Operazione "Proponi modifica": applica la modifica a una copia, ricava le modifiche, controlla la fattibilità, elementi a rischio, alternative, spiegazione, origine con la descrizione per la causa | `packages/engine/src/editing/proposta.ts` |
| Le cinque operazioni (R-ED-2…R-ED-5) con gli errori di R-ED-1, collocazione dell'attività con partenza, destinazione, andata e ritorno, id nuovi | `packages/engine/src/editing/operazioni.ts` |
| Codici e forma degli errori (R-ED-1) | `packages/engine/src/editing/errori.ts` |
| Spiegazione in linguaggio semplice (R-ED-7, CA-9) | `packages/engine/src/editing/spiegazione.ts` |
| Export del modulo: `proponiModifica`, `EsitoModifica`, `PropostaModifica`, `OrigineModifica`, `CODICI_ERRORE_MODIFICA`, `ErroreModifica`, `CodiceErroreModifica`, `PRIORITA_AGGIUNTA` (oltre a `MODULO_EDITING`) | `packages/engine/src/editing/index.ts` |
| Export del modulo editing dal pacchetto (`export *`) | `packages/engine/src/index.ts` |
| Regola di rimozione R-SOS-5 (e la parte di R-SOS-1 che trova andata, ritorno, ingresso e uscita) estratta in un modulo condiviso, identica a prima | `packages/engine/src/replanning/rimozione.ts` (nuovo) |
| La sostituzione usa la regola estratta invece della copia locale | `packages/engine/src/replanning/sostituzione.ts` |
| Demo degli scenari M1–M6, accettazione di M1, errori di CA-7 (funzione `testoModifiche`) | `packages/engine/src/demo/modifiche.ts` (nuovo) |
| Parti comuni della demo (cartella dei dati, lettura, riga compatta di un elemento, accettazione) spostate da `scenari.ts` | `packages/engine/src/demo/comune.ts` (nuovo) |
| `testoDemo` aggiunge le modifiche richieste dopo gli scenari S1–S8 | `packages/engine/src/demo/scenari.ts` |
| Commento aggiornato | `packages/engine/src/demo/main.ts` |
| Test di CA-1…CA-10 e delle altre regole | `packages/engine/test/editing/modifiche.test.ts` (nuovo) |
| Test di CA-11 sul testo della demo | `packages/engine/test/editing/demo.test.ts` (nuovo) |
| Prove di consegna | `evidence/ST-EDIT-001.md` |

## Perché

- **Firma ed esito.** `proponiModifica(viaggio, versioneBase, catalogo, sorgente, modifica)` segue gli input comuni della tabella delle operazioni; la modifica è il tipo `ModificaRichiesta` già nel modello, quindi una sola funzione copre le cinque operazioni. Restituisce `{ ok: true, proposta }` oppure `{ ok: false, errore }` con codice e messaggio `[CODICE] motivo`: con un errore non esiste nessuna proposta (R-ED-1). *Scartato:* sollevare eccezioni, che avrebbe reso gli errori attesi indistinguibili dai guasti.
- **Riuso del motore, niente logica duplicata.** Lo stato di lavoro (`creaLavoro`, `impostaElementi`, `elementiDel`), l'indice del catalogo, gli orari e il mezzo più veloce vengono dal modulo replanning; le modifiche (aggiunti, rimossi, modificati con prima e dopo) da `confrontaItinerari`; la fattibilità da `controllaFattibilita` ed `eFattibile`; la descrizione per la causa da `descriviModifica` dello storico (che già seguiva la tabella di REQ-EDIT-001); il controllo del formato `HH:mm` da `feasibility/orari.ts`; le alternative da `costruisciAlternative`; accettazione e rifiuto restano `applicaProposta` e `rifiutaProposta`.
- **Regola di rimozione condivisa (R-ED-3, CA-10).** Il corpo di R-SOS-5 era una funzione privata di `sostituzione.ts` legata al motivo della sostituzione. È stato spostato, senza cambiare una riga di logica, in `replanning/rimozione.ts` (`contornoAttivita` e `rimuoviAttivitaConSpostamenti`); il perché della rimozione dell'attività resta a chi chiama ("non c'è un'attività adatta per sostituirla" per gli imprevisti, "rimossa su richiesta del viaggiatore" per le modifiche). I 59 test di replanning passano invariati. *Scartato:* copiare la regola nel modulo editing.
- **Sposta = rimuovi + aggiungi (R-ED-4).** Prima si applica la rimozione nel giorno di origine, poi la collocazione nel giorno di arrivo sul giorno già ridotto (in M3, stesso giorno, la collocazione vede il giorno senza `D1-E1`, `D1-E2`, `D1-E3`). L'attività tiene `id`, priorità ed eventuale prenotazione; solo gli spostamenti creati prendono id nuovi.
- **Id nuovi (R-ED-7, §2.1).** Si assegnano dal prossimo numero del viaggio in ordine di inizio: andata, attività (se nuova), ritorno. La proposta porta il prossimo numero aggiornato (M1: 4; M3: 3).
- **Fattibilità (R-ED-6).** L'itinerario proposto passa da `controllaFattibilita` con la sorgente ricevuta; la proposta è fattibile se non ci sono problemi bloccanti (definizione di REQ-FEAS-001). Nessun altro elemento si sposta: in M4 la proposta resta non fattibile e la spiegazione chiede al viaggiatore come procedere.
- **Elementi a rischio** (`modello-dominio.md` §2.6): (b) se la proposta non è fattibile, gli elementi dei problemi bloccanti; (c) l'elemento successivo quando la regola di rimozione non trova un percorso (R-SOS-5). Sono ordinati per data, inizio e `id`. Il caso (a) riguarda solo gli imprevisti.
- **Spiegazione (R-ED-7, CA-9).** Nasce da dati strutturati raccolti durante l'operazione: la richiesta (con la stessa descrizione della causa) e l'elemento interessato con i nomi; per un'aggiunta da dove parte e dove va il viaggiatore e perché; ogni modifica in ordine di orario con "prima → dopo" (data, orario, tratta, e priorità o orario fisso quando cambiano) e il perché; esito e problemi; elementi a rischio con il perché; alternative; la domanda al viaggiatore se la proposta non è fattibile; il promemoria che la proposta diventa versione solo se accettata.
- **Determinismo.** Nessun orologio, nessuna casualità, nessuna rete; ordinamenti con confronti sui caratteri; il viaggio ricevuto viene copiato e mai modificato, anche quando la modifica dà errore.
- **Demo testabile (CA-11).** Il testo delle modifiche è prodotto da `testoModifiche()` in `src/demo/modifiche.ts` e `testoDemo()` lo aggiunge dopo S1–S8: il test copre la stessa funzione che usa `npm run demo`. Le sezioni M usano l'intestazione `--- M1 — … ---` e non `=== `, perché il test della demo di REQ-REPLAN-002 divide il testo su `=== ` e si aspetta esattamente S1…S8.

### Interpretazioni del requisito

- **"Ultimo elemento che termina entro l'inizio richiesto"** (R-ED-2): tra gli elementi con fine ≤ inizio si prende quello che finisce più tardi (a parità, quello che viene dopo nell'ordine del giorno); il luogo di partenza è dove finisce (arrivo di uno spostamento o luogo dell'attività).
- **Rimozione senza percorso** (R-ED-3 contro `PERCORSO_SCONOSCIUTO` di R-ED-1): R-ED-3 rimanda a R-SOS-5, che senza percorso non crea lo spostamento unico e mette a rischio l'elemento successivo; si è seguita R-SOS-5, quindi una rimozione non dà mai `PERCORSO_SCONOSCIUTO` (la proposta di solito risulta non fattibile per `MANCA_SPOSTAMENTO`). `PERCORSO_SCONOSCIUTO` vale per gli spostamenti di andata e ritorno di un'aggiunta o di uno spostamento.
- **Spostamenti a orario fisso** accanto all'attività rimossa non valgono come andata o ritorno (non si spostano né si rimuovono), come già in REQ-REPLAN-002.
- **Ordine dei controlli.** Aggiungi: giorno, attività, formato dell'orario, percorsi, limiti della giornata. Rimuovi e sposta: elemento, tipo, orario fisso, poi (sposta) giorno, attività del catalogo, orario, percorsi, limiti. Un errore ferma tutto e non consuma id.
- **`24:00` come inizio** ha formato valido ma l'attività finirebbe oltre la mezzanotte: `FUORI_GIORNATA`. Finire esattamente alle `24:00` è ammesso.
- **Durata dell'attività spostata.** Per R-ED-4 lo spostamento è una nuova collocazione (R-ED-2), quindi l'attività dura la sua durata tipica.
- **Avvisi.** La fattibilità segue REQ-FEAS-001 (nessun problema bloccante): un avviso `METEO_AVVERSO` su un'attività aggiunta compare tra i problemi e nella spiegazione ma non rende la proposta non fattibile, perché la modifica la chiede il viaggiatore (la regola più severa di R-3 di REQ-REPLAN-002 riguarda le proposte di TravelOps davanti a un imprevisto).
- **Impatto e alternative.** L'impatto è vuoto (riguarda gli imprevisti). Le alternative con link si costruiscono, come in R-ALT-1/R-ALT-2, per gli elementi a rischio con prenotazione o in volo o treno; negli scenari M1–M6 non ce ne sono.
- **Descrizione nella causa.** L'origine della proposta porta `descrizione` (campo già previsto da `OrigineConDescrizione` dello storico), calcolata con `descriviModifica`: la causa della versione è "Modifica richiesta: `<descrizione>`".
- **Modifica che non cambia nulla** (per esempio priorità già uguale): la proposta è valida, senza modifiche; accettarla dà l'avviso `NESSUNA_MODIFICA` dello storico (REQ-ITIN-002 R-7).

### Verifica dei risultati attesi con i dati

Tutti i risultati attesi tornano con i dati di riferimento: M1 aggiunge `N1` auto `HOTEL` → `CANTINA` 15:45–16:00, `N2` `A-CANTINA` 16:00–17:30 opzionale, `N3` auto `CANTINA` → `HOTEL` 17:30–17:45; M2 trasforma `D2-E3` in piedi `PONALE` → `HOTEL` 13:00–13:20 e rimuove `D2-E4`, `D2-E5`; M3 rimuove `D1-E1`, `D1-E3`, porta `D1-E2` a 17:00–19:00 e aggiunge `N1` 16:50–17:00 e `N2` 19:00–19:10; M4 aggiunge `N1` 13:25–13:30, `N2` 13:30–15:30, `N3` 15:30–15:35 ed è non fattibile con `SOVRAPPOSIZIONE` tra `D2-E4` e `N2` (oltre ad altre sovrapposizioni e spostamenti mancanti); M5 e M6 coincidono con `V-IRR` e `V-FISSO`.

## Verifica

Eseguito su Windows 11 con Node 22.22.2 e npm 10.9.7, dalla radice della copia di lavoro: `npm ci` (0 vulnerabilità), `npm run build` (nessun errore, motore e web app), `npm test` (motore: 21 file, 328 test superati, di cui 44 nei due file nuovi; web app: 7 file, 46 test superati), `npm run demo` (uscita 0: stampa gli scenari S1–S8 come prima, poi M1–M6, la versione 2 creata dall'accettazione di M1 da parte di "Alice" il 2026-06-13 alle 07:30 con causa "Modifica richiesta: aggiungi A-CANTINA il 2026-06-13 alle 16:00", e i sette errori di CA-7). Prima della modifica il motore aveva 19 file e 284 test.

| Criterio | Test che lo copre (file › nome) | Esito |
| --- | --- | --- |
| CA-1 M1 aggiungi | `test/editing/modifiche.test.ts` › "CA-1 M1 aggiungi: partenza e destinazione HOTEL, aggiunti N1, N2, N3; nessun altro elemento cambia; fattibile" | superato |
| CA-2 M2 rimuovi | › "CA-2 M2 rimuovi: D2-E3 diventa piedi PONALE → HOTEL 13:00–13:20; D2-E4 e D2-E5 rimossi; fattibile" | superato |
| CA-3 M3 sposta | › "CA-3 M3 sposta: D1-E1 e D1-E3 rimossi, D1-E2 17:00–19:00 con id e priorità, aggiunti N1 e N2; fattibile" | superato |
| CA-4 M4 sovrapposizione | › "CA-4 M4 sovrapposizione: partenza e destinazione RIST-RIVA, aggiunti N1, N2, N3; non fattibile con SOVRAPPOSIZIONE D2-E4/N2" | superato |
| CA-5 M5 priorità | › "CA-5 M5 cambia priorità: cambia solo la priorità di D3-E2, il risultato coincide con V-IRR; fattibile" | superato |
| CA-6 M6 orario fisso | › "CA-6 M6 orario fisso: cambia solo D2-E4, il risultato coincide con V-FISSO; fattibile" | superato |
| CA-7 errori senza proposta | › "CA-7 rimuovi D2-E3 → NON_ATTIVITA", "CA-7 aggiungi A-MAG il 2026-06-13 alle 11:00 (il viaggiatore è al PONALE) → PERCORSO_SCONOSCIUTO", "CA-7 aggiungi A-MAG il 2026-06-15 → GIORNO_INESISTENTE", "CA-7 rimuovi D2-E4 in V-FISSO → ORARIO_FISSO", "CA-7 aggiungi A-INESISTENTE → ATTIVITA_INESISTENTE", "CA-7 rimuovi X-99 → ELEMENTO_INESISTENTE", "CA-7 aggiungi A-LUNGOLAGO il 2026-06-12 alle 23:00 → FUORI_GIORNATA" (7 casi; ognuno verifica anche che non ci sia proposta e che il viaggio non cambi) | superato |
| CA-8 causa della versione dopo M1 | › "CA-8 accettando la proposta di M1 la versione ha causa \"Modifica richiesta: aggiungi A-CANTINA il 2026-06-13 alle 16:00\"" | superato |
| CA-9 spiegazione | › "CA-9 M1…M6: la spiegazione nomina la richiesta, ogni elemento cambiato con l'orario prima e dopo, e i problemi" (6 casi), "CA-9 per priorità e orario fisso la spiegazione dice anche il valore prima e dopo" | superato |
| CA-10 test di REQ-REPLAN-002 invariati | Tutti i 59 test di `test/replanning/*.test.ts` (non modificati) superati dopo l'estrazione della regola; in più `test/editing/modifiche.test.ts` › "CA-10 la regola di rimozione condivisa dà a REQ-REPLAN-002 gli stessi risultati (S4: unico spostamento RIST-TRENTO → HOTEL)" | superato |
| CA-11 demo con M1–M6 | `test/editing/demo.test.ts` › "npm run demo (testoDemo) mostra anche gli scenari M1–M6, dopo S1–S8", "per ogni scenario mostra richiesta, modifiche proposte, spiegazione, esito ed elementi a rischio", "mostra le modifiche e gli esiti attesi", "per M1 mostra la versione 2 creata dopo l'accettazione, con la causa della modifica richiesta", "mostra gli errori di CA-7, senza proposta", "è deterministica"; prova manuale di `npm run demo` (uscita 0, 8 scenari S e 6 scenari M stampati) | superato |

Altri test in `test/editing/modifiche.test.ts`: `ORARIO_NON_VALIDO` per aggiungi e sposta; `NON_ATTIVITA` per sposta e cambia priorità; `ORARIO_FISSO` per sposta ed `ELEMENTO_INESISTENTE` per ogni operazione; errori della nuova collocazione di uno spostamento; `FUORI_GIORNATA` per andata e ritorno, con il limite delle 24:00 ammesso; aggiunta senza destinazione (ultimo giorno) e senza spostamenti; id nuovi da un prossimo numero diverso da 1; rimozione con spostamento unico e senza percorso (successivo a rischio); rimozione di un'irrinunciabile; spostamento in un altro giorno; orario fisso su uno spostamento e tolto; priorità su un elemento a orario fisso; cause delle versioni per M2…M6; determinismo e viaggio ricevuto invariato.

## Collegamenti

- Requisito `REQ-EDIT-001`, fonte `docs/requirements/REQ-EDIT-001-modifiche-richieste.md`
- Story `ST-EDIT-001`
- Contratto `contract-ST-EDIT-001-implementation`
- Consegna `AUT-PR-EDIT-001` (branch `feature/ST-EDIT-001` verso `main`)
- Dipendenze: `REQ-REPLAN-002` (regola di rimozione R-SOS-5), `REQ-FEAS-001` (fattibilità), `REQ-ITIN-002` (versioni e storico)
- Fonti condivise: `docs/requirements/modello-dominio.md`, `docs/requirements/dati-di-riferimento.md`
