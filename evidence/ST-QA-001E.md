# Prove di consegna: ST-QA-001E

Automazione e2e dei casi P1 del testbook (`docs/testbook/`, ST-QA-001A), desktop 1280 px, adattatori e assistente finti.

## Cosa è stato chiesto

Automatizzare i casi P1 con Playwright in `apps/web/e2e` e collegarli a `apps/web/e2e/e2e.config.json` perché girino con `e2e:mirati` (REQ-QA-001, CA-1/CA-2).

## Perimetro ed esclusioni

- Dentro: `apps/web/e2e/qa001e-*.e2e.ts`, `apps/web/e2e/e2e.config.json`, questo file e `evidence/ST-QA-001E/`.
- Fuori: correzioni del codice dell'app; casi con servizi reali (modello vero, rete esterna) che girano su PC1.

## Cosa è cambiato

| File | Casi P1 |
|---|---|
| `qa001e-coerenza-versioni.e2e.ts` | TB-XPAGE-001, TB-XPAGE-002, TB-XPAGE-003, TB-TRIP-002, TB-VER-003 |
| `qa001e-oggi-imprevisti.e2e.ts` | TB-TODAY-002, TB-TODAY-008, TB-IMPR-002/003, TB-IMPR-005, TB-IMPR-010/011 |
| `qa001e-preferenze-chat-a11y.e2e.ts` | TB-PREF-005, TB-CHAT-008, TB-A11Y-001 |

Gli altri casi P1 automatizzabili sono già coperti da e2e esistenti (`ca1`..`ca7`, `ux003a/b`, `obs001a`, `qa001c-*`).

Casi saltati, ciascuno con il motivo scritto nel test:

- TB-CHAT-007, TB-CHAT-009, TB-CHAT-010, TB-REAL-003: servizi reali (modello vero, rete esterna), solo PC1.
- TB-IMPR-013: difetto noto, «Ho un imprevisto» lavora solo sulla presentazione (ST-QA-FIX-010). Il caso è scritto e si attiva impostando `IMPR_013_DIFETTO_APERTO = false` quando la fix è consegnata.

Il file `e2e.config.json` collega i nuovi e2e alle cartelle che li riguardano; un e2e cambiato gira sempre.

## Verifica

| Comando (da `apps/web`) | Esito | Log |
|---|---|---|
| `npx vitest run -c vitest.e2e.config.ts e2e/qa001e-` | 3 file verdi, 24 prove verdi, 4 saltate | `evidence/ST-QA-001E/e2e.log` |
| `npx tsc --noEmit -p .` | nessun errore | `evidence/ST-QA-001E/tsc.log` |
| `npm run e2e:mirati -- --elenco` | sceglie i 3 e2e nuovi | `evidence/ST-QA-001E/mirati.log` |
