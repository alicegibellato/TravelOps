# Prove di consegna: ST-CAT-002-FIX-TB-NEW-D9

Aggiornamento delle prove di `evidence/ST-CAT-002.md` (requisito `REQ-CAT-002`) per la correzione del collaudo TB-NEW-D9 (testbook `evidence/ST-QA-001D/testbook-2026-10-10.md`).

## Difetto

Nella ricerca della destinazione i risultati omonimi avevano lo stesso nome accessibile: «Trento» tre volte, uno nelle Filippine. La descrizione stava fuori dal pulsante, quindi un lettore di schermo non li distingueva (`SceltaDestinazione.tsx`).

## Cosa è cambiato

- `nomeAccessibileDestinazione()`: il nome accessibile di ogni risultato e di ogni destinazione vicina è il nome visibile seguito dalla descrizione («Trento, Agusan del Sur, Caraga, Filippine»); se la descrizione inizia già con il nome (Nominatim) si usa la descrizione. Il nome accessibile inizia sempre con il testo visibile del pulsante (WCAG 2.5.3).
- La descrizione resta visibile accanto al pulsante, con `aria-hidden` per non essere letta due volte.

Fuori perimetro: ordine e contenuto dei risultati, sorgente delle destinazioni.

## Verifica

| Criterio | Test | Esito |
|---|---|---|
| TB-NEW-D9: tre «Trento» con nomi accessibili distinti che iniziano con il testo visibile; descrizione non letta due volte; il clic prepara la destinazione | `apps/web/test/newd9-nomi-accessibili.test.tsx` (fallisce sul componente precedente) | superato |
| Componente della scelta della destinazione invariato per il resto (avanzamento, vicine, attribuzioni, ricerca, Sorprendimi) | `apps/web/test/cat002c-*.test.tsx` | superato |
| Accessibilità axe-core WCAG A/AA | `apps/web/test/ux001-ca5-axe.test.tsx`, `apps/web/test/plan002-accessibilita.test.tsx` | superato |

Comando, dalla radice: `npm test --workspace @travelops/web -- test/newd9-nomi-accessibili.test.tsx test/cat002c-avanzamento.test.tsx test/cat002c-attribuzioni.test.tsx test/cat002c-debounce.test.tsx test/cat002c-sorprendimi.test.tsx test/ux001-ca5-axe.test.tsx test/plan002-accessibilita.test.tsx` (log in `evidence/ST-CAT-002-FIX-TB-NEW-D9/test-web.log`). Nessuna chiamata di rete.
