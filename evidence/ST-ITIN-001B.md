# Prove di consegna: ST-ITIN-001B

## Cosa è stato chiesto

Il requisito REQ-ITIN-001 "Modello dell'itinerario e catalogo": caricare, validare ed esportare il viaggio e il catalogo descritti in `modello-dominio.md` §2, e interrogare il catalogo. Le operazioni sono carica catalogo, carica viaggio, valida itinerario, esporta (viaggio o catalogo) e interroga catalogo (per `id` o per zona). Le regole di validità strutturale sono R-1…R-8: ogni violazione è un errore con codice, elemento coinvolto e motivo. Al caricamento valgono due valori predefiniti: priorità `desiderata` e orario non fisso. Story `ST-ITIN-001B`, da consegnare come nuova pull request da `feature/ST-ITIN-001B` verso `main`.

## Perimetro ed esclusioni

- **Comprende:**
  - caricamento difensivo di catalogo e viaggio, che accetta il testo JSON o il valore già decodificato;
  - le regole R-1…R-8 con tutti gli errori restituiti in una volta;
  - la validazione dell'itinerario rispetto al catalogo;
  - l'esportazione in JSON con ricaricamento identico;
  - l'interrogazione del catalogo per `id` e l'elenco delle attività di una zona;
  - i test di ogni criterio CA-1…CA-7 sui dati di riferimento e su varianti dichiarate nei test.
- **Esclude:**
  - la fattibilità nel mondo reale (REQ-FEAS-001);
  - versioni e storico (REQ-ITIN-002);
  - la lettura di file o rete: il caricamento riceve il JSON già letto.
- **Lasciato fuori di proposito:**
  - L'export del modulo da `packages/engine/src/index.ts` lo aggiunge il responsabile della consegna, perché altre story toccano quel file in parallelo. Oggi il file esporta solo `MODULO_ITINERARY`; basta sostituire quella riga con `export * from "./itinerary/index.js";`, che non entra in conflitto con i nomi del modello.
  - `src/model/index.ts` non è stato toccato.
- **Deviazioni:** nessuna dal requisito. I punti che il requisito lascia aperti sono stati interpretati come spiegato in "Perché".

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Punto d'ingresso del modulo: esporta le operazioni e mantiene `MODULO_ITINERARY` | `packages/engine/src/itinerary/index.ts` |
| Codici di errore R-1…R-8, forma dell'errore e del risultato di caricamento | `packages/engine/src/itinerary/errori.ts` |
| Valori ammessi (R-8), orari `HH:mm` e date `AAAA-MM-GG` senza orologio, controllo della condizione meteo | `packages/engine/src/itinerary/valori.ts` |
| Lettura difensiva dei campi e raccolta degli errori, decodifica del testo JSON, garanzia "nessuna eccezione" | `packages/engine/src/itinerary/verifica.ts` |
| Caricamento del catalogo, interrogazione per `id` e attività di una zona | `packages/engine/src/itinerary/catalogo.ts` |
| Caricamento del viaggio e validazione dell'itinerario | `packages/engine/src/itinerary/viaggio.ts` |
| Esportazione in JSON | `packages/engine/src/itinerary/esporta.ts` |
| Lettura dei dati di riferimento per i test (copia nuova a ogni chiamata) | `packages/engine/test/itinerary/dati.ts` |
| Test di CA-1, CA-6, CA-7 | `packages/engine/test/itinerary/caricamento.test.ts` |
| Test di CA-2, CA-3 | `packages/engine/test/itinerary/validazione.test.ts` |
| Test di CA-4 | `packages/engine/test/itinerary/esportazione.test.ts` |
| Test di CA-5 | `packages/engine/test/itinerary/interrogazione.test.ts` |
| Prove di consegna | `evidence/ST-ITIN-001B.md` |
| Export del modulo dal pacchetto (`export * from "./itinerary/index.js"`), aggiunto dal responsabile della consegna in fase di integrazione | `packages/engine/src/index.ts` |

