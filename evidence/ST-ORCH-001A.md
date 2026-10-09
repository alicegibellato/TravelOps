# Prove di consegna: ST-ORCH-001A

## Cosa è stato chiesto

La prima parte di REQ-ORCH-001 revisione 2 "Agenti e orchestratore" (versione 1.1: agenti con OpenAI, CR-001 D-7): la base su cui si appoggiano gli strumenti del motore (ST-ORCH-001B), l'orchestratore e gli agenti (ST-ORCH-001C) e la chat lato server (ST-CHAT-001A). Story `ST-ORCH-001A` "Agenti: client OpenAI, client finto e funzionamento senza chiave", con questi criteri:

1. nuovo workspace `packages/agents` (`@travelops/agents`) con un'interfaccia `ClienteModello` neutra rispetto all'SDK (messaggi, strumenti con schema JSON, chiamate agli strumenti, risposte in streaming come iterabile asincrono di eventi testo / chiamata strumento / fine) e due realizzazioni:
   - client OpenAI con l'SDK ufficiale `openai`, che legge `OPENAI_API_KEY` e `TRAVELOPS_MODEL` (predefinito `gpt-6-luna`) solo lato server, con gli errori dell'API tradotti in un errore tipizzato "AI non disponibile";
   - client finto che riproduce conversazioni registrate (file JSON), deterministico, che fallisce chiaramente con una richiesta non registrata;
2. un ciclo minimo di esecuzione degli strumenti con un registro passato dall'esterno e un limite di iterazioni;
3. funzionamento senza chiave (CA-3): `creaClienteDaAmbiente()` restituisce lo stato "non disponibile" con il messaggio esatto "La chat non è disponibile in questo momento: puoi continuare con i pulsanti"; la web app si compila e funziona senza chiave;
4. nessuna chiave nel codice o nei log (CA-4) e nessuna rete nei test (CA-5);
5. `apps/web/.env.local` escluso da Git e documentato nel README del pacchetto.

## Perimetro ed esclusioni

- **Comprende:**
  - i tipi neutri (`Messaggio`, `ChiamataStrumento`, `DefinizioneStrumento`, `RichiestaModello`, `EventoModello`, `ClienteModello`) e `raccogliRisposta`;
  - `ErroreAiNonDisponibile` (con causa, stato HTTP, codice del fornitore e `messaggioUtente`) e `MESSAGGIO_AI_NON_DISPONIBILE`;
  - il client OpenAI (`creaClienteOpenAI`) con la Responses API in streaming e function calling;
  - `creaClienteDaAmbiente` per il funzionamento con e senza chiave;
  - il client finto (`creaClienteFinto`), il formato delle conversazioni registrate con lettura validata (`caricaConversazioneRegistrata`, `leggiConversazioneRegistrata`) e il registratore (`creaClienteRegistratore`) per scrivere le registrazioni dal modello vero;
  - il ciclo degli strumenti (`eseguiCiclo`, `eseguiCicloCompleto`, `Strumento`, `RegistroStrumenti`, `ErroreStrumento`);
  - la regola `.env*.local` nel `.gitignore` e il README del pacchetto;
  - i test di tutti i criteri, con strumenti di prova e una conversazione registrata di prova.
- **Esclude** (di altre storie):
  - gli strumenti veri del motore e della sorgente delle destinazioni: ST-ORCH-001B;
  - orchestratore, agenti Consulente, Planner e Gestione imprevisti, istruzioni di sistema e conversazioni registrate del copione della demo (CA-1, CA-2): ST-ORCH-001C;
  - la chat lato server e la sua interfaccia, compreso lo stato "AI non disponibile" a video: ST-CHAT-001A.
- **Lasciato fuori di proposito:**
  - nessuna validazione JSON Schema degli argomenti nel ciclo (servirebbe una dipendenza in più): il ciclo analizza il JSON e lo strumento valida;
  - nessun file in `packages/engine`, `packages/sources` né nei test di altri moduli;
  - nessuna UI.
- **Deviazioni:**
  - `@travelops/agents` **non è dichiarato** nelle dipendenze di `apps/web/package.json`: il test CA-9 di REQ-WEB-002 (`apps/web/test/web002-ca9-motore.test.ts`) confronta l'elenco esatto delle dipendenze della web app e fallirebbe con una voce in più. Come da istruzioni, la dichiarazione resta a ST-CHAT-001A (insieme all'aggiornamento di quel test), che userà il client. La web app oggi non importa il pacchetto, quindi nessun file di `apps/web` è cambiato; `npm run build` compila la web app senza `OPENAI_API_KEY` nell'ambiente.
  - Il `README.md` della radice non elenca ancora `packages/agents` nella tabella "Struttura": il file è fuori dai percorsi scrivibili di questa story. La documentazione completa è in `packages/agents/README.md`.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Nuovo workspace `@travelops/agents` (unica dipendenza: `openai` ^7.31.0) | `packages/agents/package.json`, `packages/agents/tsconfig.json`, `packages/agents/vitest.config.ts` |
