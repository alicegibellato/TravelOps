# Prove di consegna: ST-QA-FIX-003

## Cosa è stato chiesto

**[P2] Operazioni della bozza affidabili.** Nasce dal collaudo di Alice del 10/10/2026 (TO-010, TO-013, TO-027) e dai casi TB-PLAN-008 e TB-PLAN-009 del testbook:

- un doppio clic su un'operazione della bozza la applicava due volte (due revisioni «Più piena» di fila);
- un clic durante l'aggiornamento della pagina si perdeva;
- un'operazione che durava 3–6 s non mostrava l'attesa.

Record: story `ST-QA-FIX-003`, correzione di `ST-PLAN-002` (operazioni sulla bozza).

## Perimetro ed esclusioni

**Dentro:** `apps/web/src/componenti/PaginaBozza.tsx` e lo stile dell'indicatore di attesa in `apps/web/app/globals.css`.

**Fuori:**

- i menu che restano aperti (TO-011) e «Scambia con…» col mouse (TO-012): da riverificare con il testbook;
- le regole del motore sullo scambio dei giorni (TO-008, TO-033).

## Cosa è cambiato

- **Un'operazione alla volta.** `esegui` ha un blocco (`useRef`) che vale subito, prima che React ridisegni i pulsanti disattivati: un secondo clic mentre un'operazione è in corso non parte. Finita l'operazione, con successo o con errore, il blocco si libera.
- **Attesa sempre visibile.** «Aggiorno la bozza…» resta in vista (`position: sticky`) anche se l'operazione parte da un giorno in fondo alla pagina.

## Verifica

| Criterio | Test | Esito |
|---|---|---|
| Doppio clic: una sola operazione, «Aggiorno la bozza…» durante l'attesa, la seconda operazione possibile dopo la prima | `apps/web/test/qafix003-operazioni-bozza.test.tsx` | superato |
| L'indicatore resta visibile scorrendo | `apps/web/test/qafix003-operazioni-bozza.test.tsx` | superato |
| Operazioni e Annulla come prima | `apps/web/test/plan002-ca1-operazioni.test.tsx`, `plan002-ca2-annulla.test.tsx` | superato |

## Collegamenti

- Collaudo TO-010, TO-013, TO-027; testbook TB-PLAN-008, TB-PLAN-009.
