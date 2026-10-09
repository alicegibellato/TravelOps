# Prove di consegna: ST-REPLAN-003

## Cosa è stato chiesto

Il requisito REQ-REPLAN-003 "CR su REQ-REPLAN-001: impatto dei nuovi imprevisti" (ondata 2, CR-001 §9.12): il calcolo dell'impatto del motore gestisce anche i sei tipi di imprevisto della `modello-dominio-estensioni.md` §7.4 (volo perso, salute o infortunio, sciopero, bagaglio smarrito, documenti smarriti, stanchezza), compresi gli imprevisti su più giorni (`VOLO_PERSO`, `SALUTE`). REQ-REPLAN-001 e la sua storia restano invariati.

Criteri di accettazione CA-1…CA-5. Story `ST-REPLAN-003`, una pull request da `feature/ST-REPLAN-003`.

## Perimetro ed esclusioni

- **Comprende:**
  - i tipi dei sei imprevisti della §7.4 nel modello del motore;
  - il calcolo dell'impatto per ciascuno in `calcolaImpatto`, con il motivo in italiano;
  - gli scenari S9–S14 e la variante `V-BUS` nei dati aggiunti dell'ondata 2;
  - i test di ogni criterio CA-1…CA-5.
- **Esclude** (fuori perimetro del requisito):
  - più imprevisti nella stessa proposta;
  - il rilevamento automatico degli imprevisti (ondata 3);
  - le proposte di ripianificazione per i nuovi tipi (regole R2-BAG, R2-DOC, R2-STA e la sostituzione di S9 e S11): appartengono a REQ-REPLAN-004 (ST-REPLAN-004), che fissa i risultati esatti nel suo contratto.
- **Lasciato fuori di proposito:**
  - il tempo di 80 minuti in mezzi pubblici tra `HOTEL` e `BUONCONSIGLIO` della variante `V-BUS`: serve solo alla ripianificazione di S11 (R-CAN-1), non al calcolo dell'impatto;
  - i dati della §8.5 (`NEGOZIO-RIVA`, `COMMISSARIATO-RIVA`, `A-ACQUISTI`, `A-DENUNCIA`): servono alla ripianificazione di S12 e S13;
  - nessun file fuori dai percorsi della story: `apps/`, i moduli `history`, `editing` e le altre parti di `replanning` non sono cambiati; nessuna dipendenza nuova.
- **Deviazioni:** nessuna dai criteri. Le interpretazioni della §7.4 sono state approvate con il contratto della storia e sono spiegate in "Perché".

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Tipi della §7.4 (`ImprevistoVoloPerso`, `ImprevistoSalute`, `ImprevistoSciopero`, `ImprevistoBagaglioSmarrito`, `ImprevistoDocumentiSmarriti`, `ImprevistoStanchezza`, `MomentoDelViaggio`, `MezzoSciopero`) e le unioni `ImprevistoOndata2` e `ImprevistoEsteso` | `packages/engine/src/model/index.ts` |
| Calcolo dell'impatto dei sei tipi; `calcolaImpatto` accetta un `ImprevistoEsteso` e anche un catalogo esteso | `packages/engine/src/replanning/impatto.ts` |
| Variante `V-BUS` (versione 1 con `D3-E1` in mezzi pubblici 08:40–10:00) | `packages/engine/data/reference/estensioni/variante-v-bus.json` |
| Imprevisti degli scenari S9–S14 | `packages/engine/data/reference/estensioni/scenari-imprevisti-estesi.json` |
| Descrizione dei dati aggiunti | `packages/engine/data/reference/estensioni/README.md` |
| Test di CA-1…CA-5 | `packages/engine/test/replanning/impatto-ondata2.test.ts` |
| Prove di consegna | `evidence/ST-REPLAN-003.md` |

## Perché

### Interfaccia

- I sei tipi nuovi stanno in un'unione separata, `ImprevistoEsteso = Imprevisto | ImprevistoOndata2`, e `Imprevisto` resta quello dell'ondata 1. Allargare `Imprevisto` avrebbe rotto i `switch` completi dello storico (`history/causa.ts`, `history/esporta.ts`), delle proposte e delle spiegazioni, che sono fuori dai percorsi della story e riguardano la ripianificazione (ST-REPLAN-004). È la stessa scelta di compatibilità di ST-CAT-001 per `CatalogoEsteso`.
- `calcolaImpatto` accetta un `ImprevistoEsteso` e un `Catalogo` o un `CatalogoEsteso`: con il catalogo dell'ondata 1 i risultati di S1…S8 non cambiano (CA-1), con quello esteso il calcolo legge intensità e accessibilità delle attività.
- `ElementoColpitoDettagliato.tipoImprevisto` è ora un `ImprevistoEsteso["tipo"]`; nessun altro modulo lo legge.

### Scelte

Interpretazioni della §7.4, approvate con il contratto `contract-ST-REPLAN-003-implementation`:

