# Prove di consegna: ST-REPLAN-001

## Cosa è stato chiesto

Il requisito REQ-REPLAN-001 "Impatto degli imprevisti": dato un viaggio, il catalogo e un imprevisto (`METEO_AVVERSO`, `RITARDO`, `CHIUSURA_LUOGO`, `CANCELLAZIONE_SPOSTAMENTO`), sapere quali elementi colpisce e perché, e solo quelli. Per ogni elemento colpito servono il motivo (tipo di imprevisto e messaggio in italiano) e, per i ritardi, l'orario a cui slitterebbe secondo la regola R-RIT-1. Ogni criterio di accettazione CA-1…CA-9 va coperto da almeno un test automatico sugli scenari di riferimento. Story `ST-REPLAN-001`, consegnata come nuova pull request da `feature/ST-REPLAN-001` verso `main`.

## Perimetro ed esclusioni

- **Comprende:** l'operazione "Calcola impatto" (`calcolaImpatto`) nel modulo `replanning` del motore, con le regole R-1 (definizioni di `modello-dominio.md` §2.4), R-RIT-1 (slittamento dei ritardi), R-2 (impatto vuoto) e R-3 (motivo e ordine); i test di CA-1…CA-9 e delle regole.
- **Esclude:** la proposta di modifiche e la ripianificazione (REQ-REPLAN-002); il rilevamento automatico degli imprevisti (ondata 3); il controllo di fattibilità e i dati di contesto, che il calcolo per requisito non usa; il caricamento e la validazione dell'itinerario (REQ-ITIN-001).
- **Non toccati, per accordo con le story in parallelo:** `packages/engine/src/model/index.ts` e `packages/engine/src/index.ts`. L'export del modulo dal pacchetto lo aggiunge il responsabile della consegna.
- **Deviazioni:** nessuna dal requisito. Due interpretazioni di casi che il requisito non tratta sono descritte in "Perché".

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Calcolo dell'impatto (R-1, R-RIT-1, R-2, R-3) e tipi `ElementoColpitoDettagliato`, `ImpattoDettagliato` | `packages/engine/src/replanning/impatto.ts` (nuovo) |
| Export del modulo (`calcolaImpatto` e i due tipi; resta `MODULO_REPLANNING`) | `packages/engine/src/replanning/index.ts` |
| Export del modulo dal pacchetto (`export * from "./replanning/index.js"`), aggiunto dal responsabile della consegna in fase di integrazione | `packages/engine/src/index.ts` |
| Test di CA-1…CA-9 e delle regole sui dati di riferimento | `packages/engine/test/replanning/impatto.test.ts` (nuovo) |
| Prove di consegna | `evidence/ST-REPLAN-001.md` (nuovo) |

## Perché

- **Un solo punto d'ingresso**, `calcolaImpatto(viaggio, catalogo, imprevisto)`, come l'operazione del requisito. Non riceve la sorgente dei dati di contesto né usa il controllo di fattibilità: il requisito lo esclude, e così il modulo non dipende da REQ-FEAS-001 né da REQ-ITIN-001, scritti in parallelo.
- **Tipo dell'imprevisto nel risultato.** R-3 chiede che il motivo indichi il tipo di imprevisto; `ElementoColpito` del modello ha solo `motivo` (testo). Senza toccare il modello, il modulo restituisce `ImpattoDettagliato`, che estende `Impatto` con, per ogni elemento, `tipoImprevisto` (il codice, per esempio `METEO_AVVERSO`) e `data` del giorno. Resta assegnabile a `Impatto`. Il motivo è anche leggibile da solo: inizia con il tipo in italiano ("Meteo avverso", "Ritardo di…", "Chiusura del luogo", "Cancellazione dello spostamento") e cita luogo, zona, intervallo e orari.
- **R-RIT-1 come simulazione su minuti**: gli orari diventano minuti dalla mezzanotte; l'elemento in corso (inizio ≤ momento < fine) finisce `minuti` più tardi; altrimenti il viaggiatore è disponibile da momento + minuti; ogni elemento successivo inizia al più tardi tra l'inizio previsto e la fine del precedente slittato, con la stessa durata; ci si ferma al primo elemento che resta in orario. Gli elementi a orario fisso si simulano come gli altri e il motivo dice che non verranno spostati (lo farà REQ-REPLAN-002). Si lavora solo sul giorno dell'imprevisto, quindi gli altri giorni non sono mai colpiti.
- **Interpretazione 1, ritardo oltre la mezzanotte.** Il requisito non dice come esprimere uno slittamento oltre le 24:00. L'orario continua a crescere (per esempio `25:00`) e il motivo aggiunge "Finirebbe oltre la mezzanotte". Alternativa scartata: fermare l'orario a `24:00`, che nasconderebbe di quanto si sfora.
- **Interpretazione 2, casi che non toccano nulla (R-2).** Restituiscono impatto vuoto: un ritardo di zero minuti; una cancellazione con un id sconosciuto o che indica un'attività invece di uno spostamento; un'attività il cui riferimento al catalogo manca (non si può sapere zona né luogo). Alternativa scartata: lanciare un errore, che il requisito non prevede (gli errori di validazione sono in REQ-ITIN-001).
- **Determinismo (§3).** Nessun orologio né casualità. Gli elementi colpiti sono ordinati per data, inizio previsto e, a parità, `id`; i confronti tra testi sono per punti di codice, non con `localeCompare`, che dipende dalle impostazioni locali. Il viaggio in ingresso non viene modificato (si ordina una copia).
- **Funzioni di supporto private.** Conversione degli orari e confronti restano interni al modulo e non vengono esportati, per non creare conflitti di nomi quando il pacchetto riesporterà anche i moduli delle story in parallelo.
- **Test sui dati di riferimento**: i test leggono `catalogo.json`, le versioni e `scenari-imprevisti.json` come oggetti tipizzati del modello, senza passare dal caricamento di REQ-ITIN-001. Per CA-1, CA-4, CA-5 e CA-7 confrontano l'elemento colpito per intero, testo del motivo compreso.