| Interfaccia neutra verso il modello, eventi dello streaming, `raccogliRisposta` | `packages/agents/src/modello.ts` |
| Errori tipizzati e messaggio per il viaggiatore | `packages/agents/src/errori.ts` |
| Client OpenAI (Responses API in streaming, traduzione di richiesta, eventi ed errori) | `packages/agents/src/openai.ts` |
| Client dall'ambiente del server, con lo stato "non disponibile" | `packages/agents/src/ambiente.ts` |
| Client finto, formato e lettura delle conversazioni registrate, registratore | `packages/agents/src/finto.ts` |
| Ciclo degli strumenti | `packages/agents/src/ciclo.ts` |
| Punto d'ingresso | `packages/agents/src/index.ts` |
| Documentazione: chiave, interfaccia, formato delle registrazioni, scelte | `packages/agents/README.md` |
| Test, supporto (fetch finto SSE, strumenti di prova) e conversazione registrata di prova | `packages/agents/test/*.test.ts`, `packages/agents/test/supporto.ts`, `packages/agents/test/dati/conversazione-di-prova.json` |
| `.env` e `.env*.local` esclusi da Git | `.gitignore` |
| Workspace e `openai` nel lockfile | `package-lock.json` |
| Prove di consegna | `evidence/ST-ORCH-001A.md` |

Il `package.json` della radice non è cambiato: il glob `packages/*` include già il nuovo workspace, che `npm run build` e `npm test` compilano e provano insieme agli altri.

## Perché

- **Responses API e non Chat Completions.** È l'API che OpenAI indica per i progetti nuovi e per gli agenti. Gli eventi dello streaming sono tipizzati e una chiamata a strumento arriva completa (`response.output_item.done`) con il suo `call_id`: la traduzione verso `EventoModello` è diretta, senza ricomporre i frammenti degli argomenti come con Chat Completions. SDK `openai` 7.31.0, l'ultima stabile (nessuna dipendenza transitiva).
- **Senza stato (`store: false`).** La conversazione intera viaggia a ogni richiesta, come con il client finto: lo stesso codice degli agenti funziona con i due client, la conversazione la salva TravelOps (REQ-DATA-001) e niente resta salvato presso OpenAI. Limite: con i modelli di ragionamento gli elementi di ragionamento non vengono ripassati tra i turni (funziona, il modello riparte da capo).
- **Interfaccia di soli dati JSON.** Messaggi, chiamate ed eventi sono oggetti semplici in italiano: le conversazioni registrate li usano così come sono, e la chat li può salvare senza conversioni. Gli argomenti delle chiamate restano il testo JSON del modello (può essere non valido): il ciclo lo analizza e risponde al modello con un errore se non è JSON; il client finto li confronta per valore.
- **Istruzioni di sistema fuori dai messaggi.** `RichiestaModello.istruzioni` (in OpenAI `instructions`): ogni agente di ST-ORCH-001C ha le sue, mentre la conversazione resta la stessa.
- **Chiave mai fuori dal server (CA-4).** La chiave entra solo da `OPENAI_API_KEY` in `ambiente.ts` e finisce solo nell'intestazione `Authorization` costruita dall'SDK. Il log dell'SDK è spento in modo esplicito (vince su `OPENAI_LOG`) con un logger muto come seconda garanzia; il client restituito non tiene riferimenti all'SDK; gli errori sono nuovi `ErroreAiNonDisponibile` senza `cause` e senza il messaggio del fornitore, perché un 401 di OpenAI cita parti della chiave ("Incorrect API key provided: sk-…"). Del fornitore si tiene solo il codice, se è un identificativo breve (`invalid_api_key`).
- **"AI non disponibile" con una causa.** La chat mostra sempre lo stesso messaggio gentile, ma la causa (`chiave_mancante`, `autenticazione`, `limite`, `rete`, `servizio`, `richiesta`, `annullata`) serve ai log del server e a decidere se riprovare.
- **Client finto severo.** I turni si consumano nell'ordine; per ogni turno si controllano istruzioni, nomi degli strumenti e messaggi (tutta la conversazione, o solo la coda con `ultimiMessaggi`, per registrazioni più corte); i campi assenti non si controllano. Una richiesta diversa o in più solleva `ErroreConversazioneNonRegistrata` con turno, posizione e il confronto atteso/ricevuto; `verificaCompletata()` segnala i turni non usati. Un turno può simulare l'API che non risponde (`errore`), per i test della chat.
- **Ciclo sequenziale e conversazione sempre valida.** Gli strumenti del motore cambiano il viaggio, quindi si eseguono uno alla volta nell'ordine chiesto. Ogni chiamata riceve sempre il suo risultato, anche al limite di iterazioni (predefinito 8 risposte del modello), perché l'API rifiuta una conversazione con chiamate senza risultato; una risposta troncata non esegue le chiamate. Gli errori degli strumenti tornano al modello come `{"errore": "…"}` così può correggersi: solo i messaggi di `ErroreStrumento` arrivano al modello, le altre eccezioni restano nell'evento per i log.
- **Creare il client non chiama la rete.** `creaClienteDaAmbiente` e `creaClienteOpenAI` non fanno richieste: la prima avviene con `rispondi`. Senza chiave la funzione non solleva errori, quindi la web app si avvia comunque.

