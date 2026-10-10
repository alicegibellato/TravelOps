# ST-MONITOR-001 Design

## Controllo
- `eseguiControllo({ viaggi, porte, orologio, registro, config }) -> EsitoControllo`: per ogni viaggio confermato legge meteo ed eventi per i giorni coperti dalle porte di ST-INTEG-001, deriva le condizioni (es. pioggia forte, evento in conflitto) e le confronta con le attivita'.
- Risultato `non_disponibile` di una porta: condizione ignorata, nessun imprevisto, esito annotato.

## Imprevisto e proposta
- Una condizione nuova che tocca un'attivita' diventa un imprevisto; `calcolaImpatto` stima l'impatto e `proposta.ts` produce la proposta minima. Nessuna logica di ripianificazione nuova.
- Se l'impatto e' nullo non si genera nulla.

## Idempotenza
- Chiave `viaggio|attivita'|condizione|data`; `RegistroControlli` (interfaccia, implementazione in memoria/persistita come gli altri archivi del progetto) evita duplicati e consente di rilevare condizioni cambiate.

## Esecuzione
- Trigger: (1) scheduler nel server Next con intervallo `MONITOR_INTERVALLO_S`, avviato una sola volta (singleton con guardia) e spento con `stop()` e sul segnale di chiusura; (2) controllo all'apertura di Oggi. Possibilita' di disabilitare lo scheduler (`MONITOR_ATTIVO=false`), in tal caso resta il controllo su richiesta.
- Orologio e porte iniettati; modalita' finto|reale degli adattatori da env di ST-INTEG-001.

## Configurazione
- `MONITOR_ATTIVO`, `MONITOR_INTERVALLO_S`, orizzonte in giorni; config tipizzata e validata, default sicuri.

## UI
- Notifica nella pagina Oggi con imprevisto, attivita' colpita e proposta; stato vuoto se nulla da segnalare.

## Test
- Unit con orologio e porte finti: controllo periodico (avanzamento orologio), apertura di Oggi, impatto, nessun impatto, idempotenza, servizio non disponibile, stop dello scheduler. Nessuna rete.

## Rollback
Modulo aggiuntivo e scheduler disattivabile da config; revert del PR sufficiente.
