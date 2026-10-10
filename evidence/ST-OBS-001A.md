# Prove di consegna: ST-OBS-001A

## Cosa è stato chiesto

REQ-OBS-001, parte «report dei test visibile nell'app» (la parte sulle tracce degli agenti è ST-OBS-001B, non toccata):

1. una pagina dell'app (`/qualita`) mostra l'ultimo report dei test: totali, superati/falliti/saltati per suite (unit engine, agents, sources, web ed e2e), data, durata e link ai log;
2. il report è letto da un file JSON generato dagli script di test (`npx tsx scripts/esegui-test.ts --tipo unit`, `npx tsx scripts/esegui-test.ts --tipo e2e`) tramite un reporter; formato e percorso configurabili, nessun servizio esterno;
3. senza file (o con un file non valido) la pagina dà uno stato vuoto chiaro;
4. test unit ed e2e a 375 e 1280 px, stile coerente con il design system.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Formato, unione per suite, scrittura atomica del report | `scripts/rapporto-test.ts` |
| Reporter di Vitest | `scripts/reporter-test.ts` |
| Esecuzione delle suite, log per suite, esito «errore» se la suite si ferma prima | `scripts/esegui-test.ts`, `scripts/suite-test.json` |
| I comandi `scripts/esegui-test.ts --tipo unit` e `--tipo e2e` eseguono le suite e scrivono il report | `scripts/esegui-test.ts`, `scripts/suite-test.json` |
| Lettura e validazione del report, percorso e fuso configurabili, protezione dei log | `apps/web/src/qualita/rapporto.ts` |
| Pagina e indirizzo dei log | `apps/web/src/componenti/PaginaQualita.tsx`, `apps/web/app/qualita/page.tsx`, `apps/web/app/qualita/log/[suite]/route.ts` |
| Menu e stile (solo token) | `apps/web/src/ui/Navigazione.tsx`, `src/percorsi.ts`, `app/globals.css` |
| Test | `apps/web/test/obs001a-*.test.ts(x)`, `apps/web/e2e/obs001a-qualita.e2e.ts`; adeguati `ca1-configurazione` e `ux001-guscio-home` |
| Documentazione | `docs/report-test.md`, `apps/web/.env.example` |

## Scelte

- Il file JSON è l'unico contratto tra script e app: l'app lo valida senza fidarsi e ricalcola i totali dalle suite.
- Ogni suite aggiorna solo la propria voce: si può rilanciare una suite sola. Se una suite si ferma prima del reporter (build rotta), lo script registra «Non eseguita» con il motivo.
- I log si servono solo tramite il report e solo dentro la sua cartella (niente `../` né percorsi assoluti).
- `reports/` contiene un `.gitignore` con `*`, creato dallo script: gli esiti locali non finiscono in Git.
- Nessuna dipendenza nuova.

## Verifica

- `npx tsx scripts/esegui-test.ts --tipo unit`: engine 740, agents 133, sources 138 (+1 saltato), web 611 test superati.
- `npx tsx scripts/esegui-test.ts --tipo e2e`: 45 test superati, compresi i flussi 8 e 8b a 375 e 1280 px (menu, totali, esiti, link al log, nessuno scorrimento orizzontale, axe con contrasto, stato vuoto).
- Accessibilità (DV-ui-accessibility): axe in jsdom (`obs001a-pagina.test.tsx`) e nel browser a 375 e 1280 px (e2e).
- Passi documentati (DV-docs-executable): `docs/report-test.md` seguito alla lettera; il report è stato generato con `npx tsx scripts/esegui-test.ts --tipo unit` / `npx tsx scripts/esegui-test.ts --tipo e2e` e letto dalla pagina.
- Screenshot: `evidence/ST-OBS-001A/screenshots/qualita-{con,senza}-report--{375,1280}px.png`.

## Limiti

- Il report è locale alla macchina che lancia i test; in CI non viene pubblicato.
- Il predefinito della web app presuppone l'avvio da `apps/web`; altrimenti serve `TRAVELOPS_RAPPORTO_TEST`.
