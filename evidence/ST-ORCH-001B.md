# Prove di consegna: ST-ORCH-001B

## Cosa è stato chiesto

La seconda parte di REQ-ORCH-001 revisione 2 "Agenti e orchestratore" (versione 1.1, agenti con OpenAI): gli strumenti del motore che gli agenti di ST-ORCH-001C useranno come unico modo per cambiare un viaggio. Story `ST-ORCH-001B` "Agenti: strumenti del motore", con questi criteri:

1. nuovo modulo `packages/agents/src/strumenti/` con gli strumenti esposti agli agenti, ognuno come `Strumento` del ciclo di ST-ORCH-001A, con schema JSON rigoroso degli argomenti e validazione degli argomenti senza dipendenze nuove: cerca destinazione, prepara destinazione, proponi destinazioni per "sorprendimi", aggiorna profilo, genera bozza, alternativa, modifiche della bozza, conferma (versione 1 con lo storico), proponi modifica, proponi ripianificazione, rigenera giornata, cerca nel catalogo, leggi viaggio e versioni;
2. lo stato su cui lavorano gli strumenti passato dall'esterno con un'interfaccia (`ArchivioViaggio`), così che la web app la colleghi al proprio database e i test usino un archivio in memoria; nessun altro modo di cambiare un viaggio (CA-2) e nessuna chiamata di rete diretta (la rete passa solo dalla sorgente di destinazioni iniettata);
3. risultati in JSON compatto, testi in linguaggio semplice, mai luoghi inventati: ciò che arriva al modello viene solo dal motore e dalle istantanee;
4. test: ogni strumento con argomenti validi e non validi, un ciclo completo con il client finto (aggiorna profilo → prepara destinazione → genera bozza → conferma) su un'istantanea precaricata, CA-2 e CA-5.

## Perimetro ed esclusioni

- **Comprende:**
  - 13 strumenti (`creaStrumentiMotore`): `cerca_destinazione`, `prepara_destinazione`, `proponi_destinazioni`, `aggiorna_profilo`, `genera_bozza`, `genera_alternativa`, `modifica_bozza`, `rigenera_giornata`, `conferma_viaggio`, `proponi_modifica`, `proponi_ripianificazione`, `cerca_catalogo`, `leggi_viaggio`;
  - l'interfaccia `ArchivioViaggio` (scheda del viaggio, profilo, istantanee, revisioni della bozza, storico, proposte) e l'archivio in memoria `creaArchivioInMemoria` con il registro delle scritture;
  - la validazione degli argomenti con lo stesso schema JSON mandato al modello (`validaArgomenti`, sottoinsieme di JSON Schema scritto a mano);
  - i riassunti compatti per il modello (programma giorno per giorno con `id` e nomi dal catalogo, bozza con il "perché", proposta con i cambiamenti);
  - documentazione in `packages/agents/README.md` e i test.
- **Esclude** (di altre storie):
  - orchestratore, agenti con istruzioni di sistema, conversazioni registrate del copione della demo: ST-ORCH-001C;
  - il collegamento di `ArchivioViaggio` al database della web app e la chat che usa gli strumenti: ST-CHAT-001C;
  - `packages/sources/candidates.json` per "sorprendimi": ST-CAT-002C;
  - le revisioni della bozza di REQ-PLAN-002 (ST-PLAN-002) e gli imprevisti della §7.4 (REQ-REPLAN-004).
- **Lasciato fuori di proposito:**
  - nessuno strumento accetta una proposta: la proposta diventa una versione solo quando il viaggiatore la accetta con il pulsante (ST-CHAT-001A, `accettaProposta`);
  - gli strumenti non leggono né scrivono la conversazione: la conserva il servizio della chat (ST-CHAT-001A); l'archivio riguarda solo il viaggio;
  - nessun file in `apps/`, `packages/engine`, `packages/sources`.
- **Limiti dichiarati:**
  - **"sorprendimi"**: `candidates.json` non esiste ancora; `proponi_destinazioni` ordina le istantanee che la sorgente ha già (le 3 precaricate) con il punteggio §7.7 del profilo: somma dei punteggi delle migliori attività adatte, quante ne servono per durata × ritmo, a parità più attività adatte, poi l'`id`. Con le 3 istantanee precaricate, costruite a turno sui 7 stili, i punteggi sono spesso pari e decide il numero di attività adatte;
  - **modifiche della bozza**: il motore non ha ancora le revisioni di REQ-PLAN-002; `modifica_bozza` usa le 5 operazioni di `proponiModifica` (REQ-EDIT-001) sulla bozza e applica la modifica come nuova revisione solo se resta fattibile; ritmo, stili e date si cambiano con `aggiorna_profilo` + `genera_bozza`;
  - **rigenera giornata**: il generatore lavora sull'intero viaggio; il giorno si rifà con `generaBozza` escludendo le attività di tutti i giorni (tranne gli irrinunciabili del giorno scelto) e prendendo solo quel giorno, se l'alloggio resta lo stesso e il risultato è valido e fattibile; un irrinunciabile del giorno può finire altrove nella bozza scartata e sparire; solo prima della conferma;
  - **imprevisti**: solo i 4 di `proponiRipianificazione` (meteo avverso, ritardo, chiusura di un luogo, cancellazione di uno spostamento);
  - le opzioni del generatore (orari di arrivo e partenza) restano quelle predefinite.
