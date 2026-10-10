# Prove di consegna: ST-PLAN-003

## Cosa è stato chiesto

REQ-PLAN-003 "Le operazioni sulla bozza anche dalla chat" (modifica a REQ-PLAN-002). Story `ST-PLAN-003`, con questi criteri:

1. ogni operazione sulla bozza disponibile da pulsante è disponibile anche dalla chat: completa CA-1 di REQ-PLAN-002 (CA-1);
2. con il client finto, i prompt 6, 8 e 10 del copione cambiano la bozza come descritto nel copione (CA-2);
3. le operazioni da chat producono le stesse revisioni (stessa causa, «Annulla» compreso) di quelle da pulsante (CA-3).

## Perimetro ed esclusioni

- **Comprende:**
  - gli strumenti degli agenti per le operazioni sulla bozza e la porta `OperatoreBozza` con cui passano dal servizio della pagina della bozza;
  - il collegamento della chat della web app a quel servizio (lo stesso delle azioni dei pulsanti);
  - le conversazioni registrate dell'Atto 2 e il testo del prompt 6 del copione;
  - i test degli strumenti, degli agenti e della web app; il README del pacchetto e il copione generato in `docs/demo`.
- **Esclude:** il motore (`applicaOperazioneBozza` e le sue cause non cambiano), i pulsanti e la pagina della bozza, le proposte dopo la conferma, i file di `.sdlc`.
- **Lasciato fuori di proposito:** nessuna nuova dipendenza; nessuna chiave OpenAI (solo il client finto); il blocco dell'orario di un elemento (`imposta_orario_fisso`) non è un pulsante della bozza e resta solo in `proponi_modifica`.
- **Deviazioni:** il prompt 6 del copione è cambiato (vedi «Interpretazioni del requisito»).

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Porta `OperatoreBozza` (opera, cambia preferenze, conferma) e sua versione sull'archivio, con le funzioni del motore | `packages/agents/src/strumenti/bozza.ts`, `packages/agents/src/strumenti/index.ts` |
| Nuovi strumenti `opera_bozza`, `cambia_preferenze_bozza`, `alternative_bozza`, `confronta_bozza`; `conferma_viaggio` passa dalla porta; tolti `modifica_bozza`, `rigenera_giornata`, `genera_alternativa`; la bozza è riconosciuta dalle attività, non dall'id | `packages/agents/src/strumenti/strumenti.ts` |
| Strumenti del Planner, testi dei passi e delle azioni, istruzioni, opzione `bozza` della chat | `packages/agents/src/agenti/agenti.ts`, `chat.ts`, `istruzioni.ts` |
| La chat della web app usa il servizio dei pulsanti per le operazioni sulla bozza | `apps/web/src/chat/server/operatore-bozza.ts`, `apps/web/src/chat/server/agenti.ts` |
| Prompt 6 del copione (e sua copia generata) | `apps/web/src/demo/copione.json`, `docs/demo/copione-demo.md` |
| Conversazione registrata dell'Atto 2 con le chiamate nuove | `packages/agents/test/agenti/conversazioni/atto-2-garda.json` |
| Test degli strumenti, degli agenti e del copione aggiornati | `packages/agents/test/strumenti/strumenti.test.ts`, `ciclo-motore.test.ts`, `packages/agents/test/agenti/orchestratore.test.ts`, `controllo.test.ts`, `copione.test.ts`, `apps/web/test/demo001b-ca1-copione.test.ts` |
| Test nuovi della web app | `apps/web/test/plan003-ca1-ca3-chat-come-pulsanti.test.ts`, `apps/web/test/plan003-ca2-copione-6-8-10.test.ts` |
| Elenco degli strumenti e limiti dichiarati | `packages/agents/README.md` |
| Prove di consegna | `evidence/ST-PLAN-003.md` |

Strumenti della bozza (Planner):

| Strumento | Operazioni dei pulsanti |
| --- | --- |
| `opera_bozza` | sostituisci, rimuovi, sposta, aggiungi, blocca, sblocca, giornata più leggera, giornata più piena, rigenera giorno, scambia giorni, alternativa, annulla, torna alla revisione Bn |
| `cambia_preferenze_bozza` | cambia preferenze (ritmo e stili) |
| `alternative_bozza` | le alternative di «Sostituisci» (sola lettura) |
| `confronta_bozza` | «Confronta» (sola lettura) |
| `conferma_viaggio` | conferma l'itinerario |

## Perché

### Dipendenze

- ST-PLAN-002: `applicaOperazioneBozza`, `confermaBozza`, il servizio della bozza e le azioni lato server dei pulsanti.
- ST-CHAT-001C: la chat collegata agli agenti, l'archivio del viaggio nella base dati.
- ST-ORCH-001B e ST-ORCH-001C: strumenti, agenti e copione con il client finto.

### Scelte

