# Prove di consegna: ST-QA-FIX-002

## Cosa è stato chiesto

**[P1] Preparazione della destinazione fallita: niente viaggio fantasma e testo coerente con le tracce** (collaudo TO-021, TO-029; testbook TB-CHAT-009, TB-CHAT-010). Su richiesta di Alice la consegna rende anche **reali di serie le destinazioni**: con la configurazione predefinita l'app conosceva solo le 3 destinazioni già pronte, e l'agente rispondeva che Lisbona o Formentera «non sono disponibili».

Record: story `ST-QA-FIX-002`, correzione di `ST-ORCH-001B` (requisito `REQ-ORCH-001`, revisione 2).

## Perimetro ed esclusioni

**Dentro:**

- `apps/web/src/destinazioni/sorgente.ts` (sorgente delle destinazioni della web app);
- `packages/agents` (`prepara_destinazione`);
- `apps/web/.env.example`.

**Fuori:**

- il guscio del viaggio creato per tenere il profilo: un viaggio senza istantanea non compare in nessuna pagina (ST-UX-003A) e non viene più legato a una destinazione non costruita;
- la sorgente reale stessa (`packages/sources`).

## Cosa è cambiato

- **Destinazioni reali di serie.** `destinazioniReali()`: senza configurazione la web app cerca e costruisce le destinazioni con Nominatim e OpenStreetMap. Restano finte quando si chiede `TRAVELOPS_GEOCODING=finto` (o `TRAVELOPS_PERCORSI=finto` senza geocoding) e sempre nei test (`VITEST`, `NODE_ENV=test`). Gli e2e le impostano già finte.
- **Ripiego sulle destinazioni pronte.** `sorgenteConPronte()` affianca alla sorgente reale quella delle destinazioni già pronte:
  - le pronte vengono prima nella ricerca e non si ricostruiscono, quindi il Lago di Garda non dipende da Overpass;
  - se la ricerca reale non risponde restano le pronte;
  - se la costruzione reale fallisce e c'è una pronta con lo stesso nome (area o destinazione), si usa quella.
- **Esito coerente con la traccia.** `prepara_destinazione` trasforma una costruzione non riuscita («non disponibile», o un'eccezione del servizio) in un errore dello strumento: la traccia registra «errore», non si salva né istantanea né profilo, e il modello riceve «Non ho preparato X: dillo al viaggiatore e proponi di riprovare tra poco». Prima rispondeva «ok» con `pronta: false`.
- **`.env.example`.** Documenta chiave, modello, assistente finto, cartella dei dati e destinazioni reali di serie (collaudo TO-025).

## Verifica

| Criterio | Test | Esito |
|---|---|---|
| Destinazioni reali di serie, finte nei test e su richiesta | `apps/web/test/qafix002-destinazioni-reali.test.ts` | superato |
| Destinazione pronta prima nella ricerca, senza ricostruirla | idem | superato |
| Costruzione reale fallita: si usa la pronta con lo stesso nome | idem | superato |
| Ricerca che regge con il servizio reale giù | idem | superato |
| Test di REQ-INTEG-001 aggiornato al nuovo predefinito (`integ001-meteo`: finto su richiesta e nei test, reale senza configurazione) | `apps/web/test/integ001-meteo.test.tsx` | superato |
| Luogo nuovo non costruito: errore dello strumento, nulla salvato (anche con un'eccezione del servizio) | idem | superato |

Prova a mano con il modello vero e i servizi reali (10/10/2026): «4 giorni a Lisbona dal 12 al 15 novembre…» ha dato destinazione pronta e bozza creata in circa 75 s.

## Collegamenti

- Collaudo TO-021, TO-025, TO-029; testbook TB-CHAT-009, TB-CHAT-010.
