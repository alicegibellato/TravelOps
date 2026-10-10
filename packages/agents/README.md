# @travelops/agents

Base degli agenti di TravelOps (REQ-ORCH-001, story ST-ORCH-001A): un'interfaccia verso il modello linguistico che non dipende dall'SDK, il client OpenAI, un client finto che riproduce conversazioni registrate, il ciclo che esegue gli strumenti e il funzionamento senza chiave. Sopra la base: gli strumenti del motore (ST-ORCH-001B) e l'orchestratore con gli agenti Consulente, Planner e Gestione imprevisti, con la funzione unica per la chat `rispondiAlMessaggio` (ST-ORCH-001C).

Usano questo pacchetto: la chat lato server (ST-CHAT-001A, ST-CHAT-001C). **Solo lato server**: la chiave non deve mai arrivare al browser.

## Impostare la chiave

La chiave OpenAI sta in `apps/web/.env.local`, un file **escluso da Git** (regola `.env*.local` nel `.gitignore` della radice):

```bash
# apps/web/.env.local
OPENAI_API_KEY=...la tua chiave...
# facoltativo, predefinito gpt-6-luna
TRAVELOPS_MODEL=gpt-6-luna
```

Next.js carica il file in `process.env` del server all'avvio (`npm run dev`, `npm run start`); le variabili non hanno il prefisso `NEXT_PUBLIC_`, quindi non finiscono mai nel browser. Fuori dalla web app basta impostare le stesse variabili d'ambiente.

Senza chiave tutto funziona lo stesso: `creaClienteDaAmbiente()` restituisce lo stato "non disponibile" e la chat mostra il messaggio *"La chat non è disponibile in questo momento: puoi continuare con i pulsanti"*.

Regole sulla chiave (CA-4): mai nel codice, nei test, nei log, negli errori o nei messaggi di commit. Il pacchetto non scrive log, spegne il log dell'SDK (anche con `OPENAI_LOG`) e non riporta mai il messaggio d'errore del fornitore (che può citare parti della chiave). Un test cerca chiavi in tutti i file del repository.

## Interfaccia

Tutti i tipi sono dati JSON semplici e in italiano; nessun tipo dell'SDK `openai` esce dal pacchetto.

### Il modello: `ClienteModello`

```ts
interface ClienteModello {
  readonly fornitore: string; // "openai", "finto"
  readonly modello: string;   // per esempio "gpt-6-luna"
  rispondi(richiesta: RichiestaModello): AsyncIterable<EventoModello>;
}

interface RichiestaModello {
  istruzioni?: string;                       // istruzioni di sistema dell'agente
  messaggi: readonly Messaggio[];            // la conversazione, dal più vecchio
  strumenti?: readonly DefinizioneStrumento[];
  segnale?: AbortSignal;
}

type Messaggio =
  | { ruolo: "utente"; testo: string }
  | { ruolo: "assistente"; testo: string; chiamate?: ChiamataStrumento[] }
  | { ruolo: "strumento"; idChiamata: string; nome: string; risultato: string };

interface ChiamataStrumento { id: string; nome: string; argomenti: string /* testo JSON del modello */ }
interface DefinizioneStrumento { nome: string; descrizione: string; parametri: SchemaJson; rigoroso?: boolean }

type EventoModello =
  | { tipo: "testo"; testo: string }                          // pezzo di testo (streaming)
  | { tipo: "chiamata_strumento"; chiamata: ChiamataStrumento } // chiamata completa
  | { tipo: "fine"; motivo: "completata" | "strumenti" | "troncata"; uso?: { ingresso: number; uscita: number } };
```

- Gli eventi arrivano nell'ordine; `fine` è sempre l'ultimo, una volta sola.
- Se l'AI non risponde, l'iterazione solleva **`ErroreAiNonDisponibile`** con `causa` (`chiave_mancante`, `autenticazione`, `limite`, `rete`, `servizio`, `richiesta`, `annullata`), `stato` HTTP e `codice` del fornitore se ci sono, e `messaggioUtente` = `MESSAGGIO_AI_NON_DISPONIBILE`. Mai errori dell'SDK.
- `raccogliRisposta(eventi)` consuma lo streaming e restituisce `{ testo, chiamate, motivo, uso? }`.

