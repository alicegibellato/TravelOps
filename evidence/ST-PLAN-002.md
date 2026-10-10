# Prove di consegna: ST-PLAN-002

## Cosa è stato chiesto

REQ-PLAN-002 "Revisione e conferma della bozza" (`docs/requirements/REQ-PLAN-002-revisione-conferma-bozza.md`, modello in `modello-dominio-estensioni.md` §7.5). Story `ST-PLAN-002`, con questi criteri:

1. ogni operazione sulla bozza è disponibile sia da pulsante sia da chat (CA-1);
2. Annulla riporta esattamente alla revisione precedente (CA-2);
3. le attività bloccate sopravvivono a «Rigenera questo giorno» e a «Cambia preferenze» (CA-3);
4. dopo la conferma la versione 1 coincide con l'ultima revisione della bozza (CA-4);
5. dopo la conferma le modifiche diventano proposte (REQ-EDIT-002), non più modifiche dirette (CA-5);
6. almeno 10 revisioni consecutive non degradano il risultato, verificato da un test (CA-6).

## Perimetro ed esclusioni

- **Comprende:**
  - nel motore, il modulo puro `planning/revisioni.ts`: stato della bozza con le revisioni B1, B2, … (solo in coda), tutte le operazioni del requisito come un'unica API (`applicaOperazioneBozza`), le 3 alternative di «Sostituisci», le attività suggerite per «Aggiungi», il confronto tra revisioni, la conferma (versione 1) e le proposte dopo la conferma;
  - nel generatore (REQ-PLAN-001), l'opzione `mantieni` (attività bloccate tenute nel loro giorno) e la ricostruzione di una sola giornata (`ricostruisciGiornata`), usate da rigenera giorno, sostituisci, giornata più piena, aggiungi senza orario, scambia giorni, cambia preferenze e alternativa;
  - nella web app, la pagina `/bozza/<viaggio>` con i pulsanti di ogni operazione, Annulla, «Torna a Bn», Confronta, Cambia preferenze, Mostrami un'alternativa, «Conferma l'itinerario» con la festa leggera («Buon viaggio!», coriandoli disattivabili) e, dopo la conferma, le proposte da accettare o rifiutare;
  - «Crea la mia bozza» del percorso delle preferenze, che ora crea il viaggio con la revisione B1 e apre la pagina della bozza;
  - le azioni lato server (`app/bozza/azioni.ts`), con l'azione generica `operaBozzaAzione(viaggioId, operazione)`.
- **Esclude** (di altre storie):
  - l'aggancio degli strumenti della chat: arriva con gli strumenti di ST-CHAT-001C (`packages/agents`, `apps/web/src/chat`), che questa storia non tocca. Vedi "Interpretazioni del requisito", CA-1.
- **Lasciato fuori di proposito:** nessuna modifica a `packages/agents`, `apps/web/src/chat`, `.sdlc`; nessuna dipendenza nuova, nessun Tailwind, solo token nei fogli di stile; nessuna modifica allo schema della base dati.
- **Deviazioni:** «Sposta» si fa con giorno e ora (un piccolo modulo sulla scheda), non trascinando la scheda: il trascinamento resta un miglioramento possibile, l'operazione del motore è la stessa.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Revisioni, operazioni, annulla, confronto, conferma, proposte dopo la conferma | `packages/engine/src/planning/revisioni.ts` |
| Attività bloccate (`mantieni`), ricostruzione di una giornata, candidate per punteggio | `packages/engine/src/planning/generatore.ts`, `packages/engine/src/planning/tipi.ts` |
| Esportazioni del modulo | `packages/engine/src/planning/index.ts` (già riesportato da `src/index.ts`) |
| Test del motore | `packages/engine/test/planning/revisioni.test.ts` |
| Tipi condivisi server e browser | `apps/web/src/bozza/tipi.ts` |
| Servizio lato server: crea, opera, alternative, confronta, conferma, accetta e rifiuta; vista in parole semplici | `apps/web/src/bozza/servizio.ts`, `apps/web/src/bozza/server.ts` |
| Azioni lato server e pagina | `apps/web/app/bozza/azioni.ts`, `apps/web/app/bozza/[viaggio]/page.tsx` |
| Pagina della bozza | `apps/web/src/componenti/PaginaBozza.tsx` |
| «Crea la mia bozza» dalle preferenze | `apps/web/src/componenti/PercorsoPreferenze.tsx`, `apps/web/src/preferenze/tipi.ts`, `apps/web/app/preferenze/azioni.ts`, `apps/web/app/preferenze/page.tsx` |
| Indirizzo della pagina | `apps/web/src/percorsi.ts` |
| Stili (solo token, in fondo al file) | `apps/web/app/globals.css` |
| Test della web app | `apps/web/test/plan002-*.test.tsx`, `apps/web/test/supporto-bozza.tsx` |
| Prove di consegna | `evidence/ST-PLAN-002.md` |

## Perché

### Dipendenze

