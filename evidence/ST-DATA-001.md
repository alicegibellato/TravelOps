# Prove di consegna: ST-DATA-001

## Cosa è stato chiesto

Il requisito REQ-DATA-001 "Base dati" (ondata 2, CR-001 §9.4) chiede di salvare in SQLite viaggi, profili, revisioni della bozza, storici, proposte, conversazioni della chat, istantanee delle destinazioni e impostazioni della modalità presentazione, al posto del file JSON locale di REQ-WEB-002. Le regole:

- il file è `apps/web/.data/travelops.db`, escluso da Git;
- migrazioni numerate e ripetibili;
- uno strato di accesso unico, nessuna query sparsa nelle pagine;
- il primo avvio crea il database e carica i viaggi demo; "Ripristina i viaggi demo" li ricarica senza toccare gli altri viaggi;
- il motore resta la fonte delle regole: nessuna logica del motore nella web app.

Criteri di accettazione CA-1…CA-5. Story `ST-DATA-001`, una pull request da `feature/ST-DATA-001` verso `main`.

## Perimetro ed esclusioni

- **Comprende:**
  - lo strato di accesso ai dati `apps/web/src/basedati/` (connessione, migrazioni, viaggi, profili, revisioni della bozza, storici, proposte, conversazioni, istantanee, impostazioni, esportazione e importazione di un viaggio);
  - lo stato della pagina Demo (modalità presentazione) salvato nel database invece che in `stato.json`, con le stesse funzioni `leggiStato` e `salvaStato` usate dalle pagine;
  - il primo avvio (`apps/web/instrumentation.ts` all'avvio del server, e comunque alla prima lettura): database, migrazioni, viaggi demo, importazione una tantum del vecchio `stato.json`;
  - l'operazione "Ripristina i viaggi demo" (`ripristinaViaggiDemo` in `src/stato/operazioni.ts`);
  - i test di CA-1…CA-5 e dello strato di accesso; l'adattamento dei test di REQ-WEB-002 che leggevano il file JSON.
- **Esclude (fuori perimetro del requisito):** più utenti, server di database, sincronizzazione.
- **Lasciato fuori di proposito:**
  - pagine, componenti, layout e CSS non sono cambiati (in parallelo c'è UX-001): le pagine continuano a chiamare `leggiStato(cartellaDati())`. Il pulsante "Ripristina i viaggi demo" nell'interfaccia arriva con la Modalità presentazione di REQ-WEB-004; l'operazione è pronta e provata;
  - `packages/`, `README.md`, `apps/README.md`, `.github` non sono cambiati. Il `package.json` della radice non è cambiato (nessuno script nuovo);
  - i viaggi demo della CR-001 §8.3 (TRIP-DEMO-GARDA, TRIP-DEMO-DOLOMITI, TRIP-DEMO-ROMA) non esistono ancora: nascono da istantanee (REQ-CAT-002) e prima bozza (REQ-PLAN-001), che vengono dopo. Oggi i viaggi demo sono i quattro viaggi di riferimento dell'ondata 1, quelli degli scenari S1–S8 (vedi "Interpretazioni");
  - profili, revisioni della bozza, conversazioni e istantanee hanno tabelle e funzioni di accesso provate, ma nessuna pagina le usa ancora: il loro contenuto lo definiscono REQ-PREF-001, REQ-PLAN-002, REQ-CHAT-001 e REQ-CAT-002.
- **Deviazioni:** nessuna. La libreria è `better-sqlite3`, come chiede il vincolo del requisito (e la CR-001 §3). Un primo giro di questa storia usava `node:sqlite` per un'indicazione sbagliata nelle istruzioni di consegna; per decisione della persona è stato sostituito con `better-sqlite3`.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Connessione: file `travelops.db`, chiavi esterne, attesa se un altro processo scrive, transazioni | `apps/web/src/basedati/connessione.ts` |
| Migrazioni numerate e ripetibili (schema iniziale, tabella `migrazioni`) | `apps/web/src/basedati/migrazioni.ts` |
| Apertura: migrazioni mancanti e lavoro del primo avvio, una volta sola | `apps/web/src/basedati/apertura.ts` |
| Viaggi, profili, revisioni della bozza, storici (JSON del motore), proposte | `apps/web/src/basedati/viaggi.ts` |
| Conversazioni della chat e messaggi | `apps/web/src/basedati/conversazioni.ts` |
| Istantanee del catalogo (immutabili) | `apps/web/src/basedati/istantanee.ts` |
| Impostazioni (chiave → JSON) | `apps/web/src/basedati/impostazioni.ts` |
| Esportazione e importazione di un viaggio (CA-3) | `apps/web/src/basedati/trasferimento.ts` |
| Punto d'ingresso unico dello strato di accesso | `apps/web/src/basedati/index.ts` |
| Viaggi demo: caricamento e "Ripristina i viaggi demo" | `apps/web/src/stato/viaggi-demo.ts` |
| Stato della pagina Demo nel database (impostazione `presentazione`, storico e proposte del viaggio di partenza) | `apps/web/src/stato/presentazione.ts` |
| Importazione una tantum del vecchio `stato.json` (CA-5) | `apps/web/src/stato/importazione.ts` |
| Primo avvio della web app: viaggi demo, stato iniziale, importazione | `apps/web/src/stato/avvio.ts` |
| `leggiStato` / `salvaStato` sul database, `preparaBaseDati` | `apps/web/src/stato/archivio.ts` |
| Controlli dello stato riusati per database e vecchio file (`verificaStato`) | `apps/web/src/stato/stato.ts` |
| Operazione "Ripristina i viaggi demo"; commento aggiornato | `apps/web/src/stato/operazioni.ts` |
| Preparazione del database all'avvio del server (mai durante `next build`) | `apps/web/instrumentation.ts` |
| Dipendenza `better-sqlite3` (^13.0.3) e i suoi tipi `@types/better-sqlite3` (^9.6.0); Node.js 22 o successivo per la web app, come richiede `better-sqlite3` 13 | `apps/web/package.json`, `package-lock.json` |
| Commento di `.data/` (database e vecchio file) | `apps/web/.gitignore` |
| Scelta tecnica dei dati | `docs/requirements/visione.md` §7 |
| Test nuovi di CA-1…CA-5 e dello strato di accesso | `apps/web/test/data001-ca1-primo-avvio.test.ts`, `data001-ca2-riavvio.test.ts`, `data001-ca3-esporta-importa.test.ts`, `data001-ca4-migrazioni.test.ts`, `data001-ca5-stato-json.test.ts`, `data001-accesso.test.ts` (in `apps/web/test/`) |
| Test di REQ-WEB-002 adattati al database e alla nuova dipendenza | `apps/web/test/supporto-stato.ts`, `web002-ca6-ca7-decisioni.test.tsx`, `web002-ca8-stato.test.tsx`, `web002-ca9-motore.test.ts` (in `apps/web/test/`) |
| Prove di consegna | `evidence/ST-DATA-001.md` |

## Perché

### Libreria: `better-sqlite3`

- **È quella richiesta.** Il vincolo di REQ-DATA-001 dice "SQLite con better-sqlite3"; la CR-001 §3 la mette tra le scelte tecniche. Versione **13.0.3** (ultima stabile, 5 agosto 2026), con i tipi `@types/better-sqlite3` 9.6.0 (solo per lo sviluppo). SQLite 3.53.4.
- **Nessuna compilazione e nessuno scaricamento in installazione.** Dalla 13 il pacchetto contiene già i binari precompilati (N-API) per Linux x64/arm64 (anche musl), Windows x64/arm64 e macOS: non ha script di installazione e non usa `prebuild-install` (la 12 scaricava i binari da GitHub durante `npm ci`, o li compilava con Python e un compilatore C++). Unica dipendenza in più: `node-addon-api`.
- **Node.js 22.** `better-sqlite3` 13 dichiara `node >=22`, la versione della CI (`.nvmrc`): `apps/web/package.json` dichiara quindi `>=22.0.0` (prima `>=20.12.0`).
- **Next.js.** `better-sqlite3` è già nell'elenco dei pacchetti esterni lato server di Next.js (`server-external-packages.json`): la build non lo impacchetta (le pagine lo richiedono da `node_modules`, nessun file `.node` in `.next`), quindi `serverExternalPackages` in `next.config.mjs` non serve e la configurazione non cambia. Nessun avviso in build o in dev server.
- **API usata.** Database su file con attesa di 5 secondi se un altro processo scrive, chiavi esterne, tabelle `STRICT`, istruzioni preparate con parametri (nessun SQL composto con i dati), transazioni `BEGIN IMMEDIATE`.
- **Sicurezza.** `npm audit` resta a 0 vulnerabilità, anche con `--omit=dev`.

| Alternativa | Perché è stata scartata |
| --- | --- |
| `node:sqlite` integrato in Node.js 22 | Non è la libreria del requisito; in Node 22 è ancora "experimental" e stampa un avviso in ogni processo |
| `better-sqlite3` 12.x | Scarica i binari da GitHub durante l'installazione (o li compila): una chiamata di rete in più a ogni `npm ci` |
| `sqlite3` (asincrono) | API a callback meno adatta a transazioni brevi e sincrone; non è la libreria del requisito |
| `sql.js` (SQLite in WebAssembly) | Il database vive in memoria e va riscritto per intero sul file a ogni modifica: niente transazioni sul file |
| Un ORM (Prisma, Drizzle) | Dipendenze e generazione di codice per poche tabelle; il JSON del motore si salva comunque come testo |

### Scelte

- **Il database salva il JSON del motore.** Storici con `esportaStorico`, revisioni della bozza con `esportaViaggio`, proposte così come le restituisce `proponiRipianificazione`. Rileggendo, il motore li valida (`importaStorico`, `caricaViaggio`): la web app non ha regole proprie su itinerari, versioni o proposte. Uno storico manomesso nel database è rifiutato dal motore e la pagina mostra il motivo con "Ripristina", come prima con il file.
- **Schema.** Tabelle `viaggi` (stato `bozza`/`confermato`/`in_corso`/`concluso`, viaggio demo sì/no, destinazione, istantanea), `profili`, `revisioni_bozza`, `storici`, `proposte`, `conversazioni` e `messaggi`, `istantanee`, `impostazioni`, più `migrazioni`. Tutto ciò che appartiene a un viaggio si cancella con il viaggio (`ON DELETE CASCADE`). Le conversazioni possono nascere senza viaggio (la chat dalla home) e collegarsi dopo. Un'istantanea non cambia mai: risalvarla identica non fa nulla, con contenuto diverso è un errore.
- **Migrazioni ripetibili (CA-4).** Ogni migrazione ha un numero, gira in una transazione e si registra in `migrazioni`; quelle registrate non si rieseguono, e il loro SQL usa solo `CREATE ... IF NOT EXISTS`, quindi è innocuo anche rieseguito. Una migrazione che fallisce non lascia nulla a metà. Un database scritto da una versione più recente (migrazioni sconosciute) non si tocca: la pagina mostra il motivo.
- **Primo avvio (CA-1).** All'avvio del server `instrumentation.ts` prepara il database; anche la prima lettura di una pagina lo farebbe. La prima volta (impostazione `primo_avvio` assente) carica i viaggi demo, scrive lo stato iniziale della modalità presentazione e importa il vecchio file se c'è, tutto in una transazione; poi non si ripete. Durante `next build` non si crea nulla.
- **Una connessione per operazione.** Ogni lettura o scrittura apre il file, lavora e lo chiude: nessun file resta aperto tra le richieste, i test usano cartelle temporanee che si possono cancellare (anche su Windows) e il riavvio non ha stato in memoria. Con più richieste insieme, `BEGIN IMMEDIATE` e un'attesa di 5 secondi evitano scritture incrociate.
- **Pagine invariate.** `leggiStato(cartella)` e `salvaStato(cartella, stato)` hanno la stessa firma di prima e ora usano il database: pagine, componenti e azioni lato server non cambiano. Lo stato della Demo è l'impostazione `presentazione` (viaggio di partenza, scenario, orologio, prossimo numero di proposta) più storico e proposte del viaggio demo di partenza.
- **Strato di accesso unico.** SQL e `better-sqlite3` compaiono solo in `src/basedati/`; pagine e componenti non importano `src/basedati` (lo verifica un test).
- **Esportazione e importazione (CA-3).** Un documento JSON con i dati del viaggio, l'istantanea, il profilo, le revisioni della bozza, lo storico (lo stesso JSON di `esportaStorico`), le proposte e le conversazioni. All'importazione il motore rivalida storico e revisioni; un documento non valido non cambia nulla. Un viaggio con lo stesso identificativo si sostituisce solo se richiesto.
- **Vecchio file JSON (CA-5).** Al primo avvio, se c'è `apps/web/.data/stato.json` ed è valido, il suo stato passa nel database (si rilegge con gli stessi controlli di REQ-WEB-002 e con `importaStorico`). L'esito (`importato`, `nessun file`, `non valido` con il motivo) resta nell'impostazione `importazione_stato_json` e il file non si legge più. Il file non si cancella: resta come copia.

### Interpretazioni del requisito

- **Viaggi demo.** I viaggi della CR-001 §8.3 non si possono ancora costruire (servono istantanee e prima bozza). Fino a REQ-DEMO-001 i viaggi demo sono i quattro viaggi di riferimento che la modalità presentazione già usa per S1–S8: `versione-1`, `v-irr`, `v-fisso`, `v-volo`, confermati, con la sola versione 1 creata dal motore e titoli in parole semplici ("Weekend sul Garda, con il volo di ritorno"). L'elenco è in un solo punto (`src/stato/viaggi-demo.ts`).
- **Ripristina.** Il pulsante "Ripristina" della pagina Demo di REQ-WEB-002 resta com'è (riporta il viaggio dello scenario alla versione 1). "Ripristina i viaggi demo" ricarica tutti i viaggi demo (storico alla versione 1, senza proposte, profilo, revisioni né conversazioni) e lascia identici gli altri viaggi; scenario in corso e orologio restano.
- **"Importato una volta".** Il controllo del vecchio file avviene una sola volta, al primo avvio con il database: un file comparso o cambiato dopo è ignorato.
- **Contenuti non ancora definiti.** Profilo, dati dei messaggi della chat e contenuto delle istantanee si salvano come JSON così come arrivano: la loro forma la fissano REQ-PREF-001, REQ-CHAT-001 e REQ-CAT-002.

## Verifica

Eseguito su Windows 11, Node 22.22.2, npm 10.9.7, dalla radice della copia di lavoro:

- `npm ci`: verde, 0 vulnerabilità; `better-sqlite3@13.0.3` installato con il binario precompilato, senza compilare nulla.
- `npm run build`: verde, nessun avviso. Motore compilato con `tsc` (non modificato); web app con Next.js 16.4.0 (Turbopack): 81 pagine statiche e le 7 pagine a ogni richiesta, come prima. La build non crea `apps/web/.data`.
- `npm test`: verde.
  - Motore: 21 file, 328 test superati (non toccato).
  - Web app: 21 file, 149 test superati: i 110 di prima (4 file adattati, vedi sotto) e 39 nuovi in 6 file.
- `npm run typecheck --workspace @travelops/web` (anche sui test): nessun errore.
- `npm audit`: **0 vulnerabilità** (anche con `--omit=dev`).
- File con a capo LF, nessun CRLF; `git diff --check` pulito.
- Prova manuale con `PORT=3109 npm run dev`:
  - clone senza `apps/web/.data`: all'avvio del server, prima di qualsiasi richiesta, compare `apps/web/.data/travelops.db` con la migrazione 1, i quattro viaggi demo confermati, l'impostazione `presentazione` iniziale e `importazione_stato_json` = "nessun file";
  - nel browser integrato: "Avvia S1", poi "Accetta" con il nome predefinito: "creata la versione 2";
  - dev server fermata e riavviata: `/versioni` mostra ancora le versioni 1 e 2 (versione 2 corrente, causa "Meteo avverso: pioggia in GARDA_NORD il 2026-06-13 08:00–13:00", autore "Viaggiatore") e il confronto 1 → 2;
  - alla fine dev server fermata, nessun processo node in ascolto sulla porta 3109 né rimasto dalla copia di lavoro, `apps/web/.data/` cancellata.

| Criterio | Test o verifica (file › nome del test) | Esito |
| --- | --- | --- |
| CA-1 il primo avvio su un clone pulito crea il database con i viaggi demo | `data001-ca1-primo-avvio.test.ts` › "CA-1 il database è apps/web/.data/travelops.db, escluso da Git e assente dal repository"; "CA-1 all'avvio della web app (instrumentation) il database viene creato con i viaggi demo"; "CA-1 durante la build (next build) l'avvio non crea nessun database"; "CA-1 anche la prima pagina letta crea il database: i viaggi demo, confermati, con la sola versione 1 del motore"; "CA-1 il primo avvio applica le migrazioni, imposta la modalità presentazione e si registra come fatto"; "CA-1 il database è SQLite, con better-sqlite3 come chiede il requisito". Prova manuale: database creato all'avvio della dev server | superato |
| CA-2 lo stato sopravvive al riavvio della web app | `data001-ca2-riavvio.test.ts` › "CA-2 dopo il riavvio (moduli ricaricati, nuova connessione) lo stato della modalità presentazione è identico"; "CA-2 dopo il riavvio viaggi, profili, revisioni della bozza, storici, proposte, conversazioni, istantanee e impostazioni sono identici"; "CA-2 il riavvio non ripete il primo avvio: i viaggi demo modificati restano come sono". Anche `web002-ca8-stato.test.tsx` › "CA-8 riletto dopo il riavvio (moduli ricaricati), lo stato è identico…". Prova manuale: versione 2 ancora presente dopo il riavvio della dev server | superato |
| CA-3 un viaggio esportato e reimportato è identico (stesso JSON del motore) | `data001-ca3-esporta-importa.test.ts` › "CA-3 importato in un'altra base dati e riesportato, il documento è identico, carattere per carattere"; "CA-3 lo storico reimportato è lo stesso JSON del motore (esportaStorico), con le stesse versioni"; "CA-3 nella stessa base dati: rifiutato se il viaggio esiste, identico se si sceglie di sostituirlo"; "CA-3 un viaggio con la sua istantanea si porta dietro l'istantanea, identica"; più i rifiuti: storico manomesso (`importaStorico`), revisione non valida (`caricaViaggio`), documenti non validi | superato |
| CA-4 le migrazioni applicate due volte non cambiano nulla | `data001-ca4-migrazioni.test.ts` › "CA-4 le migrazioni sono numerate da 1 senza salti"; "CA-4 riapplicate su una base dati già aggiornata: nessuna migrazione eseguita, schema e dati identici"; "CA-4 lo SQL di ogni migrazione eseguito due volte non dà errori e non cambia lo schema"; "CA-4 riaprire la base dati (un secondo avvio) non riapplica migrazioni e non ripete il primo avvio"; più "una migrazione che fallisce non lascia nulla a metà e non si registra", "una migrazione nuova si applica una volta sola, alla prima apertura", "una base dati scritta da una versione più recente della web app non si tocca" | superato |
| CA-5 il file JSON locale di REQ-WEB-002, se presente, viene importato una volta e poi non è più usato | `data001-ca5-stato-json.test.ts` › "CA-5 il file è apps/web/.data/stato.json, quello di REQ-WEB-002"; "CA-5 al primo avvio lo stato del file passa nella base dati, identico, insieme ai viaggi demo"; "CA-5 dopo l'importazione il file non è più letto né scritto: lo stato vive solo nella base dati"; "CA-5 senza file al primo avvio non si importa nulla, e un file comparso dopo è ignorato"; "CA-5 un file non valido non si importa: si parte dai viaggi demo, il motivo resta registrato e il file non si usa più"; "CA-5 un file con uno storico manomesso è rifiutato dal motore (importaStorico) e non si importa"; "CA-5 nel codice della web app solo l'importazione conosce il file JSON" | superato |

Gli altri test nuovi (`data001-accesso.test.ts`) coprono le regole senza un criterio dedicato:

- strato di accesso unico: SQL e `better-sqlite3` solo in `src/basedati/`; pagine e componenti non usano la base dati direttamente;
- "Ripristina i viaggi demo": ogni viaggio demo torna allo stato iniziale (anche uno cancellato), un viaggio del viaggiatore resta identico, la modalità presentazione riparte dalla versione 1;
- profilo, revisioni della bozza (B1, B2), conversazioni (anche nate prima del viaggio), impostazioni, cancellazione a cascata, istantanee immutabili, vincoli dello schema.

Test di REQ-WEB-002 adattati, perché il salvataggio è cambiato davvero (stesse verifiche, sul database invece che sul file):

- `web002-ca8-stato.test.tsx`: "lo stato è nella base dati in apps/web/.data, esclusa da Git" (era il file JSON); "lo storico nella base dati è quello di esportaStorico…"; "al primo avvio (base dati creata ora) si parte dalla versione 1 di riferimento" (prima: "senza file … senza scrivere nulla", che CA-1 rende superato); stato non valido e storico manomesso ora scritti nel database;
- `web002-ca6-ca7-decisioni.test.tsx`: lo storico salvato si legge dal database invece che dal file;
- `supporto-stato.ts`: aiuti per leggere e manomettere il database nei test;
- `web002-ca9-motore.test.ts` › "CA-9 nessuna dipendenza in più: oltre al motore solo Next.js, React, Leaflet e better-sqlite3 (REQ-DATA-001)": l'elenco ammesso include ora `better-sqlite3` e `@types/better-sqlite3`, perché la dipendenza è richiesta da REQ-DATA-001. Il resto del controllo (nessun'altra dipendenza) è invariato.

## Collegamenti

- Requisito `REQ-DATA-001`, fonte `docs/requirements/REQ-DATA-001-base-dati.md` (CR-001 §9.4)
- Story `ST-DATA-001`
- Contratto `contract-ST-DATA-001-implementation`
- Profilo di consegna `AUT-PR-DATA-001` (pull request su `alicegibellato/TravelOps`, branch `feature/ST-DATA-001`)
- Dipendenze: `REQ-ITIN-002` (storico, esporta e importa), `REQ-WEB-002` (stato locale in `apps/web/.data/stato.json`, ora importato e sostituito)
- Fonti condivise: `docs/requirements/visione.md` §7, `docs/requirements/modello-dominio.md`, `docs/requirements/modello-dominio-estensioni.md` §7.1, §7.5, §7.8, `docs/requirements/dati-di-riferimento-estensioni.md` §8.3
