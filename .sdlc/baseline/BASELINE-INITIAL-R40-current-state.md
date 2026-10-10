# BASELINE-INITIAL-R40 Current State

Status: approved
Kind: existing-project

## Summary
Snapshot aggiornato con i file entrati su main (qa001c, integ001, newd4, newd9)

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

## Changes Since BASELINE-INITIAL-R39
Added 11, changed 15, removed 0.

### From Delivered Stories
- added: apps/web/e2e/qa001c-difetti.ts (story ST-QA-001C, commit 95f55753014277b6b55e7b71537af4de7aba3b84)
- added: apps/web/e2e/qa001c-imprevisti.e2e.ts (story ST-QA-001C, commit 95f55753014277b6b55e7b71537af4de7aba3b84)
- added: apps/web/e2e/qa001c-oggi-monitoraggio.e2e.ts (story ST-QA-001C, commit 95f55753014277b6b55e7b71537af4de7aba3b84)
- added: apps/web/e2e/qa001c-viaggi-versioni.e2e.ts (story ST-QA-001C, commit 95f55753014277b6b55e7b71537af4de7aba3b84)
- added: apps/web/src/servizi/link-prenotazione.ts (story ST-INTEG-001-FIX-TB-REAL-005, commit 1dcdaa46b591942397ff75930515c54e294424e2)
- added: apps/web/test/integ001-voli-reali.test.tsx (story ST-INTEG-001-FIX-TB-REAL-005, commit 1dcdaa46b591942397ff75930515c54e294424e2)
- added: apps/web/test/newd4-tempo-massimo.test.ts (story ST-CAT-002-FIX-TB-NEW-D4, commit 860ec195039c1aacb34aff248115e6de72a1483c)
- added: apps/web/test/newd9-nomi-accessibili.test.tsx (story ST-CAT-002-FIX-TB-NEW-D9, commit 62dfc71c491645ef53730ec68bc2a173de275db2)
- added: apps/web/test/obs001b-fix-xpage005-menu-corrente.test.tsx (story ST-OBS-001B-FIX-TB-XPAGE-005, commit b5c782aac2f46362b7b82f5833bc5581c259bad2)
- added: packages/sources/src/tempo-massimo.ts (story ST-CAT-002-FIX-TB-NEW-D4, commit 860ec195039c1aacb34aff248115e6de72a1483c)
- added: packages/sources/test/tempo-massimo.test.ts (story ST-CAT-002-FIX-TB-NEW-D4, commit 860ec195039c1aacb34aff248115e6de72a1483c)
- changed: apps/web/e2e/e2e.config.json (story ST-OBS-001B-FIX-TB-XPAGE-005, commit b5c782aac2f46362b7b82f5833bc5581c259bad2)
- changed: apps/web/e2e/ux003b-home-oggi.e2e.ts (story ST-DEMO-001B-FIX-TB-NEW-D6, commit 5acdb19cb9ce33bf61417065d6e913557ff6ed4e)
- changed: apps/web/e2e/ux004b-interfaccia.e2e.ts (story ST-DEMO-001B-FIX-TB-NEW-D6, commit 5acdb19cb9ce33bf61417065d6e913557ff6ed4e)
- changed: apps/web/src/componenti/SceltaDestinazione.tsx (story ST-CAT-002-FIX-TB-NEW-D9, commit 62dfc71c491645ef53730ec68bc2a173de275db2)
- changed: apps/web/src/dati/viaggi-salvati.ts (story ST-DEMO-001B-FIX-TB-NEW-D6, commit 5acdb19cb9ce33bf61417065d6e913557ff6ed4e)
- changed: apps/web/src/destinazioni/sorgente.ts (story ST-CAT-002-FIX-TB-NEW-D4, commit 860ec195039c1aacb34aff248115e6de72a1483c)
- changed: apps/web/src/ui/Navigazione.tsx (story ST-OBS-001B-FIX-TB-XPAGE-005, commit b5c782aac2f46362b7b82f5833bc5581c259bad2)
- changed: apps/web/src/viste/elemento.ts (story ST-INTEG-001-FIX-TB-REAL-005, commit 1dcdaa46b591942397ff75930515c54e294424e2)
- changed: apps/web/src/viste/giorno.ts (story ST-INTEG-001-FIX-TB-REAL-005, commit 1dcdaa46b591942397ff75930515c54e294424e2)
- changed: apps/web/src/viste/proposta.ts (story ST-INTEG-001-FIX-TB-REAL-005, commit 1dcdaa46b591942397ff75930515c54e294424e2)
- changed: apps/web/test/ux003a-ca2-viaggi-utente.test.tsx (story ST-DEMO-001B-FIX-TB-NEW-D6, commit 5acdb19cb9ce33bf61417065d6e913557ff6ed4e)
- changed: packages/sources/src/index.ts (story ST-CAT-002-FIX-TB-NEW-D4, commit 860ec195039c1aacb34aff248115e6de72a1483c)
- changed: packages/sources/src/servizi/configurazione.ts (story ST-CAT-002-FIX-TB-NEW-D4, commit 860ec195039c1aacb34aff248115e6de72a1483c)
- changed: packages/sources/src/servizi/registro.ts (story ST-CAT-002-FIX-TB-NEW-D4, commit 860ec195039c1aacb34aff248115e6de72a1483c)
- changed: packages/sources/test/servizi/servizi.test.ts (story ST-CAT-002-FIX-TB-NEW-D4, commit 860ec195039c1aacb34aff248115e6de72a1483c)

### Needs Review
- None

## Open Questions
- None

## Caveats
- This is inferred from repository files and imported documents.
- Historical authorship, prior approvals, and rationale are unknown unless present in evidence files.

## Approval Guidance
Approve this baseline only after the user confirms which inferred facts are canonical. Use bootstrap only for migration/provisional records.
