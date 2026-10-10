# ST-QA-FIX-018B — «Ho un imprevisto» sul viaggio dell'utente

## Problema (testbook TB-IMPR-013)

«Ho un imprevisto» lavorava sempre sul viaggio della presentazione: anche aperto dal viaggio confermato dell'utente, la scheda si precompilava su quel viaggio e la proposta, una volta accettata, creava una nuova versione della presentazione.

## Correzione

- `apps/web/src/imprevisti/viaggio-utente.ts`: il viaggio confermato dell'utente (storico, catalogo e dati di contesto della sua istantanea, momento del suo orologio) e la proposta per l'imprevisto costruita dal motore su quel viaggio e registrata tra le sue proposte.
- `apps/web/app/imprevisti/page.tsx` e `azioni.ts`: con `?viaggio=<id>` di un viaggio dell'utente la pagina lavora su quel viaggio; inviata la scheda, si apre la pagina del viaggio (`/bozza/<id>`) con la proposta da accettare o rifiutare. Senza viaggio, o per i viaggi di riferimento, resta il viaggio della presentazione.
- `apps/web/src/imprevisti/schede.ts`: `percorsoImprevisti(viaggio)` e `percorsoScheda(id, viaggio)`.
- Ingressi: il link «Ho un imprevisto» nella pagina del viaggio dell'utente, i pulsanti della vista Oggi e la pagina delle versioni del viaggio portano il viaggio.

## Verifica

| Criterio | Test | Esito |
|---|---|---|
| Dal viaggio dell'utente la scheda Maltempo lavora su quel viaggio | `apps/web/test/qafix018b-imprevisti-viaggio.test.tsx` | superato |
| La proposta nasce sul viaggio dell'utente e, accettata, crea la sua versione 2; la presentazione non cambia | idem | superato |
| Senza viaggio, o con un viaggio di riferimento, vale il viaggio della presentazione | idem | superato |

## Collegamenti

- Testbook TB-IMPR-013 (collaudo del gruppo C, 10/10/2026); sostituisce ST-QA-FIX-018, nata con il requisito del motore (REQ-REPLAN-004) mentre la correzione è nella web app (REQ-IMPR-001).
