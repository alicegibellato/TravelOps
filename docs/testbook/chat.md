# Chat (`TB-CHAT`) · gruppo B

La chat vive in `/pianifica` (pannello «Pianifica con TravelOps», area «Conversazione»), accanto a «La tua bozza». Assistente finto con `TRAVELOPS_ASSISTENTE=finto`; modello vero con `OPENAI_API_KEY` (solo PC1).

### TB-CHAT-001 · Prima richiesta con un suggerimento

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì (e2e `ca5-chat`)
- **Precondizioni**: stato pulito, `TRAVELOPS_ASSISTENTE=finto`.
- **Azioni**:
  1. Apri `/pianifica`: si vede «Nessun messaggio per ora: scrivimi qui sotto e ti rispondo.».
  2. Premi il suggerimento «Voglio un weekend sul lago».
- **Atteso**: il messaggio compare nella conversazione, poi «TravelOps sta scrivendo…» e la risposta; «La tua bozza» passa da «Preparo la bozza…» ai giorni del viaggio; compare «Apri la bozza».

### TB-CHAT-002 · Risposta visibile senza ricaricare

- **Priorità** P2 · **Modalità** finto e reale · **Automatizzabile** sì (finto)
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7`.
- **Precondizioni**: conversazione già aperta (TB-CHAT-001).
- **Azioni**:
  1. Scrivi «Sabato piove: cosa cambio?» in «Scrivi un messaggio» e premi «Invia».
  2. Attendi la fine di «TravelOps sta scrivendo…» senza ricaricare.
- **Atteso**: la risposta compare per intero nella conversazione; dopo un ricaricamento la conversazione è identica (nessun messaggio che appare solo dopo il ricaricamento).

### TB-CHAT-003 · Chat non disponibile

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: nessuna `OPENAI_API_KEY`, `TRAVELOPS_ASSISTENTE` non impostata.
- **Azioni**:
  1. Apri `/pianifica`.
  2. Compila le preferenze con i pulsanti e premi «Apri la bozza».
- **Atteso**: la chat mostra «La chat non è disponibile in questo momento: puoi fare tutto anche con i pulsanti.»; il percorso a pulsanti funziona fino alla bozza.

### TB-CHAT-004 · Errore di risposta e «Riprova»

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì (bloccando la richiesta `POST /api/chat/conversazioni/<id>/messaggi` dal browser)
- **Precondizioni**: conversazione aperta.
- **Azioni**:
  1. Blocca la richiesta di invio messaggi (strumenti del browser) e invia un messaggio.
  2. Sblocca la richiesta e premi «Riprova».
- **Atteso**: compare «Non sono riuscito a rispondere» con «Riprova»; il messaggio scritto non si perde; dopo «Riprova» arriva la risposta una sola volta.

### TB-CHAT-005 · Proposta in chat: Accetta e Rifiuta

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì (e2e `ca5-chat`)
- **Precondizioni**: conversazione con una bozza; l'assistente propone una modifica (es. dopo «Sabato piove: cosa cambio?»).
- **Azioni**:
  1. Premi «Rifiuta» sulla prima proposta.
  2. Chiedi un'altra modifica e premi «Accetta».
- **Atteso**: la proposta rifiutata non cambia la bozza; quella accettata aggiorna «La tua bozza» e la cronologia della bozza; i pulsanti spariscono dopo la decisione.

### TB-CHAT-006 · Durata coerente tra filtri e chat

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7`.
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. In `/pianifica` scrivi «Voglio 4 giorni sul Lago di Garda a luglio».
  2. Guarda «Le tue preferenze» e «La tua bozza».
- **Atteso**: i filtri mostrano 4 giorni, la bozza ha 4 giorni e la risposta della chat parla di 4 giorni.

### TB-CHAT-007 · Conversazione completa con il modello vero

- **Priorità** P1 · **Modalità** reale (`OPENAI_API_KEY`, solo PC1) · **Automatizzabile** no (modello vero, risposte non deterministiche e a pagamento)
- **Precondizioni**: chiave presente sul computer, `TRAVELOPS_ASSISTENTE` non impostata.
- **Azioni**:
  1. In `/pianifica` racconta un viaggio in 2-3 messaggi (destinazione, date, chi viaggia).
  2. Chiedi una modifica («Il secondo giorno più leggero»).
  3. Premi «Apri la bozza» e poi «Conferma l'itinerario».
