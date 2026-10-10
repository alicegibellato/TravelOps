# Prove di consegna: ST-OBS-001B-FIX-TB-XPAGE-005

## Cosa è stato chiesto

REQ-OBS-001, fix di `ST-OBS-001B`, dal caso TB-XPAGE-005 del testbook di ST-QA-001D (`evidence/ST-QA-001D/testbook-2026-10-10.md`).

Su «Oggi» di un viaggio (`/viaggi/<chiave>/oggi`) due voci del menu avevano `aria-current="page"`: «I miei viaggi» e «Oggi». Il testbook chiede anche di verificare la voce «Agenti».

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Causa | `apps/web/src/ui/Navigazione.tsx` | La regola di «I miei viaggi» valeva per ogni `/viaggi*`, compresa la pagina Oggi di un viaggio, che appartiene anche a «Oggi». |
| Regola condivisa | `Navigazione.tsx` (`OGGI_DI_UN_VIAGGIO`) | La stessa espressione dice quando un indirizzo è Oggi di un viaggio: «Oggi» la include, «I miei viaggi» la esclude. |
| Una sola voce corrente | `Navigazione.tsx` (`Navigazione`) | `aria-current="page"` va solo alla prima voce che corrisponde, anche se in futuro due regole si sovrapponessero. |
| Prova unitaria | `apps/web/test/obs001b-fix-xpage005-menu-corrente.test.tsx` | Il menu renderizzato con 14 indirizzi (tutte le voci, «Agenti» compresa, giorno ed elemento di un viaggio, una pagina senza voce) ha esattamente la voce attesa. Prima della fix falliva su `/viaggi/*/oggi` (`['I miei viaggi', 'Oggi']`): `.sdlc/stories/ST-OBS-001B-FIX-TB-XPAGE-005/evidence/unit-prima-della-fix.txt`. |
| E2E mirati | `apps/web/e2e/e2e.config.json` | `src/ui/Navigazione.tsx` → `obs001a-qualita`, `obs001b-agenti`, `ux003b-home-oggi`. |

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prova unitaria della fix e stile del menu | `cd apps/web && npx vitest run test/obs001b-fix-xpage005-menu-corrente.test.tsx test/ux001-ca3-stile.test.tsx` | 18 test verdi |
| Tipi | `cd apps/web && npm run typecheck` | nessun errore |
| Browser (e2e) delle pagine col menu | `cd apps/web && npx vitest run -c vitest.e2e.config.ts e2e/obs001b-agenti.e2e.ts e2e/ux003b-home-oggi.e2e.ts` | 6 test verdi (2 flussi a 1280 px) |

## Limiti

Gli e2e sono stati eseguiti sulla stessa modifica prima dell'ultimo allineamento a main, che ha portato record, il Proxy di ST-UX-003A-FIX-TB-XPAGE-004 e codice del motore (scambio dei giorni), non il menu.
