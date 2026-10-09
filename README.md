# TravelOps

Proof of concept di un assistente di viaggio che costruisce un itinerario realistico e verificato e lo mantiene aggiornato durante il viaggio, reagendo agli imprevisti con proposte motivate. Il principio: **il motore decide e verifica, l'AI interpreta e racconta.**

Visione, modello del dominio, dati di riferimento e requisiti sono in [`docs/requirements/`](docs/requirements/visione.md).

## Prerequisiti

- Node.js 20.12 o successivo per usare il motore; **22.12 o successivo per sviluppare**, perché lo richiede Vitest 5 (le versioni precedenti di Vitest hanno vulnerabilità note). La versione di riferimento è in `.nvmrc`.
- npm

## Installazione

```bash
npm ci
```

## Struttura

Monorepo con npm workspaces:

| Cartella | Contenuto |
| --- | --- |
| `packages/engine` | Il motore, pacchetto `@travelops/engine` |
| `apps/web` | La web app Next.js per consultare l'itinerario, pacchetto `@travelops/web` (REQ-WEB-001) |
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
```

Per usare un'altra porta: `PORT=3100 npm run dev` (in PowerShell: `$env:PORT=3100; npm run dev`).

## Web app

La web app (`apps/web`, Next.js con TypeScript) consulta il viaggio di riferimento e le varianti `V-IRR`, `V-FISSO`, `V-VOLO`: vista viaggio, vista giorno, mappa del giorno (Leaflet con le tessere di OpenStreetMap) e dettaglio degli elementi. I dati sono quelli di `packages/engine/data/reference`, caricati e validati con il motore; con dati non validi la web app mostra gli errori del motore. L'unica chiamata di rete sono le tessere della mappa, nel browser: la politica di sicurezza dei contenuti blocca tutto il resto e la telemetria di Next.js è disattivata.

| Cartella | Contenuto |
| --- | --- |
| `apps/web/app` | Pagine (App Router): scelta del viaggio, viaggio, giorno, elemento |
| `apps/web/src/dati` | Caricamento e validazione dei dati con `@travelops/engine` |
| `apps/web/src/viste` | Dati per le viste e per la mappa, senza React |
| `apps/web/src/componenti` | Componenti React e mappa Leaflet |
| `apps/web/test` | Test (Vitest) dei criteri di accettazione, senza browser e senza rete |

`npm run build` compila anche la web app (pagine generate in modo statico); `npm run start --workspace @travelops/web` la avvia dopo la build.

L'integrazione continua (`.github/workflows/ci.yml`) esegue build e test a ogni push e a ogni pull request verso `main`.
