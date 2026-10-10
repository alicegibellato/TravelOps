# ST-INTEG-001 Criteri e aree

## Criteri e impatto
| Criterio | Area | Effetto |
|---|---|---|
| CA-1 porte e adattatori per meteo, geocoding, percorsi, voli, eventi | Porte | un'interfaccia per servizio; adattatori Open-Meteo, Nominatim, OSRM; voli (mock + link di ricerca) ed eventi (mock) con interfaccia pronta per un provider reale |
| CA-2 modalita' mock o reale per servizio da env/config | Configurazione | un solo punto di risoluzione della modalita'; default mock in test ed e2e |
| CA-3 cache e timeout configurabili, degrado esplicito | Trasversale | decoratore di cache e timeout; risultato `non disponibile` con messaggio utente, mai eccezione verso l'app |
| CA-4 meteo nella fattibilita' e nelle viste per giorno | Dominio e UI | regola di fattibilita' che usa la previsione del giorno; riga meteo nella vista itinerario |
| CA-5 test con adattatori finti e risposte registrate | Test | copre modalita', cache, timeout, errore di rete, meteo in fattibilita'; nessuna chiamata di rete |

## Aree e file
- Porte e adattatori: `packages/sources` (nuove cartelle per servizio, tipi condivisi).
- Fattibilita': `packages/engine/src/feasibility` (solo consumo della porta meteo).
- Viste: componenti itinerario (solo riga meteo e stato non disponibile).
- Nessuna dipendenza nuova; riuso del cliente HTTP esistente.
