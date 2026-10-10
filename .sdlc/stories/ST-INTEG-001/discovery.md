# ST-INTEG-001 Discovery

## Problema
Le fonti esterne sono oggi sparse: geocoding Nominatim e cliente HTTP vivono in `packages/sources` (cliente-http, reale, registrata), mentre meteo, voli ed eventi non esistono. Il controllo di fattibilita' non conosce il meteo e non c'e' un modo uniforme di scegliere mock o reale per servizio.

## Requisito
REQ-INTEG-001, criteri CA-1..CA-5 (vedi story.json). Contratto di implementazione approvato; profilo AUT-PR-INTEG-001. Nota: nel record CA-2 e' spezzato in due righe (il testo "mock/reale" e' stato diviso sulla barra); va letto come un criterio unico.

## Fonti da leggere
- `packages/sources/src`: `cliente-http.ts` (cliente con registratore), `reale.ts` e `registrata.ts` (sorgente reale e risposte registrate), `sorgente.ts` (interfaccia esistente).
- `packages/engine/src/feasibility` e le viste itinerario per il punto d'ingresso del meteo.
- Test esistenti con risposte registrate, da riusare come modello per i test senza rete.

## Vincoli
- Open-Meteo senza chiave; Nominatim con intervallo minimo gia' definito; OSRM pubblico solo in modalita' reale.
- Default mock in test ed e2e: nessun test chiama la rete.
- Configurazione da env/file, nessun URL o timeout hardcoded nel codice di dominio.
- Il degrado non deve mai bloccare l'app.

## Rischi
- Limiti di frequenza dei servizi pubblici: cache e intervallo configurabili.
- Previsioni meteo oltre l'orizzonte del servizio: risultato marcato non disponibile, non errore.
- Divergenza tra mock e reale: stessi tipi di porta e test di contratto sugli stessi casi.
