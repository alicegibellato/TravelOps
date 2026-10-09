# Prove di consegna: ST-FEAS-001B

## Cosa è stato chiesto

Il requisito REQ-FEAS-001 "Controllo di fattibilità": dato un viaggio, il catalogo e una sorgente dei dati di contesto, restituire l'elenco di tutto ciò che non sta in piedi, con le regole R-1…R-8. Ogni problema ha codice, gravità, `id` degli elementi coinvolti e messaggio in italiano. Tempi di percorrenza, previsioni meteo e chiusure straordinarie si leggono solo attraverso l'interfaccia `SorgenteDatiContesto` (`modello-dominio.md` §2.3). Il requisito chiede anche la sorgente che legge i file simulati dell'ondata 1. Story `ST-FEAS-001B`, consegnata come nuova pull request da `feature/ST-FEAS-001B` verso `main`.

## Perimetro ed esclusioni

- **Comprende:** il controllo di fattibilità con le regole R-1…R-8 e l'ordine dei problemi; l'esito "fattibile" (nessun problema bloccante); la sorgente dei dati di contesto su file e in memoria, con la scelta del mezzo più veloce e la validazione dei dati letti; i test di CA-1…CA-7.
- **Esclude:** la correzione dei problemi (REQ-REPLAN-002); i dati di contesto reali (ondata 3); il caricamento e la validazione strutturale dell'itinerario (REQ-ITIN-001, in parallelo); gli export da `packages/engine/src/index.ts`, che aggiunge chi porta la story nella pull request.
- **Deviazioni:** nessuna dal requisito. `src/model/index.ts` e `src/index.ts` non sono stati toccati, anche se sono tra i percorsi del requisito, perché altre story in parallelo li modificano.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Operazione "Controlla fattibilità": regole R-1…R-8, ordine dei problemi, esito, codici e gravità | `packages/engine/src/feasibility/controllo.ts` |
| Calcoli puri su orari, sovrapposizioni e giorno della settimana | `packages/engine/src/feasibility/orari.ts` |
| Punto d'ingresso del modulo (tiene `MODULO_FEASIBILITY`) | `packages/engine/src/feasibility/index.ts` |
| Operazione "Sorgente su file": lettura di `contesto.json` da una cartella | `packages/engine/src/context/sorgente-file.ts` |
| Sorgente in memoria: tempi nei due sensi, mezzo più veloce, previsioni e chiusure | `packages/engine/src/context/sorgente-memoria.ts` |
| Validazione dei dati di contesto con errori in italiano | `packages/engine/src/context/validazione.ts` |
| Punto d'ingresso del modulo context | `packages/engine/src/context/index.ts` |
| Supporto ai test: dati di riferimento tipizzati, varianti, sorgente finta | `packages/engine/test/feasibility/supporto.ts` |
| Test del controllo (CA-1…CA-5, CA-7, casi limite delle regole) | `packages/engine/test/feasibility/controllo.test.ts` |
| Test della sorgente (CA-6, previsioni, chiusure, errori) | `packages/engine/test/context/sorgente.test.ts` |
| Prove di consegna | `evidence/ST-FEAS-001B.md` |
| Export dei moduli dal pacchetto (`export * from "./feasibility/index.js"` e `"./context/index.js"`), aggiunto dal responsabile della consegna in fase di integrazione | `packages/engine/src/index.ts` |

API pubblica dei due moduli, esportata da `src/index.ts`:

- `feasibility`: `controllaFattibilita`, `eFattibile`, `CODICI_PROBLEMA_FATTIBILITA`, `GRAVITA_PROBLEMI_FATTIBILITA`, `ErroreDatiNonValidi`, i tipi `CodiceProblemaFattibilita` e `ProblemaFattibilita`.
- `context`: `creaSorgenteDaFile`, `creaSorgenteDaDati`, `validaDatiContesto`, `ErroreDatiContesto`, `FILE_DATI_CONTESTO`.

## Perché

