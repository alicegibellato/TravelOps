# Prove di consegna: ST-FOUND-001

## Cosa è stato chiesto

Il requisito REQ-FOUND-001 "Fondamenta del progetto": un repository TypeScript/Node pronto per sviluppare TravelOps, con il motore come pacchetto, i tipi del modello e i dati di riferimento disponibili da subito, test d'esempio e integrazione continua. Story `ST-FOUND-001`, consegnata come nuova pull request da `feature/ST-FOUND-001` verso `main`.

## Perimetro ed esclusioni

- **Comprende:** monorepo npm workspaces, pacchetto `@travelops/engine`, tipi del modello (`modello-dominio.md` §2), dati di riferimento in JSON (`dati-di-riferimento.md`), test d'esempio per ogni modulo, test dei conteggi, script `demo`, GitHub Action di build e test, README, `.gitignore`, `.nvmrc`.
- **Esclude:** la logica del motore (caricamento, validazione, fattibilità, ripianificazione, versioni, modifiche), la web app, la pubblicazione su npm.
- **Deviazioni:** nessuna dal requisito. Una nota sui prerequisiti di sviluppo è nel paragrafo "Perché".

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Monorepo e configurazione | `package.json`, `package-lock.json`, `tsconfig.base.json`, `.nvmrc`, `.gitignore` |
| Pacchetto del motore | `packages/engine/package.json`, `packages/engine/tsconfig.json`, `packages/engine/src/index.ts` |
| Tipi del modello | `packages/engine/src/model/index.ts` |
| Moduli da riempire con i requisiti successivi | `packages/engine/src/{itinerary,history,feasibility,replanning,editing}/index.ts` |
| Demo a terminale | `packages/engine/src/demo/main.ts` |
| Dati di riferimento | `packages/engine/data/reference/*.json` e `README.md` |
| Test | `packages/engine/test/{itinerary,history,feasibility,replanning,editing}/*.test.ts`, `model.test.ts`, `reference-data.test.ts` |
| Integrazione continua | `.github/workflows/ci.yml` |
| Documentazione | `README.md`, `apps/README.md` |

## Perché

- **Monorepo con npm workspaces** (`packages/*`, `apps/*`), come da requisito: motore e web app condividono tipi e dati senza pubblicare pacchetti.
- **Nomi del modello in italiano**, uguali al glossario e ai codici dei documenti (`attivita`, `spostamento`, `METEO_AVVERSO`), per evitare traduzioni ambigue tra requisiti e codice.
- **Orari di apertura** come `{ sempre: true }` oppure fasce per giorno della settimana; un giorno senza fasce è chiuso.
- **Dati di riferimento** con `orarioFisso` e `priorita` sempre espliciti, così le varianti differiscono solo nei campi indicati dal documento. Nella proposta P-S1 la spiegazione è un segnaposto, perché il testo lo definisce REQ-REPLAN-002.
- **TypeScript 7**: non include più i tipi di Node in automatico, quindi `tsconfig.base.json` dichiara `"types": ["node"]`.
- **Vitest 5 invece di Vitest 3.** Il campo `engines` richiede Node 20.12 o successivo, come chiede CA-4. Vitest 3, l'ultima versione compatibile con Node 20, ha vulnerabilità note di gravità critica (GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr, GHSA-82fw-gwwq-j7x9), corrette solo da Vitest 5, che richiede Node 22.12 o successivo. Scelta: Vitest 5, con `npm audit` a 0 vulnerabilità. Per **eseguire i test** serve quindi Node 22.12 o successivo; il README lo dice e `.nvmrc` indica 22. Node 20 è fuori supporto da aprile 2026.
- **Alternativa scartata:** tenere Vitest 3 per eseguire i test anche su Node 20, accettando le vulnerabilità.

## Verifica

Eseguito su Windows 11, Node 22.22.2, npm 10.9.7, con `npm ci` da zero (`node_modules` e `dist` rimossi prima).

| Criterio | Verifica | Esito |
| --- | --- | --- |
| CA-1 `npm ci`, `npm run build`, `npm test` su clone pulito, su Windows | Eseguiti in sequenza dopo aver rimosso `node_modules` e `dist` | superato |
| CA-2 npm workspaces, motore in `packages/engine` | `package.json` (`workspaces`), `packages/engine/package.json` (`@travelops/engine`) | superato |
| CA-3 cartelle `itinerary`, `history`, `feasibility`, `replanning`, `editing` in `src` e `test`, ognuna con un test | 5 file di test d'esempio, tutti verdi | superato |
| CA-4 TypeScript `strict`, `engines` ≥ 20.12 | `tsconfig.base.json`, campo `engines` della radice e del motore | superato (vedi nota su Vitest) |
| CA-5 tipi del modello esportati da `src/model` | `test/model.test.ts` importa tipi e costanti dal pacchetto; `npm run build` produce `dist/index.d.ts` | superato |
| CA-6 dati di riferimento JSON: catalogo, contesto, versione 1, varianti, S1–S8, M1–M6, P-S1 | 9 file in `packages/engine/data/reference` | superato |
| CA-7 test dei conteggi (4 zone, 11 luoghi, 8 attività, 15 tempi, 15 elementi, 8 imprevisti, 6 modifiche) | `test/reference-data.test.ts` | superato |
| CA-8 GitHub Action su push e pull request verso `main` | `.github/workflows/ci.yml`; esecuzione sulla pull request | da verificare sulla pull request |
| CA-9 `npm run demo` stampa un messaggio di avvio | Eseguito dalla radice | superato |
| CA-10 README con prerequisiti, installazione, struttura, test e demo | `README.md` | superato |
| CA-11 `node_modules`, compilati e `.data/` esclusi da Git | `.gitignore`; `git check-ignore` su `node_modules` e `dist` | superato |

Risultato dei test: 7 file, 12 test, tutti superati. `npm audit`: 0 vulnerabilità.

## Collegamenti

- Requisito `REQ-FOUND-001` (`.sdlc/requirements/REQ-FOUND-001.json`), fonte `docs/requirements/REQ-FOUND-001-fondamenta.md`
- Story `ST-FOUND-001`
- Contratto `contract-ST-FOUND-001-implementation`
- Consegna `AUT-PR-FOUND-001` (pull request `PR-FOUND-001` su `alicegibellato/TravelOps`, branch `feature/ST-FOUND-001`)
- Fonti condivise: `docs/requirements/modello-dominio.md`, `docs/requirements/dati-di-riferimento.md`
