# ST-INTEG-001 Design

## Porte (in `packages/sources`)
- `PortaMeteo`: `previsione(luogo, giorni) -> RisultatoServizio<PrevisioneGiorno[]>`.
- `PortaGeocoding`: `cerca(testo) -> RisultatoServizio<Area[]>` (riusa Nominatim esistente).
- `PortaPercorsi`: `percorso(da, a, modo) -> RisultatoServizio<Percorso>` (OSRM).
- `PortaVoli`: `cerca(richiesta) -> RisultatoServizio<OffertaVolo[]>` piu' `linkRicerca(richiesta)`; solo mock + link, interfaccia pronta per un provider reale.
- `PortaEventi`: `cerca(luogo, periodo) -> RisultatoServizio<Evento[]>`; solo mock.
- `RisultatoServizio<T>` = `{ stato: "ok", dati, origine }` oppure `{ stato: "non_disponibile", motivo, messaggio }`. Nessuna eccezione verso i chiamanti.

## Adattatori
- Reali: Open-Meteo (senza chiave), Nominatim, OSRM, tramite il cliente HTTP esistente.
- Mock: dati deterministici da fixture/risposte registrate, stessa interfaccia.

## Configurazione
- Env: `INTEG_<SERVIZIO>_MODALITA` = `mock|reale` (meteo, geocoding, percorsi, voli, eventi); `INTEG_TIMEOUT_MS`, `INTEG_CACHE_TTL_S` globali con override per servizio; base URL per servizio.
- Un solo `risolviIntegrazioni(config)` crea le porte; default `mock` in test ed e2e e come fallback se la variabile manca.
- Valori e URL in config tipizzata con validazione, nessun hardcoding nei moduli di dominio.

## Cache e timeout
- Decoratore `conCacheETimeout(porta, opzioni)`: cache in memoria con TTL e chiave canonica, timeout con `AbortController`, errore di rete o timeout convertiti in `non_disponibile` con messaggio per l'utente. Cache e orologio iniettabili (orologio finto nei test).

## Meteo in fattibilita' e viste
- La regola di fattibilita' riceve la previsione per giorno dalla `PortaMeteo`: condizioni avverse segnalate come avviso sulle attivita' all'aperto del giorno; `non_disponibile` non blocca ne' penalizza, mostra "meteo non disponibile".
- La vista itinerario mostra una riga meteo per giorno (sintesi, temperatura, stato non disponibile).

## Test
- Unit con adattatori finti e risposte registrate: modalita' da env, cache (hit, scadenza), timeout, errore di rete, meteo nella fattibilita' e nelle viste.
- Nessun test chiama la rete; guardia che fallisce se viene aperta una connessione.

## Rollback
Aggiunta di moduli e di una regola opzionale; con tutte le modalita' su mock il comportamento resta quello attuale. Il revert del PR basta.