### Funzionamento senza chiave: `creaClienteDaAmbiente`

```ts
function creaClienteDaAmbiente(ambiente?: Ambiente /* = process.env */, opzioni?: OpzioniDaAmbiente): StatoClienteModello;

type StatoClienteModello =
  | { disponibile: true; cliente: ClienteModello; modello: string }
  | { disponibile: false; motivo: "chiave_mancante"; messaggio: string /* MESSAGGIO_AI_NON_DISPONIBILE */ };
```

Non solleva errori e non fa chiamate di rete. Legge `OPENAI_API_KEY` (assente o vuota → non disponibile) e `TRAVELOPS_MODEL` (predefinito `MODELLO_PREDEFINITO` = `gpt-6-luna`).

### Il client OpenAI: `creaClienteOpenAI`

```ts
function creaClienteOpenAI(opzioni: {
  chiaveApi: string; modello?: string;
  fetch?: FetchCompatibile;   // nei test: un fetch finto, mai la rete
  maxTentativi?: number;      // predefinito 1
  timeoutMs?: number;         // predefinito 60 000
  indirizzoBase?: string;
}): ClienteModello;
```

Usa l'SDK ufficiale `openai` (7.x) con la **Responses API** in streaming e le chiamate agli strumenti (function calling). Scelta rispetto a Chat Completions: è l'API che OpenAI indica per i progetti nuovi e per gli agenti; gli eventi dello streaming sono tipizzati e una chiamata a strumento arriva completa (`response.output_item.done`) con il suo `call_id`, senza ricomporre a mano i frammenti degli argomenti. Le richieste sono **senza stato** (`store: false`): la conversazione intera viaggia a ogni richiesta, come con il client finto, e niente resta salvato presso OpenAI.

