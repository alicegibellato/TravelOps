# Prove di consegna: ST-ITIN-002

## Cosa è stato chiesto

Il requisito REQ-ITIN-002 "Versioni e storico": ogni proposta accettata produce una nuova versione dell'itinerario; le precedenti restano consultabili e confrontabili. Vale sia per le proposte nate da un imprevisto sia per quelle nate da una modifica richiesta. Le operazioni sono:

- crea storico;
- applica proposta;
- elenca versioni;
- leggi versione;
- confronta;
- esporta / importa.

Le regole sono R-1…R-8:

- causa della versione 1;
- immutabilità delle versioni;
- dati registrati e formato della causa;
- confronto per `id`;
- `PROPOSTA_SUPERATA`;
- nessuna versione per proposte rifiutate o non accettate;
- `NESSUNA_MODIFICA`;
- accettazione di proposte non fattibili.

I criteri di accettazione CA-1…CA-7 usano la versione 1 di riferimento e la proposta P-S1 (`dati-di-riferimento.md` §4 e §8). Story `ST-ITIN-002`, da consegnare come una pull request da `feature/ST-ITIN-002`.

## Perimetro ed esclusioni

- **Comprende:**
  - il modulo `history` con tutte le operazioni del requisito;
  - la causa di ogni tipo di imprevisto e delle modifiche richieste;
  - l'importazione difensiva dello storico;
  - i test di CA-1…CA-7 e delle regole R-1…R-8 sui dati di riferimento e su varianti dichiarate nei test.
- **Esclude:**
  - la costruzione delle proposte (REQ-REPLAN-002, REQ-EDIT-001): nei test P-S1 si legge da `data/reference/proposta-p-s1.json`;
  - il salvataggio persistente in un database (ondata 2): l'esportazione restituisce il testo JSON, non scrive file.
- **Lasciato fuori di proposito:**
  - L'export del modulo da `packages/engine/src/index.ts` lo aggiunge il responsabile della consegna, perché altre story toccano quel file in parallelo. Oggi il file esporta solo `MODULO_HISTORY`; basta sostituire quella riga con `export * from "./history/index.js";`. I nomi esportati non collidono con gli export degli altri moduli: verificato sull'elenco dei nomi esportati in `src/`.
  - `src/model/index.ts` non è stato toccato: i tipi nuovi stanno in `src/history/tipi.ts`.
- **Deviazioni:** nessuna dal requisito. I punti che il requisito lascia aperti sono stati interpretati come spiegato in "Perché".

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Punto d'ingresso del modulo: esporta operazioni e tipi, mantiene `MODULO_HISTORY` | `packages/engine/src/history/index.ts` |
| Tipi: momento, versione, storico, voce dell'elenco, differenza, codici e segnalazioni, esiti | `packages/engine/src/history/tipi.ts` |
| Causa della versione (R-3) e descrizione delle modifiche richieste (tabella di REQ-EDIT-001) | `packages/engine/src/history/causa.ts` |
| Confronto tra itinerari per `id` (R-4) e controllo "itinerario identico" (R-7) | `packages/engine/src/history/confronto.ts` |
| Crea storico, applica e rifiuta proposta, elenca, leggi e confronta versioni | `packages/engine/src/history/storico.ts` |
| Esportazione e importazione in JSON | `packages/engine/src/history/esporta.ts` |
| Supporto: segnalazioni, controllo del momento, uguaglianza profonda, copia e congelamento | `packages/engine/src/history/supporto.ts` |
| Dati di riferimento per i test (copia nuova a ogni chiamata) | `packages/engine/test/history/dati.ts` |
| Test di CA-1, CA-2, CA-4, CA-6, CA-7 e delle regole R-1…R-3, R-5…R-8 | `packages/engine/test/history/storico.test.ts` |
| Test di CA-3 e della regola R-4 | `packages/engine/test/history/confronto.test.ts` |
| Test di CA-5 e dell'importazione di storici non validi | `packages/engine/test/history/esportazione.test.ts` |
| Prove di consegna | `evidence/ST-ITIN-002.md` |
| Export del modulo dal pacchetto (`export * from "./history/index.js"`), aggiunto dal responsabile della consegna in fase di integrazione | `packages/engine/src/index.ts` |

