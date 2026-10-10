# BASELINE-INITIAL-R30 Current State

Status: approved
Kind: existing-project

## Summary
Baseline per ST-OBS-001A-FIX1

## Product Signal
TravelOps: assistente di viaggio che costruisce itinerari verificati e li ripianifica davanti agli imprevisti.

## Architecture And Component Signals
- Source root: packages
- Source root: apps
- docs/requirements/REQ-EDIT-001-modifiche-richieste.md: REQ-EDIT-001 — Modifiche richieste dal viaggiatore > Obiettivo > Operazioni > Regole > Risultati attesi > Criteri di accettazione > Campi per il plugin
- docs/requirements/REQ-FEAS-001-fattibilita.md: REQ-FEAS-001 — Controllo di fattibilità > Obiettivo > Operazioni > Regole > Criteri di accettazione > Campi per il plugin
- docs/requirements/REQ-FOUND-001-fondamenta.md: REQ-FOUND-001 — Fondamenta del progetto > Obiettivo > Struttura del repository > Criteri di accettazione > Campi per il plugin
- docs/requirements/REQ-ITIN-001-modello-catalogo.md: REQ-ITIN-001 — Modello dell'itinerario e catalogo > Obiettivo > Operazioni > Regole di validità strutturale > Criteri di accettazione > Campi per il plugin
- docs/requirements/REQ-ITIN-002-versioni-storico.md: REQ-ITIN-002 — Versioni e storico > Obiettivo > Operazioni > Regole > Criteri di accettazione > Campi per il plugin
- docs/requirements/REQ-REPLAN-001-impatto.md: REQ-REPLAN-001 — Impatto degli imprevisti > Obiettivo > Operazioni > Regole > Criteri di accettazione > Campi per il plugin
- docs/requirements/REQ-REPLAN-002-ripianificazione.md: REQ-REPLAN-002 — Ripianificazione minima con spiegazione > Obiettivo > Operazioni > Regole generali > Sostituzione di un'attività (`METEO_AVVERSO`, `CHIUSURA_LUOGO`) > Ritardo (`RITARDO`) > Cancellazione di uno spostamento (`CANCELLAZIONE_SPOSTAMENTO`) > Alternative con link > Risultati attesi > Criteri di accettazione > Campi per il plugin
- docs/requirements/REQ-WEB-001-consultazione.md: REQ-WEB-001 — Web app: consultazione dell'itinerario > Obiettivo > Funzionalità > Criteri di accettazione > Campi per il plugin
- docs/requirements/REQ-WEB-002-proposte-demo.md: REQ-WEB-002 — Web app: proposte, versioni e pagina Demo > Obiettivo > Funzionalità > Criteri di accettazione > Campi per il plugin
- docs/requirements/dati-di-riferimento.md: TravelOps — Dati di riferimento e scenari > 1. Viaggio > 2. Catalogo > 2.1 Zone > 2.2 Luoghi > 2.3 Attività > 3. Dati di contesto > 3.1 Tempi di percorrenza (minuti, validi nei due sensi) > 3.2 Meteo di riferimento > 3.3 Chiusure straordinarie di riferimento > 4. Itinerario (versione 1) > 5. Varianti
- docs/requirements/modello-dominio.md: TravelOps — Modello del dominio e regole comuni del motore > 1. Glossario > 2. Modello > 2.1 Viaggio, giorni, elementi > 2.2 Catalogo > 2.3 Dati di contesto > 2.4 Imprevisti > 2.5 Orari > 2.6 Problemi, proposte, alternative > 3. Regole comuni del motore
- docs/requirements/visione.md: TravelOps — Visione del proof of concept > 1. Obiettivo > 2. Principi > 3. Mappa dei requisiti > 4. Sequenza e parallelismo > 5. Ondate 2 e 3 (da dettagliare) > 6. Fuori dal PoC > 7. Scelte tecniche > 8. Convenzioni per il plugin Agentic SDLC

## Detected Stack
- node: package-json (package.json)
- language: typescript (package.json)
- test-runner: vitest (package.json)
- automation: npm-scripts (package.json)

## Key Files
- .github/workflows/ci.yml (01ccde56f9019e1956f2200606837586c99296171ea5a88c1de39ecd3286589f)
- package-lock.json (01c8d3d86153aaef967b30178b89af9aa250e981ddbdeaf6733d78681d5860e2)
- package.json (00a9da0b156d1a9f1d4f08646ffae4d2d3758a9767355d149a423757d9766c17)
- README.md (80fbf49d12edbd306cb2ff165b2e27b9fc502127f34de8e10609bef95e1b9485)