- ST-PLAN-001: `generaBozza`, `generaAlternativa`, collocazione delle giornate, punteggio (§7.7).
- ST-EDIT-001 e ST-EDIT-002: `proponiModifica` (rimuovi, sposta, aggiungi a un orario, priorità per il lucchetto) e `proponiModificaOndata2` (giornata più leggera o più piena, rigenera giorno) per le proposte dopo la conferma.
- ST-ITIN-002: `confrontaItinerari`, `creaStorico`, `applicaProposta`, `rifiutaProposta`.
- ST-FEAS-001: `controllaFattibilita` su ogni revisione.
- ST-DATA-001: tabelle `revisioni_bozza`, `storici`, `proposte`, `profili`, `impostazioni`.
- ST-PREF-001B, ST-UX-001: percorso delle preferenze, componenti e token.

### Scelte

- **Un'unica API per pulsanti e chat.** Ogni operazione è un dato semplice (`OperazioneBozza`, per esempio `{ tipo: "blocca", elementoId }`) applicato da `applicaOperazioneBozza(stato, contesto, operazione)`, che restituisce uno stato nuovo con una revisione in più oppure il motivo per cui non si può. Lo stato ricevuto non cambia mai. `OPERAZIONI_BOZZA` elenca i tipi per chi costruisce gli strumenti.
- **Nessuna logica duplicata.** Rimuovi, sposta, aggiungi a un orario e blocca passano da `proponiModifica` (se ne usa l'itinerario, senza accettare la proposta); le giornate si ricostruiscono con le regole del generatore (`ricostruisciGiornata`); cambia preferenze e alternativa sono `generaBozza` e `generaAlternativa` con `mantieni`; confronto e conferma sono quelli dello storico.
- **Il lucchetto è la priorità irrinunciabile.** "Blocca: l'attività diventa irrinunciabile". Così il blocco vive nell'itinerario stesso (nessun dato in più da salvare) e le regole esistenti già lo rispettano: la verifica del generatore non toglie le bloccate e REQ-EDIT-002 non tocca le irrinunciabili.
- **Annulla segue la catena delle modifiche.** Ogni revisione ricorda quella a cui riporta «Annulla» (`precedente`): annullare due volte risale due modifiche invece di rifare quella appena annullata; «Torna a Bn» porta a qualsiasi revisione e si può a sua volta annullare. Annullare crea sempre una revisione nuova (le revisioni restano tutte consultabili).
- **Forma normalizzata.** Ogni revisione salva il viaggio nella forma di `caricaViaggio` (valori predefiniti espliciti): è la stessa che si rilegge dalla base dati e che diventa la versione 1, quindi i confronti di CA-2 e CA-4 sono esatti.
- **Problemi bloccanti.** L'operazione è applicata comunque; ogni problema bloccante ha un'azione suggerita in parole semplici ("Sposta "…" a un altro orario, oppure rigenera la giornata"), mostrata sulla scheda dell'attività o sul giorno.
- **Persistenza senza cambiare lo schema.** Le revisioni stanno in `revisioni_bozza`; il profilo di ogni revisione, la revisione precedente e quella confermata stanno nell'impostazione `bozza-revisioni:<viaggio>`. Se mancano (per esempio dopo un'importazione), valgono il profilo del viaggio e la revisione prima.
- **Dopo la conferma** gli stessi pulsanti chiamano la stessa azione: il servizio vede che il viaggio è confermato e chiede al motore una proposta (`propostaDopoConferma`), salvata tra le proposte del viaggio; «Accetta» crea la versione successiva con `applicaProposta`, «Rifiuta» usa `rifiutaProposta`.

### Interpretazioni del requisito

