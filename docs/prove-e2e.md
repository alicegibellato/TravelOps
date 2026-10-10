# Prove end-to-end

Le prove e2e (`apps/web/e2e/*.e2e.ts`) girano solo alla larghezza desktop di 1280 px (REQ-E2E-001-R2). La configurazione è in `apps/web/e2e/e2e.config.json`.

## Suite completa (default e gate di rilascio)

`npm run e2e` in `apps/web` esegue tutti i flussi. È la suite che conta per il rilascio.

## Build solo se cambia il codice

Prima dei flussi `e2e/prepara.ts` calcola un'impronta SHA-256 di percorsi e contenuti degli ingressi della build (`build.ingressi`: `apps/web/app`, `apps/web/src`, `packages`, `package-lock.json`, `apps/web/next.config.mjs`; le cartelle in `build.esclusi` non contano) e la confronta con quella salvata in `apps/web/.next/.e2e-hash`. Compila (`npm run build`) solo se l'impronta è diversa o la build manca, poi salva la nuova impronta. Cambiare data di modifica senza cambiare contenuto non fa ricompilare.

`TRAVELOPS_E2E_SENZA_BUILD=1` salta del tutto il controllo e usa la build presente.

## Modalità mirata

`npm run e2e:mirati` in `apps/web` esegue solo gli e2e legati ai file cambiati rispetto a `origin/main` (commit del ramo, modifiche non salvate e file nuovi). `TRAVELOPS_E2E_BASE=<ref>` cambia la base; `npm run e2e:mirati -- --elenco` stampa la scelta senza eseguire; `npm run e2e:mirati -- --file <percorso>` (ripetibile, percorso dalla radice) usa i file indicati invece di quelli cambiati.

Regole, nell'ordine:

1. file in `mirati.senzaE2e` (record `.sdlc`, `evidence`, `docs`, Markdown, test unitari): nessun e2e;
2. un file `apps/web/e2e/<nome>.e2e.ts` cambiato esegue se stesso;
3. un file che corrisponde a una o più righe di `mirati.mappa` esegue gli e2e indicati (nomi senza `.e2e.ts`, anche con glob, per esempio `ux003b-bozza-*`);
4. un file che non corrisponde a nessuna riga (per esempio stili comuni, componenti condivisi, `packages`, supporto e2e) fa girare la suite completa.

## Tabella di corrispondenza

| Cartella (glob) | E2E |
| --- | --- |
| `apps/web/{app,src}/preferenze/**` | ca1-preferenze, ca2-bozza, ca3-proposta, ux003b-bozza-*, ux003b-pianifica, ux003b-scatti, ux004b-interfaccia |
| `apps/web/{app,src}/bozza/**` | ca2-bozza, ca3-proposta, ux003b-bozza-*, ux003b-scatti, ux004b-interfaccia |
| `apps/web/{app,src}/oggi/**` | ca4-oggi, ca7-monitoraggio, ux003b-home-oggi, ux003b-scatti, ux004b-interfaccia |
| `apps/web/src/monitoraggio/**` | ca7-monitoraggio |
| `apps/web/{app,src}/imprevisti/**` | ca3-proposta, ca4-oggi, ca7-monitoraggio |
| `apps/web/app/api/chat/**`, `apps/web/src/chat/**` | ca5-chat |
| `apps/web/app/pianifica/**` | ca5-chat, ux003b-pianifica, ux003b-scatti |
| `apps/web/{app,src}/demo/**` | ca6-presentazione, ux003b-home-oggi, ux003b-scatti, ux004b-interfaccia |
| `apps/web/app/destinazione/**` | ux004b-interfaccia |
| `apps/web/{app,src}/qualita/**` | obs001a-qualita |

Un nuovo e2e o una nuova cartella si aggiungono solo a `e2e.config.json` (e a questa tabella).

## Attese

Nessuna pausa fissa: prima di uno screenshot si attende la fine delle animazioni (`animazioniFinite`), dopo la chiusura di un menu il ritorno del focus (`attendiFocus`), entrambe in `e2e/supporto.ts`.
