# BASELINE-INITIAL-R10 Current State

Status: approved
Kind: existing-project

## Summary
Current project state after the work delivered since BASELINE-INITIAL-R9.

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
- package-lock.json (5ab210891a4f9f51b00ba6b94601ab7aea817ae38174ba1eed440926e5a1b5b6)
- package.json (717c57a3d4b5720f6968dd55e13fb3c9e1f30a58397e2598ce4a4e399ca941dd)
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
- docs/requirements/visione.md: TravelOps — Visione del proof of concept; sections TravelOps — Visione del proof of concept > 1. Obiettivo > 2. Principi > 3. Mappa dei requisiti > 4. Sequenza e parallelismo > 5. Ondate 2 e 3 (da dettagliare) > 6. Fuori dal PoC > 7. Scelte tecniche > 8. Convenzioni per il plugin Agentic SDLC; evidence a06c0f4c8c7cc0e83fc6049e41c9d007f7fb88253d14c26c695e58669fec52b3
- evidence/ST-FOUND-001.md: Prove di consegna: ST-FOUND-001; sections Prove di consegna: ST-FOUND-001 > Cosa è stato chiesto > Perimetro ed esclusioni > Cosa è cambiato > Perché > Verifica > Collegamenti; evidence c87c9729697dba617709bd231866a04f567a291ae312e7c26e8049808ba48e75
- README.md: TravelOps; sections TravelOps > Prerequisiti > Installazione > Struttura > Comandi > Web app > Demo: imprevisti, proposte e versioni; evidence 07b3a00d45b3ae54218ae66e571061f41cc2d908a772f9e39b7a927d7be17ab9

## Changes Since BASELINE-INITIAL-R9
Added 32, changed 7, removed 0.

### From Delivered Stories
- added: apps/web/app/demo/azioni.ts (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/app/demo/page.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/app/demo/proposte/[id]/page.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/app/itinerario/page.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/app/versioni/[numero]/elementi/[elemento]/page.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/app/versioni/[numero]/giorni/[data]/page.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/app/versioni/[numero]/page.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/app/versioni/page.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/src/componenti/Avvisi.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/src/componenti/ContenutiStato.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/src/componenti/PaginaDemo.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/src/componenti/PaginaProposta.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/src/componenti/PaginaVersioni.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/src/componenti/TabellaElementi.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/src/componenti/azioni.ts (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/src/dati/scenari.ts (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/src/stato/archivio.ts (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/src/stato/operazioni.ts (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/src/stato/stato.ts (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/src/viste/demo.ts (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/src/viste/proposta.ts (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/src/viste/segnalazioni.ts (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/src/viste/versioni.ts (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/test/supporto-stato.ts (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/test/web002-ca1-proposta-s1.test.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/test/web002-ca2-accettazione.test.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/test/web002-ca3-confronto.test.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/test/web002-ca4-ca5-rischio.test.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/test/web002-ca6-ca7-decisioni.test.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/test/web002-ca8-stato.test.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/test/web002-ca9-motore.test.ts (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- added: apps/web/test/web002-demo.test.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- changed: README.md (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- changed: apps/web/app/globals.css (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- changed: apps/web/app/layout.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- changed: apps/web/src/componenti/DettaglioElemento.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- changed: apps/web/src/componenti/VistaGiorno.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- changed: apps/web/src/componenti/VistaViaggio.tsx (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)
- changed: apps/web/src/percorsi.ts (story ST-WEB-002, commit d14576a74ec1060392571db2ac13043cfea053be)

### Needs Review
- None

## Open Questions
- None

## Caveats
- This is inferred from repository files and imported documents.
- Historical authorship, prior approvals, and rationale are unknown unless present in evidence files.

## Approval Guidance
Approve this baseline only after the user confirms which inferred facts are canonical. Use bootstrap only for migration/provisional records.
