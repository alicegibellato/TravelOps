# Prove di consegna: ST-WEB-001

## Cosa è stato chiesto

Il requisito REQ-WEB-001 "Web app: consultazione dell'itinerario" chiede la prima versione della web app, in `apps/web`, con Next.js e TypeScript, mappa Leaflet e tessere OpenStreetMap. La web app usa il motore `@travelops/engine` come pacchetto, senza duplicarne la logica. Le funzionalità richieste sono cinque:

- **Scelta del viaggio:** versione 1 di riferimento e varianti `V-IRR`, `V-FISSO`, `V-VOLO`.
- **Vista viaggio:** titolo, date e, per ogni giorno, luogo di partenza, alloggio e numero di elementi.
- **Vista giorno:** gli elementi in ordine con orari, tipo, attività o tratta, mezzo, priorità, orario fisso e prenotazione (codice e link di gestione).
- **Mappa del giorno:** un indicatore numerato per ogni attività, nell'ordine dell'itinerario, e una linea per ogni spostamento. I luoghi senza coordinate sono elencati sotto la mappa.
- **Dettaglio elemento:** tutti i campi; per un'attività anche categoria, all'aperto o al coperto, durata tipica e orari di apertura del luogo.

Criteri di accettazione CA-1…CA-6. Story `ST-WEB-001`, da consegnare come una pull request da `feature/ST-WEB-001` verso `main`.

## Perimetro ed esclusioni

- **Comprende:**
  - il workspace `apps/web` (`@travelops/web`) con le pagine di scelta del viaggio, viaggio, giorno (con mappa) e dettaglio elemento;
  - caricamento e validazione dei dati di riferimento con il motore, e la pagina degli errori quando i dati non sono validi;
  - la politica di sicurezza dei contenuti (CSP), che nel browser consente solo le tessere di OpenStreetMap come risorsa esterna;
  - lo script `dev` nella radice, la documentazione nel `README.md`;
  - i test automatici di ogni criterio CA-1…CA-6.
- **Esclude (fuori perimetro del requisito):**
  - proposte, versioni e pagina Demo (REQ-WEB-002);
  - modifiche dall'interfaccia;
  - chat (ondata 2);
  - accesso e utenti: un solo utente senza accesso.
- **Lasciato fuori di proposito:**
  - `packages/engine` non è stato toccato;
  - `.github/workflows/ci.yml` non è cambiato: esegue già `npm ci`, `npm run build` e `npm test` su tutti i workspace a ogni push, quindi ora compila e prova anche la web app;
  - nessun test nel browser (Playwright o simili): come chiede il requisito, i test verificano i dati preparati per le viste e per la mappa, e l'HTML prodotto dai componenti con React lato server.
- **Deviazioni:** nessuna dal requisito. Fuori da `apps/web` sono cambiati, nel perimetro della story:
  - la `package.json` della radice: nuovo script `dev`, richiesto da CA-1;
  - `README.md` (la modifica a `apps/README.md` è stata esclusa dal responsabile della consegna perché fuori dai percorsi approvati);
  - `package-lock.json`, generato da npm.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Workspace della web app: dipendenze e script `dev`, `build`, `start`, `typecheck`, `test` | `apps/web/package.json` |