Il test esistente `packages/engine/test/history/history.test.ts` (presenza di `MODULO_HISTORY`) non è cambiato. I dati di riferimento in `packages/engine/data/reference` non sono cambiati.

## Perché

### Interfaccia

| Operazione | Funzione | Risultato |
| --- | --- | --- |
| Crea storico | `creaStorico(viaggio)` | `{ ok: true, storico }` oppure `VIAGGIO_NON_VALIDO` |
| Applica proposta | `applicaProposta(storico, proposta, autore, momento)` | `versione_creata`, `avviso` (`NESSUNA_MODIFICA`) oppure `errore` (`PROPOSTA_SUPERATA`, `ACCETTAZIONE_NON_VALIDA`, `PROPOSTA_NON_VALIDA`) |
| Rifiuta proposta | `rifiutaProposta(storico, proposta)` | `rifiutata`, con lo storico ricevuto |
| Elenca versioni | `elencaVersioni(storico)` | numero, momento, causa, autore di ogni versione |
| Leggi versione | `leggiVersione(storico, numero)` | copia del viaggio oppure `VERSIONE_INESISTENTE` |
| Confronta | `confrontaVersioni(storico, a, b)` | aggiunti, rimossi, modificati (campi prima e dopo) oppure `VERSIONE_INESISTENTE` |
| Esporta / importa | `esportaStorico(storico)`, `importaStorico(json)` | testo JSON / storico oppure `STORICO_NON_VALIDO` |

Ci sono anche alcuni aiuti:

- `versioneCorrente(storico)` e `viaggioCorrente(storico)`: la versione corrente e una copia del suo viaggio;
- `confrontaItinerari(a, b)`: il confronto tra due viaggi qualsiasi;
- `causaVersione(origine, base)` e `descriviModifica(modifica, base)`: la causa e la descrizione di una modifica richiesta.

Ogni errore o avviso ha `codice`, `messaggio` in italiano (`[CODICE] motivo`) e `dettagli`, per esempio gli errori di validazione dell'itinerario. Nessuna operazione solleva eccezioni.

### Scelte

- **Immutabilità (R-2).** Lo storico e le sue versioni sono congelati in profondità con `Object.freeze`. Ogni operazione restituisce un nuovo storico e riusa le versioni precedenti, che sono già congelate. Il viaggio ricevuto e l'itinerario della proposta vengono copiati: modificarli dopo non cambia lo storico. `leggiVersione` e `viaggioCorrente` restituiscono copie modificabili.
- **Forma canonica e validità.** Il viaggio della versione 1 e l'itinerario di ogni proposta passano da `caricaViaggio` (REQ-ITIN-001). Così ogni versione:
  - è valida;
  - ha i valori predefiniti scritti (orario non fisso, priorità `desiderata`);
  - si reimporta sempre.

  Un itinerario non valido non crea versioni (`VIAGGIO_NON_VALIDO`, `PROPOSTA_NON_VALIDA`).
- **Dati di una versione (R-3, R-8).** Ogni versione registra:
  - numero, momento, causa, origine e autore;
  - `propostaFattibile` e i problemi della proposta;
  - le modifiche rispetto alla versione precedente.

  Nella versione 1 momento, origine, autore e `propostaFattibile` valgono `null`. Le modifiche sono calcolate con lo stesso confronto di R-4, quindi coincidono sempre con `confrontaVersioni(n-1, n)` e indicano anche la data del giorno.
- **Confronto (R-4).** Gli elementi si abbinano per `id`. Per i modificati si riportano solo i campi diversi, con il valore prima e dopo, in un ordine fisso: `data` (del giorno), `tipo`, `inizio`, `fine`, `orarioFisso`, `prenotazione`, `attivitaId`, `priorita`, `da`, `a`, `mezzo`. Il campo `data` serve a vedere uno spostamento in un altro giorno con lo stesso orario. I campi assenti valgono come i valori predefiniti del modello. Aggiunti e modificati seguono l'ordine dell'itinerario più recente, i rimossi quello del più vecchio.
- **Ordine dei controlli in `applicaProposta`.** I controlli seguono quest'ordine:
  1. accettazione (nome e momento);
  2. versione base (`PROPOSTA_SUPERATA`);
  3. validità dell'itinerario e stesso viaggio;
  4. itinerario identico (`NESSUNA_MODIFICA`).

  In tutti i casi senza versione lo storico restituito è lo stesso oggetto ricevuto.
