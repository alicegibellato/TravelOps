# Monitoraggio (`TB-MON`) · gruppo C

Il monitoraggio controlla i viaggi confermati (`MONITOR_ATTIVO`, `MONITOR_INTERVALLO_S`, `MONITOR_ORIZZONTE_GIORNI`; scenario finto con `MONITOR_FINTO`) e mostra le notifiche in «Oggi».

### TB-MON-001 · Pioggia rilevata: notifica in Oggi

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì (e2e `ca7-monitoraggio`)
- **Precondizioni**: stato pulito; `MONITOR_FINTO` con pioggia sul giorno del trekking del Ponale; `MONITOR_INTERVALLO_S=1`.
- **Azioni**:
  1. Avvia l'app e attendi un giro del monitoraggio.
  2. Apri «Oggi» del viaggio di riferimento sul giorno del trekking.
- **Atteso**: compare una notifica che spiega il rischio e porta alla proposta di ripianificazione; nessuna modifica al programma finché non si accetta.

### TB-MON-002 · Monitoraggio spento

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: come TB-MON-001 ma con `MONITOR_ATTIVO=false`.
- **Azioni**:
  1. Avvia l'app, attendi 5 s, apri «Oggi».
- **Atteso**: nessuna notifica di monitoraggio; il resto di «Oggi» funziona.

### TB-MON-003 · Configurazione non valida e orizzonte

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: `MONITOR_INTERVALLO_S=0`, `MONITOR_ORIZZONTE_GIORNI=2`; un viaggio confermato che inizia tra 5 giorni con pioggia nello scenario finto.
- **Azioni**:
  1. Avvia l'app e leggi il log di avvio.
  2. Apri «Oggi» del viaggio.
- **Atteso**: l'intervallo non valido torna al predefinito (900 s) con un avviso nel log, l'app parte; il viaggio fuori dall'orizzonte di 2 giorni non riceve notifiche.