## Verifica

Eseguito su Windows 11, Node 22.22.2, npm 10.9.7: `npm ci`, poi `npm run build` e `npm test` dalla radice della copia di lavoro. Il file di test è stato anche verificato con `tsc` nelle stesse impostazioni `strict` del pacchetto, senza errori.

Tutti i test di questa story sono in `packages/engine/test/replanning/impatto.test.ts`, nel blocco "calcolaImpatto: criteri di accettazione di REQ-REPLAN-001".

| Criterio | Test che lo copre | Esito |
| --- | --- | --- |
| CA-1 S1 pioggia: colpito solo `D2-E2`, motivo meteo avverso | "CA-1 S1 pioggia: colpito solo D2-E2, con motivo meteo avverso" | superato |
| CA-2 S2 ritardo breve: `D3-E1`…`D3-E4` con gli orari attesi, `D3-E5`…`D3-E7` no | "CA-2 S2 ritardo breve: colpiti D3-E1…D3-E4 con gli orari slittati, D3-E5…D3-E7 no" | superato |
| CA-3 S3 foratura: `D3-E1`…`D3-E7` con gli orari attesi, nessun elemento dei giorni 1 e 2 | "CA-3 S3 foratura: colpiti D3-E1…D3-E7 con gli orari slittati, nessun elemento dei giorni 1 e 2" | superato |
| CA-4 S4 chiusura del MUSE: colpito solo `D3-E6` | "CA-4 S4 chiusura del MUSE: colpito solo D3-E6" | superato |
| CA-5 S5 cancellazione: colpito solo `D3-E1` | "CA-5 S5 cancellazione: colpito solo D3-E1" | superato |
| CA-6 S6: impatto identico a S3 | "CA-6 S6: impatto identico a S3, la priorità irrinunciabile non cambia l'impatto" | superato |
| CA-7 S7 volo cancellato: colpito solo `D3-E9` | "CA-7 S7 volo cancellato: colpito solo D3-E9" | superato |
| CA-8 S8: `D3-E8` 17:30–19:45 e `D3-E9` 19:45–20:50 anche se a orario fisso | "CA-8 S8 ritardo verso l'aeroporto: colpiti D3-E8 e D3-E9, che slitterebbe anche se è a orario fisso" | superato |
| CA-9 pioggia in zona `TRENTO` il 2026-06-13: impatto vuoto | "CA-9 una pioggia in zona TRENTO il 2026-06-13 dà impatto vuoto" | superato |
| CA-9 qualsiasi imprevisto del 2026-06-20: impatto vuoto | "CA-9 qualsiasi imprevisto del 2026-06-20 (fuori dalle date del viaggio) dà impatto vuoto": meteo, ritardo e chiusura al 2026-06-20, più gli imprevisti datati di S1–S8 spostati a quella data. La cancellazione non ha una data e non rientra nel caso. | superato |

Oltre ai criteri, il blocco "calcolaImpatto: regole di REQ-REPLAN-001" ha 11 test sulle regole: R-RIT-1 senza elementi in corso, arresto al primo elemento in orario, confine "in corso" alla fine dell'elemento, nessun giorno successivo colpito e orario oltre la mezzanotte, ritardo di zero minuti; meteo solo su attività all'aperto della zona, intervalli che si toccano, chiusura che non colpisce gli spostamenti, cancellazione di un id sconosciuto o di un'attività; ordine per inizio con elementi in disordine; determinismo e viaggio non modificato su tutti gli scenari S1–S8.

Risultato: `npm run build` senza errori; `npm test` **8 file, 33 test, tutti superati** (21 test nuovi in `impatto.test.ts`, 12 già presenti). `npm ci`: 0 vulnerabilità.

## Collegamenti

- Requisito `REQ-REPLAN-001` (`.sdlc/requirements/REQ-REPLAN-001.json`), fonte `docs/requirements/REQ-REPLAN-001-impatto.md`
- Story `ST-REPLAN-001`
- Contratto `contract-ST-REPLAN-001-implementation`
- Consegna `AUT-PR-REPLAN-001` (branch `feature/ST-REPLAN-001` verso `main` su `alicegibellato/TravelOps`)
- Fonti condivise: `docs/requirements/modello-dominio.md`, `docs/requirements/dati-di-riferimento.md`
