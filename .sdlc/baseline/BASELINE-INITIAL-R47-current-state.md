# BASELINE-INITIAL-R47 Current State

Status: approved
Kind: existing-project

## Summary
Refresh da story consegnate (QA-FIX-004B)

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
- package.json (6868701b625123dfafb77fba22b0fc28dbbd73a29a1e85bc16bb8e6be06c7b12)
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

## Changes Since BASELINE-INITIAL-R46
Added 6, changed 24, removed 0.

### From Delivered Stories
- added: apps/web/app/viaggi/[viaggio]/versioni/page.tsx (story ST-QA-FIX-004B, commit f976dad45d5d276af21cd5ff9572055303a127c2)
- added: apps/web/test/pref001a-fix-pref007-data-passata.test.tsx (story ST-PREF-001A-FIX-TB-PREF-007, commit f8aa9feb3636ebf776f2210e6f9a4341fde30e82)
- added: apps/web/test/pref001b-fix-pref002-ricarica.test.tsx (story ST-PREF-001B-FIX-TB-PREF-002, commit ff61b9a4458eae119702d7511695641fae1d412d)
- added: apps/web/test/qafix004-versioni-viaggio.test.tsx (story ST-QA-FIX-004B, commit f976dad45d5d276af21cd5ff9572055303a127c2)
- added: packages/engine/test/editing/sposta-senza-ponte.test.ts (story ST-PLAN-002-FIX-TB-PLAN-004, commit b92289ec7d711b6b00f51e17ed6b0e48ad356424)
- added: packages/engine/test/planning/ritmo-pasti.test.ts (story ST-PLAN-001-FIX-TB-PLAN-007, commit 6c10f3012ac3e824bc1b55db4e63eb7717b13314)
- changed: apps/web/app/itinerario/page.tsx (story ST-QA-FIX-004B, commit f976dad45d5d276af21cd5ff9572055303a127c2)
- changed: apps/web/app/pianifica/page.tsx (story ST-PREF-001A-FIX-TB-PREF-007, commit f8aa9feb3636ebf776f2210e6f9a4341fde30e82)
- changed: apps/web/app/preferenze/azioni.ts (story ST-PREF-001A-FIX-TB-PREF-007, commit f8aa9feb3636ebf776f2210e6f9a4341fde30e82)
- changed: apps/web/app/preferenze/page.tsx (story ST-PREF-001A-FIX-TB-PREF-007, commit f8aa9feb3636ebf776f2210e6f9a4341fde30e82)
- changed: apps/web/app/versioni/page.tsx (story ST-QA-FIX-004B, commit f976dad45d5d276af21cd5ff9572055303a127c2)
- changed: apps/web/src/bozza/server.ts (story ST-PREF-001A-FIX-TB-PREF-007, commit f8aa9feb3636ebf776f2210e6f9a4341fde30e82)
- changed: apps/web/src/bozza/servizio.ts (story ST-PREF-001A-FIX-TB-PREF-007, commit f8aa9feb3636ebf776f2210e6f9a4341fde30e82)
- changed: apps/web/src/componenti/PaginaVersioni.tsx (story ST-QA-FIX-004B, commit f976dad45d5d276af21cd5ff9572055303a127c2)
- changed: apps/web/src/componenti/PassiPreferenze.tsx (story ST-PREF-001A-FIX-TB-PREF-007, commit f8aa9feb3636ebf776f2210e6f9a4341fde30e82)
- changed: apps/web/src/componenti/PercorsoPreferenze.tsx (story ST-PREF-001A-FIX-TB-PREF-007, commit f8aa9feb3636ebf776f2210e6f9a4341fde30e82; also changed by story ST-PREF-001B-FIX-TB-PREF-002)
- changed: apps/web/src/dati/viaggi-salvati.ts (story ST-QA-FIX-004B, commit f976dad45d5d276af21cd5ff9572055303a127c2)
- changed: apps/web/src/percorsi.ts (story ST-QA-FIX-004B, commit f976dad45d5d276af21cd5ff9572055303a127c2)
- changed: apps/web/src/preferenze/servizio.ts (story ST-PREF-001A-FIX-TB-PREF-007, commit f8aa9feb3636ebf776f2210e6f9a4341fde30e82)
- changed: apps/web/src/stato/archivio.ts (story ST-PREF-001A-FIX-TB-PREF-007, commit f8aa9feb3636ebf776f2210e6f9a4341fde30e82)
- changed: apps/web/src/viste/versioni.ts (story ST-QA-FIX-004B, commit f976dad45d5d276af21cd5ff9572055303a127c2)
- changed: apps/web/test/supporto-preferenze.tsx (story ST-PREF-001A-FIX-TB-PREF-007, commit f8aa9feb3636ebf776f2210e6f9a4341fde30e82)
- changed: package.json (story ST-WEB-001-FIX-DEV-SOURCES, commit 4a3d6f50a6e50cb3b629533830b5af5297a45757)
- changed: packages/engine/src/editing/operazioni.ts (story ST-PLAN-002-FIX-TB-PLAN-004, commit b92289ec7d711b6b00f51e17ed6b0e48ad356424)
- changed: packages/engine/src/planning/generatore.ts (story ST-PLAN-001-FIX-TB-PLAN-007, commit 6c10f3012ac3e824bc1b55db4e63eb7717b13314)
- changed: packages/engine/src/planning/giornata.ts (story ST-PLAN-001-FIX-TB-PLAN-007, commit 6c10f3012ac3e824bc1b55db4e63eb7717b13314)
- changed: packages/engine/src/preferences/validazione.ts (story ST-PREF-001A-FIX-TB-PREF-007, commit f8aa9feb3636ebf776f2210e6f9a4341fde30e82)
- changed: packages/engine/test/planning/riferimento/bozza-PR-1-garda-2026-10-09.json (story ST-PLAN-001-FIX-TB-PLAN-007, commit 6c10f3012ac3e824bc1b55db4e63eb7717b13314)
- changed: packages/engine/test/planning/riferimento/bozza-PR-1-istantanea-prova-planning.json (story ST-PLAN-001-FIX-TB-PLAN-007, commit 6c10f3012ac3e824bc1b55db4e63eb7717b13314)
- changed: packages/engine/test/preferences/profilo.test.ts (story ST-PREF-001A-FIX-TB-PREF-007, commit f8aa9feb3636ebf776f2210e6f9a4341fde30e82)

### Needs Review
- None

## Open Questions
- None

## Caveats
- This is inferred from repository files and imported documents.
- Historical authorship, prior approvals, and rationale are unknown unless present in evidence files.

## Approval Guidance
Approve this baseline only after the user confirms which inferred facts are canonical. Use bootstrap only for migration/provisional records.
