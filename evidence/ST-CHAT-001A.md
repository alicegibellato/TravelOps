# Prove di consegna: ST-CHAT-001A

## Cosa è stato chiesto

La storia ST-CHAT-001A porta nella web app la parte **lato server** della chat di REQ-CHAT-001:

- **Endpoint della chat** con la risposta **in streaming**: il testo arriva a pezzi mentre si forma.
- **Conversazione salvata** per viaggio nel database di REQ-DATA-001, con le schede ricche e le risposte rapide.
- **CA-2**: una proposta accettata dalla chat crea la stessa versione che si crea dal pulsante.
- **CA-5 lato server**: errore della singola richiesta e "AI non disponibile" gestiti, con messaggi semplici e nessun dettaglio tecnico.

Vincoli: la chiave OpenAI resta sul server; nessuna logica del motore duplicata; SQL solo in `src/basedati`; nessuna chiamata di rete nei test; modifiche solo in `apps/web`, `docs` ed `evidence`.

## Perimetro ed esclusioni

- **Comprende:**
  - il protocollo dello streaming (eventi JSON, uno per riga), usabile dal server e dal browser (`apps/web/src/chat/protocollo.ts`);
  - l'assistente lato server dietro un'interfaccia, in due versioni: con il modello linguistico (`@travelops/agents`, ST-ORCH-001A) e finta a copione (`apps/web/src/chat/server/assistente.ts`);
  - il servizio della chat: crea e legge le conversazioni, risponde in streaming salvando i messaggi, accetta e rifiuta una proposta con le operazioni del pulsante (`apps/web/src/chat/server/servizio.ts`);
  - gli endpoint HTTP (`apps/web/app/api/chat/...`) e i loro gestori, provabili senza Next.js (`apps/web/src/chat/server/gestori.ts`, `web-app.ts`);
  - 29 test nuovi.
- **Esclude:**
  - **il collegamento del pannello** (ST-CHAT-001B) a questi endpoint e gli **agenti veri** con gli strumenti del motore: ST-CHAT-001C, dopo ST-ORCH-001B e ST-ORCH-001C. Oggi il pannello usa ancora la sorgente finta nel browser;
  - CA-1 (dal prompt 1 alla bozza) e CA-6 (filtri e chat sullo stesso profilo): servono gli agenti e REQ-PREF-001, quindi ST-CHAT-001C;
  - CA-3 e CA-4 (chip e telefono): sono del pannello, già consegnati con ST-CHAT-001B.
- **Deviazione approvata:** `@travelops/agents` si usa tramite il collegamento del workspace npm, senza dichiararlo in `apps/web/package.json`. Dichiararlo cambierebbe `package-lock.json`, che è fuori dai percorsi approvati del requisito. È la stessa scelta già fatta per `@travelops/sources` (ST-CAT-002A). Approvata da Valerio con il contratto.
- **Lasciato fuori di proposito:** `packages/`, `.github`, `package.json` e `package-lock.json` non sono toccati.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Protocollo dello streaming: eventi `testo`, `risposta`, `errore`; codifica, decodifica validata, flusso di byte e lettura a pezzi | `apps/web/src/chat/protocollo.ts` |
| Assistente lato server: interfaccia, versione con il modello (ciclo di `@travelops/agents`, istruzioni in italiano), versione dall'ambiente (`OPENAI_API_KEY`, `TRAVELOPS_MODEL`), versione finta; codice d'errore per il viaggiatore | `apps/web/src/chat/server/assistente.ts` |
| Servizio della chat: conversazioni, validazione del messaggio, risposta in streaming con salvataggio, decisione su una proposta con le operazioni della Demo | `apps/web/src/chat/server/servizio.ts` |
| Gestori HTTP (Request → Response), con le dipendenze iniettate | `apps/web/src/chat/server/gestori.ts` |
| Gestori con le dipendenze vere: cartella `.data`, assistente dall'ambiente, rigenerazione delle pagine | `apps/web/src/chat/server/web-app.ts` |
| Endpoint Next.js | `apps/web/app/api/chat/conversazioni/route.ts`, `.../[id]/route.ts`, `.../[id]/messaggi/route.ts`, `.../[id]/proposte/[proposta]/route.ts` |
| Alias dei test per i sorgenti di `@travelops/agents` (come per motore e sorgenti) | `apps/web/vitest.config.ts` |
| Test nuovi (29) e supporto | `apps/web/test/chat001a-*.test.ts`, `apps/web/test/supporto-chat001a.ts` |
| Prove di consegna | `evidence/ST-CHAT-001A.md` |

Gli endpoint:

