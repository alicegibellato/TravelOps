# @travelops/agents

Base degli agenti di TravelOps (REQ-ORCH-001, story ST-ORCH-001A): un'interfaccia verso il modello linguistico che non dipende dall'SDK, il client OpenAI, un client finto che riproduce conversazioni registrate, il ciclo che esegue gli strumenti e il funzionamento senza chiave.

Usano questo pacchetto: gli strumenti del motore (ST-ORCH-001B), l'orchestratore e gli agenti Consulente, Planner e Gestione imprevisti (ST-ORCH-001C), la chat lato server (ST-CHAT-001A). **Solo lato server**: la chiave non deve mai arrivare al browser.

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

## Test

```bash
npm test --workspace @travelops/agents
```

Nessuna chiamata di rete (CA-5): il client OpenAI si prova con un fetch finto che risponde con gli eventi SSE della Responses API; un test blocca `fetch`, socket, `http`/`https` e DNS. Gli strumenti dei test sono di prova (`test/supporto.ts`), la conversazione registrata di esempio è `test/dati/conversazione-di-prova.json`.