- **Firma.** `controllaFattibilita(viaggio, catalogo, sorgente)` restituisce l'elenco dei problemi, come dice la tabella delle operazioni. L'esito è una funzione a parte, `eFattibile(problemi)`, così chi ripianifica può usarlo anche su elenchi filtrati. `ProblemaFattibilita` è un `Problema` del modello con il codice ristretto agli otto codici del requisito: i tipi nuovi stanno nel modulo, il modello resta invariato.
- **Solo l'interfaccia.** Il controllo importa solo i tipi del modello e non conosce `src/context`: riceve una `SorgenteDatiContesto` qualsiasi. Un test controlla che il codice del modulo non importi file system, rete o il modulo context e non usi orologio o casualità.
- **Precondizioni.** Il controllo presuppone un itinerario valido secondo REQ-ITIN-001. Un'attività o un luogo assenti dal catalogo, o un orario malformato, sollevano `ErroreDatiNonValidi` con un messaggio in italiano. *Scartato:* ignorarli, perché darebbe un falso "fattibile"; inventare codici di problema nuovi, perché non sono nel requisito e quei difetti appartengono a REQ-ITIN-001.
- **R-1.** La posizione del viaggiatore segue §2.1: un'attività inizia e finisce nel suo luogo, uno spostamento va da `da` ad `a`. Il giorno parte da `luogoPartenza`; l'ultimo elemento si confronta con l'alloggio solo se c'è (non nell'ultimo giorno). Gli elementi si scorrono in ordine di inizio, a parità nell'ordine dell'elenco. Un giorno senza elementi con alloggio diverso dal luogo di partenza dà `MANCA_SPOSTAMENTO` senza elementi coinvolti.
- **R-2 e R-3** usano il mezzo dello spostamento, non il più veloce. Se il tempo non è noto vale solo R-2: non c'è niente con cui confrontare la durata.
- **R-4** confronta tutte le coppie del giorno, non solo quelle consecutive. Gli intervalli che si toccano non si sovrappongono (§2.4); gli elementi coinvolti sono in ordine di inizio.
- **R-5.** L'attività deve stare dentro una sola fascia (§2.5): un pranzo dalle 14:00 alle 19:30 è fuori orario anche se tocca due fasce. Il giorno della settimana si ricava dalla data con un calcolo puro (`Date.UTC`), senza leggere l'orologio.
- **R-7 e R-8** danno un solo problema per attività, anche con più previsioni avverse o più chiusure sovrapposte, elencate nel messaggio in ordine di orario. *Scartato:* un problema per previsione, che ripeterebbe codice ed elementi e renderebbe ambiguo l'ordine.
- **Ordine (CA-7).** L'ordine è per data, poi inizio del primo elemento coinvolto, poi codice. "Poi di codice" è letto come ordine alfabetico del codice, non come ordine delle regole. Le parità rimaste si risolvono con l'ordine alfabetico degli `id` coinvolti (§3) e infine con il messaggio. I confronti sono sui caratteri, senza `localeCompare`, quindi non dipendono dalla lingua del sistema.
- **Sorgente su file.** Legge `contesto.json` (formato `DatiContesto`) una sola volta alla creazione, lo valida e poi risponde dalla memoria: le interrogazioni non toccano il disco. `creaSorgenteDaDati` costruisce la stessa sorgente da dati in memoria e servirà a REQ-REPLAN-002 per arricchire i dati con l'imprevisto.
- **Mezzo più veloce.** I tempi sono indicizzati per coppia non ordinata, così valgono nei due sensi. Il più veloce si trova scorrendo `ORDINE_MEZZI` e tenendo solo i tempi strettamente minori: a parità di minuti vince il primo mezzo dell'ordine, qualunque sia l'ordine delle righe nel file.
- **Dati incoerenti.** Due tempi diversi per la stessa coppia e lo stesso mezzo (anche in senso inverso) sono un errore. *Scartato:* prendere il minore, perché nasconderebbe un errore nei dati. La validazione riporta tutti i difetti in una volta, con la posizione nel file. Previsioni e chiusure tornano come copie in ordine di orario, quindi chi le riceve non può alterare la sorgente.
- **Test.** La sorgente finta dei test è scritta in `test/feasibility/supporto.ts` e non riusa `src/context`: dimostra che il controllo dipende solo dall'interfaccia. La variante con più mezzi di CA-6 è dichiarata nel test e scritta in una cartella temporanea, così il lettore di file lavora davvero; la cartella si cancella a fine test.

## Verifica

Eseguito su Windows 11 con Node 22.22.2 e npm 10.9.7: `npm ci` (0 vulnerabilità), `npm run build` (nessun errore) e `npm test` dalla radice della copia di lavoro.

| Criterio | Test che lo copre (file › nome) | Esito |
| --- | --- | --- |
| CA-1 Versione 1, `V-IRR`, `V-FISSO`, `V-VOLO` senza problemi, con meteo sereno e senza chiusure | `test/feasibility/controllo.test.ts` › "CA-1 versione 1 e varianti senza problemi…" › "%s: nessun problema con la sorgente su file dei dati di riferimento" (4 casi) e "%s: nessun problema con una sorgente finta con gli stessi dati" (4 casi); "i dati di contesto di riferimento non hanno previsioni né chiusure" | superato |
| CA-2 Per R-1…R-6 una variante con un solo difetto dà un solo problema bloccante con quel codice e quegli `id` | `test/feasibility/controllo.test.ts` › "CA-2 un solo difetto per regola R-1…R-6…" › "$regola $codice: $caso" (8 casi: tre per R-1, cioè tra elementi consecutivi, primo elemento e ultimo elemento; uno per ciascuna di R-2…R-6, con messaggio completo); "ogni regola R-1…R-6 ha almeno una variante" | superato |
| CA-3 Con la previsione di S1 un solo problema: avviso `METEO_AVVERSO` su `D2-E2` | `test/feasibility/controllo.test.ts` › "CA-3 scenario S1: pioggia sul trekking" › "restituisce un solo problema: avviso METEO_AVVERSO su D2-E2" | superato |
| CA-4 Con la chiusura di S4 un solo problema: `LUOGO_CHIUSO` bloccante su `D3-E6` | `test/feasibility/controllo.test.ts` › "CA-4 scenario S4: chiusura del MUSE" › "restituisce un solo problema: LUOGO_CHIUSO bloccante su D3-E6" | superato |
| CA-5 Il controllo funziona con una sorgente finta, senza leggere file né rete | `test/feasibility/controllo.test.ts` › "CA-5 il controllo usa solo la sorgente ricevuta" › "con una sorgente finta i tempi, il meteo e le chiusure vengono da lei", "con una sorgente finta vuota ogni spostamento ha un percorso sconosciuto", "il codice del controllo non usa file system, rete, orologio, casualità né il modulo context" | superato |
| CA-6 La sorgente su file legge i dati di riferimento; con più mezzi indica il più veloce e a parità segue l'ordine dei mezzi | `test/context/sorgente.test.ts` › "CA-6 sorgente su file: legge i dati di riferimento" (5 test, fra cui "restituisce i 15 tempi di percorrenza di riferimento, validi nei due sensi") e "CA-6 sorgente su file: coppie con più mezzi (variante di test)" › "%s ↔ %s: il più veloce, a parità di minuti nell'ordine dei mezzi" (5 casi), "il risultato non dipende dall'ordine delle righe nel file", "il tempo di ciascun mezzo della coppia resta disponibile" | superato |
| CA-7 A parità di input l'elenco è identico, nello stesso ordine | `test/feasibility/controllo.test.ts` › "CA-7 stesso input, stesso elenco nello stesso ordine" › "ordina per data, poi inizio del primo elemento coinvolto, poi codice" (variante con tutti gli otto codici), "ripetendo il controllo l'elenco è identico, messaggi compresi", "l'ordine non dipende dall'ordine dei giorni nell'elenco", "non modifica il viaggio, il catalogo né i dati ricevuti" | superato |

Ci sono anche test sui casi limite delle regole: un giorno vuoto (R-1), un luogo chiuso di lunedì e le attività a cavallo di due fasce (R-5), meteo non avverso o che tocca l'attività (R-7), chiusure parziali o che toccano l'attività (R-8), gravità ed esito, dati non validi. Altri test coprono la sorgente: previsioni e chiusure, copie restituite, BOM, file mancante, JSON non valido, contenuto non conforme, tempi discordanti.

**Risultato dei test: 9 file, 70 test, tutti superati.** Di questi, 58 test sono nuovi, in 2 file nuovi: 38 in `test/feasibility/controllo.test.ts` e 20 in `test/context/sorgente.test.ts`. I file di test nuovi passano anche il controllo dei tipi di `tsc` con le opzioni `strict` di `tsconfig.base.json`, eseguito con una configurazione temporanea fuori dal repository.

Il controllo è stato provato anche sugli esiti che REQ-REPLAN-002 si aspetta, con uno script locale che non fa parte della suite:

- S6 con gli orari slittati di REQ-REPLAN-001 CA-3: `FUORI_ORARIO` su `D3-E2` e su `D3-E4`.
- S8: `SOVRAPPOSIZIONE` tra `D3-E8` e `D3-E9`.
- P-S1 con la pioggia di S1: nessun problema.

## Collegamenti

- Requisito `REQ-FEAS-001`, fonte `docs/requirements/REQ-FEAS-001-fattibilita.md`
- Story `ST-FEAS-001B`, che sostituisce `ST-FEAS-001`: le consegne di quella story sono state annullate senza merge (PR #4 chiusa) perché il suo punto di partenza era incompatibile con il contesto aggiornato dopo il merge di `ST-REPLAN-001`. Codice e test sono gli stessi, sviluppati dall'agente della story.
- Contratto `contract-ST-FEAS-001B-implementation`
- Profilo di consegna `AUT-PR-FEAS-001B`, branch `feature/ST-FEAS-001B`
- Fonti condivise: `docs/requirements/modello-dominio.md` (§2.1, §2.3, §2.4, §2.5, §3), `docs/requirements/dati-di-riferimento.md`