| Interfaccia | Responses API |
| --- | --- |
| `istruzioni` | `instructions` |
| `{ ruolo: "utente" }` | `{ type: "message", role: "user" }` |
| `{ ruolo: "assistente", testo, chiamate }` | `{ type: "message", role: "assistant" }` (se c'è testo) e un `{ type: "function_call", call_id, name, arguments }` per chiamata |
| `{ ruolo: "strumento" }` | `{ type: "function_call_output", call_id, output }` |
| `DefinizioneStrumento` | `{ type: "function", name, description, parameters, strict }` |
| `response.output_text.delta`, `response.refusal.delta` | evento `testo` |
| `response.output_item.done` di tipo `function_call` | evento `chiamata_strumento` |
| `response.completed` / `response.incomplete` | `fine` (`completata` o `strumenti` / `troncata`) |
| `response.failed`, evento `error`, errori HTTP e di rete | `ErroreAiNonDisponibile` |

Limite noto: con i modelli di ragionamento, in modalità senza stato gli elementi di ragionamento non vengono ripassati tra un turno e l'altro; funziona, ma il modello ragiona di nuovo da capo.

### Il client finto: `creaClienteFinto`

Riproduce una conversazione registrata, deterministico e senza rete. Per i test di CA-1 (copione della demo) e della chat.

```ts
function creaClienteFinto(conversazione: ConversazioneRegistrata | unknown): ClienteFinto;
function caricaConversazioneRegistrata(percorso: string | URL): ConversazioneRegistrata; // da file JSON, validata
function leggiConversazioneRegistrata(dati: unknown): ConversazioneRegistrata;

interface ClienteFinto extends ClienteModello {
  readonly richieste: readonly RichiestaModello[]; // ricevute, nell'ordine
  turniUsati(): number;
  verificaCompletata(): void; // fallisce se restano turni non usati
}
```

Formato del file (versione 1):

```json
{
  "versione": 1,
  "descrizione": "Copione, prompt 1",
  "turni": [
    {
      "atteso": {
        "istruzioni": "…",
        "strumenti": ["cerca_destinazione"],
        "messaggi": [{ "ruolo": "utente", "testo": "Vorrei 4 giorni a Lisbona" }]
      },
      "risposta": {
        "testo": ["Cerco ", "Lisbona."],
        "chiamate": [{ "id": "call_1", "nome": "cerca_destinazione", "argomenti": { "testo": "Lisbona" } }]
      }
    }
  ]
}
```

- `atteso`: i campi assenti non si controllano. `messaggi` è la conversazione intera; in alternativa `ultimiMessaggi` controlla solo la coda (registrazioni più corte). Gli argomenti delle chiamate si confrontano per valore JSON.
- `risposta`: `testo` (un testo o un elenco di pezzi, uno per evento), `chiamate` (argomenti come oggetto o testo JSON), `motivo` facoltativo, oppure `errore` (una causa di `ErroreAiNonDisponibile`) per simulare l'API che non risponde.
- Una richiesta diversa da quella registrata, o in più, solleva **`ErroreConversazioneNonRegistrata`** con il turno e la prima differenza (atteso e ricevuto). Un file scritto male solleva `ErroreConversazioneNonValida` con il punto esatto.

Per scrivere le registrazioni dal modello vero: `creaClienteRegistratore(cliente)` passa gli eventi così come sono e `conversazione(descrizione)` restituisce il JSON da salvare.

### Il ciclo degli strumenti: `eseguiCiclo`

```ts
interface Strumento {
  definizione: DefinizioneStrumento;
  esegui(argomenti: unknown /* JSON analizzato, NON validato sullo schema */, contesto: { chiamata; segnale? }): unknown;
}
type RegistroStrumenti = readonly Strumento[];

function eseguiCiclo(opzioni: {
  cliente: ClienteModello; istruzioni?: string; messaggi: readonly Messaggio[];
  strumenti?: RegistroStrumenti; maxIterazioni?: number /* = 8 */; segnale?: AbortSignal;
}): AsyncGenerator<EventoCiclo>;
function eseguiCicloCompleto(opzioni): Promise<EsitoCiclo>;

type EventoCiclo =
  | { tipo: "testo"; testo: string }
  | { tipo: "chiamata_strumento"; chiamata }
  | { tipo: "risultato_strumento"; chiamata; risultato: string; errore: boolean; eccezione?: unknown }
  | { tipo: "fine"; esito: EsitoCiclo };

interface EsitoCiclo {
  motivo: "completata" | "troncata" | "limite_iterazioni";
  testo: string;                 // ultima risposta del modello
  messaggiNuovi: Messaggio[];    // da salvare con la conversazione
  chiamate: ChiamataStrumento[];
  iterazioni: number;            // risposte del modello chieste
}
```

Il modello chiede strumenti → il ciclo li esegue **uno alla volta, nell'ordine** (quelli del motore cambiano il viaggio) → i risultati tornano al modello → fino alla risposta finale o a `maxIterazioni` risposte.

- Il valore restituito da `esegui` torna al modello: un testo così com'è, altrimenti come JSON.
- Strumento sconosciuto, argomenti non JSON o eccezione: il modello riceve `{"errore": "…"}` e può correggersi. Il messaggio di un'eccezione arriva al modello solo se è un `ErroreStrumento`; per le altre il modello riceve un testo generico e l'eccezione resta nell'evento `risultato_strumento` per i log del server.
- Ogni chiamata ha sempre il suo risultato, anche quando ci si ferma per il limite: la conversazione resta valida per il turno dopo. Una risposta `troncata` chiude il ciclo senza eseguire chiamate.
- La validazione degli argomenti rispetto allo schema spetta allo strumento (nessuna dipendenza in più per JSON Schema).
- `ErroreAiNonDisponibile` esce dal ciclo così com'è.

## Gli strumenti del motore (ST-ORCH-001B)

`src/strumenti/`: gli strumenti che gli agenti possono chiamare. Sono l'**unico** modo con cui un agente cambia un viaggio (CA-2); non chiamano mai la rete: la rete, se c'è, passa solo dalla `SorgenteDestinazioni` iniettata (CA-5).

```ts
const strumenti = creaStrumentiMotore({
  archivio,           // ArchivioViaggio: il viaggio della conversazione (database nella web app, in memoria nei test)
  sorgente,           // SorgenteDestinazioni di @travelops/sources: registrata nei test, reale nella web app
  contesto?,          // (istantanea) => SorgenteDatiContesto; predefinito contestoDaIstantanea (solo tempi, senza meteo né chiusure)
});
await eseguiCicloCompleto({ cliente, istruzioni, messaggi, strumenti });
```

Ogni strumento ha uno schema JSON **rigoroso** (`rigoroso: true`, `strict` di OpenAI: tutte le proprietà in `required`, `additionalProperties: false`, le facoltative come `["tipo", "null"]`) e valida gli argomenti con lo stesso schema (`validaArgomenti`, `src/strumenti/schema.ts`, senza dipendenze). Argomenti sbagliati o un'operazione impossibile danno un `ErroreStrumento` in italiano semplice: il modello lo riceve e si può correggere. I risultati sono JSON compatti; i nomi di luoghi e attività vengono solo dall'istantanea, le spiegazioni solo dal motore.

| Strumento | Argomenti principali | Che cosa fa | Scrive |
| --- | --- | --- | --- |
| `cerca_destinazione` | `testo` | `sorgente.cercaDestinazioni`: aree con `areaId`, `nome`, `descrizione`, `giaPronta` | no |
| `prepara_destinazione` | `areaId`, `testo` | `sorgente.costruisciIstantanea`; salva l'istantanea, collega il viaggio, mette la destinazione nel profilo (`riferimento` = id dell'istantanea). Sotto i minimi: messaggio e alternative | sì |
| `proponi_destinazioni` | `limite` | "sorprendimi": le istantanee della sorgente ordinate per punteggio del profilo (§7.7) | no |
| `aggiorna_profilo` | i campi di `BozzaProfilo` appiattiti (`destinazione`, `date`, `durata`, `adulti`, `bambini`, `stili`, `ritmo`, …); `null` = invariato | unisce, `validaProfilo` (con il catalogo dell'istantanea), salva se non ci sono valori non validi, restituisce `cosaManca` | sì |
| `genera_bozza` | — | `generaBozza`: nuova revisione della bozza (B1, B2, …) con programma e "perché" | sì |
| `opera_bozza` | `operazione`, `elementoId`, `attivitaId`, `data`, `conData`, `inizio`, `numero` | una delle operazioni dei pulsanti sulla bozza non confermata (`sostituisci`, `rimuovi`, `sposta`, `aggiungi`, `blocca`, `sblocca`, `giornata_piu_leggera`, `giornata_piu_piena`, `rigenera_giorno`, `scambia_giorni`, `alternativa`, `annulla`, `torna_alla_revisione`): `applicaOperazioneBozza` del motore tramite l'`OperatoreBozza`, nuova revisione con la stessa causa del pulsante | sì |
| `cambia_preferenze_bozza` | `ritmo`, `stili` | «Cambia preferenze»: aggiorna ritmo e stili e rigenera tenendo le attività bloccate (`cambia_preferenze` del motore) | sì |
| `alternative_bozza` | `elementoId` | le alternative per «Sostituisci» (`alternativeSostituzione`) | no |
| `confronta_bozza` | `da`, `a` | che cosa cambia tra due revisioni (`confrontaRevisioni`) | no |
| `conferma_viaggio` | — | `confermaBozza` tramite l'`OperatoreBozza`: versione 1, "Itinerario iniziale" | sì |
| `proponi_modifica` | `operazione` (`aggiungi`, `rimuovi`, `sposta`, `cambia_priorita`, `imposta_orario_fisso`), `elementoId`, `attivitaId`, `data`, `inizio`, `priorita`, `orarioFisso` | viaggio confermato: `proponiModifica` sulla versione corrente, proposta salvata (diventa versione solo quando il viaggiatore la accetta, fuori dagli strumenti) | proposta |
| `proponi_ripianificazione` | `tipo` (`METEO_AVVERSO`, `RITARDO`, `CHIUSURA_LUOGO`, `CANCELLAZIONE_SPOSTAMENTO`), `data`, `inizio`, `fine`, `zonaId`, `condizione`, `momento`, `minuti`, `motivo`, `luogoId`, `elementoId` | `proponiRipianificazione`, proposta salvata | proposta |
| `cerca_catalogo` | `testo`, `stile`, `categoria`, `limite` | attività e ristoranti dell'istantanea del viaggio, con adattezza al profilo e motivi di esclusione | no |
| `leggi_viaggio` | `versione` | stato, profilo e cosa manca, zone, bozza corrente oppure versione scelta con l'elenco delle versioni | no |

### L'archivio del viaggio: `ArchivioViaggio`

Un archivio riguarda **un solo viaggio**, quello della conversazione; l'identificativo lo decide chi realizza l'archivio (la web app lo crea alla prima scrittura se la conversazione è nata dalla home). I metodi possono restituire il valore subito (better-sqlite3) o una promessa.

```ts
interface ArchivioViaggio {
  leggiScheda(): SchedaViaggio | null;               // { titolo, stato, destinazione, istantaneaId }
  salvaScheda(scheda: SchedaViaggio): void;           // crea o aggiorna il viaggio (tabella viaggi)
  leggiProfilo(): BozzaProfilo | null;                // tabella profili
  salvaProfilo(profilo: BozzaProfilo): void;
  leggiIstantanea(id: string): IstantaneaCatalogo | null;      // tabella istantanee
  salvaIstantanea(istantanea: IstantaneaDestinazione): void;
  leggiRevisioniBozza(): readonly RevisioneBozza[];   // { numero, causa, viaggio }, tabella revisioni_bozza
  aggiungiRevisioneBozza(causa: string, viaggio: Viaggio): number;
  leggiStorico(): Storico | null;                     // esportaStorico / importaStorico
  salvaStorico(storico: Storico): void;
  salvaProposta(tipo: "modifica" | "ripianificazione", proposta: Proposta): number;  // tabella proposte
}
```

Corrispondenza con la web app (`apps/web/src/basedati`): `salvaScheda` → `salvaViaggio`, `leggiProfilo`/`salvaProfilo` → stesse funzioni, `aggiungiRevisioneBozza` → stessa funzione, `leggiStorico`/`salvaStorico` → `leggiStoricoDelViaggio`/`salvaStoricoDelViaggio`, `salvaProposta` → una riga in più in `sostituisciProposteDelViaggio`, `leggiIstantanea` → `istantanee`. La conversazione resta al servizio della chat (ST-CHAT-001A): gli strumenti non la leggono e non la scrivono. Un viaggio dell'ondata 1 senza istantanea si collega presentando il suo catalogo e i suoi tempi come `IstantaneaCatalogo`.

`creaArchivioInMemoria(iniziale?)` è l'archivio dei test: conserva copie e registra ogni scrittura in `scritture` (CA-2).

### Limiti dichiarati

- **"Sorprendimi"**: `packages/sources/candidates.json` (ST-CAT-002C) non esiste ancora; `proponi_destinazioni` ordina le istantanee che la sorgente ha già (`elencaIstantanee`: le 3 precaricate). Punteggio di una destinazione = somma dei punteggi §7.7 delle sue migliori attività adatte, quante ne servono per durata × ritmo (a parità: più attività adatte, poi l'`id`). Se mancano date o durata si usano segnaposto (il punteggio non le usa).
- **Operazioni sulla bozza (REQ-PLAN-003)**: gli strumenti non hanno regole proprie: `opera_bozza`, `cambia_preferenze_bozza` e `conferma_viaggio` passano da `OperatoreBozza` (`src/strumenti/bozza.ts`). La web app lo collega al servizio della pagina della bozza (lo stesso delle azioni dei pulsanti, `apps/web/src/chat/server/operatore-bozza.ts`): stesse revisioni, stesse cause, stessi dati di «Annulla». Senza porta vale `creaOperatoreDaArchivio`, che applica le funzioni del motore sull'`ArchivioViaggio` (il profilo è unico per tutte le revisioni e «Annulla» risale una revisione alla volta). Il blocco dell'orario (`imposta_orario_fisso`) non è un pulsante della bozza: resta solo in `proponi_modifica`.
- **Imprevisti**: `proponiRipianificazione` accetta i 4 imprevisti dell'ondata 1; quelli della §7.4 (volo perso, salute, sciopero, …) aspettano REQ-REPLAN-004.
- **Accettare una proposta** non è uno strumento: lo fa il viaggiatore con il pulsante (ST-CHAT-001A, `accettaProposta`). Le opzioni del generatore (orari di arrivo e partenza) restano quelle predefinite.

## Gli agenti e l'orchestratore (ST-ORCH-001C)

`src/agenti/`: tre agenti, un orchestratore che sceglie chi risponde, il controllo delle risposte (CA-2) e una funzione unica per la chat. Un agente è solo una configurazione del ciclo: istruzioni di sistema in italiano e un sottoinsieme degli strumenti del motore.

| Agente | Che cosa fa | Strumenti |
| --- | --- | --- |
| **Consulente** (`consulente`) | Raccoglie le preferenze (al massimo 2 domande per messaggio), prepara la destinazione o propone quelle di "sorprendimi", crea la prima bozza | `cerca_destinazione`, `prepara_destinazione`, `proponi_destinazioni`, `aggiorna_profilo`, `genera_bozza`, `cerca_catalogo`, `leggi_viaggio` |
| **Planner** (`planner`) | Rifinisce la bozza con le operazioni dei pulsanti (sostituisci, sposta, scambia giorni, alternativa, annulla, …), la conferma; a viaggio confermato prepara le modifiche richieste come proposte | `aggiorna_profilo`, `genera_bozza`, `opera_bozza`, `cambia_preferenze_bozza`, `conferma_viaggio`, `proponi_modifica`, `cerca_catalogo`, `leggi_viaggio`, `alternative_bozza`, `confronta_bozza` |
| **Gestione imprevisti** (`imprevisti`) | Traduce il racconto in un imprevisto strutturato e chiede la ripianificazione (con conferma se deve dedurre un dato); per i tipi non ancora nel motore lo dice e, se aiuta, propone una modifica puntuale | `proponi_modifica`, `proponi_ripianificazione`, `cerca_catalogo`, `leggi_viaggio` |

### Istruzioni di sistema (`istruzioni.ts`)

Ruolo dell'agente + `REGOLE_COMUNI` + la situazione del momento (`testoSituazione`: data e ora attuali se note, fase del viaggio, destinazione). Le regole comuni: tono amichevole, seconda persona, frasi brevi; niente codici tecnici (id, nomi di strumenti, JSON); al massimo 2 domande; solo luoghi e attività letti nei risultati degli strumenti o scritti dal viaggiatore; l'itinerario lo cambia solo il motore; mai dire di aver prenotato, pagato o cancellato; riassumere un'azione importante prima di farla e chiedere conferma se non è stata chiesta in modo esplicito o se un dato è dedotto; dire che cosa è stato fatto; una proposta si accetta o si rifiuta con i pulsanti.

### L'orchestratore (`instradamento.ts`): regole, poi modello

1. **Regole sulla fase del viaggio** (`leggiSituazioneViaggio`: `nuovo`, `destinazione`, `bozza`, `confermato`): senza bozza risponde il Consulente, con una bozza non confermata il Planner. A viaggio confermato, una risposta breve ("Sì, procedi", "Ok", "No") torna all'`ultimoAgente`.
2. **Modello**, solo a viaggio confermato: dove lo stesso stato ammette una modifica richiesta (Planner) o un imprevisto (Gestione imprevisti), una richiesta con il solo strumento `scegli_agente` (`{ agente, motivo }`, schema rigoroso), le istruzioni dell'orchestratore e gli ultimi 6 messaggi di testo (senza strumenti).
3. **Ripiego**: se il modello non chiama `scegli_agente` con un agente valido, parole chiave di imprevisto → Gestione imprevisti, altrimenti Planner.

Perché così: la fase del viaggio decide già l'agente in tre fasi su quattro, quindi l'instradamento è deterministico, gratuito e facile da provare; il modello serve solo dove c'è vera ambiguità, con un turno in più che nei test è un turno registrato come gli altri. Un agente unico con tutti i 15 strumenti sarebbe stato più semplice, ma con istruzioni più lunghe e strumenti sbagliati a portata di mano (per esempio `genera_bozza` su un viaggio in corso).

### La funzione per la chat: `rispondiAlMessaggio`

```ts
function rispondiAlMessaggio(opzioni: {
  cliente: ClienteModello;           // creaClienteDaAmbiente().cliente nella web app, il client finto nei test
  archivio: ArchivioViaggio;         // il viaggio della conversazione
  sorgente: SorgenteDestinazioni;
  conversazione: readonly Messaggio[]; // salvata, senza il messaggio nuovo
  messaggio: string;                 // il messaggio nuovo del viaggiatore
  ultimoAgente?: NomeAgente | null;  // dall'evento "fine" del messaggio precedente
  adesso?: { data: string; ora: string } | null; // orologio (simulato nella demo)
  contesto?: ContestoMotore; maxIterazioni?: number /* = 10 */; segnale?: AbortSignal;
}): AsyncGenerator<EventoChat>;
function rispondiAlMessaggioCompleto(opzioni): Promise<{ eventi: EventoChat[]; fine: EventoChatFine }>;
```

| Evento | Quando | Campi |
| --- | --- | --- |
| `agente` | sempre il primo | `agente`, `titolo` ("Gestione imprevisti"), `modo` (`regole`, `modello`, `ripiego`), `motivo` |
| `testo` | pezzi del testo, in streaming | `testo` |
| `passo` | uno strumento parte ("Sto esplorando la destinazione…") | `strumento`, `testo` |
| `azione` | uno strumento ha cambiato il viaggio | `strumento`, `testo` ("Bozza creata"), `dati` (il risultato) |
| `proposta` | `proponi_modifica` o `proponi_ripianificazione` riuscite | `tipoProposta`, `propostaId`, `fattibile`, `dati` |
| `risultato` | strumento di lettura, o di scrittura che non ha cambiato nulla | `strumento`, `dati` |
| `strumento_fallito` | errore restituito al modello (per i log del server) | `strumento`, `messaggio`, `eccezione?` |
| `testo_corretto` | il controllo CA-2 ha sostituito il testo già mostrato: la chat rimpiazza la bolla | `testo`, `problemi` |
| `non_disponibile` | l'AI non risponde (CA-3) | `causa`, `messaggio` = `MESSAGGIO_AI_NON_DISPONIBILE` |
| `fine` | sempre l'ultimo | `agente`, `testo` (controllato), `motivo`, `messaggiNuovi` (messaggio del viaggiatore e dell'agente, da salvare), `chiamate` |

La chat salva `messaggiNuovi` (con i messaggi degli strumenti, così il turno dopo il modello ha il contesto) e `agente` come `ultimoAgente`. Con `non_disponibile` si salva solo il messaggio del viaggiatore; ciò che gli strumenti hanno già fatto resta nel viaggio.

### Il controllo delle risposte (`controllo.ts`, CA-2)

Prima di salvare la risposta, `controllaRisposta` cerca nel testo dell'agente i nomi propri (parole con l'iniziale maiuscola, anche di più parole legate da "di", "del", "sul", …) e li ammette solo se tutte le loro parole stanno in un solo testo delle fonti: l'istantanea del viaggio (attività, luoghi, zone, destinazione), i risultati degli strumenti della conversazione, i messaggi del viaggiatore. I testi dell'assistente non sono una fonte. Segnala anche "ho prenotato", "ti ho prenotato", "ho cancellato", "ho pagato", …. Se c'è un problema la risposta diventa `TESTO_RISPOSTA_SOSTITUITA`, sia nello streaming (`testo_corretto`) sia nella conversazione salvata.

