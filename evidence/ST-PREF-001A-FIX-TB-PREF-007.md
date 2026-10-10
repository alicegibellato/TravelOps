# Prove di consegna: ST-PREF-001A-FIX-TB-PREF-007

## Cosa è stato chiesto

Fix di `ST-PREF-001A`. Caso di collaudo TB-PREF-007: nel percorso delle preferenze si poteva indicare un giorno di partenza già passato e il profilo veniva accettato.

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Regola nel motore | `packages/engine/src/preferences/validazione.ts` | Nuova opzione `oggi` (giorno secondo l'orologio dell'app, passato da chi chiama): un giorno di partenza precedente a oggi non è valido. Senza `oggi` le date nel passato restano accettate (profili già salvati, viaggi conclusi). |
| Giorno di oggi passato al motore | `apps/web/src/preferenze/servizio.ts`, `src/bozza/servizio.ts`, `src/bozza/server.ts`, `src/stato/archivio.ts`, `app/preferenze/azioni.ts` | Il giorno di oggi viene letto dall'orologio dell'app e inoltrato alla validazione, in salvataggio e nelle bozze. |
| Interfaccia | `app/preferenze/page.tsx`, `app/pianifica/page.tsx`, `src/componenti/PercorsoPreferenze.tsx`, `src/componenti/PassiPreferenze.tsx` | Il giorno di oggi arriva ai passi del percorso, così la data «Dal» non propone giorni passati. |
| Prove automatiche | `apps/web/test/pref001a-fix-pref007-data-passata.test.tsx`, `apps/web/test/supporto-preferenze.tsx`, `packages/engine/test/preferences/profilo.test.ts` | Casi su data passata rifiutata, oggi accettato, assenza di `oggi` invariata. |

Nessuna nuova dipendenza.

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prova mirata web | `cd apps/web && npx vitest run test/pref001a-fix-pref007-data-passata.test.tsx` | 4 test verdi |
| Preferenze del motore | `cd packages/engine && npx vitest run test/preferences` | 51 test verdi (3 file) |
| Tipi | `cd apps/web && npx tsc --noEmit -p tsconfig.json` | nessun errore |
| App compilata | `npm run build` dalla radice, poi `next start` sulla porta 3252 con servizi finti e dati vuoti; `curl` su `/` e `/preferenze` | 200 su entrambe; `/preferenze` mostra «Passo 1 di 5» |

Log in `evidence/ST-PREF-001A-FIX-TB-PREF-007/` (`test-fix.log`, `tsc.log`, `http.log`).

## Limiti

Suite completa ed e2e non rieseguite (verifica minima concordata). Il caso TB-PREF-007 va rieseguito nel collaudo. Il limite minimo della data «Dal» non compare nell'HTML generato dal server: la regola è verificata dalle prove automatiche e dalla validazione al salvataggio.