I dati di riferimento in `packages/engine/data/reference` non sono cambiati: ogni variante con difetti è costruita dentro il test che la usa.

## Perché

### Interfaccia

| Operazione | Funzione |
| --- | --- |
| Carica catalogo | `caricaCatalogo(json)` |
| Carica viaggio | `caricaViaggio(json, catalogo?)` |
| Valida itinerario | `validaItinerario(viaggio, catalogo)` |
| Esporta | `esportaViaggio(viaggio)`, `esportaCatalogo(catalogo)` |
| Interroga catalogo | `trovaZona`, `trovaLuogo`, `trovaAttivita`, `trovaNelCatalogo` (per `id`), `attivitaDellaZona` (per zona) |

- **Esito dei caricamenti:** `{ ok: true, valore }` oppure `{ ok: false, errori }`.
- **Forma di un errore:** `codice`, `id` coinvolto, `percorso` del campo nel JSON (per esempio `giorni[1].elementi[1].inizio`), `motivo` in italiano e `messaggio` completo (`[CODICE] id: motivo`).
- **Chi è coinvolto:** l'`id` dell'elemento, la data del giorno, l'`id` della voce di catalogo o l'`id` del viaggio. Se l'`id` stesso manca, l'errore indica la posizione nel JSON.

### Scelte

- **Tutti gli errori in una volta, nessuna eccezione (CA-3, CA-7).** Il caricamento legge il dato come `unknown` campo per campo. Ogni lettore registra l'errore e prosegue. Un errore non ne genera altri a cascata: per esempio, un orario non valido non viene usato per i controlli di ordine e di fine dopo l'inizio. Così una variante con un solo difetto dà esattamente un errore (CA-2). Un `try/catch` finale trasforma in errore anche un dato che non si riesce a leggere, per esempio un oggetto che solleva eccezioni a ogni lettura.
- **Due livelli di controllo.** `caricaViaggio` applica le regole strutturali e controlla i riferimenti al catalogo (R-6) solo se riceve il catalogo. `validaItinerario` applica tutte le regole R-1…R-8 a un viaggio già in memoria, quindi serve anche per gli itinerari costruiti dal motore (proposte, modifiche).
- **Oggetti nuovi in forma canonica.** Il valore caricato è un oggetto nuovo che non modifica l'input. Contiene solo i campi del modello, in un ordine fisso, con i valori predefiniti scritti esplicitamente. Ne segue che:
  - l'esportazione è deterministica;
  - il testo esportato coincide con i file di riferimento;
  - esportare e ricaricare restituisce dati identici (CA-4).

  I campi sconosciuti vengono ignorati.
- **Determinismo (§3).** Date e orari si calcolano sui testi, con un algoritmo di calendario, senza `Date` né orologio. L'ordine alfabetico degli `id` confronta i codici dei caratteri, non usa `localeCompare`, quindi non dipende dalla lingua del sistema. Gli errori escono sempre nello stesso ordine: quello di lettura del documento.

### Interpretazioni del requisito

- **Testo che non è JSON:** `VALORE_NON_VALIDO` sul documento intero (`viaggio` o `catalogo`), senza introdurre un nono codice.
- **Valore assente:** un testo vuoto vale come campo mancante (R-1); `null` vale come assente.
- **Tipi sbagliati e campi a valore chiuso** (`VALORE_NON_VALIDO`, clausola generale di R-8):
  - un tipo sbagliato, per esempio un numero dove serve un testo;
  - una data che non esiste o non è nel formato `AAAA-MM-GG`;
  - un numero di viaggiatori o una durata tipica che non sono interi ≥ 1.
- **Alloggio della notte:** è obbligatorio (R-1) in ogni giorno prima della data di fine del viaggio, perché il modello lo prevede assente solo nell'ultimo giorno.
- **Giorni non validi (R-7):**
  - una data di fine che precede quella di inizio è un errore sull'`id` del viaggio;
  - anche i giorni fuori ordine di data sono un errore;
  - i giorni mancanti consecutivi danno un solo errore per intervallo, sulla prima data mancante. Così anche un viaggio di migliaia di anni produce pochi errori.
