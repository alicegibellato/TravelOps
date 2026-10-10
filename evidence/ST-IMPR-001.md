# Prove di consegna: ST-IMPR-001

## Cosa è stato chiesto

REQ-IMPR-001 (Imprevisto raccontato o scelto). Il viaggiatore segnala un imprevisto in due modi:

- con il pulsante **Ho un imprevisto**: schede con moduli brevi e precompilati;
- raccontandolo in chat.

L'agente lo traduce in un imprevisto strutturato, chiede conferma e poi mostra la proposta.

Criteri:

- **CA-1** Ogni prompt di imprevisto del copione della demo produce, con il client finto, l'imprevisto strutturato atteso.
- **CA-2** Ogni tipo di imprevisto e di richiesta di modello-dominio-estensioni.md §7.4 ha la sua scheda e il suo modulo.
- **CA-3** Nessuna proposta parte senza la conferma del viaggiatore.
- **CA-4** Un racconto ambiguo porta a una domanda, mai a un'ipotesi silenziosa.

Record: requisito `REQ-IMPR-001`, story `ST-IMPR-001`, contratto `contract-ST-IMPR-001-implementation`, profilo di
consegna `AUT-PR-IMPR-001`.

## Perimetro ed esclusioni

**Dentro:**

- `packages/agents`: lo strumento degli imprevisti con i sei tipi della §7.4, il nuovo strumento per restare di più o tornare prima, il blocco delle proposte senza conferma e le istruzioni di Gestione imprevisti;
- `apps/web`: la pagina **Ho un imprevisto** (`/imprevisti`) con 12 schede e moduli, e il pulsante sulla versione corrente del viaggio confermato.

**Fuori** (non-goal di REQ-IMPR-001):

- rilevamento automatico degli imprevisti;
- prenotazioni, pagamenti, modifiche o cancellazioni presso fornitori.

Il motore non cambia: le proposte vengono da `proponiRipianificazione` (con gli imprevisti estesi di ST-REPLAN-004) e da
`proponiModificaOndata2` (prolunga e accorcia di ST-EDIT-002).

## Cosa è cambiato

### Agenti (`packages/agents`)

- **Imprevisti estesi** (`strumenti/strumenti.ts`): `proponi_ripianificazione` accetta i dieci tipi del motore (`TIPI_IMPREVISTO`). Ai quattro dell'ondata 1 si aggiungono volo o treno perso, salute, sciopero, bagaglio o documenti smarriti e stanchezza. Ognuno ha i suoi campi e controlli: lo spostamento esiste, il giorno è del viaggio, la zona esiste.
- **Restare di più o tornare prima**: nuovo strumento `proponi_cambio_durata`, prolunga o accorcia con `proponiModificaOndata2`. È disponibile a Gestione imprevisti.
- **CA-3 nel codice, non solo nelle istruzioni.** Per Gestione imprevisti gli strumenti di proposta partono solo se `haConfermato` (`agenti/chat.ts`) è vero: l'ultimo messaggio di TravelOps è una domanda e il viaggiatore risponde sì. Altrimenti lo strumento risponde con l'errore `SERVE_CONFERMA` e il modello deve riassumere e chiedere "Procedo?". Il Planner non ha il blocco, perché le modifiche che il viaggiatore chiede in modo esplicito restano come prima.
- **Istruzioni di Gestione imprevisti** (`agenti/istruzioni.ts`), in tre regole:
  - c'è un riepilogo che finisce con "Procedo?" prima di ogni proposta;
  - la proposta arriva solo dopo il sì;
  - con un racconto ambiguo l'agente fa al massimo 2 domande.
- **Conversazione registrata dell'Atto 3** (`test/agenti/conversazioni/atto-3-imprevisti.json`), riscritta per i prompt 12-19. Per ogni imprevisto il racconto produce un riepilogo con "Procedo?"; al sì segue la proposta con l'imprevisto strutturato.

### Web app (`apps/web`)