| Avvio della CLI di Next.js con la telemetria disattivata, uguale su Windows, macOS e Linux | `apps/web/scripts/next.mjs` |
| Configurazione di Next.js: radice del monorepo, CSP e altre intestazioni di sicurezza, niente file generati nel repository (`agentRules: false`), un avviso di Turbopack che non riguarda la web app | `apps/web/next.config.mjs` |
| TypeScript `strict` (estende `tsconfig.base.json`) e configurazione di Vitest | `apps/web/tsconfig.json`, `apps/web/vitest.config.ts` |
| File generati da Next.js esclusi da git (`.next/`, `next-env.d.ts`) | `apps/web/.gitignore` |
| Layout, stile e pagine: scelta del viaggio, viaggio, giorno, elemento, pagina non trovata | `apps/web/app/layout.tsx`, `apps/web/app/globals.css`, `apps/web/app/page.tsx`, `apps/web/app/not-found.tsx`, `apps/web/app/viaggi/[viaggio]/page.tsx`, `apps/web/app/viaggi/[viaggio]/giorni/[data]/page.tsx`, `apps/web/app/viaggi/[viaggio]/elementi/[elemento]/page.tsx` |
| Caricamento e validazione con il motore (CA-5) | `apps/web/src/dati/carica.ts` |
| I quattro viaggi consultabili e il catalogo, importati dai dati di riferimento del motore | `apps/web/src/dati/viaggi.ts` |
| Dati per la vista viaggio, la vista giorno, il dettaglio e la mappa (senza React) | `apps/web/src/viste/viaggio.ts`, `apps/web/src/viste/giorno.ts`, `apps/web/src/viste/elemento.ts`, `apps/web/src/viste/mappa.ts` |
| Etichette in italiano, date estese, riferimenti al catalogo tramite le funzioni del motore | `apps/web/src/viste/etichette.ts`, `apps/web/src/viste/luoghi.ts` |
| Unica integrazione esterna: tessere OSM, attribuzione e CSP (CA-6) | `apps/web/src/rete.ts` |
| Indirizzi delle pagine | `apps/web/src/percorsi.ts` |
| Componenti: scelta del viaggio, viste, prenotazione, errori, contenuto delle pagine | `apps/web/src/componenti/SceltaViaggio.tsx`, `VistaViaggio.tsx`, `VistaGiorno.tsx`, `DettaglioElemento.tsx`, `Prenotazione.tsx`, `ErroriDati.tsx`, `Contenuti.tsx` (in `apps/web/src/componenti/`) |
| Mappa Leaflet (componente client), legenda ed elenco dei luoghi senza coordinate | `apps/web/src/componenti/MappaGiorno.tsx`, `apps/web/src/componenti/SezioneMappa.tsx` |
| Test di CA-1…CA-6 e del dettaglio, con il loro supporto | `apps/web/test/ca1-configurazione.test.ts`, `ca2-vista-giorno.test.tsx`, `ca3-mappa.test.tsx`, `ca4-volo.test.tsx`, `ca5-validazione.test.tsx`, `ca6-rete.test.ts`, `dettaglio.test.tsx`, `supporto.ts` (in `apps/web/test/`) |
| Script `dev` dalla radice: compila il motore e avvia la web app (CA-1) | `package.json` |
| Dipendenze della web app | `package-lock.json` |
| Documentazione: comandi, struttura e comportamento di rete della web app | `README.md` |
| Prove di consegna | `evidence/ST-WEB-001.md` |

## Perché

### Dipendenze

| Pacchetto | Versione | Tipo | Perché |
| --- | --- | --- | --- |
| `next` | ^16.4.0 (installata 16.4.0) | dipendenza | Scelta tecnica della visione (§7). È l'ultima versione stabile. Gestisce TypeScript 7 della radice con la CLI `tsc`, quindi la build controlla i tipi senza installare un secondo TypeScript. |
| `react`, `react-dom` | ^19.3.0 (installata 19.3.0) | dipendenza | Richieste da Next.js 16; ultima versione stabile |
| `leaflet` | ^1.9.4 (installata 1.9.4) | dipendenza | Mappa della visione (§7); ultima versione stabile (la 2.0 è ancora alfa) |
| `@types/react`, `@types/react-dom` | ^19.3.0 | sviluppo | Tipi di React |
| `@types/leaflet` | ^1.9.22 | sviluppo | Tipi di Leaflet |

Non serve nessuna libreria di test in più: Vitest 5 della radice esegue i test della web app, e `react-dom/server` produce l'HTML dei componenti.

### Scelte

- **Nessuna logica del motore duplicata (CA-5).** I dati si caricano con `caricaCatalogo` e `caricaViaggio(json, catalogo)` e si validano con `validaItinerario`. I riferimenti al catalogo si risolvono con `trovaLuogo`, `trovaAttivita` e `trovaZona`, e la priorità predefinita è `PRIORITA_PREDEFINITA` del motore. La web app aggiunge solo presentazione:
  - etichette in italiano;
  - date estese;
  - la numerazione degli indicatori.

  Se il catalogo non è valido, il viaggio si controlla comunque nella struttura, così la pagina mostra tutti gli errori in una volta.
