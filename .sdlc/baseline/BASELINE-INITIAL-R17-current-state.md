# BASELINE-INITIAL-R17 Current State

Status: approved
Kind: existing-project

## Summary
Current project state after the work delivered since BASELINE-INITIAL-R16.

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
- package-lock.json (07945aad87b5a226601b5220444de0f8c1cc75e135b3ddf0a9b7f85ab72f2d04)
- package.json (99e37286a87d9fea085ee614e1066c0eae13994d58e6ffd2f27dc9d5532bd1bb)
- README.md (07b3a00d45b3ae54218ae66e571061f41cc2d908a772f9e39b7a927d7be17ab9)

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
- README.md: TravelOps; sections TravelOps > Prerequisiti > Installazione > Struttura > Comandi > Web app > Demo: imprevisti, proposte e versioni; evidence 07b3a00d45b3ae54218ae66e571061f41cc2d908a772f9e39b7a927d7be17ab9

## Changes Since BASELINE-INITIAL-R16
Added 35, changed 20, removed 0.

### From Delivered Stories
- added: apps/web/app/api/chat/conversazioni/[id]/messaggi/route.ts (story ST-CHAT-001A, commit 37308552c4482390024996995f92852e66b6aab2)
- added: apps/web/app/api/chat/conversazioni/[id]/proposte/[proposta]/route.ts (story ST-CHAT-001A, commit 37308552c4482390024996995f92852e66b6aab2)
- added: apps/web/app/api/chat/conversazioni/[id]/route.ts (story ST-CHAT-001A, commit 37308552c4482390024996995f92852e66b6aab2)
- added: apps/web/app/api/chat/conversazioni/route.ts (story ST-CHAT-001A, commit 37308552c4482390024996995f92852e66b6aab2)
- added: apps/web/src/chat/protocollo.ts (story ST-CHAT-001A, commit 37308552c4482390024996995f92852e66b6aab2)
- added: apps/web/src/chat/server/assistente.ts (story ST-CHAT-001A, commit 37308552c4482390024996995f92852e66b6aab2)
- added: apps/web/src/chat/server/gestori.ts (story ST-CHAT-001A, commit 37308552c4482390024996995f92852e66b6aab2)
- added: apps/web/src/chat/server/servizio.ts (story ST-CHAT-001A, commit 37308552c4482390024996995f92852e66b6aab2)
- added: apps/web/src/chat/server/web-app.ts (story ST-CHAT-001A, commit 37308552c4482390024996995f92852e66b6aab2)
- added: apps/web/src/componenti/LineaTempoProposta.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- added: apps/web/src/ui/BarraDecisione.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- added: apps/web/src/ui/Cronologia.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- added: apps/web/src/ui/LinkPresentazione.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- added: apps/web/test/chat001a-assistente-modello.test.ts (story ST-CHAT-001A, commit 37308552c4482390024996995f92852e66b6aab2)
- added: apps/web/test/chat001a-ca2-proposta.test.ts (story ST-CHAT-001A, commit 37308552c4482390024996995f92852e66b6aab2)
- added: apps/web/test/chat001a-ca5-errori.test.ts (story ST-CHAT-001A, commit 37308552c4482390024996995f92852e66b6aab2)
- added: apps/web/test/chat001a-streaming.test.ts (story ST-CHAT-001A, commit 37308552c4482390024996995f92852e66b6aab2)
- added: apps/web/test/supporto-chat001a.ts (story ST-CHAT-001A, commit 37308552c4482390024996995f92852e66b6aab2)
- added: apps/web/test/web004-ca1-stato.test.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- added: apps/web/test/web004-ca2-proposta.test.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- added: apps/web/test/web004-ca3-barra.test.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- added: apps/web/test/web004-ca4-versioni.test.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- added: apps/web/test/web004-ca5-presentazione.test.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- added: apps/web/test/web004-ca6-codici.test.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- changed: apps/web/app/demo/azioni.ts (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- changed: apps/web/app/demo/page.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- changed: apps/web/app/globals.css (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- changed: apps/web/src/componenti/PaginaDemo.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- changed: apps/web/src/componenti/PaginaProposta.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- changed: apps/web/src/componenti/PaginaVersioni.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- changed: apps/web/src/componenti/azioni.ts (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- changed: apps/web/src/ui/Guscio.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- changed: apps/web/src/ui/Navigazione.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- changed: apps/web/src/ui/ui.css (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- changed: apps/web/src/viste/demo.ts (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- changed: apps/web/src/viste/proposta.ts (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- changed: apps/web/test/supporto-stato.ts (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- changed: apps/web/test/ux001-guscio-home.test.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- changed: apps/web/test/web002-ca1-proposta-s1.test.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- changed: apps/web/test/web002-ca3-confronto.test.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- changed: apps/web/test/web002-ca4-ca5-rischio.test.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- changed: apps/web/test/web002-demo.test.tsx (story ST-WEB-004, commit 0db3342eda28bad2c31fb7eeb972cc829e548901)
- changed: apps/web/vitest.config.ts (story ST-CHAT-001A, commit 37308552c4482390024996995f92852e66b6aab2)

### Needs Review
- added: packages/engine/src/planning/generatore.ts
- added: packages/engine/src/planning/giornata.ts
- added: packages/engine/src/planning/index.ts
- added: packages/engine/src/planning/tipi.ts
- added: packages/engine/test/planning/dati/istantanea-prova-planning.json
- added: packages/engine/test/planning/generatore.test.ts
- added: packages/engine/test/planning/istantanea-prova.test.ts
- added: packages/engine/test/planning/riferimento.test.ts
- added: packages/engine/test/planning/riferimento/bozza-PR-1-garda-2026-10-09.json
- added: packages/engine/test/planning/riferimento/bozza-PR-1-istantanea-prova-planning.json
- added: packages/engine/test/planning/supporto.ts
- changed: packages/engine/src/index.ts

## Open Questions
- None

## Caveats
- This is inferred from repository files and imported documents.
- Historical authorship, prior approvals, and rationale are unknown unless present in evidence files.

## Approval Guidance
Approve this baseline only after the user confirms which inferred facts are canonical. Use bootstrap only for migration/provisional records.
