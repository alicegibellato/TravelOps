# Prove di consegna: ST-UX-004A (criteri CA-1 … CA-6)

## Cosa è stato chiesto

REQ-UX-004, story `ST-UX-004A`: bozze più varie e testi più umani.

1. CA-1 varietà: al massimo 2 attività dello stesso tipo di fila e nessun tragitto oltre 45 minuti tra attività vicine di valore simile, con soglie configurabili.
2. CA-2 «Da sapere» raggruppa le note uguali (gli orari non verificati compaiono una sola volta con l'elenco dei luoghi).
3. CA-3 le revisioni hanno etichette leggibili e una cronologia comprensibile invece di B1…Bn.
4. CA-4 la spiegazione delle proposte è breve (al massimo 3 frasi in evidenza) con i dettagli espandibili e senza codici interni.
5. CA-5 un ritardo che non cambia nessuna attività è una nota informativa, senza Accetta.
6. CA-6 test unitari e di integrazione.

## Cosa è stato fatto

| Criterio | Dove | Come |
|---|---|---|
| CA-1 | `packages/engine/src/planning/generatore.ts`, `configurazione.ts` | Nella scelta a giri una candidata che introduce una serie troppo lunga di attività della stessa categoria, o un tragitto più lungo della soglia tra attività con punteggi vicini, è saltata. Se il giorno resterebbe vuoto la soglia si rilassa. Soglie in `VARIETA_PREDEFINITA`, sostituibili con `OpzioniBozza.varieta`. |
| CA-2 | `planning/leggibilita.ts` (`raggruppaNoteBozza`), `apps/web/src/bozza/servizio.ts` | Gli avvisi `ORARI_DA_VERIFICARE` diventano una sola nota con i luoghi; le note uguali non si ripetono. Testo in `TESTI_NOTE`. |
| CA-3 | `planning/leggibilita.ts` (`etichettaRevisione`, `cronologiaBozza`), `PaginaBozza.tsx` | Etichette come «Più leggera lunedì» e «Sostituita Degustazione»; la pagina mostra «Ultima modifica» e la «Cronologia della bozza»; i rimandi «revisione Bn» diventano l'etichetta richiamata. Le cause salvate non cambiano. |
| CA-4 | `replanning/spiegazione.ts` (`scriviRiepilogo`), `PaginaProposta.tsx` | `Proposta.riepilogo` (al massimo 3 frasi) in evidenza; la spiegazione completa sta in «Mostra i dettagli». Nei dettagli niente codici dei problemi né id nei rimandi. Le proposte salvate prima ne ricavano uno dalla spiegazione. |
| CA-5 | `replanning/proposta.ts`, `viste/proposta.ts`, `stato/operazioni.ts` | `Proposta.informativa` per un `RITARDO` senza modifiche: la pagina mostra la nota, senza Accetta né Rifiuta; l'accettazione è rifiutata anche se forzata; in Demo lo stato è «Solo informazione». |

Note di compatibilità: i campi `riepilogo` e `informativa` sono facoltativi, nessuno schema persistente cambia. Il viaggio demo Garda generato dal motore cambia per via della varietà (aggiornato il riferimento `bozza-PR-1-garda-2026-10-09.json`); i test di Oggi fissano il proprio programma senza soglie di varietà.

## Prove

| Prova | Esito |
|---|---|
| `npm run build` | verde |
| Motore (`packages/engine`) | 760 test verdi, di cui nuovi: `varieta.test.ts`, `leggibilita.test.ts`, `replanning/riepilogo.test.ts` |
| Web (`apps/web`) | 619 test verdi, di cui nuovi: `ux004a-leggibilita.test.tsx`, `ux004a-accessibilita.test.tsx` |
| `npm run e2e` | 45 test verdi a 375 e 1280 px; il flusso Oggi verifica la nota informativa e i dettagli espandibili, il flusso Bozza la cronologia leggibile |
| Accessibilità (axe-core, WCAG A/AA) | pagina della proposta (con riepilogo e dettagli, e nota informativa) e pagina della bozza senza violazioni |
| Documentazione eseguibile | `docs/motore/pianificazione.md`, sezione «Varietà della giornata»: il comando `npx vitest run test/planning/varieta.test.ts` e l'esempio `varieta` sono stati eseguiti |

Note: sotto carico, in una esecuzione parallela completa, due test già esistenti (`ux001-browser`, `ux001-ca6-codici`) sono andati oltre il tempo massimo; da soli e nelle esecuzioni finali passano.