## Imported Documents
- docs/requirements/REQ-EDIT-001-modifiche-richieste.md: REQ-EDIT-001 — Modifiche richieste dal viaggiatore; sections REQ-EDIT-001 — Modifiche richieste dal viaggiatore > Obiettivo > Operazioni > Regole > Risultati attesi > Criteri di accettazione > Campi per il plugin; evidence 4e2b3d161ef9eacd536cd530fe4124c8f2462924f2be4c6be424f124fed2e9cd
- docs/requirements/REQ-FEAS-001-fattibilita.md: REQ-FEAS-001 — Controllo di fattibilità; sections REQ-FEAS-001 — Controllo di fattibilità > Obiettivo > Operazioni > Regole > Criteri di accettazione > Campi per il plugin; evidence f700d672654cd76bbea3e5037b109120bdddcd7ab71509858ecfd61ec0be5f4f
- docs/requirements/REQ-FOUND-001-fondamenta.md: REQ-FOUND-001 — Fondamenta del progetto; sections REQ-FOUND-001 — Fondamenta del progetto > Obiettivo > Struttura del repository > Criteri di accettazione > Campi per il plugin; evidence 2941442f48fc066b12362c649842bb0db70577214d67529e6263b88b64144b86
- docs/requirements/REQ-ITIN-001-modello-catalogo.md: REQ-ITIN-001 — Modello dell'itinerario e catalogo; sections REQ-ITIN-001 — Modello dell'itinerario e catalogo > Obiettivo > Operazioni > Regole di validità strutturale > Criteri di accettazione > Campi per il plugin; evidence f68635e6295f06504b3c7381f992e6b58f2127260d2d95f254232bf13a726456
- docs/requirements/REQ-ITIN-002-versioni-storico.md: REQ-ITIN-002 — Versioni e storico; sections REQ-ITIN-002 — Versioni e storico > Obiettivo > Operazioni > Regole > Criteri di accettazione > Campi per il plugin; evidence 107331c21a5507928e71abcd8b737030544374a2237b4e36c3d05f3c7fa3c3a4
- docs/requirements/REQ-REPLAN-001-impatto.md: REQ-REPLAN-001 — Impatto degli imprevisti; sections REQ-REPLAN-001 — Impatto degli imprevisti > Obiettivo > Operazioni > Regole > Criteri di accettazione > Campi per il plugin; evidence ca2a95b84e1e69f953844177c4fee105466db5e4f6eeda87ca01a4fc9463f1e6
- docs/requirements/REQ-REPLAN-002-ripianificazione.md: REQ-REPLAN-002 — Ripianificazione minima con spiegazione; sections REQ-REPLAN-002 — Ripianificazione minima con spiegazione > Obiettivo > Operazioni > Regole generali > Sostituzione di un'attività (`METEO_AVVERSO`, `CHIUSURA_LUOGO`) > Ritardo (`RITARDO`) > Cancellazione di uno spostamento (`CANCELLAZIONE_SPOSTAMENTO`) > Alternative con link > Risultati attesi > Criteri di accettazione > Campi per il plugin; evidence da3f6dc070bdf79f6a2841de1daf39d4059d23f3a8a73a68ee3acea1e5b20ef6
- docs/requirements/REQ-WEB-001-consultazione.md: REQ-WEB-001 — Web app: consultazione dell'itinerario; sections REQ-WEB-001 — Web app: consultazione dell'itinerario > Obiettivo > Funzionalità > Criteri di accettazione > Campi per il plugin; evidence e5676b98ae55c075c97d5f9f78796489e8c403c22972018a4e0d1a6c55d80559
- docs/requirements/REQ-WEB-002-proposte-demo.md: REQ-WEB-002 — Web app: proposte, versioni e pagina Demo; sections REQ-WEB-002 — Web app: proposte, versioni e pagina Demo > Obiettivo > Funzionalità > Criteri di accettazione > Campi per il plugin; evidence 4538c963eadb9796ada740ad6fab3e9ce1b7efb28dd9f6596b3de257df34d47d
- docs/requirements/dati-di-riferimento.md: TravelOps — Dati di riferimento e scenari; sections TravelOps — Dati di riferimento e scenari > 1. Viaggio > 2. Catalogo > 2.1 Zone > 2.2 Luoghi > 2.3 Attività > 3. Dati di contesto > 3.1 Tempi di percorrenza (minuti, validi nei due sensi) > 3.2 Meteo di riferimento > 3.3 Chiusure straordinarie di riferimento > 4. Itinerario (versione 1) > 5. Varianti; evidence 9cb73e962be611d6483c926e18cd26f6449fe5f7f92775030d35a6ce5dc74467
- docs/requirements/modello-dominio.md: TravelOps — Modello del dominio e regole comuni del motore; sections TravelOps — Modello del dominio e regole comuni del motore > 1. Glossario > 2. Modello > 2.1 Viaggio, giorni, elementi > 2.2 Catalogo > 2.3 Dati di contesto > 2.4 Imprevisti > 2.5 Orari > 2.6 Problemi, proposte, alternative > 3. Regole comuni del motore; evidence 74740312c0094eb14fc1b7f6be08259eedbb59299a9d5290ceb88ee54cb14dc3
- docs/requirements/visione.md: TravelOps — Visione del proof of concept; sections TravelOps — Visione del proof of concept > 1. Obiettivo > 2. Principi > 3. Mappa dei requisiti > 4. Sequenza e parallelismo > 5. Ondate 2 e 3 (da dettagliare) > 6. Fuori dal PoC > 7. Scelte tecniche > 8. Convenzioni per il plugin Agentic SDLC; evidence 4613f4ab78f112628fec73f6767d95190045af8bc5142d5473213083abb25b77
- evidence/ST-FOUND-001.md: Prove di consegna: ST-FOUND-001; sections Prove di consegna: ST-FOUND-001 > Cosa è stato chiesto > Perimetro ed esclusioni > Cosa è cambiato > Perché > Verifica > Collegamenti; evidence c87c9729697dba617709bd231866a04f567a291ae312e7c26e8049808ba48e75
- README.md: TravelOps; sections TravelOps > Prerequisiti > Avvio in 3 comandi > Installazione > Struttura > Comandi > Web app > Demo: imprevisti, proposte e versioni; evidence 80fbf49d12edbd306cb2ff165b2e27b9fc502127f34de8e10609bef95e1b9485