- **Deviazioni:**
  - `packages/agents/package.json` ha uno script `prebuild` che costruisce prima `@travelops/engine` e `@travelops/sources`: `npm run build --workspaces` segue l'ordine alfabetico dei workspace e `agents` viene prima di `engine`, quindi con una copia pulita (`npm ci` + `npm run build` della CI) la compilazione di `agents` non troverebbe i tipi del motore. Il motore e le sorgenti vengono così compilati due volte (pochi secondi in più); il `package.json` della radice non è nei percorsi scrivibili.
  - L'interfaccia di esempio del brief citava anche la conversazione: non è nell'archivio perché nessuno strumento la usa (vedi sopra).

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Gli strumenti del motore, schemi, profilo, imprevisti, giornata rifatta | `packages/agents/src/strumenti/strumenti.ts` |
| Interfaccia `ArchivioViaggio` e archivio in memoria | `packages/agents/src/strumenti/archivio.ts` |
| Validazione degli argomenti con lo schema JSON | `packages/agents/src/strumenti/schema.ts` |
| Riassunti compatti per il modello | `packages/agents/src/strumenti/riassunti.ts` |
| Punti d'ingresso | `packages/agents/src/strumenti/index.ts`, `packages/agents/src/index.ts` |
| Dipendenze di workspace `@travelops/engine` e `@travelops/sources`, `prebuild` | `packages/agents/package.json`, `package-lock.json` |
| Documentazione: strumenti, archivio, corrispondenza con il database della web app, limiti | `packages/agents/README.md` |
| Test e supporto | `packages/agents/test/strumenti/strumenti.test.ts`, `packages/agents/test/strumenti/ciclo-motore.test.ts`, `packages/agents/test/strumenti/supporto.ts` |
| Prove di consegna | `evidence/ST-ORCH-001B.md` |

## Perché

- **Un solo schema per modello e validazione.** Lo schema JSON di ogni strumento va a OpenAI in modalità rigorosa (`strict`: tutte le proprietà in `required`, `additionalProperties: false`, le facoltative come `["tipo", "null"]`) e lo stesso oggetto controlla gli argomenti ricevuti (`validaArgomenti`): niente regole duplicate e nessuna dipendenza in più. Il ciclo di ST-ORCH-001A lascia la validazione agli strumenti; un errore è un `ErroreStrumento` in italiano che torna al modello, così si corregge. Con un modello non rigoroso una proprietà facoltativa assente vale `null`.
- **Archivio di un solo viaggio, sincrono o asincrono.** Gli strumenti lavorano sempre sul viaggio della conversazione: l'identificativo e la creazione del viaggio restano alla web app. I metodi possono restituire il valore subito (better-sqlite3) o una promessa; le forme salvate sono quelle del motore (`BozzaProfilo`, `Viaggio`, `Storico`, `Proposta`), che la web app già salva (`salvaProfilo`, `aggiungiRevisioneBozza`, `salvaStoricoDelViaggio`, proposte).
- **Bozza e viaggio confermato separati.** Prima della conferma gli strumenti creano revisioni della bozza (B1, B2, …); `conferma_viaggio` crea lo storico con la versione 1 (`creaStorico`); dopo, ogni cambiamento è una proposta del motore salvata (`proponi_modifica`, `proponi_ripianificazione`) che non tocca lo storico. Gli strumenti della bozza rifiutano un viaggio confermato e viceversa.
- **Coerenza tra profilo, istantanea e bozza.** `prepara_destinazione` mette nel profilo la destinazione con `riferimento` = id dell'istantanea; `genera_bozza` rifiuta un profilo che punta a un'altra destinazione; la bozza ha `id` `BOZZA-<istantanea>` e gli strumenti che la usano controllano che sia della destinazione corrente.
- **Solo dati del motore e dell'istantanea.** I riassunti contengono nomi presi dal catalogo dell'istantanea (attività, luoghi, zone, area) e testi del motore (perché, spiegazioni, avvisi, problemi); gli `id` restano accanto ai nomi perché il modello li deve ripassare agli strumenti.
- **Nessuna rete.** Il modulo non importa moduli di rete né chiama `fetch`: ricerca e costruzione delle destinazioni passano dalla `SorgenteDestinazioni` ricevuta; i dati di contesto predefiniti sono i tempi dell'istantanea (`contestoDaIstantanea`), sostituibili con `contesto` per meteo e chiusure.