- **Atteso**: la bozza nasce dalle informazioni date, la modifica si vede nella bozza, la conferma porta al viaggio confermato; nessun testo in inglese o tecnico nelle risposte; nessun segreto nei log.

### TB-CHAT-008 · Destinazione non trovata

- **Priorità** P1 · **Modalità** finto e reale · **Automatizzabile** sì (finto)
- **Fonte**: revisione di Alice (PC1); ST-CHAT-003A CA-1.
- **Precondizioni**: stato pulito, servizi finti (in reale: servizi `TRAVELOPS_*` reali).
- **Azioni**:
  1. In `/pianifica` scrivi «Voglio 4 giorni a Manila a luglio».
- **Atteso**: la chat chiede di precisare la destinazione o ne propone di preparabili; nessun viaggio nasce in «I miei viaggi»; il profilo delle preferenze resta invariato.

### TB-CHAT-009 · Preparazione della destinazione fallita

- **Priorità** P1 · **Modalità** reale · **Automatizzabile** no (servizio reale fuori uso)
- **Fonte**: revisione di Alice (PC1); ST-QA-FIX-002.
- **Precondizioni**: servizio reale dei luoghi non raggiungibile o in errore.
- **Azioni**:
  1. In `/pianifica` chiedi un viaggio verso una destinazione non ancora preparata.
- **Atteso**: non nasce un viaggio `chat-N` senza istantanea; il testo della chat dice che la preparazione non è riuscita ed è coerente con quanto registrato nella traccia.

### TB-CHAT-010 · Destinazione vera non ancora pronta

- **Priorità** P1 · **Modalità** reale (`TRAVELOPS_GEOCODING=reale`) · **Automatizzabile** no (rete esterna)
- **Fonte**: revisione di Alice (PC1).
- **Precondizioni**: Formentera non presente tra le destinazioni preparate.
- **Azioni**:
  1. In `/pianifica` scrivi «Una settimana a Formentera a settembre».
- **Atteso**: la destinazione viene preparata e la bozza nasce; la chat non risponde «non disponibile».

### TB-CHAT-011 · Due viaggi di seguito

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: revisione di Alice (PC1); ST-CHAT-003A CA-2.
- **Precondizioni**: un primo viaggio creato dalla chat con date, viaggiatori, ritmo, forma fisica e pasti.
- **Azioni**:
  1. Avvia una nuova pianificazione da «Pianifica un viaggio» e chiedi un secondo viaggio.
- **Atteso**: il secondo viaggio eredita solo ritmo, forma fisica e pasti; date e viaggiatori non sono ereditati e vengono chiesti di nuovo.

### TB-CHAT-012 · Domande di logistica

- **Priorità** P2 · **Modalità** reale · **Automatizzabile** no (modello vero)
- **Fonte**: revisione di Alice (PC1); REQ-ORCH-002.
- **Precondizioni**: viaggio in corso di pianificazione con almeno due luoghi.
- **Azioni**:
  1. Chiedi «Quanto ci metto da <luogo A> a <luogo B>?».
  2. Chiedi «Meglio a piedi o in auto?».
- **Atteso**: le risposte riportano i tempi calcolati dalla stima degli spostamenti (gli stessi visibili nella bozza), non tempi inventati.

### TB-CHAT-013 · Chat nelle pagine del viaggio

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: revisione di Alice (PC1); ST-CHAT-003B CA-3.
- **Precondizioni**: un viaggio dell'utente con la chat disponibile nelle sue pagine.
- **Azioni**:
  1. Dalla pagina del viaggio scrivi una richiesta di modifica in chat.
- **Atteso**: la risposta arriva dagli agenti (riferita ai dati del viaggio), non dal copione della presentazione.

### TB-CHAT-014 · Coerenza tra testo e dati

- **Priorità** P2 · **Modalità** reale · **Automatizzabile** no (modello vero; verifica sulle tracce degli agenti)
- **Fonte**: revisione di Alice (PC1).
- **Precondizioni**: conversazione con almeno 5 richieste di modifica, alcune non realizzabili.
- **Azioni**:
  1. Per ogni risposta confronta il testo con la «Cronologia della bozza» e con le tracce degli agenti.
- **Atteso**: ogni risposta che dice di aver fatto una modifica ha una revisione in cronologia; ogni risposta «non posso» non ha nessuna scrittura.