- **Esportazione e importazione (CA-5).** Il JSON ha la forma `{ "versioni": [...] }`, con rientro di due spazi. L'importazione accetta il testo o il valore già decodificato e raccoglie tutti i problemi con la posizione (per esempio `versioni[1].momento`). Controlla:
  - numeri consecutivi da 1;
  - i campi della versione 1 (causa "Itinerario iniziale", `null` dove serve) e delle successive;
  - origine e problemi;
  - la validità di ogni viaggio;
  - che tutte le versioni siano dello stesso viaggio;
  - che il prossimo numero per gli id non torni indietro;
  - che le modifiche registrate corrispondano alle differenze tra versioni consecutive.

  Esportare lo storico importato restituisce lo stesso testo.
- **Determinismo (§3).** Il momento è un input, e il motore non usa mai l'orologio né la casualità. Le date si controllano sul calendario, sui testi.

### Interpretazioni del requisito

- **Momento:** `{ data: "AAAA-MM-GG", ora: "HH:mm" }`, con l'ora da `00:00` a `23:59`. Non si controlla che i momenti crescano da una versione all'altra: l'orologio simulato della demo (REQ-WEB-002) può tornare indietro.
- **Proposta "accettata" (R-6):** il modello `Proposta` non ha uno stato di accettazione. L'accettazione è la chiamata ad `applicaProposta` con il nome di chi accetta e il momento: senza un nome (testo vuoto) o con un momento non valido la proposta non è accettata, quindi `ACCETTAZIONE_NON_VALIDA` e nessuna versione. `rifiutaProposta` non crea versioni.
- **`PROPOSTA_SUPERATA` (R-5):** vale per ogni versione base diversa dalla corrente, anche per un numero più alto (una versione che non esiste ancora).
- **Itinerario identico (R-7):** si confrontano i giorni (data, luogo di partenza, alloggio, elementi nello stesso ordine e con gli stessi campi), cioè l'itinerario del glossario. Non si confronta il prossimo numero per gli id. I valori predefiniti omessi non contano come differenza.
- **Prossimo numero per gli id nuovi (CA-7):** è quello dell'itinerario della proposta (P-S1: 2). Come salvaguardia del §2.1 ("un id non viene mai riutilizzato"), non scende mai sotto quello della versione corrente né sotto gli id `N<numero>` già comparsi nello storico.
- **Descrizione della modifica richiesta (R-3):** il modello non ha ancora il campo per la descrizione che "arriva con la proposta" (REQ-EDIT-001). Se l'origine di tipo `modifica` porta un testo in `descrizione`, si usa quello. Altrimenti la descrizione si ricava dalla modifica con la tabella di REQ-EDIT-001: `<attività>` è l'`id` dell'attività di catalogo, come in REQ-EDIT-001 CA-8 ("aggiungi A-CANTINA il 2026-06-13 alle 16:00").
- **Trattino delle fasce orarie:** nella causa le fasce usano il trattino medio `–` (U+2013), come nel testo del requisito.
- **Altri codici:** il requisito nomina solo `PROPOSTA_SUPERATA` e `NESSUNA_MODIFICA`. Per i casi che non nomina il modulo usa `ACCETTAZIONE_NON_VALIDA`, `PROPOSTA_NON_VALIDA`, `VIAGGIO_NON_VALIDO`, `VERSIONE_INESISTENTE` e `STORICO_NON_VALIDO`, tutti in `CODICI_STORICO`.

## Verifica

Comandi lanciati dalla radice della copia di lavoro, dopo `npm ci`:

- `npm run build`: `tsc -p tsconfig.json` senza errori.
- `npm test`: **17 file di test, 247 test, tutti superati**. Del modulo history: 4 file, 53 test, tutti superati:
  - `history.test.ts`: 1 test;
  - `storico.test.ts`: 34 test;
  - `confronto.test.ts`: 9 test;
  - `esportazione.test.ts`: 9 test.