| Metodo e indirizzo | Corpo | Risposta |
| --- | --- | --- |
| `POST /api/chat/conversazioni` | `{ viaggio?: string }` | 201 `{ conversazione }`; 404 se il viaggio non esiste |
| `GET /api/chat/conversazioni/:id` | — | 200 `{ conversazione }` con i messaggi; 404 |
| `POST /api/chat/conversazioni/:id/messaggi` | `{ testo }` | 200, eventi JSON per riga (`application/x-ndjson`); 400 messaggio non valido; 404 |
| `POST /api/chat/conversazioni/:id/proposte/:proposta` | `{ decisione: "accetta" \| "rifiuta", nome? }` | 200 `{ esito, messaggio }`; 400; 404 |

Gli errori della richiesta rispondono `{ errore: { codice, messaggio } }`.

## Perché

### Scelte

- **Streaming come eventi JSON per riga.** È il formato più semplice da leggere sia sul server sia nel browser con `fetch` e `ReadableStream`, senza librerie. Il flusso finisce sempre con un solo evento `risposta` (con il numero del messaggio salvato) oppure `errore`. Se chi legge chiude la connessione, si ferma anche l'assistente (`cancel` → `return` del generatore e `AbortSignal` della richiesta).
- **Si salva solo una risposta completa.** Il messaggio del viaggiatore e la risposta si salvano insieme, in una transazione, quando la risposta è completa. Se l'assistente fallisce la conversazione non cambia: il viaggiatore può riprovare con lo stesso testo senza duplicati né messaggi senza risposta.
- **Due tipi di errore per il viaggiatore**, come la sorgente del pannello (`non-disponibile`, `errore`):
  - `non-disponibile`: manca la chiave o è rifiutata (`chiave_mancante`, `autenticazione`). La chat si spegne con il messaggio di REQ-ORCH-001: "La chat non è disponibile in questo momento: puoi continuare con i pulsanti".
  - `errore`: rete, servizio, limite, richiesta rifiutata, risposta vuota o un errore qualunque. Vale solo per quella richiesta: "Non sono riuscito a rispondere: riprova tra poco."
  - Nessun dettaglio tecnico (stato HTTP, causa, messaggio dell'eccezione) arriva al viaggiatore.
- **CA-2 con la stessa operazione del pulsante.** Accettare o rifiutare dalla chat chiama `accettaProposta` e `rifiutaPropostaSalvata` di `src/stato/operazioni.ts`, le stesse funzioni dell'azione della pagina Demo. Il nome segue le regole del campo del modulo: obbligatorio, al massimo 80 caratteri, "Viaggiatore" se manca. L'esito si salva nella conversazione con la scheda di conferma e le pagine si rigenerano (`revalidatePath`), come dopo il pulsante.
- **Assistente sostituibile.** Il servizio conosce solo `AssistenteChat`. Oggi la versione vera usa il ciclo di `@travelops/agents` senza strumenti, con istruzioni brevi che vietano di inventare orari, prezzi o modifiche. ST-CHAT-001C ci collegherà l'orchestratore e gli agenti di ST-ORCH-001C senza cambiare endpoint, protocollo e salvataggio.
- **Gestori separati da Next.js.** I file `route.ts` sono di tre righe; tutto il resto riceve una `Request` e restituisce una `Response`. I test chiamano i gestori con una cartella temporanea e l'assistente scelto, senza avviare il server.
- **Chiave solo sul server.** L'assistente si crea dall'ambiente del server a ogni messaggio (`creaClienteDaAmbiente`); lo stato restituito non contiene la chiave. I moduli in `src/chat/server` non sono importati da file `"use client"`.

### Alternative scartate

| Alternativa | Perché è stata scartata |
| --- | --- |
| Server-Sent Events (`text/event-stream`) | `EventSource` non manda richieste POST con un corpo; il test di rete del pannello vieta `EventSource`. Le righe JSON si leggono con `fetch` |
| Salvare il messaggio del viaggiatore subito, prima della risposta | Un errore lascerebbe un messaggio senza risposta e un "Riprova" lo duplicherebbe |
| Server Actions di Next.js al posto degli endpoint | Non restituiscono uno streaming di testo controllabile e sono più difficili da provare in isolamento |
| Dichiarare `@travelops/agents` in `apps/web/package.json` | Cambia `package-lock.json`, fuori dai percorsi del requisito (scelta approvata) |
| Collegare ora il pannello agli endpoint | È il perimetro di ST-CHAT-001C, insieme agli agenti veri |

## Verifica

Eseguito su Windows 11, Node 24, nella copia di lavoro `C:\Progetti\TravelOps` sul ramo `feature/ST-CHAT-001A`, dopo `npm ci`.

- `npm run build` per `@travelops/agents`, `@travelops/engine` e `@travelops/sources`: verde.
- `npm run typecheck -w @travelops/web`: nessun errore, test compresi.
- `npm run build -w @travelops/web` (Next.js): verde; i quattro endpoint compaiono come rotte dinamiche (`ƒ /api/chat/conversazioni`, `…/[id]`, `…/[id]/messaggi`, `…/[id]/proposte/[proposta]`).
- Test nuovi: `npx vitest run test/chat001a-*.test.ts` in `apps/web`: 4 file, **29 test, tutti verdi**.
- Suite completa della web app (`npx vitest run` in `apps/web`): 47 file, 343 test, **339 verdi e 4 rossi per tempo scaduto** (oltre 5 secondi) in `ux001-browser.test.tsx`, `ux001-ca6-codici.test.tsx` e `web003-ca5-codici.test.tsx`. Sono test pesanti che disegnano tutte le pagine; non toccano la chat. **Vanno in timeout allo stesso modo anche senza queste modifiche** (verificato togliendo temporaneamente i file della storia): su questa macchina superano i 5 secondi. La CI su Linux è il riferimento.
- `ca6-rete.test.ts` passa: nessun `fetch`, `EventSource` o socket nei file della web app; i test della chat bloccano `fetch` per tutta la durata.
- `data001-accesso.test.ts` passa: nessun SQL fuori da `src/basedati`.
- File con a capo LF.

| Criterio | Test (file › nome) | Esito |
| --- | --- | --- |
| Endpoint con risposte in streaming | `chat001a-streaming.test.ts` › "la risposta arriva a pezzi di testo e finisce con la risposta completa, scheda e risposte rapide comprese"; `chat001a-assistente-modello.test.ts` › "la risposta del modello arriva in streaming e si salva; il modello riceve la conversazione intera"; protocollo › "un evento per riga, riletto uguale anche se il flusso arriva spezzato a caso", "dagli eventi al flusso e ritorno", "righe che non sono eventi del protocollo sono rifiutate" | superato |
| Conversazione salvata per viaggio nel database (REQ-DATA-001) | `chat001a-streaming.test.ts` › "crea una conversazione collegata al viaggio e una ancora senza viaggio"; "la conversazione è salvata nel database: messaggio del viaggiatore, risposta, scheda e risposte rapide"; "la conversazione sopravvive al riavvio …"; "l'assistente riceve tutta la conversazione fino al nuovo messaggio compreso" | superato |
| CA-2 una proposta accettata dalla chat crea la stessa versione del pulsante | `chat001a-ca2-proposta.test.ts` › "CA-2 accettando S1 come «Alice» dalla chat e dal pulsante lo storico salvato è identico, versione 2 compresa"; "CA-2 l'esito si salva nella conversazione con la scheda di conferma e le pagine si rigenerano"; "CA-2 rifiutando dalla chat e dal pulsante lo stato salvato è identico …"; "una proposta che non c'è più …"; "richieste non valide …" | superato |
| CA-5 AI non disponibile (lato server) | `chat001a-ca5-errori.test.ts` › "CA-5 senza OPENAI_API_KEY l'AI non è disponibile …"; "CA-5 con la chiave rifiutata (autenticazione) …"; `chat001a-assistente-modello.test.ts` › "dall'ambiente: senza chiave non disponibile …" | superato |
| CA-5 errore della singola richiesta (lato server) | `chat001a-ca5-errori.test.ts` › "CA-5 con un errore di rete / servizio / limite / richiesta fallisce solo questa richiesta: si può riprovare …"; "… un errore qualunque dell'assistente …"; "… una risposta vuota …"; `chat001a-assistente-modello.test.ts` › "l'API che non risponde (errore registrato) …" | superato |
| CA-5 richieste non valide (lato server) | `chat001a-ca5-errori.test.ts` › "CA-5 messaggio vuoto, troppo lungo o non testo: 400 …"; "… lungo esattamente il massimo si accetta"; "CA-5 conversazione inesistente: 404 …"; "CA-5 viaggio inesistente o non valido alla creazione: 404 o 400" | superato |
| Nessuna chiamata di rete nei test; chiave mai nelle risposte | `supporto-chat001a.ts` blocca `fetch` in ogni test; client del modello finto (`creaClienteFinto`); `chat001a-assistente-modello.test.ts` › "dall'ambiente …" verifica che lo stato non contenga la chiave | superato |

## Collegamenti

- Requisito: REQ-CHAT-001 (`docs/requirements/REQ-CHAT-001-chat.md`)
- Storia: ST-CHAT-001A
- Contratto: contract-ST-CHAT-001A-implementation
- Autonomia: AUT-PR-CHAT-001A
- Dipendenze: ST-DATA-001 (conversazioni salvate), ST-ORCH-001A (`@travelops/agents`), ST-CHAT-001B (tipi e sorgente della chat), ST-WEB-002 (operazioni della Demo)
- Seguito: ST-CHAT-001C (pannello collegato agli endpoint, agenti veri, CA-1, CA-6)
