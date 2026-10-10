# Prove di consegna: ST-QA-FIX-016-FOLLOWUP

## Cosa è stato chiesto

Dopo ST-QA-FIX-016 due prove della web app erano rosse su main: `data001-accesso` (le pagine non devono usare la base dati direttamente) e `ux003a-ca2-viaggi-utente` (una bozza su `/viaggi/<id>` resta «non trovata»).

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Accesso ai dati | `apps/web/src/dati/viaggi-salvati.ts` | Nuova funzione `viaggioSalvatoNonLeggibile(cartella, chiave, bozza)`: legge il viaggio salvato dallo strato dati e dice se è del tipo cercato. |
| Pagine | `apps/web/app/bozza/[viaggio]/page.tsx`, `apps/web/app/viaggi/[viaggio]/page.tsx` | Usano la funzione al posto di `trovaViaggio` e `usaBaseDati`; la spiegazione dei dati non validi di FIX-016 resta. In `/bozza` solo per le bozze, in `/viaggi` solo per i viaggi confermati: una bozza su `/viaggi/<id>` resta «Pagina non trovata». |
| Prove | `apps/web/test/data001-accesso.test.ts`, `apps/web/test/ux003a-ca2-viaggi-utente.test.tsx` | Non modificate: tornano verdi. |

Nessuna nuova dipendenza.

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Suite unit della web app | `cd apps/web && npx vitest run` | 120 file, 781 test, 0 fallimenti (log in `ST-QA-FIX-016-FOLLOWUP/test-fix.log`) |
| Tipi | `cd apps/web && npx tsc --noEmit -p tsconfig.json` | nessun errore (log in `ST-QA-FIX-016-FOLLOWUP/tsc.log`) |
| App compilata | `npm run build`, poi `GET /` e `GET /pianifica` sull'app avviata | 200 e 200 (log in `ST-QA-FIX-016-FOLLOWUP/http.log`) |

## Limiti

Gli e2e completi si eseguono dopo il merge, su main aggiornato.
