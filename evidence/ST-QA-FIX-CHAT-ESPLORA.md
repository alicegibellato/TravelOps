# ST-QA-FIX-CHAT-ESPLORA — Chat libera prima di scegliere la meta

## Problema (segnalato da Alice, 11/10/2026)

Alla richiesta «voglio andare in Sudamerica la prossima estate, non so bene dove, fammi un itinerario di 2 settimane» la chat rispondeva sempre «Scusa, nella mia risposta c'erano informazioni che non posso garantire…»: il controllo dei nomi (REQ-ORCH-001 CA-2) sostituiva ogni risposta che citava mete non ancora nel catalogo, anche quando il viaggio non aveva ancora una destinazione.

## Correzione

- `packages/agents/src/agenti/chat.ts`: finché il viaggio non ha una destinazione preparata (nessuna istantanea) il controllo non blocca i nomi di luoghi; restano bloccate le frasi che dichiarano prenotazioni, pagamenti o cancellazioni. Con la destinazione preparata il controllo dei nomi resta com'era.
- `packages/agents/src/agenti/istruzioni.ts`: prima della meta la chat può chiacchierare e suggerire mete, tappe e idee di massima (senza orari, prezzi o link); dopo, nomina solo luoghi e attività degli strumenti; il programma giorno per giorno resta del motore. Il Consulente, se il viaggiatore non sa dove andare, propone 2 o 3 mete o un giro di tappe e poi prepara la meta scelta.

## Verifica

| Criterio | Test | Esito |
|---|---|---|
| Prima della meta i suggerimenti di mete e tappe si vedono | `packages/agents/test/agenti/qafix-chat-esplora.test.ts` | superato |
| Chi dice di aver prenotato resta bloccato anche prima della meta | idem | superato |
| Con una destinazione preparata un itinerario inventato è ancora sostituito | `packages/agents/test/agenti/controllo.test.ts` | superato |
