# Prove di consegna: ST-OBS-001A-FIX-TB-NEW-D5

## Cosa è stato chiesto

REQ-OBS-001, fix di `ST-OBS-001A`. Caso di collaudo TB-NEW-D5: la pagina `/qualita` e i log dei test mostravano percorsi assoluti del computer con il nome utente.

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Percorso in pagina | `apps/web/src/qualita/rapporto.ts` (`percorsoVisibile`), `apps/web/src/componenti/PaginaQualita.tsx` | Il percorso del report è mostrato relativo al repository; fuori dal repository con `~` al posto della cartella personale, altrimenti solo il nome del file. |
| Log serviti | `apps/web/src/qualita/rapporto.ts` (`nascondiPercorsi`), `apps/web/app/qualita/log/[suite]/route.ts` | Dal testo del log si tolgono la radice del repository, la cartella personale e ogni `/Users/<nome>` o `/home/<nome>`. |
| Prove | `apps/web/test/obs001a-percorsi.test.ts`, `apps/web/test/obs001a-pagina.test.tsx` | Nuove prove sulle due funzioni e sul log servito; la prova della pagina si aspetta il nome del file e non il percorso assoluto. |

Nessuna nuova dipendenza. I file dei log sul disco non cambiano: si filtra solo ciò che l'app serve.

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prove mirate (inclusa la scansione axe della pagina) | `cd apps/web && npx vitest run test/obs001a-percorsi.test.ts test/obs001a-pagina.test.tsx test/obs001a-rapporto.test.ts` | 27 test verdi (6 rossi senza la fix) |
| App compilata | `cd apps/web && npm run build && npm run start -- -p 3415`, poi `curl http://localhost:3415/qualita` | 200, «reports/test-report.json», nessun `/Users/` nella pagina |
| Tipi | `cd apps/web && npx tsc --noEmit -p .` | nessun errore |

## Limiti

Suite web completa ed e2e non rieseguite (verifica minima concordata). I percorsi assoluti fuori dalla cartella personale e dal repository (per esempio sotto `/var`) nei log non sono toccati. Il caso TB-NEW-D5 va rieseguito nel collaudo di gruppo D.