- **Logica fuori dai componenti.** `src/viste/*` prepara dati semplici per le viste e per la mappa. `src/componenti/Contenuti.tsx` sceglie tra la vista e gli errori. Le pagine di `app/` scelgono solo il viaggio da caricare. Così i test coprono tutto senza avviare Next.js né un browser.
- **Pagine statiche.** `generateStaticParams` e `dynamicParams = false` generano in build le 81 pagine, cioè 4 viaggi, i loro giorni e i loro elementi. Un indirizzo sconosciuto dà la pagina "non trovata".
- **Rete (CA-6):**
  - I dati JSON sono importati dai dati di riferimento del motore (`@travelops/engine/data/reference/*`) ed entrano nella build: la web app non scarica nulla.
  - La mappa usa `https://tile.openstreetmap.org/{z}/{x}/{y}.png` con l'attribuzione richiesta.
  - Gli indicatori sono numeri in HTML (`L.divIcon`), non le icone predefinite di Leaflet, che sono immagini da caricare.
  - Nessun font esterno: si usano i caratteri di sistema.
  - Nel browser, la CSP vieta le chiamate verso altri siti (`connect-src 'self'`) e ammette come immagini esterne solo le tessere OSM.
  - I link di gestione della prenotazione e alla pagina dei diritti di OSM sono link che apre il viaggiatore: la web app non li chiama.
  - La telemetria di Next.js è disattivata in `dev`, `build` e `start` (`NEXT_TELEMETRY_DISABLED=1` impostata da `scripts/next.mjs`). Così la build non usa la rete oltre all'installazione dei pacchetti.
- **Leaflet caricato nel browser.** Leaflet usa `window`, quindi `MappaGiorno` lo importa dentro `useEffect`. Un `ResizeObserver` rifà l'inquadratura se la mappa nasce in un contenitore ancora senza dimensioni. Durante la verifica manuale, la prima apertura con il pannello nascosto inquadrava al massimo ingrandimento. I nomi in popup e tooltip sono inseriti come testo, mai come HTML.
- **Monorepo:**
  - `turbopack.root` e `outputFileTracingRoot` indicano la radice del repository, perché le dipendenze sono installate lì. La radice va dichiarata anche perché sopra la copia di lavoro esiste un altro `package-lock.json`.
  - Nei test, `@travelops/engine` punta ai sorgenti del motore, così `npm test` funziona anche prima di `npm run build`.
  - La web app compilata usa invece il pacchetto (`dist`), che `npm run build` compila prima della web app perché i workspace sono elencati con `packages/*` prima di `apps/*`.
- **Avvisi e file generati.** Turbopack segnala la lettura di file con percorso variabile in `creaSorgenteDaFile` del motore, che la web app non usa. L'avviso riguarda solo i pacchetti per il deploy, quindi è ignorato in modo mirato in `next.config.mjs`, senza toccare il motore. `next dev` 16.4 scrive un `AGENTS.md` nella cartella dell'app: `agentRules: false` lo impedisce.
- **Interpretazioni del requisito:**
  - Gli indicatori sono numerati in base alla posizione dell'attività tra le attività del giorno. Se un'attività non ha coordinate, il suo numero compare nell'elenco sotto la mappa e la numerazione delle altre resta coerente con il programma.
  - I luoghi senza coordinate sono quelli delle attività e degli estremi degli spostamenti del giorno, ciascuno con gli elementi che lo usano.
  - Nel dettaglio di un elemento si mostrano anche luogo, tipo di luogo e zona dell'attività.

### Alternative scartate

