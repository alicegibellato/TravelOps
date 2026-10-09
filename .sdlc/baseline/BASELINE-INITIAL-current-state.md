# BASELINE-INITIAL Current State

Status: approved
Kind: existing-project

## Summary
TravelOps: proof of concept di un assistente di viaggio, ancora senza codice. Visione, modello del dominio, dati di riferimento e 9 requisiti dell'ondata 1 e del filone web sono in docs/requirements/.

## Product Signal
# REQ-EDIT-001 — Modifiche richieste dal viaggiatore | Campo | Valore | |---|---| | Stato | Bozza per `requirement propose` | | Versione | 1.0 | | Ondata | 1 — Motore | | Dipende da | REQ-ITIN-002 REQ-FEAS-001 REQ-REPLAN-002 | | Fonti (`--source`) | questo file `modello-dominio.md` `dati-di-riferimento.md` | | Tetto di autonomia proposto | `checkpointed` | | Storia e PR | `ST-EDIT-001` una pull request | ## Obiettivo Trasformare una modifica chiesta dal viaggiatore ( aggiungi una degustazione sabato alle 16 togli il pranzo ) in una proposta con le stesse garanzie degli imprevisti controllo di fattibilità spiegazione accettazione. È il motore su cui si appoggerà la chat dell'ondata 2. La rimozione riusa la regola R-SOS-5 di REQ-REPLAN-002 perciò questo requisito viene dopo. ## Operazioni Og

## Architecture And Component Signals
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
- None

## Key Files
- None

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

## Open Questions
- None

## Caveats
- This is inferred from repository files and imported documents.
- Historical authorship, prior approvals, and rationale are unknown unless present in evidence files.

## Approval Guidance
Approve this baseline only after the user confirms which inferred facts are canonical. Use bootstrap only for migration/provisional records.