- **Ordine degli elementi (R-4):** ogni elemento si confronta con quello che lo precede nell'elenco. Due elementi con lo stesso inizio non sono un errore di ordine: la sovrapposizione è un problema di fattibilità (REQ-FEAS-001).
- **Fasce di apertura del catalogo:** valgono R-2 e R-3 come per gli elementi. L'apertura alle 24:00 è `FUORI_GIORNATA`; una chiusura non successiva all'apertura è `ORARIO_NON_VALIDO`.
- **Catalogo:**
  - gli `id` sono unici in tutto il catalogo (`ID_DUPLICATO`, estensione di R-5), così un `id` indica una sola zona, un solo luogo o una sola attività (CA-5);
  - la zona di un luogo e il luogo di un'attività devono esistere (R-6).
- **Condizione meteo (R-8):** non compare né nel viaggio né nel catalogo. Il modulo esporta `controllaCondizioneMeteo` e `VALORI_AMMESSI` per chi legge previsioni e imprevisti.

### Alternative scartate

| Alternativa | Perché è stata scartata |
| --- | --- |
| Validazione con una libreria (zod, ajv, JSON Schema) | Nuova dipendenza npm, non ammessa; messaggi non in italiano |
| Fermarsi al primo errore o sollevare eccezioni | Viola CA-3 e CA-7 |
| Conservare i campi sconosciuti nel valore caricato | Il valore non rispetterebbe più esattamente i tipi del modello e l'esportazione non sarebbe canonica |
| Un codice `JSON_NON_VALIDO` in più | Il requisito definisce solo R-1…R-8 |

## Verifica

Eseguito su Windows 11, Node 22.22.2, npm 10.9.7, dalla radice della copia di lavoro: `npm ci`, poi `npm run build` (verde) e `npm test` (verde).

**Risultato dei test: 11 file, 116 test, tutti superati.** Di questi, 5 file e 105 test sono del modulo itinerary.

I test non sono compilati da `npm run build`. Per questo sono stati controllati anche con `tsc` in modalità `strict`, insieme ai sorgenti, usando una configurazione temporanea fuori dal repository: nessun errore.