| Alternativa | Perché è stata scartata |
| --- | --- |
| `react-leaflet` | Dipendenza in più, non prevista dalle scelte tecniche; per indicatori e linee basta Leaflet |
| Test nel browser (Playwright) o `@testing-library/react` con jsdom | Dipendenze pesanti non necessarie: il requisito chiede test sui dati passati alle viste e alla mappa |
| `next.config.ts` che importa la CSP da `src/rete.ts` | Il caricamento di un `next.config.ts` con importazioni dipende dalla versione; la CSP è in `next.config.mjs` e un test verifica che coincida con `politicaSicurezzaContenuti` |
| Variabile `NEXT_TELEMETRY_DISABLED=1 next …` scritta negli script npm | Non funziona su Windows (cmd.exe) |
| Next.js 16.3.8 | Nessun vantaggio: anche la 16.4.0 è stabile e `npm audit` non segnala nulla |
| Copiare i JSON di riferimento in `apps/web` | Duplicherebbe i dati del motore |

## Verifica

Eseguito su Windows 11, Node 22.22.2, npm 10.9.7, dalla radice della copia di lavoro, dopo aver cancellato `packages/engine/dist`, `apps/web/.next` e i file generati:

- `npm ci`: verde.
- `npm run build`: verde.
  - Il motore è compilato con `tsc`.
  - La web app è compilata con Next.js 16.4.0 (Turbopack), con il controllo dei tipi di TypeScript 7 e 81 pagine statiche.
  - Nessun avviso.
- `npm test`: verde.
  - Motore: 14 file, 195 test superati (non toccato).
  - Web app: 7 file, 46 test superati.
- `npm run typecheck --workspace @travelops/web` (`tsc --noEmit`, anche sui test): nessun errore.
- `npm audit`: **0 vulnerabilità** (anche con `--omit=dev`).
- `npm run dev` dalla radice (con `PORT=3107`, per non usare la porta 3000 di altre copie di lavoro):
  - il motore si compila e Next.js è pronto in circa 1 s;
  - `GET /viaggi/versione-1/giorni/2026-06-13` risponde 200 con `D2-E1`…`D2-E5` in ordine;
  - poi la dev server è stata fermata.
- Verifica manuale nel browser della dev server:
  - la vista giorno del 2026-06-14 con `V-VOLO` mostra 3 indicatori e 6 linee sulle tessere OSM;
  - le risorse caricate vengono solo da `localhost` e da `tile.openstreetmap.org`;
  - nessun errore in console;
  - le intestazioni contengono la CSP.

