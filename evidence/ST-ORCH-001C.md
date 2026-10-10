# Prove di consegna: ST-ORCH-001C

## Cosa è stato chiesto

La terza parte di REQ-ORCH-001 revisione 2 "Agenti e orchestratore" (versione 1.1, agenti con OpenAI): l'orchestratore e i tre agenti che usano gli strumenti del motore di ST-ORCH-001B. Story `ST-ORCH-001C` "Agenti: orchestratore, Consulente, Planner e Gestione imprevisti", con questi criteri:

1. in `packages/agents/src/agenti/` un orchestratore che capisce l'intento del messaggio e sceglie l'agente: Consulente (raccoglie le preferenze, al massimo 2 domande per messaggio), Planner (genera e rifinisce la bozza), Gestione imprevisti (traduce il racconto in imprevisto strutturato e chiede la ripianificazione); ogni agente con istruzioni di sistema in italiano e un sottoinsieme degli strumenti; architettura semplice, testabile e motivata;
2. istruzioni di sistema: tono amichevole, frasi brevi, nessun codice tecnico, mai luoghi che non vengono dall'istantanea, mai dire di aver prenotato o cancellato, riassumere un'azione importante prima di applicarla (con conferma dove serve);
3. una funzione unica per la chat, `rispondiAlMessaggio({ cliente, archivio, sorgente, conversazione, messaggio })`, con eventi in streaming (testo, azioni fatte, proposte) per ST-CHAT-001C;
4. **CA-1**: con il client finto, i prompt del copione della demo (CR-001 §10, REQ-DEMO-001) producono le chiamate agli strumenti attese, verificate con conversazioni registrate scritte a mano in `packages/agents/test/agenti/conversazioni/`; **CA-2**: nessuna risposta contiene un itinerario che non viene dal motore, con un controllo nel codice (non solo nei test) sui nomi di luoghi e attività del testo finale; CA-3, CA-4, CA-5 come già garantiti da ST-ORCH-001A;
5. nessuna chiamata reale a OpenAI.

## Perimetro ed esclusioni

- **Comprende:**
  - i tre agenti (`AGENTI`: istruzioni fisse + sottoinsieme degli strumenti) e la situazione del momento aggiunta alle istruzioni (data e ora, fase del viaggio, destinazione);
  - l'orchestratore `scegliAgente`: regole sulla fase del viaggio, modello con lo strumento `scegli_agente` a viaggio confermato, ripiego a parole chiave;
  - il controllo delle risposte `controllaRisposta` (CA-2), chiamato dalla chat prima di salvare la risposta;
  - `rispondiAlMessaggio` e `rispondiAlMessaggioCompleto` con 10 tipi di evento;
  - 6 conversazioni registrate che coprono i prompt 1–19 del copione (tranne 4b con la rete, vedi sotto), 3 file di test, la sezione "Gli agenti e l'orchestratore" in `packages/agents/README.md`.
- **Esclude** (di altre storie):
  - il collegamento alla web app (route della chat, `ArchivioViaggio` sul database, salvataggio di conversazione e `ultimoAgente`, schede ricche): ST-CHAT-001C;
  - le registrazioni dal modello vero (`creaClienteRegistratore`) e il collaudo con OpenAI: UAT di REQ-DEMO-001;
  - gli strumenti per scambiare giornate e tornare a una revisione (REQ-PLAN-002) e gli imprevisti della §7.4 (REQ-REPLAN-004).
- **Lasciato fuori di proposito:**
  - nessuno strumento nuovo: gli agenti usano solo i 13 strumenti di ST-ORCH-001B; nessun file fuori da `packages/agents/` ed `evidence/`;
  - l'orchestratore non risponde mai al viaggiatore: sceglie soltanto.
