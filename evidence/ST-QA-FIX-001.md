# ST-QA-FIX-001 — «Crea la mia bozza» funziona anche senza chat

## Problema (collaudo TO-004)

Senza chiave del modello, «Crea la mia bozza» in Pianifica restava per sempre su «Preparo la bozza…»: la pagina mandava la richiesta alla chat, che non era disponibile.

## Correzione

- `apps/web/app/pianifica/page.tsx`: la pagina sa se la chat è disponibile (`assistenteDaAmbienteConFinto().disponibile`) e, senza chat, passa alle preferenze l'azione del motore che crea la bozza.
- `apps/web/src/chat/PaginaPianifica.tsx`: il messaggio alla chat parte solo se la chat è disponibile; altrimenti la bozza la crea il motore e si apre la sua pagina. Se la creazione fallisce, lo scheletro «Preparo la bozza…» si spegne e la pagina spiega cosa è successo.

## Verifica

| Criterio | Test | Esito |
|---|---|---|
| Senza chat la bozza la crea il motore e si apre la sua pagina; nessun messaggio alla chat | `apps/web/test/qafix001-crea-bozza-senza-chiave.test.tsx` | superato |
| Se il motore non riesce, lo scheletro si spegne e la pagina dice cosa è successo | idem | superato |

## Collegamenti

- Collaudo TO-004 (10/10/2026).