| Criterio | Test o verifica (file › nome del test) | Esito |
| --- | --- | --- |
| CA-1 avvio in sviluppo dalla radice; `npm run build` compila anche la web app; la CI la compila a ogni push | `ca1-configurazione.test.ts` › "CA-1 la web app è un workspace del monorepo con build, test e dev server"; "CA-1 dalla radice `npm run dev` compila il motore e avvia la web app in sviluppo"; "CA-1 dalla radice `npm run build` e `npm test` comprendono tutti i workspace, quindi anche la web app"; "CA-1 la CI compila e prova tutto il monorepo a ogni push". Verifica: `npm run build` dalla radice verde con la web app compilata; `npm run dev` dalla radice avviato e fermato | superato |
| CA-2 la vista giorno del 2026-06-13 mostra `D2-E1`…`D2-E5` in ordine con gli orari dei dati di riferimento | `ca2-vista-giorno.test.tsx` › "CA-2 i dati della vista hanno D2-E1…D2-E5 in ordine, con gli orari dei dati di riferimento"; "CA-2 ogni riga ha tipo, attività o tratta, mezzo, priorità, orario fisso e prenotazione"; "CA-2 la pagina del giorno mostra D2-E1…D2-E5 in ordine, ciascuno con il suo orario" | superato |
| CA-3 la mappa del 2026-06-14 riceve 3 indicatori numerati (castello, pranzo, MUSE) con le coordinate dei dati di riferimento | `ca3-mappa.test.tsx` › "CA-3 riceve 3 indicatori numerati, nell'ordine castello, pranzo, MUSE, con le coordinate dei dati di riferimento"; "CA-3 riceve una linea per ogni spostamento, tra le coordinate dei due luoghi"; "CA-3 la pagina del giorno passa alla mappa 3 indicatori e 4 linee e li elenca nella legenda nello stesso ordine"; "i luoghi senza coordinate sono elencati sotto la mappa e non ricevono indicatori né linee (variante: MUSE senza coordinate)" | superato |
| CA-4 con `V-VOLO` la vista giorno del 2026-06-14 mostra `D3-E9` a orario fisso, con il codice `XY123` e il link di gestione | `ca4-volo.test.tsx` › "CA-4 la vista giorno ha D3-E9 a orario fisso, con il codice XY123 e il link di gestione"; "CA-4 la pagina del giorno mostra D3-E9 a orario fisso, il codice XY123 e il link di gestione"; "CA-4 il dettaglio di D3-E9 riporta fornitore, codice, link di gestione e orario fisso" | superato |
| CA-5 i dati si caricano e si validano con il motore; con dati non validi la web app mostra gli errori invece della vista | `ca5-validazione.test.tsx` › "CA-5 il viaggio %s si carica e si valida con il motore senza errori" (4 casi); "CA-5 con dati non validi restituisce gli errori del motore, gli stessi di caricaViaggio"; "CA-5 la pagina del viaggio mostra gli errori invece della vista"; "CA-5 anche le pagine del giorno e dell'elemento mostrano gli errori invece della vista e della mappa"; "CA-5 un catalogo non valido dà gli errori del catalogo e quelli strutturali del viaggio, tutti insieme"; "CA-5 un testo che non è JSON non provoca eccezioni: è un errore del motore" | superato |
| CA-6 nessuna chiamata di rete oltre alle tessere OSM | `ca6-rete.test.ts` › "CA-6 la mappa usa le tessere di OpenStreetMap con l'attribuzione richiesta"; "CA-6 la politica di sicurezza (sviluppo: %s) ammette solo la stessa origine e, per le immagini, le tessere OSM" (2 casi); "CA-6 Next.js invia la stessa politica di sicurezza su tutte le pagine"; "CA-6 il codice della web app non usa API di rete (fetch, XHR, WebSocket, EventSource, sendBeacon)"; "CA-6 nel codice della web app compaiono solo gli indirizzi di OpenStreetMap"; "CA-6 la mappa non usa le icone predefinite di Leaflet (immagini da caricare): gli indicatori sono numeri in HTML"; "CA-6 i dati di viaggio e catalogo sono importati nella build, non scaricati"; "CA-6 dev server, build e avvio passano dallo script che disattiva la telemetria di Next.js". Verifica manuale: nel browser, risorse solo da `localhost:3107` e `tile.openstreetmap.org` | superato |

Gli altri test della web app coprono le funzionalità senza un criterio dedicato:

- `ca2-vista-giorno.test.tsx`, vista viaggio:
  - "titolo, date e, per ogni giorno, luogo di partenza, alloggio e numero di elementi";
  - "la pagina del viaggio mostra titolo, date e i tre giorni con i link alla vista giorno";
  - "con V-VOLO l'ultimo giorno ha 9 elementi".
- `ca3-mappa.test.tsx` › "con V-VOLO la mappa del 2026-06-14 ha anche le linee verso l'aeroporto e il volo".
- `ca4-volo.test.tsx`, scelta del viaggio:
  - "con V-IRR il castello (D3-E2) è irrinunciabile";
  - "con V-FISSO il pranzo sul lago (D2-E4) è a orario fisso";
  - "la scelta del viaggio offre versione 1, V-IRR, V-FISSO, V-VOLO e porta allo stesso giorno";
  - "senza la variante V-VOLO il giorno non ha D3-E9".
- `dettaglio.test.tsx`, dettaglio elemento (6 test): campi di un'attività con categoria, al coperto, durata tipica e orari di apertura del luogo; luogo sempre aperto; ristorante con due fasce; spostamento con prenotazione; pagina del dettaglio; elemento inesistente.

## Collegamenti

- Requisito `REQ-WEB-001`, fonte `docs/requirements/REQ-WEB-001-consultazione.md`
- Story `ST-WEB-001`
- Contratto `contract-ST-WEB-001-implementation`
- Profilo di consegna `AUT-PR-WEB-001` (pull request su `alicegibellato/TravelOps`, branch `feature/ST-WEB-001`)
- Fonti condivise: `docs/requirements/visione.md` §7, `docs/requirements/modello-dominio.md`, `docs/requirements/dati-di-riferimento.md`