Limiti: una sola parola maiuscola a inizio frase non si controlla (in italiano è quasi sempre una parola comune); un nome inventato fatto solo di parole presenti in un testo delle fonti passa; "e" e "a" non legano i nomi, quindi "Malcesine e Limone" sono due nomi.

### Limiti dichiarati degli agenti

- **Copione, prompt 6, 8 e 10** (REQ-PLAN-003): sostituire un'attività, scambiare due giorni e tornare alla versione di prima sono operazioni di `opera_bozza` (`sostituisci`, `scambia_giorni`, `annulla`). Il prompt 6 parla della degustazione di lunedì: la bozza del Garda del prompt 2 (natura e gastronomia) non ha musei.
- **Copione, prompt 13, 15, 17, 18**: salute, voler restare di più, documenti persi e stanchezza aspettano REQ-REPLAN-004: Gestione imprevisti lo dice e, dove aiuta, propone una modifica puntuale con `proponi_modifica`. Lo sciopero e il volo perso (§7.4) idem.
- **Irrinunciabili nell'alternativa**: l'alternativa del motore tiene le attività bloccate (priorità dell'elemento). Il Planner, quando un'attività va tenuta a ogni costo, la blocca con `opera_bozza` (`blocca`) e la aggiunge agli irrinunciabili del profilo con `aggiorna_profilo`, così resta anche se si rifà la bozza da zero.
- **Avanzamento della preparazione**: `prepara_destinazione` non inoltra i passi della sorgente ("Cerco i luoghi…"): la chat riceve solo il passo "Sto esplorando la destinazione…".
- **Viaggi dell'ondata 1**: gli strumenti lavorano su un'istantanea; un viaggio demo senza istantanea va collegato al catalogo di riferimento presentato come `IstantaneaCatalogo` (come fa `test/agenti/supporto.ts` con V-VOLO).

## Test

```bash
npm test --workspace @travelops/agents
```

Gli strumenti del motore si provano in `test/strumenti/` con le 3 istantanee precaricate di `packages/sources/snapshots/` e la sorgente registrata (ricerche di `packages/sources/registrazioni/precaricate.json`): `strumenti.test.ts` (ogni strumento con argomenti validi e non validi, schema rigoroso), `ciclo-motore.test.ts` (ciclo completo con il client finto, CA-2, CA-5 con la rete bloccata).

Gli agenti si provano in `test/agenti/`: `copione.test.ts` (CA-1, i prompt della CR-001 §10 con le conversazioni registrate scritte a mano in `test/agenti/conversazioni/`, rete bloccata), `controllo.test.ts` (CA-2, controllo da solo e dentro la chat), `orchestratore.test.ts` (regole, modello e ripiego, strumenti e istruzioni degli agenti, eventi della chat, CA-3, CA-5).

Il pacchetto dipende da `@travelops/engine` e `@travelops/sources`: lo script `prebuild` li compila prima, perché `npm run build --workspaces` segue l'ordine alfabetico dei workspace (`agents` viene prima di `engine`).

Nessuna chiamata di rete (CA-5): il client OpenAI si prova con un fetch finto che risponde con gli eventi SSE della Responses API; un test blocca `fetch`, socket, `http`/`https` e DNS. Gli strumenti dei test sono di prova (`test/supporto.ts`), la conversazione registrata di esempio è `test/dati/conversazione-di-prova.json`.