- **Volo perso:** colpito lo spostamento indicato, solo se è in volo o in treno; un id sconosciuto o un altro mezzo danno impatto vuoto. Con l'arrivo previsto (data e orario, perché può cadere il giorno dopo) sono colpiti anche gli elementi che iniziano dall'inizio dello spostamento perso e prima dell'arrivo, anche nei giorni successivi. Gli elementi precedenti allo spostamento perso no.
- **Salute:** colpite le attività di quei giorni con intensità nota superiore alla massima consentita (`facile` < `moderata` < `impegnativa`) o, con mobilità ridotta, con `accessibile` uguale a `false`. Un dato assente nel catalogo non rende colpita l'attività: con il catalogo dell'ondata 1, che non ha questi campi, nulla è colpito. Senza numero di giorni vale fino alla fine del viaggio; un numero non intero o minore di 1 ha impatto vuoto (R-2), come i giorni fuori dal viaggio.
- **Sciopero:** senza zona, tutti gli spostamenti con quel mezzo in quella data; con la zona, quelli che partono o arrivano in un luogo di quella zona.
- **Bagaglio e documenti smarriti:** nessun elemento colpito; il tempo libero per acquisti o documenti lo aggiunge la ripianificazione (§9.11, §9.13).
- **Stanchezza:** le sole attività di quel giorno non irrinunciabili e non a orario fisso; gli spostamenti non sono colpiti.

Come nell'ondata 1 il calcolo è deterministico (nessun orologio: la data finale di un imprevisto di salute si calcola in UTC dalla data di inizio), non modifica il viaggio e ordina i risultati per data, inizio e id.

## Verifica

Comandi eseguiti dalla radice della copia di lavoro, dopo `npm ci`:

| Comando | Esito |
| --- | --- |
| `npm run build` | superato: motore compilato con `tsc`, web app compilata da Next.js |
| `npm test` | superato: motore 27 file, 523 test (508 esistenti invariati + 15 nuovi); web app 21 file, 149 test |
| `npm run demo` | superato |

| Criterio | Test | Esito |
| --- | --- | --- |
| **CA-1** I criteri di REQ-REPLAN-001 restano soddisfatti | I test di REQ-REPLAN-001 in `test/replanning/impatto.test.ts`, `ripianificazione.test.ts` e `demo.test.ts`, non modificati, passano. In più `test/replanning/impatto-ondata2.test.ts` "CA-1 …": gli scenari S1…S8 danno lo stesso impatto con il catalogo esteso e con quello dell'ondata 1 | superato |
| **CA-2** S9 colpisce solo D2-E2, S10 solo D3-E9, S11 solo D3-E1 | "CA-2 S9 …" (impatto esatto con il motivo), "CA-2 S10 …", "CA-2 S11 …" sugli scenari di `scenari-imprevisti-estesi.json` | superato |
| **CA-3** S12, S13 e S14 rispettano la §7.4 | "CA-3 S12 … e S13 …" (impatto vuoto); "CA-3 S14 …" (colpite `D3-E2`, `D3-E4`, `D3-E6`, non gli spostamenti); casi limite: attività irrinunciabili (`V-IRR`) e a orario fisso (`V-FISSO`) non colpite dalla stanchezza, sciopero di un altro mezzo, data o zona, volo perso su uno spostamento non in volo o treno | superato |
| **CA-4** Un imprevisto SALUTE di 3 giorni colpisce solo le attività non compatibili in quei 3 giorni | "CA-4 …" su un viaggio di 5 giorni con il Ponale e il lungolago ogni giorno: colpito solo il Ponale del 13, 14 e 15 giugno; mobilità ridotta, fino alla fine del viaggio, date fuori dal viaggio, numero di giorni non valido; catalogo senza intensità né accessibilità | superato |
| **CA-5** Un VOLO_PERSO con arrivo previsto il giorno dopo colpisce gli elementi che iniziano prima dell'arrivo, anche nel giorno successivo | "CA-5 …" sulla versione 1 con un treno alle 18:20 del primo giorno e arrivo previsto il 2026-06-13 alle 10:00: colpiti il treno, `D2-E1` e `D2-E2`, non gli elementi prima del treno né quelli dopo l'arrivo; senza arrivo previsto solo il treno | superato |

Oltre ai criteri: un test verifica che il calcolo sugli scenari S9–S14 sia deterministico e non modifichi il viaggio.

## Collegamenti

- Requisito: [REQ-REPLAN-003](../docs/requirements/REQ-REPLAN-003-cr-impatto-nuovi-imprevisti.md)
- Story: `ST-REPLAN-003`
- Contratto: `contract-ST-REPLAN-003-implementation`
- Profilo di autonomia: `AUT-PR-REPLAN-003`
- Branch: `feature/ST-REPLAN-003`
- Fonti: [modello-dominio-estensioni.md](../docs/requirements/modello-dominio-estensioni.md) §7.4; [dati-di-riferimento-estensioni.md](../docs/requirements/dati-di-riferimento-estensioni.md) §8.4; [CR-001](../docs/CR-001-travelops-prodotto-demo.md) §9.12
