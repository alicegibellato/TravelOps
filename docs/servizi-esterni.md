# Servizi esterni

Meteo, geocoding, percorsi, voli ed eventi passano da **porte** (interfacce indipendenti dal fornitore) in `packages/sources/src/servizi`, ciascuna con un adattatore **finto** (predefinito: deterministico, senza rete) e uno **reale**. La modalità di ogni servizio si sceglie da variabile d'ambiente; l'elenco completo, con i predefiniti, è in [`apps/web/.env.example`](../apps/web/.env.example).

| Variabile | Predefinito | Adattatore reale |
| --- | --- | --- |
| `TRAVELOPS_METEO` | `finto` | Open-Meteo (senza chiave): previsione giornaliera e oraria, codici WMO mappati su sereno, nuvoloso, pioggia, temporale, neve |
| `TRAVELOPS_PERCORSI` | `finto` | OSRM, con il cliente HTTP di `packages/sources` |
| `TRAVELOPS_GEOCODING` | come `TRAVELOPS_PERCORSI` | Nominatim; nella web app sceglie anche la sorgente reale delle destinazioni |
| `TRAVELOPS_VOLI` | `finto` | nessun fornitore ancora: orari di esempio e link di ricerca; interfaccia `ProviderVoli` pronta |
| `TRAVELOPS_EVENTI` | `finto` | nessun fornitore ancora: eventi di esempio; interfaccia `ProviderEventi` pronta |

`TRAVELOPS_SERVIZI_TIMEOUT_MS` (8000) limita ogni chiamata; `TRAVELOPS_<SERVIZIO>_TTL_S` regola la cache in memoria. Se un servizio non risponde, il risultato è marcato «non disponibile» con un messaggio (per esempio «Meteo non disponibile: il servizio non risponde in tempo») e l'app continua a funzionare. Il meteo entra nel controllo di fattibilità (attività all'aperto con pioggia prevista danno un avviso) e nelle viste viaggio e giorno delle versioni, con una previsione per giorno. I test e le prove end-to-end usano sempre gli adattatori finti; la prova verso Open-Meteo reale gira solo con `TRAVELOPS_TEST_RETE=1`.

