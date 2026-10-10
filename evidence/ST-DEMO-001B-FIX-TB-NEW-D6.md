# Prove di consegna: ST-DEMO-001B-FIX-TB-NEW-D6

## Cosa è stato chiesto

REQ-DEMO-001 (viaggi demo), fix di `ST-DEMO-001B`. Caso di collaudo TB-NEW-D6: la home mostrava 7 card, di cui 4 con lo stesso titolo «Weekend sul Garda · 12–14 giugno 2026». Erano gli itinerari di riferimento (`versione-1`, `v-irr`, `v-fisso`, `v-volo`), cioè gli scenari della modalità presentazione, presentati come viaggi dell'utente.

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Elenco della home | `apps/web/src/dati/viaggi-salvati.ts` (`schedeHomeSulDb`) | Dei viaggi demo restano solo quelli del prodotto (Garda, Dolomiti, Roma): gli itinerari di riferimento non sono più schede. Restano raggiungibili dalla modalità presentazione e dagli indirizzi `/viaggi/<chiave>`. |
| Prova unitaria | `apps/web/test/ux003a-ca2-viaggi-utente.test.tsx` | La home elenca prima i viaggi dell'utente, poi i 3 demo del prodotto, e nessun itinerario di riferimento. |
| Prove nel browser (aggiornate) | `apps/web/e2e/ux003b-home-oggi.e2e.ts`, `apps/web/e2e/ux004b-interfaccia.e2e.ts` | Si aspettano 3 schede (titoli distinti) invece di 7. Non rieseguite in questa consegna. |

Nessuna nuova dipendenza, nessun cambio al modello dei dati. Se la base dati non si legge, la home usa ancora il ripiego con i viaggi di riferimento (invariato).

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prova unitaria della fix | `cd apps/web && npx vitest run test/ux003a-ca2-viaggi-utente.test.tsx` | 8 test verdi (2 rossi prima della fix) |
| Tipi | `cd apps/web && npx tsc --noEmit -p .` | nessun errore (dopo `npm run build --workspaces`) |

## Limiti

Suite web completa ed e2e non rieseguite (verifica minima concordata). Il caso TB-NEW-D6 va rieseguito nel collaudo di gruppo D (ST-QA-001D).
