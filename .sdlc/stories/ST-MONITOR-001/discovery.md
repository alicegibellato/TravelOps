# ST-MONITOR-001 Discovery

## Problema
Dopo la conferma di un viaggio nessuno controlla piu' meteo ed eventi: se una condizione cambia, l'utente lo scopre da solo. Con le porte di ST-INTEG-001 (meteo, eventi) il controllo puo' diventare automatico e coerente con la ripianificazione esistente.

## Requisito
REQ-MONITOR-001, criteri CA-1..CA-5 (vedi story.json). Contratto di implementazione approvato; profilo AUT-PR-MONITOR-001. Dipendenza DEP-MONITOR-001 su ST-INTEG-001 (requires_artifact).

## Fonti da leggere
- `packages/sources` (porte e adattatori di ST-INTEG-001, modalita' finto|reale da env).
- `packages/engine/src/replanning/impatto.ts` (`calcolaImpatto`) e `proposta.ts` (proposta minima).
- Viaggi confermati e attivita' nel modello (`packages/engine/src/model`, `itinerary`) e pagina Oggi in `apps/web`.

## Vincoli
- Nessun processo in background non controllato: timer nel server Next con intervallo configurabile e spegnimento pulito, oppure controllo su richiesta.
- Intervallo, soglie e modalita' adattatori da env/config, nessun valore hardcoded.
- Orologio e adattatori iniettabili: nessun test usa tempo reale o rete.
- Un servizio non disponibile non genera imprevisti ne' errori verso l'utente.

## Rischi
- Duplicati di imprevisti su controlli ripetuti: chiave di idempotenza (viaggio, attivita', condizione, data).
- Timer doppio con hot reload o piu' istanze: singleton con guardia e `stop()` esplicito.
- Rumore di notifiche: solo condizioni nuove che impattano un'attivita'.