- **Limiti dichiarati:**
  - **prompt 8 e 10** (scambiare due giornate, tornare alla bozza di prima): manca lo strumento (ST-PLAN-002); il Planner lo dice e propone ciò che può fare, "Annulla" resta un pulsante della chat;
  - **prompt 13, 15, 17, 18** (caviglia, restare di più, documenti, stanchezza): tipi della §7.4 non ancora nel motore (REQ-REPLAN-004); Gestione imprevisti lo dice e, per la caviglia, propone di togliere il trekking con `proponi_modifica`; niente link a farmacie o Polizia (il motore non li dà e l'agente non li inventa);
  - **prompt 4b** (Lisbona) richiede la rete: nei test la sorgente è registrata e senza Lisbona, quindi la registrazione prova il caso "senza rete" (profilo salvato, nessun luogo inventato); la costruzione al volo resta al collaudo;
  - **prompt 6**: la bozza generata dal motore per PR-1 non ha musei; la registrazione prova la risposta onesta (una domanda, nessuna ipotesi);
  - **controllo CA-2**: una sola parola maiuscola a inizio frase non si controlla; un nome inventato composto solo da parole presenti in un testo delle fonti passa; il controllo guarda il testo, non le frasi senza nomi propri (per esempio "un bel museo");
  - **irrinunciabili nell'alternativa**: `genera_alternativa` tiene gli irrinunciabili del profilo, non la priorità degli elementi; per questo il Planner fa entrambe le cose (prompt 7);
  - **passi della preparazione**: `prepara_destinazione` non inoltra l'avanzamento della sorgente; la chat riceve il solo passo "Sto esplorando la destinazione…".
- **Deviazioni:**
  - l'Atto 3 usa la variante V-VOLO dei dati di riferimento (catalogo esteso presentato come istantanea), perché TRIP-DEMO-GARDA (ST-DEMO-001) non esiste ancora: stessa mattina di sabato con il trekking al Ponale e lo stesso volo di ritorno a orario fisso;
  - la funzione della chat ha, oltre ai campi del brief, `ultimoAgente` (per le risposte brevi come "Sì, procedi") e `adesso` (l'orologio simulato della demo).

## Cosa è cambiato

| File | Che cosa |
| --- | --- |
| `packages/agents/src/agenti/istruzioni.ts` | `REGOLE_COMUNI`, i ruoli di Consulente, Planner e Gestione imprevisti, `ISTRUZIONI_ORCHESTRATORE` |
| `packages/agents/src/agenti/agenti.ts` | `AGENTI`, `strumentiDellAgente`, `leggiSituazioneViaggio` (fasi `nuovo`, `destinazione`, `bozza`, `confermato`), `testoSituazione`, `istruzioniPer` |
| `packages/agents/src/agenti/instradamento.ts` | `scegliConRegole`, `scegliAgente` con `STRUMENTO_SCEGLI_AGENTE`, `scegliPerRipiego`, `messaggiPerOrchestratore` |
| `packages/agents/src/agenti/controllo.ts` | `controllaRisposta`, `estraiNomiPropri`, `raccogliFonti`, `TESTO_RISPOSTA_SOSTITUITA` |
| `packages/agents/src/agenti/chat.ts` | `rispondiAlMessaggio`, `rispondiAlMessaggioCompleto`, i tipi `EventoChat*`, `TESTO_PASSO` |
| `packages/agents/src/agenti/index.ts`, `src/index.ts` | esportazioni |
| `packages/agents/test/agenti/conversazioni/*.json` | `atto-1-garda.json` (prompt 1–2), `atto-2-garda.json` (5–11), `atto-1-sorprendimi.json` (3, 3b), `atto-1-roma.json` (4), `atto-1-lisbona-senza-rete.json` (4b), `atto-3-imprevisti.json` (12–19, con la conferma "Sì, procedi.") |
| `packages/agents/test/agenti/*.ts` | `supporto.ts` (copione, viaggio V-VOLO confermato, orologio simulato), `copione.test.ts`, `controllo.test.ts`, `orchestratore.test.ts` |
| `packages/agents/README.md` | sezione "Gli agenti e l'orchestratore (ST-ORCH-001C)": agenti, istruzioni, instradamento, API della chat con la tabella degli eventi, controllo CA-2, limiti |

API per la chat:

```ts
rispondiAlMessaggio({ cliente, archivio, sorgente, conversazione, messaggio, ultimoAgente?, adesso?, contesto?, maxIterazioni?, segnale? })
  → AsyncGenerator<EventoChat>
// agente → (testo | passo | azione | proposta | risultato | strumento_fallito)* → testo_corretto? → fine
// oppure, se l'AI non risponde: non_disponibile → fine
```

## Perché

- **Regole prima del modello.** La fase del viaggio decide già l'agente quasi sempre: senza bozza serve il Consulente, con una bozza il Planner. Solo a viaggio confermato lo stesso stato ammette una modifica richiesta o un imprevisto, e lì decide il modello con un solo strumento (`scegli_agente`, schema rigoroso). Così l'instradamento è deterministico, senza costi in tre fasi su quattro e provato con il client finto come tutto il resto; se il modello non sceglie, un ripiego a parole chiave evita di bloccare la chat.
- **Agenti come configurazione.** Un agente è istruzioni + sottoinsieme di strumenti passati a `eseguiCiclo`: nessun ciclo nuovo, nessuna classe. Il sottoinsieme toglie strumenti sbagliati per il momento (Gestione imprevisti non può generare una bozza, il Consulente non può confermare).
- **Il Consulente arriva fino alla prima bozza.** Il copione chiede la bozza subito per Roma e dopo due risposte per il Garda: separare "preferenze" e "prima bozza" in due agenti avrebbe richiesto un passaggio tra agenti nello stesso messaggio.
- **Controllo nel codice, non solo nei test.** `controllaRisposta` gira a ogni risposta: i nomi propri del testo devono venire dall'istantanea, dai risultati degli strumenti o dal viaggiatore; il testo dell'assistente non è una fonte, quindi un'invenzione non si "auto-legittima" nei turni dopo. Una risposta che non passa si sostituisce sia nello streaming sia nella conversazione salvata, e le azioni fatte restano valide perché vengono dagli strumenti.
- **Situazione nelle istruzioni.** Data e ora (orologio simulato) e fase del viaggio servono a Gestione imprevisti per "stamattina", "da adesso", e a tutti per non usare strumenti fuori fase.

## Verifica

Comandi dalla radice, con `CI=true`: `npm ci`, `npm run build` (uscita 0), `npm test` (uscita 0). Nessuna chiamata a OpenAI: i test usano solo il client finto e bloccano `fetch`, socket, `http`/`https` e DNS.

| Criterio | Test | Esito |
| --- | --- | --- |
| CA-1 prompt 1–2 (Consulente: profilo, destinazione, ≤ 2 domande, bozza di 4 giorni con "perché" e degustazioni) e 5–11 (Planner: alleggerire, nessun museo → domanda, irrinunciabile, scambio non disponibile, alternativa con la degustazione bloccata, "Annulla", conferma → versione 1) | `test/agenti/copione.test.ts` › "Atti 1 e 2 sul Lago di Garda" | superato |
| CA-1 prompt 3 e 3b (sorprendimi: 3 destinazioni, poi bozza in Val di Fassa con ritmo intenso e partenze presto) | `copione.test.ts` › "prompt 3 e 3b" | superato |
| CA-1 prompt 4 (Roma con bambini, pranzi sì e cene no, bozza subito) | `copione.test.ts` › "prompt 4" | superato |
| CA-1 prompt 4b senza rete (Lisbona non registrata, nessuna invenzione) | `copione.test.ts` › "prompt 4b senza rete" | superato |
| CA-1 prompt 12–19 (orchestratore → Gestione imprevisti; pioggia → MAG al posto del Ponale; gomma → conferma, "Sì, procedi" → ritardo di 120 minuti; volo cancellato → itinerario invariato e link; ritardo di 30 minuti; le proposte non cambiano la versione 1; istruzioni con l'orologio simulato) | `copione.test.ts` › "prompt 12-19" | superato |
| CA-2 controllo nel codice: nomi dell'istantanea ammessi, itinerario inventato segnalato nome per nome, inizio frase, fonti (viaggiatore e strumenti sì, assistente no), "ho prenotato" | `test/agenti/controllo.test.ts` › "controllare una risposta" (5 test) | superato |
| CA-2 nella chat: testo inventato o "vi ho prenotato" sostituito nello streaming e nella conversazione salvata, nessuna scrittura sul viaggio; testo corretto lasciato com'è; nessuna risposta del copione sostituita | `controllo.test.ts` › "nella chat" (3 test); `copione.test.ts` (nessun `testo_corretto`) | superato |
| Orchestratore: regole sulla fase, risposte brevi all'ultimo agente, scelta del modello, ripiego | `test/agenti/orchestratore.test.ts` › "regole" e "scelta con il modello" (6 test) | superato |
| Agenti: sottoinsiemi che coprono i 13 strumenti, istruzioni con le regole | `orchestratore.test.ts` › "agenti: strumenti e istruzioni" (2 test) | superato |
| Eventi della chat: `agente`, `passo`, `azione`, `risultato`, `strumento_fallito`, `testo`, `fine` con i messaggi da salvare | `orchestratore.test.ts` › "eventi della risposta" | superato |
| CA-3 AI non disponibile: `non_disponibile` con il messaggio previsto, nessuna scrittura | `orchestratore.test.ts` › "CA-3 se l'AI non risponde" | superato |
| CA-4 nessuna chiave nel codice o nei log | `test/ca4-segreti.test.ts` (ST-ORCH-001A, cerca in tutti i file del repository, compresi i nuovi) | superato |
| CA-5 nessuna rete nei test; il codice degli agenti non importa moduli di rete né il client OpenAI | `copione.test.ts` (rete bloccata), `orchestratore.test.ts` › "CA-5", `test/ca5-rete.test.ts` | superato |

Numeri: `@travelops/agents` 11 file e 112 test (26 nuovi: 5 in `copione.test.ts`, 10 in `controllo.test.ts`, 11 in `orchestratore.test.ts`); `@travelops/engine` 642 test; `@travelops/sources` 87 test; `@travelops/web` 47 file e 343 test, nessun timeout. Totale 1184 test superati. Compilazione TypeScript del pacchetto e dei nuovi test senza errori.

## Collegamenti

- Requisito: [REQ-ORCH-001](../docs/requirements/REQ-ORCH-001-agenti-orchestratore.md), revisione `REQ-ORCH-001-R2`
- Story: `ST-ORCH-001C`
- Contratto: `contract-ST-ORCH-001C-implementation`
- Profilo di esecuzione: `AUT-PR-ORCH-001C`
- Branch: `feature/ST-ORCH-001C`
