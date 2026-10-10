# Prove di consegna: ST-E2E-001-FIX1

## Cosa è stato chiesto

REQ-E2E-001, fix di `ST-E2E-001`:

1. Le prove end-to-end (`apps/web/e2e`) scrivevano gli screenshot dentro `evidence/<story già chiusa>/screenshots`: ogni `npm run e2e` sporcava le evidenze di story certificate.
2. Due prove unitarie, `ux001-browser` e `ux001-ca6-codici`, andavano oltre il tempo massimo con tutta la suite web in parallelo (da sole passavano).

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Screenshot fuori da `evidence/` | `apps/web/e2e/supporto.ts` (`CARTELLA_SCATTI_E2E`, `cartellaScatti`), `ux003b-supporto.ts`, `ux003b-bozza-*.e2e.ts`, `ux004b-supporto.ts`, `obs001a-qualita.e2e.ts` | Gli scatti vanno in `apps/web/test-results/e2e/screenshots/<story>/`, cartella già ignorata da git. |
| Copia esplicita in evidence | `apps/web/scripts/copia-scatti.ts`, `npm run e2e:copia-scatti -- <ST-ID>` | Unico passaggio che scrive in `evidence/<story>/screenshots`; si lancia solo quando serve per una story. |
| Protezione dal ritorno del difetto | `apps/web/test/e2e-scatti-fuori-da-evidence.test.ts` | Nessun file di `e2e/` nomina la cartella `evidence` nel codice (i commenti sono esclusi); la cartella degli scatti è quella ignorata. |
| Prove robuste sotto carico | `apps/web/test/ux001-browser.test.tsx`, `ux001-ca6-codici.test.tsx` | Tempo massimo di 90 s per prova (prima 5 s predefiniti, contro circa 5 s effettivi a macchina scarica), anche per avvio e chiusura del browser. Nessuna prova è disattivata; un blocco vero fallisce comunque. Il browser resta uno per file, con rete bloccata e pagine proprie: nessuna risorsa condivisa tra file. |

## Prove

| Prova | Esito |
|---|---|
| `npm run e2e` due volte di fila | 51 test verdi (14 file); `git status evidence/` pulito dopo ogni esecuzione; 40 screenshot in `apps/web/test-results/e2e/screenshots` |
| Suite web completa (`npx vitest run`, tutti i file in parallelo) due volte di fila | 653 test verdi (94 file) a ogni esecuzione |
| Documentazione eseguibile | il comando `npm run e2e:copia-scatti -- ST-OBS-001A` è stato eseguito: copia gli scatti in `evidence/ST-OBS-001A/screenshots` (modifica poi annullata) |
