# Prove di consegna: ST-EDIT-002

## Cosa è stato chiesto

La storia ST-EDIT-002 realizza REQ-EDIT-002, una CR su REQ-EDIT-001: nuove modifiche richieste dal viaggiatore, tutte come **proposte** da accettare o rifiutare, nel rispetto degli orari fissi e delle prenotazioni.

- **R2-PRO Prolunga il soggiorno** di N giorni dopo una data (scenari M7 e M8).
- **R2-ACC Accorcia il viaggio** di N giorni.
- **R2-RIT Cambia ritmo di un giorno**: più leggero o più pieno.
- **R2-RIG Rigenera un giorno**.

Ogni proposta dichiara il livello di ripianificazione (§7.6) e ha una spiegazione in parole semplici. I risultati M1…M6 di REQ-EDIT-001 non cambiano.

## Perimetro ed esclusioni

- **Comprende:**
  - il tipo `ModificaOndata2` e il livello `LivelloRipianificazione` nel modello (`packages/engine/src/model`), con il campo facoltativo `Proposta.livello`;
  - la funzione `proponiModificaOndata2` con le quattro operazioni (`packages/engine/src/editing/ondata2.ts`);
  - la spiegazione estesa alle nuove operazioni, con la riga del livello solo per loro;
  - 20 test nuovi in `packages/engine/test/editing/ondata2.test.ts`.
- **Esclude:**
  - **«Riempi questo giorno»** sui giorni liberi aggiunti da R2-PRO: è di REQ-PLAN-001 e REQ-PLAN-002;
  - **le regole di REQ-PLAN-002** per cambia ritmo e rigenera: REQ-PLAN-002 non le ha ancora definite. Valgono quelle fissate nel contratto, che PLAN-002 potrà sostituire;
  - **lo storico per le nuove origini** (`src/history`). La causa della versione è giusta, perché usa la descrizione della proposta. Però l'importazione dello storico (`importaStorico`) rifiuta una versione nata da `prolunga`, `accorcia`, `cambia_ritmo` o `rigenera_giorno`, perché conosce solo le operazioni di REQ-EDIT-001. `src/history` non è nel perimetro di REQ-EDIT-002, quindi serve una CR su REQ-ITIN-002, annunciata sul canale tra i computer insieme allo stesso problema per gli imprevisti S9–S14 di ST-REPLAN-004. Nessuna interfaccia produce ancora queste versioni.
- **Lasciato fuori di proposito:** `proponiModifica`, `ModificaRichiesta`, `src/history`, la web app.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Tipi `RitmoGiorno`, `ModificaOndata2`, `ModificaEstesa`, `LivelloRipianificazione`; `Proposta.livello` facoltativo | `packages/engine/src/model/index.ts` |
| Le quattro operazioni, gli elementi bloccati, il problema `ORARIO_FISSO_DA_RIPROGRAMMARE`, le alternative per la nuova data, la descrizione per la causa | `packages/engine/src/editing/ondata2.ts` |
| Date di calendario (somma di giorni, "1 giorno") | `packages/engine/src/editing/date.ts` |
| `colloca` e `togli` esportate per riusarle (comportamento invariato) | `packages/engine/src/editing/operazioni.ts` |
| Spiegazione: richiesta delle nuove operazioni e riga del livello (`TESTI_LIVELLO`, come nella web app) | `packages/engine/src/editing/spiegazione.ts` |
| Esportazioni del modulo | `packages/engine/src/editing/index.ts` |
| Test nuovi (20) | `packages/engine/test/editing/ondata2.test.ts` |
| Prove di consegna | `evidence/ST-EDIT-002.md` |

## Perché

### Le regole (fissate nel contratto `contract-ST-EDIT-002-implementation`)

