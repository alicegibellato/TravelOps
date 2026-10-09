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
| `apps/` | Le applicazioni; la web app arriva con REQ-WEB-001 |
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
```

L'integrazione continua (`.github/workflows/ci.yml`) esegue build e test a ogni push e a ogni pull request verso `main`.