## Verifica

Comandi eseguiti dalla radice della copia di lavoro (`C:\Users\a.gibellato\TravelOps-wt\ST-ORCH-001A`, Node.js 22.22.2, npm 10.9.7, `CI=true`, senza `OPENAI_API_KEY` nell'ambiente): `npm ci`, `npm install openai@^7.31.0 -w @travelops/agents`, `npm run build`, `npm test`, `npm audit`, controllo dei tipi dei test del pacchetto con `tsc --noEmit`, `git check-ignore -v apps/web/.env.local`.

| Comando | Esito |
| --- | --- |
| `npm run build` | verde: `@travelops/agents` (tsc), motore, `@travelops/sources` e web app (Next.js, 82 pagine) senza chiave |
| `npm test` | verde: `@travelops/agents` 6 file / 42 test (tutti nuovi), motore 30 file / 573 test, `@travelops/sources` 6 file / 56 test, web app 43 file / 314 test |
| `npm audit` | 0 vulnerabilità |
| `git check-ignore -v apps/web/.env.local` | escluso dalla regola `.env*.local` (`.gitignore`, riga 14) |

| Criterio | Test | Esito |
| --- | --- | --- |
| 1. Interfaccia `ClienteModello` neutra, streaming come iterabile asincrono di eventi | `packages/agents/test/cliente-openai.test.ts`, `cliente-finto.test.ts` (eventi `testo`, `chiamata_strumento`, `fine` dai due client) | passato |
| 1. Client OpenAI: richiesta verso la Responses API, streaming, `gpt-6-luna` predefinito, errori tradotti in "AI non disponibile" | `packages/agents/test/cliente-openai.test.ts` (12 test: corpo della richiesta, strict, eventi e consumo, 401/403/429/400/404/500/503, rete, risposta fallita, evento `error`, flusso interrotto, annullamento, chiave vuota) | passato |
| 1. Client finto: riproduce conversazioni registrate da JSON, deterministico, fallisce chiaramente con una richiesta non registrata | `packages/agents/test/cliente-finto.test.ts` (6 test: riproduzione e `verificaCompletata`, determinismo, messaggio/istruzioni/strumenti/numero di messaggi diversi e turno in più, campi non controllati ed errore simulato, file non validi, registratore) | passato |
| 2. Ciclo degli strumenti con registro esterno e limite di iterazioni | `packages/agents/test/ciclo-strumenti.test.ts` (7 test: ciclo completo in streaming con due strumenti, nessuno strumento, strumento sconosciuto / JSON non valido / eccezioni / `ErroreStrumento`, limite di iterazioni, risposta troncata, AI non disponibile, registro non valido) | passato |
| 3. CA-3 senza chiave: stato "non disponibile" con il messaggio esatto | `packages/agents/test/ca3-senza-chiave.test.ts` (8 test: messaggio esatto, chiave assente/vuota/spazi, `process.env` predefinito, modello predefinito e `TRAVELOPS_MODEL`, import del pacchetto senza chiave) | passato |
| 3. CA-3 la web app si compila e funziona senza chiave | `npm run build` e `npm test` della web app senza `OPENAI_API_KEY` | passato |
| 4. CA-4 nessuna chiave nei log | `packages/agents/test/ca4-segreti.test.ts` (2 test: cattura di console, stdout e stderr con `OPENAI_LOG=debug`; risposte, ciclo, 401 ed evento di errore che citano la chiave; errori, client e stato senza la chiave; la chiave solo nell'intestazione `Authorization`) | passato |
| 4. CA-4 nessuna chiave nel codice | `packages/agents/test/ca4-segreti.test.ts` (3 test: nessun file del repository con una chiave OpenAI o `OPENAI_API_KEY=` con un valore; `.env*.local` nel `.gitignore`; il pacchetto non scrive log e legge l'ambiente solo in `ambiente.ts`) | passato |
| 4. CA-5 nessuna rete nei test | `packages/agents/test/ca5-rete.test.ts` (4 test: `fetch`, socket, `http`/`https` e DNS bloccati; client finto, ciclo, stato e client OpenAI con fetch finto funzionano; senza fetch finto il client OpenAI tocca solo il `fetch` globale bloccato e risponde "AI non disponibile"; nessuna chiamata di rete diretta, SDK solo in `openai.ts`) | passato |
| 5. `apps/web/.env.local` escluso da Git e documentato | `.gitignore`, `packages/agents/README.md` ("Impostare la chiave"), test CA-4 sul `.gitignore` | passato |
| Nessuna regressione (motore, sorgenti, web app) | suite esistenti invariate | passato |

## Collegamenti

- Requisito: [REQ-ORCH-001](../docs/requirements/REQ-ORCH-001-agenti-orchestratore.md), revisione `REQ-ORCH-001-R2`
- Story: `ST-ORCH-001A`
- Contratto: `contract-ST-ORCH-001A-implementation`
- Profilo di esecuzione: `AUT-PR-ORCH-001A`
- Branch: `feature/ST-ORCH-001A`