- **Elementi bloccati.** Sono gli elementi a orario fisso più lo spostamento immediatamente precedente che porta al loro luogo di partenza (in V-VOLO il trasferimento in auto all'aeroporto, D3-E8, prima del volo D3-E9). Restano insieme: il dato di riferimento segna come fisso solo D3-E9, ma il requisito chiede che D3-E8 e D3-E9 restino entrambi nella data originale.
- **R2-PRO.** Dopo la data si inseriscono N giorni liberi, senza elementi, con partenza e alloggio uguali all'alloggio del giorno indicato. I giorni successivi slittano di N giorni con gli stessi elementi (stessi id e orari) e la fine del viaggio cresce di N. I bloccati restano nella loro data, sono a rischio con le alternative per la nuova data, e la proposta non è fattibile per il problema bloccante `ORARIO_FISSO_DA_RIPROGRAMMARE`. Livello "resto del viaggio".
- **R2-ACC.** Si tolgono gli ultimi N giorni tranne i bloccati, che restano nel loro giorno a rischio con le alternative per la data N giorni prima e rendono la proposta non fattibile. Senza bloccati il viaggio finisce N giorni prima e l'ultimo giorno resta senza alloggio. Livello "resto del viaggio".
- **R2-RIT.**
  - *Più leggero*: toglie, con la regola R-SOS-5, l'attività non bloccata, non irrinunciabile e senza prenotazione con la priorità più bassa; a parità quella che inizia più tardi, poi l'id.
  - *Più pieno*: aggiunge la prima attività del catalogo (in ordine di id), non pasto e non già nel viaggio, dopo l'ultimo elemento del giorno, purché non nascano problemi bloccanti nuovi. L'inizio è la fine dell'ultimo elemento più il percorso più veloce, arrotondato per eccesso ai 5 minuti; in un giorno vuoto si parte dalle 09:00.
  - Livello "giornata".
- **R2-RIG.** Restano gli elementi bloccati, le attività irrinunciabili e quelle con prenotazione. Le altre attività si tolgono con R-SOS-5 e si ricollocano una dopo l'altra, in ordine di priorità e poi di orario, ognuna dopo l'ultimo elemento con il percorso più veloce. Quelle che non entrano senza problemi nuovi restano fuori, e la spiegazione lo dice. Livello "giornata".

### Scelte

- **Un tipo separato per le nuove modifiche.** Seguo lo schema di `ImprevistoEsteso` (ST-REPLAN-003). `ModificaRichiesta` e `proponiModifica` non cambiano, quindi M1…M6 restano identici, compresi i testi delle spiegazioni (la riga del livello compare solo per le nuove operazioni).
- **Origine della proposta.** `OrigineProposta` del modello accetta solo le operazioni di REQ-EDIT-001 e `src/history` è fuori perimetro. La nuova modifica viaggia nell'origine con una sola conversione di tipo, commentata in `OrigineModificaOndata2`; la causa della versione usa sempre la descrizione (`causaVersione` la preferisce). La modifica tipizzata è nel campo `modificaOndata2` della proposta.
- **Livello di ripianificazione.** Il tipo `"minimo" | "giornata" | "resto"` è lo stesso della web app (`apps/web/src/testi-ui.ts`), concordato con ST-REPLAN-004 che lo usa per le sue proposte.
- **Riuso delle regole esistenti.** Rimozioni con R-SOS-5 (`togli`), collocazioni con `colloca` di REQ-EDIT-001, alternative con `costruisciAlternative` di REQ-REPLAN-002, controllo con REQ-FEAS-001: nessuna regola duplicata.

### Alternative scartate

| Alternativa | Perché è stata scartata |
| --- | --- |
| Aggiungere le nuove operazioni a `ModificaRichiesta` | Lo `switch` di `descriviModifica` e la validazione di `importaStorico` (in `src/history`, fuori perimetro) non compilerebbero più o rifiuterebbero i dati |
| Allargare il perimetro dei requisiti a `src/history` in questa storia | ST-REPLAN-004 ha lo stesso bisogno in parallelo: due storie sullo stesso file andrebbero in conflitto. Meglio una CR unica su REQ-ITIN-002 |
| Rigenerare il giorno con il generatore di REQ-PLAN-001 | Il generatore lavora su profilo e istantanea della destinazione; i viaggi dell'ondata 1 non li hanno |
| Spostare anche gli elementi a orario fisso con il resto del giorno | Il requisito lo vieta: restano nella data originale, a rischio |

## Verifica

Eseguito su Windows 11, Node 24, nella copia di lavoro `C:\Progetti\TravelOps` sul ramo `feature/ST-EDIT-002`.

- `npx tsc -p tsconfig.json --noEmit` e `npm run build` in `packages/engine`: verdi.
- `npx vitest run` in `packages/engine`: 34 file, **662 test, tutti verdi**, compresi i 20 nuovi e tutti quelli di REQ-EDIT-001.
- `npm run typecheck -w @travelops/web`: verde (il campo `Proposta.livello` è facoltativo).
- File con a capo LF.

| Criterio | Test (file › nome) | Esito |
| --- | --- | --- |
| CA-1 i criteri CA-1…CA-11 di REQ-EDIT-001 restano soddisfatti | `test/editing/modifiche.test.ts`, `editing.test.ts`, `demo.test.ts`: invariati e verdi | superato |
| CA-2 M7 coincide con il contratto | `ondata2.test.ts` › "CA-2 M7 aggiunge un giorno libero il 2026-06-14 …", "… nessun elemento aggiunto o rimosso …", "… non è fattibile: il 2026-06-15 è lunedì …" | superato |
| CA-2 M8 coincide con il contratto: elementi fissi nella data originale, a rischio, non fattibile, gestione prenotazione e ricerca voli per il 2026-06-15 | `ondata2.test.ts` › "CA-2 M8 D3-E8 e D3-E9 restano il 2026-06-14 …", "… la proposta non è fattibile …", "… le alternative sono la gestione della prenotazione e la ricerca voli per il 2026-06-15" | superato |
| CA-3 accorciare di 1 giorno V-VOLO lascia D3-E8 e D3-E9 a rischio con le alternative | `ondata2.test.ts` › "CA-3 tolti D3-E1…D3-E7 …"; "R2-ACC senza elementi a orario fisso …" | superato |
| CA-4 cambia ritmo e rigenera dichiarano il livello | `ondata2.test.ts` › "CA-4 giornata più leggera …", "CA-4 giornata più piena …", "CA-4 rigenera un giorno …"; errori | superato |
| CA-5 ogni nuova operazione ha una spiegazione in parole semplici | `ondata2.test.ts` › "CA-5 prolunga / accorcia / più leggera / più piena / rigenera …", "CA-5 M8 la spiegazione dice che D3-E9 è a orario fisso …" | superato |
| CA-6 tutte le modifiche sono proposte da accettare o rifiutare | `ondata2.test.ts` › "CA-6 la proposta non cambia il viaggio ricevuto; diventa una versione solo se accettata …", "CA-6 stesso input, stessa proposta" | superato |

## Collegamenti

- Requisito: REQ-EDIT-002 (`docs/requirements/REQ-EDIT-002-cr-modifiche-ampliate.md`), CR su REQ-EDIT-001
- Storia: ST-EDIT-002
- Contratto: contract-ST-EDIT-002-implementation (risultati di M7, M8 e CA-3 fissati nell'analisi)
- Autonomia: AUT-PR-EDIT-002
- Dipendenze: ST-EDIT-001 (modifiche richieste), ST-PLAN-001 (bozza), ST-REPLAN-002 (R-SOS-5, alternative)
- Seguito: CR su REQ-ITIN-002 per lo storico delle nuove origini; REQ-PLAN-002 per le proprie regole di ritmo e rigenerazione