## Changes Since BASELINE-INITIAL-R29
Added 16, changed 27, removed 0.

### From Delivered Stories
- added: apps/web/app/qualita/log/[suite]/route.ts (story ST-OBS-001A, commit cb0a81e1c26ac66e3e0b9dcca8912b92dc044de8)
- added: apps/web/app/qualita/page.tsx (story ST-OBS-001A, commit cb0a81e1c26ac66e3e0b9dcca8912b92dc044de8)
- added: apps/web/e2e/obs001a-qualita.e2e.ts (story ST-OBS-001A, commit cb0a81e1c26ac66e3e0b9dcca8912b92dc044de8)
- added: apps/web/src/componenti/PaginaQualita.tsx (story ST-OBS-001A, commit cb0a81e1c26ac66e3e0b9dcca8912b92dc044de8)
- added: apps/web/src/qualita/rapporto.ts (story ST-OBS-001A, commit cb0a81e1c26ac66e3e0b9dcca8912b92dc044de8)
- added: apps/web/test/obs001a-pagina.test.tsx (story ST-OBS-001A, commit cb0a81e1c26ac66e3e0b9dcca8912b92dc044de8)
- added: apps/web/test/supporto-qualita.ts (story ST-OBS-001A, commit cb0a81e1c26ac66e3e0b9dcca8912b92dc044de8)
- added: apps/web/test/ux004a-accessibilita.test.tsx (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- added: apps/web/test/ux004a-leggibilita.test.tsx (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- added: packages/engine/src/planning/configurazione.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- added: packages/engine/src/planning/leggibilita.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- added: packages/engine/test/planning/leggibilita.test.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- added: packages/engine/test/planning/varieta.test.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- added: packages/engine/test/replanning/riepilogo.test.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: apps/web/app/globals.css (story ST-OBS-001A, commit cb0a81e1c26ac66e3e0b9dcca8912b92dc044de8)
- changed: apps/web/e2e/ca1-preferenze.e2e.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: apps/web/e2e/ca2-bozza.e2e.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: apps/web/e2e/ca4-oggi.e2e.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: apps/web/src/bozza/servizio.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: apps/web/src/bozza/tipi.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: apps/web/src/componenti/PaginaBozza.tsx (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: apps/web/src/componenti/PaginaProposta.tsx (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: apps/web/src/monitoraggio/servizio.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: apps/web/src/percorsi.ts (story ST-OBS-001A, commit cb0a81e1c26ac66e3e0b9dcca8912b92dc044de8)
- changed: apps/web/src/stato/operazioni.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: apps/web/src/ui/Navigazione.tsx (story ST-OBS-001A, commit cb0a81e1c26ac66e3e0b9dcca8912b92dc044de8)
- changed: apps/web/src/viste/demo.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: apps/web/src/viste/proposta.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: apps/web/test/plan002-ca1-operazioni.test.tsx (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: apps/web/test/plan002-ca2-annulla.test.tsx (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: apps/web/test/supporto-bozza.tsx (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: apps/web/test/supporto-oggi.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: apps/web/test/ux001-guscio-home.test.tsx (story ST-OBS-001A, commit cb0a81e1c26ac66e3e0b9dcca8912b92dc044de8)
- changed: packages/engine/src/model/index.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: packages/engine/src/planning/generatore.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: packages/engine/src/planning/index.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: packages/engine/src/planning/tipi.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: packages/engine/src/replanning/proposta.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: packages/engine/src/replanning/spiegazione.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: packages/engine/test/planning/generatore.test.ts (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)
- changed: packages/engine/test/planning/riferimento/bozza-PR-1-garda-2026-10-09.json (story ST-UX-004A, commit ea1cc31251c53c07d7b14b381be92a5c82a983f7)

### Needs Review
- added: apps/web/test/obs001a-rapporto.test.ts
- added: apps/web/test/obs001a-script-test.test.ts

## Open Questions
- None

## Caveats
- This is inferred from repository files and imported documents.
- Historical authorship, prior approvals, and rationale are unknown unless present in evidence files.

## Approval Guidance
Approve this baseline only after the user confirms which inferred facts are canonical. Use bootstrap only for migration/provisional records.