- **Una sola strada per le regole.** Gli strumenti non applicano operazioni: chiamano `OperatoreBozza`. Nella web app la porta è il servizio della pagina della bozza (`servizioBozza()`), lo stesso che usano `operaBozzaAzione`, `cambiaPreferenzeBozzaAzione` e `confermaBozzaAzione`: stesse revisioni, stesse cause, stessi dati di «Annulla» (profilo di ogni revisione e revisione a cui si torna). Senza porta (agenti usati da soli, test) `creaOperatoreDaArchivio` applica le stesse funzioni del motore sull'`ArchivioViaggio`.
- **Uno strumento per le operazioni, non uno per operazione.** `opera_bozza` ha l'elenco delle operazioni come valori ammessi (schema rigoroso) e i campi che servono a ciascuna; un campo mancante per quell'operazione è un errore in italiano che il modello può correggere. Alternative e confronto sono strumenti di sola lettura a parte.
- **Strumenti vecchi tolti.** `modifica_bozza`, `rigenera_giornata` e `genera_alternativa` facevano le stesse cose con regole e cause diverse («Modifica: …», «Alternativa»): lasciarli avrebbe dato al modello due strade con revisioni diverse (contro CA-3). I loro casi sono stati riportati sui nuovi strumenti.
- **La bozza dei pulsanti è la bozza della chat.** Gli strumenti riconoscevano la bozza dall'id (`BOZZA-<istantanea>`), ma «Crea la mia bozza» dà `viaggio-N`: la chat non poteva toccarla. Ora una bozza è della destinazione preparata se tutte le sue attività sono nell'istantanea. Vale anche per `leggi_viaggio`.
- **Profilo condiviso.** Per un viaggio nato in chat, dopo «cambia preferenze» il profilo condiviso con il percorso guidato viene allineato (ritmo e stili), come fa già `aggiorna_profilo`.

### Interpretazioni del requisito

- **Prompt 6.** «Sostituisci il museo con qualcosa all'aperto» presuppone un museo che la bozza del Garda del prompt 2 (natura e gastronomia) non ha; prima la chat rispondeva a parole. Il prompt ora è «Sostituisci la degustazione di lunedì con qualcosa all'aperto»: il risultato atteso resta quello del CR-001 (un'attività al chiuso lascia il posto a una all'aperto compatibile, la scheda spiega perché). `CR-001` e `docs/requirements/REQ-DEMO-001-copione-demo.md` riportano ancora il testo originale: non sono stati toccati.
- **Prompt 5.** «Alleggerisci» è «giornata più leggera»: il motore toglie l'attività con meno punteggio del giorno (qui la degustazione da Fra' Luca). Per questo il prompt 7 («questa degustazione») blocca quella che resta, all'Enoteca Segantini.
- **Prompt 10.** «Torna alla versione di prima» è «Annulla»: dopo l'alternativa (B6) nasce B7 con l'itinerario di B5.

### Alternative scartate

- **Uno strumento per ogni operazione (14):** più descrizioni da tenere allineate e più strumenti a portata del modello; lo schema con i valori ammessi dà lo stesso controllo.
- **Operazioni applicate direttamente sull'archivio anche nella web app:** non conserverebbe i profili per revisione né la catena di «Annulla» (stanno in un'impostazione del servizio), quindi le revisioni non sarebbero uguali a quelle dei pulsanti.
- **Chiamare le azioni lato server dalla chat:** sono funzioni `"use server"` con `revalidatePath`; la chat lato server usa direttamente il servizio, che è ciò che quelle azioni chiamano.

## Verifica

Comandi eseguiti nella copia di lavoro: `npm ci --prefer-offline` (solo per avere le dipendenze del lockfile), `npm run build` (dalla radice), `npm test -w @travelops/agents`, `npm test -w @travelops/engine`, e in `apps/web` `npx vitest run` (tutti i test, nessuna esclusione).

- `npm run build`: riuscito (compila anche i test della web app).
- Agenti: 12 file e 128 test superati. Nuovi o riscritti: `opera_bozza` (valida per tutte le operazioni, non valida per campi mancanti, operazioni o giorni inesistenti, bozza assente, viaggio confermato), `cambia_preferenze_bozza`, `alternative_bozza`, `confronta_bozza`, copertura dell'orchestratore (ogni operazione è uno strumento del Planner, e solo suo), copione dell'Atto 2.
- Motore: 36 file e 718 test superati (nessuna modifica).
- Web: 83 file e 540 test superati, 0 falliti. Nuovi: 3 test in `plan003-*`; riscritto il test dei prompt 5-11 di `demo001b-ca1-copione`.
- Nessuna chiamata di rete e nessuna chiave: tutti i test usano il client finto (le prove con il modello vero restano al collaudo).

Corrispondenza criteri e test:

| Criterio | Test |
| --- | --- |
| CA-1 ogni operazione da pulsante anche da chat | `plan003-ca1-ca3-chat-come-pulsanti` (le 14 operazioni di `OPERAZIONI_BOZZA` fatte dalla chat; alternative e confronto), `orchestratore.test.ts` (i valori di `opera_bozza` più `cambia_preferenze_bozza` coprono `OPERAZIONI_BOZZA`; solo il Planner), `strumenti.test.ts` (ogni operazione, argomenti validi e non validi) |
| CA-2 prompt 6, 8 e 10 con il client finto | `plan003-ca2-copione-6-8-10` (programma dei giorni prima e dopo ogni prompt, causa della revisione, ritorno a B5), `demo001b-ca1-copione` (i prompt 5-11 con le revisioni salvate), `packages/agents/test/agenti/copione.test.ts` (chiamate agli strumenti e revisioni) |
| CA-3 stesse revisioni di pulsanti e chat | `plan003-ca1-ca3-chat-come-pulsanti`: due bozze identiche, una con le azioni dei pulsanti, una con la chat; dopo ogni passo stessa revisione (numero, causa, itinerario) e stessi dati di «Annulla» (anche annullare due volte e «Torna a B3»); stessa conferma (stato e storico); stesso motivo se l'operazione non si può fare |

## Collegamenti

- Requisito: REQ-PLAN-003 (modifica a REQ-PLAN-002)
- Story: ST-PLAN-003
- Dipendenze: ST-PLAN-002, ST-CHAT-001C
