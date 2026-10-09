# REQ-ITIN-001 — Modello dell'itinerario e catalogo

| Campo | Valore |
|---|---|
| Stato | Bozza per `requirement propose` |
| Versione | 1.0 |
| Ondata | 1 — Motore |
| Area suggerita | B |
| Dipende da | REQ-FOUND-001 |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-ITIN-001`, una pull request |

## Obiettivo

Caricare, validare ed esportare il viaggio e il catalogo descritti in `modello-dominio.md` §2, e interrogare il catalogo. I tipi esistono già (REQ-FOUND-001): questo requisito aggiunge la lettura sicura dei dati e le regole di validità strutturale.

## Operazioni

| Operazione | Input | Output |
|---|---|---|
| Carica catalogo | JSON del catalogo | catalogo, oppure elenco di errori |
| Carica viaggio | JSON del viaggio con itinerario | viaggio, oppure elenco di errori |
| Valida itinerario | viaggio, catalogo | elenco di errori (vuoto se valido) |
| Esporta | viaggio o catalogo | JSON |
| Interroga catalogo | `id` oppure zona | zona, luogo o attività; elenco delle attività di una zona |

## Regole di validità strutturale

Ogni violazione è un errore con codice, `id` dell'elemento (o data del giorno, o `id` del catalogo) e motivo.

- **R-1** `CAMPO_MANCANTE`: manca un campo obbligatorio del modello.
- **R-2** `ORARIO_NON_VALIDO`: un orario non ha formato `HH:mm` (due cifre per le ore, minuti da 00 a 59), oppure la fine di un elemento non è successiva all'inizio.
- **R-3** `FUORI_GIORNATA`: un orario supera le 24:00, oppure un elemento inizia alle 24:00.
- **R-4** `ORDINE_NON_VALIDO`: gli elementi di un giorno non sono in ordine di inizio.
- **R-5** `ID_DUPLICATO`: due elementi del viaggio hanno lo stesso `id`.
- **R-6** `RIFERIMENTO_INESISTENTE`: un'attività, un luogo, una zona o un alloggio non esiste nel catalogo.
- **R-7** `GIORNI_NON_VALIDI`: manca un giorno del viaggio, c'è un giorno ripetuto o fuori dalle date del viaggio.
- **R-8** `VALORE_NON_VALIDO`: un campo ha un valore fuori da quelli ammessi (tipo di elemento, mezzo, priorità, tipo di luogo, categoria, condizione meteo); coordinate fuori intervallo (latitudine da −90 a 90, longitudine da −180 a 180); link di gestione che non inizia con `https://`; prossimo numero per gli id nuovi minore di 1.

Valori predefiniti al caricamento: un'attività senza priorità vale `desiderata`; un elemento senza indicazione di orario fisso non è a orario fisso.

## Criteri di accettazione

- **CA-1** Il catalogo, la versione 1 e le varianti `V-IRR`, `V-FISSO` e `V-VOLO` (`dati-di-riferimento.md`) si caricano e la validazione non restituisce errori.
- **CA-2** Per ciascuna regola R-1…R-8 una variante dei dati di riferimento con quel solo difetto restituisce esattamente un errore con quel codice e l'`id` (o la data) coinvolto.
- **CA-3** Dati con più difetti restituiscono tutti gli errori in una volta, non solo il primo.
- **CA-4** Esportare in JSON e ricaricare restituisce un viaggio e un catalogo identici agli originali, compresi priorità, orario fisso, prenotazioni, coordinate e prossimo numero per gli id nuovi.
- **CA-5** Il catalogo restituisce una zona, un luogo o un'attività dal suo `id`, ed elenca le attività di una zona in ordine alfabetico di `id`.
- **CA-6** Un'attività senza priorità viene caricata con priorità `desiderata`; un elemento senza indicazione di orario fisso viene caricato come non fisso.
- **CA-7** Dati non validi non provocano eccezioni: il caricamento restituisce sempre il risultato o l'elenco degli errori.

## Campi per il plugin

- **Sintesi** (`--summary`): caricare, validare con le regole R-1…R-8, esportare viaggio e catalogo e interrogare il catalogo, segnalando tutti gli errori con codice, elemento e motivo.
- **Criteri** (`--acceptance`): CA-1…CA-7.
- **Fuori perimetro** (`--non-goal`): fattibilità nel mondo reale (REQ-FEAS-001); versioni e storico (REQ-ITIN-002); lettura di file o rete (il caricamento riceve il JSON già letto).
- **Vincoli** (`--constraint`): regole comuni del motore (`modello-dominio.md` §3).
- **Percorsi** (`--write-path`): `packages/engine/src/itinerary`, `packages/engine/src/model`, `packages/engine/src/index.ts`, `packages/engine/test/itinerary`, `packages/engine/data/reference`, `packages/engine/package.json`, `package-lock.json`, `docs`, `evidence`.