- **CA-1, parte chat.** L'operazione è disponibile alla chat come API pura del motore (`applicaOperazioneBozza` con `OperazioneBozza`) e come azione lato server (`operaBozzaAzione(viaggioId, operazione)`, oppure `servizioBozza().opera(viaggioId, operazione)` lato server). Lo strumento della chat che la invoca arriva con gli strumenti di ST-CHAT-001C, che sta modificando `packages/agents` e `apps/web/src/chat`: a questa storia era vietato toccarli. Il test `plan002-ca1-operazioni` verifica che la stessa operazione, arrivata come JSON, dia lo stesso risultato del pulsante.
- **Sostituisci.** Le 3 migliori candidate per punteggio (§7.7) non ancora nel viaggio che entrano nella stessa giornata al posto dell'attività senza farne uscire altre; la giornata si ricolloca con le regole del generatore.
- **Giornata più leggera / più piena.** Più leggera toglie l'attività non bloccata (né a orario fisso) col punteggio più basso, a parità l'`id`. Più piena aggiunge la migliore candidata per punteggio che entra (al massimo un'attività impegnativa al giorno, come R-4).
- **Rigenera questo giorno.** Tiene le bloccate e sceglie le altre per punteggio fino alle attività previste dal ritmo, senza quelle di prima (così la giornata cambia davvero); se così ne entrano meno, le riammette.
- **Pasti.** Non si bloccano né si sostituiscono dalla scheda; si possono rimuovere e spostare. Le rigenerazioni li ricollocano con la regola R-5.
- **Cambia preferenze** dalla pagina cambia ritmo e stili (gli altri campi si cambiano dal percorso delle preferenze); il motore accetta qualsiasi profilo validato.
- **Destinazioni.** La bozza nasce solo da una destinazione con l'istantanea pronta nella base dati (le precaricate o una già costruita); altrimenti il viaggiatore legge cosa fare.

### Alternative scartate

- Salvare l'elenco delle bloccate a parte: un dato in più da tenere allineato con l'itinerario, quando il requisito dice già che il lucchetto rende l'attività irrinunciabile.
- Rigenerare tutto il viaggio per «Rigenera questo giorno»: cambierebbero anche gli altri giorni.
- Una migrazione con nuove colonne per profilo e revisione precedente: i test esistenti fissano lo schema alla migrazione 1 e i dati stanno bene in un'impostazione.
- Annulla come "torna sempre a Bn-1": annullare due volte rifarebbe la modifica appena annullata.

## Verifica

Comandi eseguiti dalla radice della copia di lavoro: `npm ci`, `npm run build`, `npm test -w @travelops/engine`, `npm test -w @travelops/sources`; in `apps/web`: `npx vitest run -t '^(?!.*axe-core con tutte le regole \(anche il contrasto\) su (home|stile) in tema).*$'` e `npx tsc --noEmit -p .`.

- `npm run build`: riuscito (la pagina `/bozza/[viaggio]` è dinamica).
- Motore: 718 test superati, di cui 17 nuovi (`revisioni.test.ts`); i riferimenti delle bozze di ST-PLAN-001 non cambiano.
- Sources: 96 test superati.
- Web: 435 test superati e 4 esclusi (i controlli di contrasto axe nel browser su home e /stile, che falliscono solo con il Chrome locale anche su main); 13 nuovi di questa storia.

Corrispondenza criteri e test:

| Criterio | Test |
| --- | --- |
| CA-1 ogni operazione da pulsante | `plan002-ca1-operazioni` (tutti i pulsanti presenti; ogni pulsante crea una revisione salvata con la sua causa: blocca, rigenera giorno, più piena, più leggera, scambia giorni, aggiungi, rimuovi, alternativa, cambia preferenze, sostituisci con le alternative, sposta) |
| CA-1 ogni operazione da chat | `revisioni.test.ts` (CA-1: elenco delle operazioni, operazione arrivata come JSON uguale a quella del pulsante, stato salvato e ricostruito), `plan002-ca1-operazioni` (la stessa operazione in JSON al servizio dà la stessa vista; azione `operaBozzaAzione`) |
| CA-2 Annulla esatto | `revisioni.test.ts` (Annulla dopo ognuna delle 11 operazioni che modificano la bozza; catena di annulla; «torna alla revisione Bn»), `plan002-ca2-annulla` (dalla pagina, anche nella base dati; Torna a B3; Confronta) |
| CA-3 bloccate | `revisioni.test.ts` (istantanea di prova e Garda: due bloccate dopo rigenera giorno, tre cambi di preferenze e alternativa; sblocca), `plan002-ca2-annulla` (la scheda bloccata resta con il lucchetto dopo «Rigenera questo giorno» e «Cambia preferenze») |
| CA-4 versione 1 = ultima revisione | `revisioni.test.ts` (CA-4), `plan002-ca4-ca5-conferma` (storico salvato, stato confermato, «Buon viaggio!», coriandoli disattivabili, festa chiudibile) |
| CA-5 proposte dopo la conferma | `revisioni.test.ts` (CA-5: la bozza confermata non cambia; 6 operazioni diventano proposte e l'accettazione crea la versione 2), `plan002-ca4-ca5-conferma` (Rimuovi prepara una proposta, Accetta crea la versione 2, Rifiuta non crea versioni) |
| CA-6 10+ revisioni | `revisioni.test.ts` (CA-6: 14 operazioni di fila sull'istantanea di prova e sul Garda; ogni revisione valida, senza problemi bloccanti, id unici, nessun giorno vuoto, bloccate presenti; numero di attività non peggiorato; annullando tutto si torna esattamente a B1) |
| Problemi bloccanti con azione suggerita | `revisioni.test.ts` (sposta sopra un'altra attività: revisione creata, suggerimenti senza codici) |
| Accessibilità e nessun codice a vista | `plan002-accessibilita` (axe senza violazioni, prima e dopo la conferma), `plan002-ca1-operazioni` |
| «Crea la mia bozza» | `plan002-ca1-operazioni` (dal percorso guidato: viaggio in bozza con B1 e pagina della bozza; senza destinazione pronta un messaggio) |

## Collegamenti

- Requisito: REQ-PLAN-002
- Story: ST-PLAN-002
- Dipendenze: ST-PLAN-001, ST-EDIT-001, ST-EDIT-002, ST-ITIN-002, ST-FEAS-001, ST-DATA-001, ST-PREF-001B, ST-UX-001
- Aggancio della chat: con gli strumenti di ST-CHAT-001C
