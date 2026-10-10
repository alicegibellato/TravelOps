# Prove di consegna: ST-ORCH-002

## Cosa è stato chiesto

REQ-ORCH-002: un orchestratore LLM che riceve ogni messaggio e delega a Consulente, Planner, Logistica (nuovo) e Gestione imprevisti. Senza chiave ripiega in modo deterministico sulle regole, e traccia ogni delega e ogni chiamata a strumento.

Record: requisito `REQ-ORCH-002`, story `ST-ORCH-002`.

## Perimetro ed esclusioni

**Dentro:**

- `packages/agents`: orchestrazione con il modello e ripiego, agente Logistica con lo strumento `stima_spostamento`, tracce della risposta;
- `apps/web`: la chat con la chiave usa l'orchestrazione con il modello e salva le tracce nella base dati (migrazione 2, tabella `tracce_agenti`).

**Fuori:**

- la pagina «Cosa hanno fatto gli agenti» e il report dei test (REQ-OBS-001, ST-OBS-001B);
- gli adattatori dei servizi esterni (REQ-INTEG-001): la Logistica li usa attraverso una porta con la stessa forma di `ServizioPercorsi`.

## Cosa è cambiato

- **Orchestratore con il modello (CA-1).** `scegliAgente` ha l'opzione `orchestrazione`:
  - con `"modello"` chiede al modello, per ogni messaggio, a quale dei quattro agenti delegare (strumento `scegli_agente`), anche dove le regole deciderebbero da sole;
  - con `"regole"` (il predefinito) tiene il comportamento di REQ-ORCH-001 e le conversazioni registrate della demo.

  La web app con la chiave (`assistenteDaAmbiente`) usa `"modello"` e passa alla Logistica il servizio dei percorsi di REQ-INTEG-001 (`serviziEsterni().percorsi`). Il servizio è finto, senza rete, finché `TRAVELOPS_PERCORSI` non vale `reale`.
- **Agente Logistica (CA-2).** Il nuovo agente risponde su come muoversi tra i posti del viaggio: tempi, mezzi, distanze e trasferimenti. Ha gli strumenti `stima_spostamento`, `cerca_catalogo`, `leggi_viaggio`, `opera_bozza` e `proponi_modifica`. `stima_spostamento` è in sola lettura e prende i dati da tre fonti:
  - i tempi dei dati di contesto del motore (`ContestoMotore`, la stessa sorgente delle bozze);
  - la distanza in linea d'aria dalle coordinate;
  - con il servizio dei percorsi di REQ-INTEG-001 (`percorsi`), anche i tempi e i km su strada a piedi e in auto.

  Se il servizio non risponde, la stima resta quella dei dati di contesto.
- **Ripiego senza chiave (CA-3).** Se il modello non è disponibile (chiave assente o rifiutata, rete, servizio) o non sceglie un agente valido, la scelta torna alle regole di REQ-ORCH-001. Se non bastano, valgono le parole chiave: le domande sugli spostamenti vanno alla Logistica, gli imprevisti alla Gestione imprevisti. La chat resta usabile e i pulsanti funzionano come prima.
- **Tracce (CA-4).** Ogni risposta (`fine.tracce`) elenca:
  - la delega: agente, motivo, modo regole/modello/ripiego;
  - ogni chiamata a strumento: agente, strumento, argomenti riassunti in al massimo 200 caratteri, esito ok o errore con il messaggio, durata in ms e inizio.

  La web app le salva in `tracce_agenti`, per conversazione e numero di risposta, e le rilegge per conversazione o per viaggio (`tracceDellaConversazione`, `tracceDelViaggio`) per la pagina di REQ-OBS-001.

## Verifica

| Criterio | Test | Esito |
|---|---|---|
| CA-1 il modello sceglie l'agente di ogni messaggio | `packages/agents/test/agenti/orch002.test.ts` (delega a ciascuno dei quattro agenti) | superato |
| CA-2 Logistica con tempi, mezzi e distanze | `packages/agents/test/agenti/orch002.test.ts` (contesto, porta dei percorsi, servizio giù, luogo sconosciuto) | superato |
| CA-3 ripiego deterministico senza chiave | `packages/agents/test/agenti/orch002.test.ts` (chiave mancante, risposta a parole, agente inesistente, chat senza chiave) | superato |
| CA-4 tracce di deleghe e strumenti | `packages/agents/test/agenti/orch002.test.ts`, `apps/web/test/orch002-tracce.test.ts` | superato |
| CA-5 client finto: quattro agenti e ripiego | `packages/agents/test/agenti/orch002.test.ts` | superato |

I test già esistenti restano verdi:

- agenti: 147 test;
- migrazioni della base dati: i test contano ora le migrazioni invece di assumerne una.

Il plugin registra build, suite completa e scansione dei segreti.

## Collegamenti

- Requisito `REQ-ORCH-002`, story `ST-ORCH-002`; segue ST-ORCH-001C (instradamento a regole) e usa la porta dei percorsi di ST-INTEG-001.
- Prossimo passo: ST-OBS-001B, la pagina «Cosa hanno fatto gli agenti» sulle tracce salvate.
