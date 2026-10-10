# Prove di consegna: ST-CHAT-003A

## Cosa è stato chiesto

REQ-CHAT-003 (Chat e preferenze coerenti), parte agenti e profilo. Nel collaudo di Alice con il modello vero (10/10/2026) sono emersi due difetti che riguardano i dati:

- **B2.** La chat diceva che «Filippine» e «Manila» non erano disponibili, ma le salvava nel profilo e creava un viaggio «Nuovo viaggio – Filippine».
- **B3.** Una conversazione nuova partiva dal profilo del viaggio precedente (date, viaggiatori, irrinunciabili), e la bozza veniva creata senza domande con dati mai detti.

Record: requisito `REQ-CHAT-003` (`docs/requirements/REQ-CHAT-003-chat-e-preferenze-coerenti.md`), story `ST-CHAT-003A`, contratto `contract-ST-CHAT-003A-implementation`, profilo `AUT-PR-CHAT-003A`.

## Perimetro ed esclusioni

**Dentro:**

- `packages/agents`: controllo della destinazione in `aggiorna_profilo`;
- `apps/web`: proprietà del profilo condiviso e nuovo viaggio con profilo nuovo (`preferenze/profilo.ts`, archivio della chat, creazione della conversazione, pagina Pianifica).

**Fuori:**

- una sola chat nelle pagine del viaggio, il percorso guidato che segue la chat e Sorprendimi senza doppioni (ST-CHAT-003B);
- le destinazioni reali come predefinite: con la sorgente registrata la web app conosce solo le destinazioni già pronte, ed è un requisito a parte.

## Cosa è cambiato

- **Solo luoghi che la sorgente conosce (CA-1).** `aggiorna_profilo` cerca un luogo nuovo senza riferimento con `cercaDestinazioni`. Se la sorgente non trova nulla, lo strumento risponde con un errore («Non trovo «Manila»…: profilo non salvato») e chiede al modello di far precisare il posto. Il profilo resta com'è e nessun viaggio viene creato. Un luogo che la sorgente trova, o una destinazione già preparata (con riferimento), si salva come prima.
- **Il profilo condiviso appartiene al suo viaggio (CA-2).** Quando la chat di un viaggio `chat-…` salva il profilo condiviso, l'impostazione `profilo-preferenze-viaggio` ricorda a quale viaggio appartiene.
- **Nuovo viaggio, profilo nuovo (CA-2).** `iniziaNuovoViaggio` tiene solo ritmo, forma fisica e pasti, e azzera tutto il resto. Scatta in due momenti:
  - quando la pagina Pianifica si apre senza conversazione;
  - quando nasce una conversazione senza viaggio.

  Non tocca un profilo che non appartiene ancora a nessun viaggio, così i filtri compilati prima di scrivere in chat non si perdono.
- **Il viaggio di prima tiene il suo profilo.** Dopo l'azzeramento, la conversazione di un viaggio precedente legge e scrive solo il profilo di quel viaggio, senza toccare quello del viaggio nuovo.
- **Copione della demo (Atto 1, prompt 4b «Lisbona senza rete»).** Nella conversazione registrata il Consulente salva le preferenze senza la destinazione che la sorgente non trova, e chiede di precisarla. Prima salvava «Lisbona» nel profilo.

## Perché

- **Controllo nello strumento.** Il controllo sta nello strumento e non nelle istruzioni: il modello può sbagliare, lo strumento no. L'errore torna al modello, che lo spiega al viaggiatore. È la stessa strada degli altri errori degli strumenti.
- **Profilo legato al viaggio.** Legare il profilo al viaggio che l'ha usato, invece di azzerarlo a ogni conversazione, salva un caso preciso: il viaggiatore compila i filtri e solo dopo scrive in chat. Tenere ritmo, forma fisica e pasti è la scelta di Alice: sono preferenze della persona, non del viaggio.

## Verifica

| Criterio | Test | Esito |
|---|---|---|
| CA-1 destinazione non trovata: errore, profilo e viaggi invariati | `packages/agents/test/agenti/chat003a.test.ts` (strumento, e chat con client finto) | superato |
| CA-2 conversazione nuova con solo ritmo, forma fisica e pasti; senza date e viaggiatori la bozza non parte | `apps/web/test/chat003a-profilo-nuovo-viaggio.test.ts` | superato |
| Copione della demo, prompt 4b | `packages/agents/test/agenti/copione.test.ts`, `apps/web/test/demo001b-ca1-copione.test.ts` | superato |

Il plugin registra la suite completa (build e test), la scansione dei segreti e le verifiche derivate.

## Collegamenti

- Requisito `REQ-CHAT-003`, story `ST-CHAT-003A`.
- Segue ST-ORCH-002 (le tracce degli agenti mostrano l'errore di `aggiorna_profilo` come esito «errore»).
- La storia gemella ST-CHAT-003B copre la web app.
