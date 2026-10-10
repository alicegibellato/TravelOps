# Prove di consegna: ST-WEB-001-FIX-TB-NEW-D1

## Cosa è stato chiesto

REQ-WEB-001, fix di `ST-WEB-001`. Caso di collaudo TB-NEW-D1: `/favicon.ico` rispondeva 404 su ogni pagina, con un errore in console del browser.

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Icona del sito | `apps/web/app/favicon.ico` | File icona 32x32 nei colori del prodotto; Next.js lo serve da solo a `/favicon.ico`. |
| Prova automatica | `apps/web/test/web001-favicon.test.ts` | Controlla che il file esista e abbia la struttura di un'icona valida (rosso senza il file). |

Nessuna nuova dipendenza, nessun cambio al codice dell'app.

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prova unitaria | `cd apps/web && npx vitest run test/web001-favicon.test.ts` | 1 test verde (1 rosso senza il file) |
| App compilata | `cd apps/web && npm run build && npm run start -- -p 3411`, poi `curl -i http://localhost:3411/favicon.ico` | 200, `image/x-icon`, 171 byte; la home risponde 200 |
| Tipi | `cd apps/web && npx tsc --noEmit -p .` | nessun errore |

## Limiti

Suite web completa ed e2e non rieseguite (verifica minima concordata). Il caso TB-NEW-D1 va rieseguito nel collaudo di gruppo D.
