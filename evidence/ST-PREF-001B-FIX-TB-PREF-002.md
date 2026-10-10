# Prove di consegna: ST-PREF-001B-FIX-TB-PREF-002

## Cosa è stato chiesto

REQ-PREF-001, fix di `ST-PREF-001B`. Caso di collaudo TB-PREF-002: dopo il ricaricamento della pagina il percorso delle preferenze ripartiva dal passo 3 ma con il riepilogo su «Da scegliere», perché le scelte già fatte (destinazione e date) andavano perse.

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Bozza ricordata nel browser | `apps/web/src/componenti/PercorsoPreferenze.tsx` | Le scelte vengono tenute in `sessionStorage` insieme al passo e riprese al ricaricamento. Se la pagina parte da un profilo già salvato vale quello. La bozza si svuota dopo «Crea la mia bozza». Se la memoria non è disponibile, il comportamento resta quello di prima. |
| Prova automatica | `apps/web/test/pref001b-fix-pref002-ricarica.test.tsx` | Ricarica la pagina al passo 3 e controlla che passo, destinazione e date restino e che il profilo salvato non cambi (rosso senza la correzione). |

Nessuna nuova dipendenza.

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prova unitaria | `cd apps/web && npx vitest run test/pref001b-fix-pref002-ricarica.test.tsx` | 1 test verde (1 rosso senza la correzione) |
| Tipi | `cd apps/web && npx tsc --noEmit -p tsconfig.json` | nessun errore |
| App compilata | `npm run build` dalla radice, poi `node scripts/next.mjs start -p 3251 -H 127.0.0.1` con dati finti e cartella vuota; `curl` su `/` e `/preferenze` | 200 su entrambe; in `/preferenze` presenti «Passo 1 di 5» e «Dove» |

Registri in `evidence/ST-PREF-001B-FIX-TB-PREF-002/` (`test-fix.log`, `tsc.log`, `http.log`).

## Limiti

Suite completa ed e2e non rieseguite (verifica minima concordata). Il caso TB-PREF-002 va rieseguito nel collaudo.
