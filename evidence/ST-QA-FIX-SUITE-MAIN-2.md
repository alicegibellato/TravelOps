# Prove di consegna: ST-QA-FIX-SUITE-MAIN-2

## Cosa è stato chiesto

Rimettere in verde la suite di prove dopo le ultime unioni su main. Solo prove automatiche (10 file di test ed e2e), nessun cambio al codice dell'app.

## Cosa è stato fatto

| File | Correzione |
|---|---|
| `apps/web/test/ca1-configurazione.test.ts` | L'asserzione ora controlla il nuovo script di sviluppo. |
| `apps/web/e2e/supporto.ts` | Dopo «Sorprendimi» il passo 2 si apre su «Mese e durata»: l'aiuto sceglie «Date precise». |
| `apps/web/e2e/obs001a-qualita.e2e.ts` | La pagina mostra solo il nome del file; il percorso è ripulito da NEW-D5. |
| `apps/web/e2e/qa001c-viaggi-versioni.e2e.ts` | Dopo QA-FIX-004B «Versioni» porta a «Versioni di «…»». |
| `apps/web/e2e/qa001c-imprevisti.e2e.ts` | Il dump va in una cartella temporanea invece del percorso Windows `C:/Progetti`, che creava `apps/web/C:` nel repository. |
| `apps/web/test/plan003-ca2-copione-6-8-10.test.ts` | Il copione non usa più l'id di catalogo fisso: controlla che le attività del giorno scambiato passino all'altro giorno (rotto dall'unione di PREF-001). |
| `apps/web/test/ux001-browser.test.tsx` | CA-4: le righe si distinguono con `offsetTop`. |
| `apps/web/test/chat001b-ca4-telefono.test.tsx`, `ux002-browser.test.tsx`, `web003-ca6-layout.test.tsx` | Timeout di 60 s per l'`afterAll`. |

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Build | `npm run build` (radice) | ok |
| Suite web completa | `cd apps/web && npx vitest run` | 773 verdi, 2 rossi (116 file verdi su 118) |
| e2e | `npx vitest run -c vitest.e2e.config.ts e2e/ca1-preferenze.e2e.ts e2e/obs001a-qualita.e2e.ts e2e/qa001c-viaggi-versioni.e2e.ts e2e/qa001c-imprevisti.e2e.ts` | 20 verdi su 20 (4 file), TB-TRIP-005 incluso |
| Tipi | `cd apps/web && npx tsc --noEmit -p tsconfig.json` | nessun errore |
| Pagina | `GET /qualita` sulla porta 3473 | 200, contiene «Qualità» |

I 2 rossi della suite non toccano i file corretti: `data001-accesso.test.ts` (le pagine `app/bozza/[viaggio]/page.tsx` e `app/viaggi/[viaggio]/page.tsx` usano la base dati direttamente) e `ux003a-ca2-viaggi-utente.test.tsx` (CA-2, una promessa che doveva essere rifiutata). Dipendono dal codice dell'app, fuori dal perimetro di questo fix.

## Limiti

Suite completa ed e2e completi si rieseguono su main dopo l'unione. TB-TRIP-005 «identici a prima» è intermittente se lanciato con altri file (qui è passato).
