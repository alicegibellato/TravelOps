# Prove di consegna: ST-INTEG-001-FIX-TB-REAL-005

## Cosa è stato chiesto

REQ-INTEG-001, fix di `ST-INTEG-001`. Caso di collaudo TB-REAL-005: con `TRAVELOPS_VOLI=reale`, nella proposta «Volo cancellato» il link «Gestisci prenotazione» puntava a `https://example.com/prenotazioni/XY123`, un segnaposto dei dati demo, e l'esito diceva solo «Fattibile» pur con un elemento a rischio.

Causa: le viste leggevano il link di gestione dai dati di riferimento senza distinguere la modalità dei voli.

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Link segnaposto | `apps/web/src/servizi/link-prenotazione.ts` | Con voli reali un link su dominio riservato (example.com/.org/.net, elenco configurabile con `TRAVELOPS_DOMINI_SEGNAPOSTO`) non si mostra. Con voli finti resta. |
| Viste | `apps/web/src/viste/giorno.ts`, `elemento.ts`, `proposta.ts` | Il pulsante, il dettaglio, le alternative e la riga della spiegazione con il link segnaposto spariscono; resta la ricerca voli. |
| Esito | `apps/web/src/viste/proposta.ts` | «Fattibile, con elementi a rischio» quando ci sono elementi a rischio. |
| Prova unitaria | `apps/web/test/integ001-voli-reali.test.tsx` | Proposta S7 con voli reali e finti, esito, configurazione dei domini. |

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prova unitaria della fix | `cd apps/web && npx vitest run test/integ001-voli-reali.test.tsx test/web002-ca4-ca5-rischio.test.tsx` | 10 test verdi (il caso con voli reali era rosso prima della fix) |
| Tipi dei file toccati | `cd apps/web && npx tsc --noEmit` | nessun errore nei file toccati |

## Limiti

Verifica ridotta ai file toccati (nessuna suite completa). Il caso TB-REAL-005 va rieseguito nel collaudo di gruppo D (ST-QA-001D).