| Criterio | Test (file › nome) | Esito |
| --- | --- | --- |
| CA-1 storico della versione 1 con causa "Itinerario iniziale" | `test/history/storico.test.ts` › "CA-1: lo storico della versione 1 di riferimento ha solo la versione 1, con causa \"Itinerario iniziale\"" | superato |
| CA-2 P-S1 accettata da "Alice" il 2026-06-13 alle 07:30 → versione 2, causa, autore, momento; versione 1 identica | `test/history/storico.test.ts` › "CA-2: P-S1 accettata da \"Alice\" il 2026-06-13 alle 07:30 crea la versione 2; la versione 1 non cambia" | superato |
| CA-3 confronto 1 → 2: modificati `D2-E1` e `D2-E3`, rimosso `D2-E2`, aggiunto `N1` con `A-MAG`, nient'altro | `test/history/confronto.test.ts` › "CA-3: modificati D2-E1 (arrivo e orario) e D2-E3 (partenza e orario), rimosso D2-E2, aggiunto N1 con A-MAG; nient'altro" | superato |
| CA-4 proposta sulla versione 1 con corrente la 2 → `PROPOSTA_SUPERATA`, storico invariato | `test/history/storico.test.ts` › "CA-4: una proposta costruita sulla versione 1, applicata quando la corrente è la 2, è rifiutata con PROPOSTA_SUPERATA e lo storico non cambia" | superato |
| CA-5 esportare e reimportare restituisce le stesse versioni | `test/history/esportazione.test.ts` › "CA-5: esportare e reimportare lo storico del CA-2 restituisce le stesse versioni"; "CA-5: vale anche per la sola versione 1 e per uno storico con modifica richiesta, prenotazione e proposta non fattibile" | superato |
| CA-6 itinerario identico → `NESSUNA_MODIFICA`, nessuna versione | `test/history/storico.test.ts` › "CA-6: una proposta con itinerario identico a quello corrente non crea versioni e restituisce NESSUNA_MODIFICA" | superato |
| CA-7 dopo il CA-2 il prossimo numero per gli id nuovi è 2 | `test/history/storico.test.ts` › "CA-7: dopo il CA-2 il prossimo numero per gli id nuovi del viaggio corrente è 2" | superato |

Le regole hanno anche test propri:

| Regola | Test (file › blocco) |
| --- | --- |
| R-1 | `storico.test.ts` › "CA-1 / R-1 crea storico" (anche il viaggio non valido) |
| R-2 | `storico.test.ts` › "R-2 una versione non cambia più" (oggetti congelati; il viaggio passato, la proposta accettata e il viaggio letto si modificano senza effetti) |
| R-3 | `storico.test.ts` › "R-3 causa della versione": cause di `RITARDO`, `CHIUSURA_LUOGO`, `CANCELLAZIONE_SPOSTAMENTO` e delle modifiche M1, M2, M3, M5, M6, orario non più fisso e descrizione esplicita. Anche "R-3: la versione registra l'elenco delle modifiche…" |
| R-4 | `confronto.test.ts` › "R-4 regole del confronto" (cambio di giorno, priorità, orario fisso, prenotazione, valori predefiniti, versioni non consecutive) |
| R-5 | `storico.test.ts` › "CA-4 / R-5 proposta superata" |
| R-6 | `storico.test.ts` › "R-6 proposte rifiutate o non accettate" |
| R-7 | `storico.test.ts` › "CA-6 / R-7 nessuna modifica" |
| R-8 | `storico.test.ts` › "R-8 proposta non fattibile" |

## Collegamenti

- Requisito: `REQ-ITIN-002` (`docs/requirements/REQ-ITIN-002-versioni-storico.md`), con le fonti `docs/requirements/modello-dominio.md` e `docs/requirements/dati-di-riferimento.md`.
- Story: `ST-ITIN-002`.
- Contratto: `contract-ST-ITIN-002-implementation`.
- Profilo di autonomia: `AUT-PR-ITIN-002`.
- Branch: `feature/ST-ITIN-002`.
