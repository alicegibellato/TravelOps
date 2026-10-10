# Prove di consegna: ST-OBS-001B (REQ-OBS-001, criteri CA-3 e CA-4 parte tracce)

## Cosa è stato chiesto

REQ-OBS-001, story `ST-OBS-001B`: una pagina «Cosa hanno fatto gli agenti» che mostra, per conversazione e per viaggio, le tracce runtime di REQ-ORCH-002 (agente, strumento, input riassunto, esito, durata) (CA-3), con test automatici del rendering delle tracce (CA-4).

## Perimetro ed esclusioni

- **Comprende:** pagina `/agenti` (elenco delle conversazioni con tracce, dettaglio per conversazione `?conversazione=N` e per viaggio `?viaggio=<id>`, stato vuoto), lettura dell'elenco dalla base dati, voce «Agenti» nella navigazione.
- **Esclude:** il telefono (decisione di team: solo web app su computer, 1280 px); la scrittura delle tracce, già fatta da ST-ORCH-002; il report dei test (ST-OBS-001A).
- **Deviazioni:** due e2e esistenti contavano 4 viaggi in home; dopo ST-UX-003A (CA-2) la home mostra anche i 3 viaggi demo della base dati, quindi ora ne contano 7.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Elenco delle conversazioni con tracce (risposte, voci, errori, ultima attività) | `apps/web/src/basedati/tracce.ts`, `apps/web/src/basedati/index.ts` |
| Pagina e componente | `apps/web/app/agenti/page.tsx`, `apps/web/src/componenti/PaginaAgenti.tsx`, `apps/web/app/globals.css` |
| Percorsi e navigazione | `apps/web/src/percorsi.ts`, `apps/web/src/ui/Navigazione.tsx` |
| Intestazione con otto voci a 1280 px: voci più compatte, icona della presentazione che non si restringe (area di tocco ≥ 24 px) | `apps/web/src/ui/ui.css` |
| Test | `apps/web/test/obs001b-agenti.test.tsx`, `apps/web/e2e/obs001b-agenti.e2e.ts`, `apps/web/e2e/e2e.config.json`; aggiornati `apps/web/test/ux001-guscio-home.test.tsx`, `apps/web/e2e/ux004b-interfaccia.e2e.ts`, `apps/web/e2e/ux003b-home-oggi.e2e.ts` |

## Prove

- `npm ci && npm run build`: riuscito (CI del progetto disattivata, prova locale).
- Test unitari nel perimetro (tracce, pagina, navigazione, stile, axe): 69 superati, 0 falliti.
- e2e completi (`npm run e2e`, 1280 px): 46 superati, 0 falliti; tra questi `obs001b-agenti` (vuota, conversazione, viaggio, axe senza violazioni, nessuno scorrimento orizzontale).
- Screenshot su computer: `evidence/ST-OBS-001B/screenshots/agenti-vuota--1280px.png`, `agenti-conversazione--1280px.png`.