| Criterio | Test che lo copre (file › nome del test) | Esito |
| --- | --- | --- |
| CA-1 catalogo, versione 1, `V-IRR`, `V-FISSO`, `V-VOLO` si caricano e la validazione non dà errori | `caricamento.test.ts` › "CA-1 il catalogo di riferimento si carica senza errori"; "CA-1 %s si carica e la validazione con il catalogo non restituisce errori" (4 casi: `versione-1.json`, `variante-v-irr.json`, `variante-v-fisso.json`, `variante-v-volo.json`); "CA-1 si carica anche il testo JSON letto dal file, non solo il valore decodificato" | superato |
| CA-2 per ogni regola R-1…R-8 una variante con quel solo difetto dà esattamente un errore con quel codice e l'`id` o la data | `validazione.test.ts` › "CA-2 viaggio $regola $codice: $descrizione" (27 varianti del viaggio: R-1 ×6, R-2 ×3, R-3 ×3, R-4, R-5, R-6 ×4, R-7 ×4, R-8 ×5); "CA-2 catalogo $regola $codice: $descrizione" (12 varianti del catalogo); "CA-2 R-6 RIFERIMENTO_INESISTENTE: il viaggio si carica senza catalogo e validaItinerario trova il riferimento"; "CA-2 R-8 VALORE_NON_VALIDO: una condizione meteo non ammessa (grandine) è un errore"; "CA-2 ogni regola R-1…R-8 ha almeno una variante con quel solo difetto" | superato |
| CA-3 più difetti danno tutti gli errori in una volta | `validazione.test.ts` › "CA-3 un viaggio con un difetto per ogni regola R-1…R-8 restituisce gli otto errori in una volta"; "CA-3 validaItinerario restituisce gli stessi errori di un caricamento con catalogo"; "CA-3 più difetti nello stesso elemento sono segnalati tutti"; "CA-3 un catalogo con più difetti restituisce tutti gli errori in una volta"; "CA-3 a parità di dati gli errori sono identici e nello stesso ordine" | superato |
| CA-4 esportare e ricaricare restituisce dati identici (priorità, orario fisso, prenotazioni, coordinate, prossimo numero) | `esportazione.test.ts` › "CA-4 il catalogo esportato e ricaricato è identico, coordinate comprese"; "CA-4 %s esportato e ricaricato è identico all'originale" (4 casi); "CA-4 restano identici priorità, orario fisso, prenotazioni e prossimo numero per gli id nuovi"; "CA-4 l'esportazione è deterministica e coincide con i file di riferimento"; "CA-4 un viaggio senza valori espliciti viene esportato con i valori predefiniti e ricaricato identico" | superato |
| CA-5 zona, luogo o attività dal loro `id`; attività di una zona in ordine alfabetico di `id` | `interrogazione.test.ts` › "CA-5 restituisce una zona dal suo id"; "CA-5 restituisce un luogo dal suo id"; "CA-5 restituisce un'attività dal suo id"; "CA-5 trova zona, luogo o attività con un solo id e dice di che voce si tratta"; "CA-5 elenca le attività di una zona in ordine alfabetico di id"; "CA-5 una zona senza attività o sconosciuta restituisce un elenco vuoto"; "CA-5 l'ordine non dipende dall'ordine del catalogo e il catalogo non viene modificato" | superato |
| CA-6 senza priorità → `desiderata`; senza orario fisso → non fisso | `caricamento.test.ts` › "CA-6 un'attività senza priorità viene caricata con priorità desiderata"; "CA-6 un elemento senza indicazione di orario fisso viene caricato come non fisso"; "CA-6 con i valori predefiniti il viaggio caricato coincide con la versione 1 che li scrive esplicitamente" | superato |
| CA-7 dati non validi non provocano eccezioni | `caricamento.test.ts` › "CA-7 caricaViaggio con %s restituisce errori senza eccezioni" (18 casi); "CA-7 caricaCatalogo con %s restituisce errori senza eccezioni" (9 casi); "CA-7 validaItinerario non solleva eccezioni neanche con viaggio e catalogo non validi"; "CA-7 un intervallo di date enorme dà un solo errore per ogni gruppo di giorni mancanti"; "CA-7 il caricamento non modifica il JSON ricevuto e restituisce un oggetto nuovo" | superato |

Gli altri test del modulo sono:

- `itinerary.test.ts` › "è disponibile nel pacchetto del motore", che c'era già;
- `caricamento.test.ts` › "l'itinerario della proposta P-S1 (id nuovo N1, prossimo numero 2) è valido";
- `validazione.test.ts` › "un errore riporta codice, elemento coinvolto, posizione e motivo in italiano";
- `validazione.test.ts` › "anche nel catalogo gli id sono unici: due attività con lo stesso id sono ID_DUPLICATO".

## Collegamenti

- Requisito `REQ-ITIN-001` (`.sdlc/requirements/REQ-ITIN-001.json`), fonte `docs/requirements/REQ-ITIN-001-modello-catalogo.md`
- Story `ST-ITIN-001B`, che sostituisce `ST-ITIN-001`: la sua consegna è stata annullata senza commit perché il punto di partenza era incompatibile con il contesto aggiornato dopo il merge di `ST-REPLAN-001`. Codice e test sono gli stessi, sviluppati dall'agente della story.
- Contratto `contract-ST-ITIN-001B-implementation`
- Profilo di consegna `AUT-PR-ITIN-001B` (pull request su `alicegibellato/TravelOps`, branch `feature/ST-ITIN-001B`)
- Fonti condivise: `docs/requirements/modello-dominio.md`, `docs/requirements/dati-di-riferimento.md`