- **Schede** (`src/imprevisti/schede.ts`): 12 schede, ognuna con il suo modulo breve:
  - Volo cancellato, Ho perso il volo o il treno, Sono in ritardo, Maltempo, Posto chiuso, Sciopero;
  - Non sto bene / mi sono fatto male, Bagaglio smarrito, Documenti persi o rubati, Sono stanco;
  - Voglio restare di più, Voglio tornare prima.
- **Modulo** (`src/imprevisti/modulo.ts`):
  - precompila con oggi e l'ora dell'orologio simulato, l'elemento in corso, la zona e il posto dell'elemento in corso, e il prossimo volo o treno;
  - legge i campi e li trasforma nell'imprevisto o nella richiesta, con gli errori in parole semplici.
  - L'imprevisto lo costruisce `imprevistoDaCampi` di `@travelops/agents` (`strumenti/imprevisti.ts`), con gli stessi controlli dello strumento della chat. Anche l'elemento in corso e gli orari vengono da lì, così nella web app non ci sono codici del motore né calcoli sugli orari (CA-9 di REQ-WEB-002).
- **Proposta** (`src/imprevisti/operazione.ts`):
  - chiede al motore la proposta sulla versione corrente, con il catalogo e i dati di contesto di riferimento della Demo;
  - la salva tra le proposte, così si apre nella vista della proposta di REQ-WEB-004 con Accetta e Rifiuta.
- **Pagina e azione**: pagina `app/imprevisti/page.tsx`, azione `app/imprevisti/azioni.ts`, componente `src/componenti/PaginaImprevisti.tsx`, stili in `src/ui/ui.css`.
- **Pulsante** "Ho un imprevisto" nell'intestazione della versione corrente (`src/componenti/PaginaVersioni.tsx`).

## Perché

- **Conferma nel codice.** Con le sole istruzioni, il modello potrebbe proporre senza aspettare. Con il controllo nello strumento, CA-3 vale qualunque cosa decida il modello: la proposta non si salva. Per i moduli, invece, inviare il modulo è la conferma.
- **Schede sulla vista proposta della Demo.** Le proposte nate dalle schede si salvano come quelle degli scenari della Demo. Così riusano la vista, i pulsanti e la stessa operazione di accettazione (stessa versione, stesso autore, stesso orologio), invece di duplicarli.
- **Catalogo di riferimento nella web app.** La web app può usare solo i dati di riferimento di primo livello del motore (CA-9 di REQ-WEB-002), quindi le proposte delle schede usano il catalogo della Demo, lo stesso della vista della proposta. Le attività arricchite della §7.3 (intensità, accessibilità) le usa la chat, sulle istantanee delle destinazioni.

## Verifica

| Criterio | Test o controllo | Esito |
|---|---|---|
| CA-1 i prompt di imprevisto del copione (12-19) producono l'imprevisto strutturato atteso | `packages/agents/test/agenti/copione.test.ts` (Atto 3, client finto, rete bloccata) | superato |
| CA-2 una scheda e un modulo per ogni tipo e richiesta; ogni modulo precompilato diventa una proposta | `apps/web/test/impr001-schede.test.tsx`; per gli strumenti degli agenti `packages/agents/test/agenti/impr001-imprevisti.test.ts` | superato |
| CA-3 nessuna proposta senza conferma | `impr001-imprevisti.test.ts` (blocco nello strumento, `haConfermato`), `copione.test.ts` (riepilogo poi sì), `impr001-schede.test.tsx` (la versione non cambia finché non si accetta) | superato |
| CA-4 racconto ambiguo → domanda | `impr001-imprevisti.test.ts` ("C'è un problema con il treno"), istruzioni di Gestione imprevisti | superato |

Build, suite completa (`npm run build`, `npm test`) e scansione dei segreti sul commit della story sono registrate dal
plugin (`.sdlc/tests/`, `.sdlc/security/`).

## Collegamenti

- Requisito `REQ-IMPR-001` (`docs/requirements/REQ-IMPR-001-imprevisto-raccontato.md`), story `ST-IMPR-001`.
- Dipendenze su main: ST-ORCH-001C, ST-CHAT-001C, ST-REPLAN-004, ST-EDIT-002.
- Pull request da `feature/ST-IMPR-001` verso `main` su `alicegibellato/TravelOps`, con il commit e i record del plugin.
