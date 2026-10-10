# TravelOps

Proof of concept di un assistente di viaggio che costruisce un itinerario realistico e verificato e lo mantiene aggiornato durante il viaggio, reagendo agli imprevisti con proposte motivate. Il principio: **il motore decide e verifica, l'AI interpreta e racconta.**

Visione, modello del dominio, dati di riferimento e requisiti sono in [`docs/requirements/`](docs/requirements/visione.md).

## Prerequisiti

- Node.js 20.12 o successivo per usare il motore; **22.12 o successivo per sviluppare**, perché lo richiede Vitest 5 (le versioni precedenti di Vitest hanno vulnerabilità note). La versione di riferimento è in `.nvmrc`.
- npm

## Avvio in 3 comandi

Da un clone pulito (Node 22.12 o successivo):

```bash
npm ci
npm run build
npm run dev     # poi apri http://localhost:3000
```

Al primo avvio l'app crea il suo database locale (`apps/web/.data/travelops.db`, fuori da Git) con le destinazioni precaricate (Garda, Roma, Dolomiti – Val di Fassa) e i viaggi demo; funziona senza rete, tranne la costruzione di destinazioni nuove e le tessere della mappa. Per la demo vera e propria: **Modalità presentazione** → **Ripristina i viaggi demo**, poi i prompt del copione (con «Copia» accanto) sono in fondo alla stessa pagina; il copione completo, con i risultati attesi, è in [`docs/demo/copione-demo.md`](docs/demo/copione-demo.md). Per usare il modello OpenAI vero in chat serve la chiave nell'ambiente del server (vedi `evidence/ST-DEMO-001B.md`); senza chiave la chat risponde con un messaggio gentile.

## Installazione

```bash
npm ci
```

## Struttura

Monorepo con npm workspaces:

| Cartella | Contenuto |
| --- | --- |
| `packages/engine` | Il motore, pacchetto `@travelops/engine` |
| `apps/web` | La web app Next.js, pacchetto `@travelops/web`: consultazione dell'itinerario (REQ-WEB-001), proposte, versioni e pagina Demo (REQ-WEB-002) |
| `docs/requirements/` | Visione, modello del dominio, dati di riferimento, requisiti |
| `.sdlc/` | Requisiti, storie, decisioni e prove del plugin Agentic SDLC |

Il motore (`packages/engine`):

| Cartella | Contenuto | Requisito |
| --- | --- | --- |
| `src/model` | Tipi del modello e interfaccia della sorgente dei dati di contesto | REQ-FOUND-001 |
| `src/itinerary` | Caricamento, validazione, catalogo | REQ-ITIN-001 |
| `src/history` | Versioni e storico | REQ-ITIN-002 |
| `src/feasibility` | Controllo di fattibilità | REQ-FEAS-001 |
| `src/replanning` | Impatto e ripianificazione | REQ-REPLAN-001, REQ-REPLAN-002 |
| `src/editing` | Modifiche richieste | REQ-EDIT-001 |
| `src/demo` | Demo a terminale | REQ-REPLAN-002, REQ-EDIT-001 |
| `test/` | Test, con le stesse cartelle di `src/` | |
| `data/reference/` | Dati di riferimento in JSON | REQ-FOUND-001 |

## Comandi

Dalla radice del repository:

```bash
npm run build   # compila tutti i workspace con tsc
npm test        # esegue i test (Vitest)
npm run demo    # demo a terminale del motore
npm run dev     # compila il motore e avvia la web app in sviluppo su http://localhost:3000
npm run copione -w @travelops/web   # rigenera docs/demo/copione-demo.md da apps/web/src/demo/copione.json
```

Per usare un'altra porta: `PORT=3100 npm run dev` (in PowerShell: `$env:PORT=3100; npm run dev`).

## Web app

La web app (`apps/web`, Next.js con TypeScript) consulta il viaggio di riferimento e le varianti `V-IRR`, `V-FISSO`, `V-VOLO`: vista viaggio, vista giorno, mappa del giorno (Leaflet con le tessere di OpenStreetMap) e dettaglio degli elementi. I dati sono quelli di `packages/engine/data/reference`, caricati e validati con il motore; con dati non validi la web app mostra gli errori del motore. L'unica chiamata di rete sono le tessere della mappa, nel browser: la politica di sicurezza dei contenuti blocca tutto il resto e la telemetria di Next.js è disattivata.

| Cartella | Contenuto |
| --- | --- |
| `apps/web/app` | Pagine (App Router): scelta del viaggio, viaggio, giorno, elemento; Demo, proposta, versioni; azioni lato server (`app/demo/azioni.ts`) |
| `apps/web/src/dati` | Caricamento e validazione dei dati con `@travelops/engine`; scenari S1–S8 e dati di contesto di riferimento |
| `apps/web/src/stato` | Stato locale in `apps/web/.data/stato.json` e operazioni della Demo (avvia, orologio, accetta, rifiuta, ripristina) |
| `apps/web/src/viste` | Dati per le viste e per la mappa, senza React |
| `apps/web/src/componenti` | Componenti React e mappa Leaflet |
| `apps/web/test` | Test (Vitest) dei criteri di accettazione, senza browser e senza rete |

`npm run build` compila anche la web app (le pagine dei viaggi di riferimento sono generate in modo statico, quelle della Demo e delle versioni a ogni richiesta); `npm run start --workspace @travelops/web` la avvia dopo la build.

### Demo: imprevisti, proposte e versioni

La pagina **Demo** (`/demo`) mostra il motore all'opera (REQ-WEB-002):

1. Imposta l'**orologio simulato** (data e ora correnti del viaggio): è il momento con cui si accettano le proposte.
2. **Avvia** uno degli scenari S1–S8: la web app carica il suo itinerario di partenza (versione 1 o variante) e mostra la proposta del motore con imprevisto, impatto, modifiche (prima → dopo), itinerario risultante del giorno, spiegazione, esito con i problemi, elementi a rischio e alternative. I link delle alternative si aprono in una nuova scheda solo su clic.
3. **Accetta** (con il nome di chi accetta, predefinito "Viaggiatore") o **Rifiuta**. Accettare crea una nuova versione; accettare una proposta costruita su una versione non più corrente mostra il messaggio di proposta superata.
4. **Versioni** (`/versioni`): elenco con numero, momento, causa e autore e confronto tra due versioni. **Itinerario corrente** (`/itinerario`) porta alla versione corrente; nella vista giorno di una versione i problemi di fattibilità sono segnalati accanto agli elementi coinvolti.
5. **Ripristina** torna all'itinerario di partenza, con la sola versione 1.

Proposte, controlli e versioni vengono tutti dal motore: la web app li mostra e salva lo stato. Lo stato (viaggio di partenza, scenario in corso, orologio, storico esportato con `esportaStorico` e proposte) è nel file `apps/web/.data/stato.json`, escluso da Git: sopravvive al riavvio della web app. Per ricominciare da zero basta "Ripristina" o cancellare la cartella `apps/web/.data`. Nell'ondata 2 il file sarà sostituito dal database.

L'integrazione continua (`.github/workflows/ci.yml`) esegue build e test a ogni push e a ogni pull request verso `main`.
