# Prove di consegna: ST-CHAT-002

## Cosa è stato chiesto

REQ-CHAT-002 (Chat rifinita dopo il collaudo con il modello vero). Nel collaudo di PC1 del 10/10/2026, con la chiave OpenAI e il modello `gpt-6-luna`, sono emersi cinque difetti della chat. Questa storia li corregge:

1. «Crea la mia bozza» dai filtri: l'agente rispondeva di non vedere le preferenze.
2. Le schede di proposta mostravano codici del motore.
3. «Sostituisci» su un viaggio confermato produceva testo e scheda incoerenti.
4. Le date del riepilogo erano scritte male («al domenica»).
5. Le bolle della chat erano lunghe e ripetevano il programma.

Record: requisito `REQ-CHAT-002`, story `ST-CHAT-002`, contratto `contract-ST-CHAT-002-implementation`, profilo `AUT-PR-CHAT-002`.

## Perimetro ed esclusioni

**Dentro:**

- `packages/agents`: lettura del viaggio con il profilo condiviso, «sostituisci» per i viaggi confermati, istruzioni degli agenti;
- `apps/web`: avviso delle schede di proposta, date del riepilogo, messaggio di «Crea la mia bozza».

**Fuori:**

- il ridisegno grafico di Pianifica e della bozza (REQ-UX-003, ST-UX-003A e ST-UX-003B);
- il motore (`packages/engine`) non cambia.

## Cosa è cambiato

- **Profilo dei filtri visto dagli agenti (CA-1).** Senza viaggio, `leggi_viaggio` restituisce il profilo raccolto con i filtri, insieme a «cosa manca». Il messaggio indica di non chiedere di nuovo le preferenze, ma di preparare la destinazione e generare la bozza. Anche il Consulente, nelle istruzioni, legge il viaggio prima di chiedere le preferenze. Il messaggio di «Crea la mia bozza» della pagina Pianifica lo dice in chiaro.
- **Schede senza codici (CA-2).** Lo fa `avvisoProposta` (`apps/web/src/chat/server/agenti.ts`). L'avviso della scheda non usa più la spiegazione grezza del motore, che contiene identificativi, codici dei problemi e date tecniche. Dice invece in parole semplici:
  - se la proposta non sta in piedi;
  - se il programma non cambia;
  - se ci sono orari da verificare e quanti altri punti controllare.
- **Sostituisci (CA-3).** `proponi_modifica` ha l'operazione `sostituisci`. Il motore calcola prima la rimozione e poi l'aggiunta della nuova attività alla stessa ora, sull'itinerario risultante. La proposta unisce i cambiamenti e porta l'itinerario finale, che il motore applica all'accettazione.
- **Date (CA-4).** Il riepilogo scrive «da venerdì 16 ottobre a domenica 18 ottobre».
- **Bolle brevi (CA-5).** Una regola comune chiede di riassumere in 2 o 3 frasi dopo una bozza o una modifica, senza ripetere il programma che è già accanto alla chat. Il Planner usa `sostituisci` per mettere un'attività al posto di un'altra.

## Perché

- **Sostituisci negli agenti.** Il motore è fuori dal perimetro di questa storia. Comporre due proposte del motore tiene tutte le regole lì (fattibilità, spostamenti) e produce una sola proposta coerente per il viaggiatore.
- **Avviso costruito dai dati.** La spiegazione del motore è pensata per lo storico e per la pagina della proposta; in chat serve un testo breve per chi viaggia.

## Verifica

| Criterio | Test | Esito |
|---|---|---|
| CA-1 Crea la mia bozza dai filtri porta a una bozza | `packages/agents/test/agenti/chat002.test.ts` (client finto: leggi_viaggio, cerca, prepara, genera_bozza) | superato |
| CA-2 nessun codice del motore nelle schede | `apps/web/test/chat002-schede-e-date.test.ts` | superato |
| CA-3 sostituisci in una sola proposta | `packages/agents/test/agenti/chat002.test.ts` | superato |
| CA-4 date in italiano corretto | `apps/web/test/chat002-schede-e-date.test.ts` | superato |
| CA-5 risposte brevi accanto alla bozza | `packages/agents/test/agenti/chat002.test.ts` (istruzioni) | superato |

I test della chat e degli agenti già esistenti restano verdi (133 negli agenti, chat della web app).

Il plugin registra build, suite completa e scansione dei segreti.

## Collegamenti

- Requisito `REQ-CHAT-002` (`docs/requirements/REQ-CHAT-002-chat-rifinita.md`), story `ST-CHAT-002`.
- Dipende da ST-CHAT-001C, ST-ORCH-001C, ST-PLAN-003 (su main).