## Verifica

Comandi eseguiti dalla radice della copia di lavoro (`C:\Users\a.gibellato\TravelOps-wt\ST-ORCH-001B`, base locale 0c074b6 = main 958408f + ST-PLAN-001, `CI=true`): `npm ci`, eliminazione di `dist` di `agents`, `engine` e `sources`, `npm run build`, `npm test`.

| Comando | Esito |
| --- | --- |
| `npm run build` (copia pulita, senza `dist`) | verde: `prebuild` di `@travelops/agents` (motore e sorgenti), `@travelops/agents`, motore, `@travelops/sources`, web app (Next.js) |
| `npm test` | verde: `@travelops/agents` 8 file / 86 test (44 nuovi), motore 33 file / 642 test, `@travelops/sources` 11 file / 87 test, web app 47 file / 343 test |

| Criterio | Test | Esito |
| --- | --- | --- |
| 1. 13 strumenti con schema JSON rigoroso | `strumenti.test.ts` › definizioni (nomi, `rigoroso`, regole `strict` su ogni oggetto annidato, `null` negli `enum` facoltativi) | passato |
| 1. Validazione degli argomenti con lo schema, senza dipendenze | `strumenti.test.ts` › validazione con lo schema (tipi, mancanti, in più, limiti, formato, valori ammessi, `null` per le facoltative assenti) | passato |
| 1. Ogni strumento con argomenti validi e non validi | `strumenti.test.ts`: `cerca_destinazione` (3), `prepara_destinazione` (4, con minimi non rispettati), `proponi_destinazioni` (3), `aggiorna_profilo` (3), `genera_bozza` (2), `genera_alternativa` (2), `modifica_bozza` (2), `rigenera_giornata` (2), `conferma_viaggio` (2), `proponi_modifica` (2), `proponi_ripianificazione` (3), `cerca_catalogo` (3), `leggi_viaggio` (2) | passato |
| 1. "Sorprendimi" dalle istantanee precaricate ordinate col punteggio del profilo | `strumenti.test.ts` › proponi_destinazioni (ordine per punteggio, esempi dal catalogo, ordine diverso con profili diversi, nessuna scrittura) | passato |
| 1. Conferma: versione 1 con lo storico | `strumenti.test.ts` › conferma_viaggio; `ciclo-motore.test.ts` › ciclo completo | passato |
| 2. Stato passato da fuori (`ArchivioViaggio`), archivio in memoria nei test | tutti i test usano `creaArchivioInMemoria`; il ciclo completo controlla l'elenco esatto delle scritture | passato |
| 4. Ciclo completo con il client finto: aggiorna profilo → prepara destinazione → genera bozza → conferma sull'istantanea precaricata del Garda | `ciclo-motore.test.ts` › ciclo completo (`creaClienteFinto` + `eseguiCiclo`, 5 turni, risultati senza errori, storico v1 = bozza B1, `verificaCompletata`); errore di uno strumento che torna al modello | passato |
| CA-2 nessuna modifica fuori dagli strumenti | `ciclo-motore.test.ts` › CA-2: risposta di solo testo che dice di aver cambiato il viaggio → nessuna scrittura; strumento inesistente → nessuna scrittura; strumenti di lettura → nessuna scrittura; una proposta non diventa versione | passato |
| CA-2 / 3. mai luoghi inventati: i nomi nei risultati vengono dall'istantanea | `ciclo-motore.test.ts` › CA-2 ogni luogo e attività nei risultati viene dall'istantanea (9 strumenti, più di 50 nomi controllati); `strumenti.test.ts` (esempi, tolte e nuove nel catalogo) | passato |
| CA-5 nessuna rete nei test | `ciclo-motore.test.ts`: `fetch`, socket, `http`/`https` e DNS bloccati per tutto il file, nessun tentativo registrato; il codice degli strumenti non importa moduli di rete e non chiama `fetch` | passato |
| Nessuna regressione (motore, sorgenti, web app, test di ST-ORCH-001A) | suite esistenti invariate | passato |

## Collegamenti

- Requisito: [REQ-ORCH-001](../docs/requirements/REQ-ORCH-001-agenti-orchestratore.md), revisione `REQ-ORCH-001-R2`
- Story: `ST-ORCH-001B`
- Contratto: `contract-ST-ORCH-001B-implementation`
- Profilo di esecuzione: `AUT-PR-ORCH-001B`
- Branch: `feature/ST-ORCH-001B`
