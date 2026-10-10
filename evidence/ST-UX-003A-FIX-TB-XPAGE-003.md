# Prove di consegna: ST-UX-003A-FIX-TB-XPAGE-003

## Cosa è stato chiesto

REQ-UX-003 (CA-2: le pagine di un viaggio), fix di `ST-UX-003A`. Caso di collaudo TB-XPAGE-003 (`docs/testbook/coerenza.md`): accettata la proposta «Chiusura del MUSE», tutte le pagine devono mostrare l'alternativa al MUSE; invece `/viaggi/versione-1/giorni/2026-06-14` mostrava ancora la visita al MUSE.

Causa: per un viaggio di riferimento `caricaViaggioDellApp` (`apps/web/src/dati/viaggi-salvati.ts`) caricava l'itinerario fisso dei JSON del motore e ignorava la versione corrente dello storico della modalità presentazione. «Oggi» (`datiOggi`, `apps/web/src/oggi/operazioni.ts`) la seguiva già: le pagine del viaggio, del giorno e dell'elemento no.

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Regola unica | `apps/web/src/dati/viaggi-salvati.ts` (`viaggioDiRiferimento`) | Se il viaggio è quello di partenza della presentazione (`stato.partenza === chiave`) vale la versione corrente dello storico, altrimenti l'itinerario di riferimento. |
| Pagine del viaggio di riferimento | `apps/web/src/dati/viaggi-salvati.ts` (`caricaViaggioDellApp`) | Per un viaggio di riferimento l'esito passa da `conVersioneCorrente`: legge lo stato con `leggiStato` e applica la regola; se lo stato non si legge resta l'itinerario fisso, come prima. |
| Oggi | `apps/web/src/oggi/operazioni.ts` (`datiOggi`) | Usa la stessa `viaggioDiRiferimento`: la regola non è scritta due volte. |
| Prova unitaria | `apps/web/test/ux003a-fix-xpage003-proposta-accettata.test.tsx` | Avvia S4, accetta la proposta: `caricaViaggioDellApp` restituisce la versione 2, uguale a `datiOggi`; le pagine del viaggio e del giorno non contengono «Visita al MUSE»; senza proposte accettate e per la variante `v-irr` resta l'itinerario fisso. Prima della fix 2 casi su 4 fallivano. |
| Prova nel browser | `apps/web/e2e/xpage003-proposta-accettata.e2e.ts`, mappatura in `apps/web/e2e/e2e.config.json` | Il giorno del MUSE mostra la visita; da `/demo` si avvia «Chiusura del MUSE» e si accetta; `/demo` mostra la versione corrente 2; il giorno del MUSE, la pagina del viaggio e «Itinerario corrente» (`/versioni/2`) non mostrano più il MUSE. |

Nessuna regola del motore ripetuta, nessuna nuova dipendenza, nessun cambio al modello dei dati.

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prova unitaria della fix | `cd apps/web && npx vitest run test/ux003a-fix-xpage003-proposta-accettata.test.tsx` | 4 test verdi (2 rossi prima della fix) |
| Suite web completa | `cd apps/web && npx vitest run` | 713 test verdi (103 file) |
| Tipi | `cd apps/web && npx tsc --noEmit -p .` | nessun errore (dopo `npm run build --workspaces`) |
| Browser (e2e) | `cd apps/web && npx vitest run -c vitest.e2e.config.ts e2e/xpage003-proposta-accettata.e2e.ts e2e/ca4-oggi.e2e.ts e2e/ux003b-home-oggi.e2e.ts` | 6 test verdi (3 flussi a 1280 px) |
| Accessibilità | `ux001-ca5-axe.test.tsx` e `today001-ca3-pagina.test.tsx` nella suite web | verdi; la fix non cambia DOM né etichette |

## Limiti

Il caso TB-XPAGE-003 del testbook va rieseguito a mano nel collaudo di gruppo D (ST-QA-001D) per la chiusura formale; qui è coperto dalla prova nel browser con gli stessi passi.
