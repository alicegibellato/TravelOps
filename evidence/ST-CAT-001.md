# Prove di consegna: ST-CAT-001

## Cosa è stato chiesto

Il requisito REQ-CAT-001 "Catalogo esteso: modello e regole di classificazione" (ondata 2, CR-001 §9.5): estendere il catalogo del motore con i campi di `modello-dominio-estensioni.md` §7.3 e definire le regole deterministiche che trasformano un luogo reale di OpenStreetMap in un'attività di catalogo, tutto dentro il motore e senza rete. In concreto:

- tipi del motore estesi (§7.3, §7.8), compatibili con l'ondata 1, e validazione dei campi nuovi nel caricamento di REQ-ITIN-001;
- avviso "orari da verificare" nel controllo di fattibilità per i luoghi con orari non verificati;
- una tabella di classificazione (dati, non codice sparso) da tag OpenStreetMap a tipo di luogo, categoria, stili, all'aperto o al coperto, intensità, durata tipica e costo;
- orari predefiniti per tipo di luogo quando manca `opening_hours`, sempre marcati come non verificati;
- lettura del formato `opening_hours` nelle fasce di apertura del motore;
- i valori della §7.3 sulle 8 attività dell'ondata 1 nei dati di riferimento JSON.

Criteri di accettazione CA-1…CA-5. Story `ST-CAT-001`, una pull request da `feature/ST-CAT-001`.

## Perimetro ed esclusioni

- **Comprende:**
  - i tipi della §7.3 (stili, intensità, costo, adatta ai bambini, accessibile, mesi consigliati, descrizione breve, immagine; costo indicativo, opzioni alimentari, origine, identificativo OSM, orari verificati, fonte della descrizione, attribuzione dell'immagine) e della §7.8 (istantanea del catalogo);
  - i tipi di luogo `spiaggia`, `punto_panoramico`, `parco`, `impianto`, `negozio`, `farmacia`, `ospedale` e la categoria `servizio`;
  - la validazione dei campi nuovi in `caricaCatalogo` e il nuovo `caricaCatalogoEsteso`;
  - l'avviso `ORARI_DA_VERIFICARE` nel controllo di fattibilità;
  - il nuovo modulo `packages/engine/src/catalog` (tabella di classificazione, orari predefiniti, lettura di `opening_hours`, classificazione di un elemento OSM);
  - i dati aggiunti in `packages/engine/data/reference/estensioni/`: catalogo esteso con i valori della §7.3 ed esempi OSM registrati;
  - i test di ogni criterio CA-1…CA-5.
- **Esclude** (fuori perimetro del requisito):
  - qualsiasi chiamata di rete: gli esempi OSM sono file nel repository;
  - la scelta e la costruzione delle destinazioni, le istantanee precaricate e il pacchetto `packages/sources` (REQ-CAT-002);
  - il punteggio delle preferenze (§7.7, REQ-PREF-001 e REQ-PLAN-001).
- **Lasciato fuori di proposito:**
  - i dati della §8.5 (`NEGOZIO-RIVA`, `COMMISSARIATO-RIVA`, `A-ACQUISTI`, `A-DENUNCIA`): servono agli scenari S12 e S13 di REQ-REPLAN-004, che li aggiunge con il suo contratto. I tipi che li rendono possibili (`negozio`, `servizio`) ci sono già;
  - il caricamento validato di un'istantanea completa (§7.8): qui c'è il tipo `IstantaneaCatalogo`; il suo lettore, con le fonti e i tempi stimati dei mezzi pubblici, appartiene a REQ-CAT-002;
  - nessun file fuori dai percorsi della story: `apps/`, `package.json` della radice e `README.md` non sono stati toccati; `package.json` del motore e `package-lock.json` non sono cambiati (nessuna dipendenza nuova).
- **Deviazioni:** nessuna dai criteri. Due scelte di compatibilità (tipi estesi separati, codice dell'avviso separato da quelli di REQ-FEAS-001) sono spiegate in "Perché"; un'interpretazione di CA-4 è spiegata nello stesso capitolo.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Tipi della §7.3 (campi facoltativi su `Luogo` e `AttivitaCatalogo`; `StileViaggio`, `Intensita`, `Costo`, `OpzioneAlimentare`, `OrigineLuogo`, `Immagine`; `TipoLuogoEsteso`, `CategoriaEstesa`, `LuogoEsteso`, `AttivitaCatalogoEstesa`, `CatalogoEsteso`) e della §7.8 (`IstantaneaCatalogo`, `FonteIstantanea`) | `packages/engine/src/model/index.ts` |
| Valori ammessi aggiunti (tipi di luogo e categorie estesi, stili, intensità, costi, opzioni alimentari, origini), anche in `VALORI_AMMESSI` | `packages/engine/src/itinerary/valori.ts` |
| Validazione dei campi nuovi in `caricaCatalogo`, nuovo `caricaCatalogoEsteso`, interrogazioni che accettano anche un catalogo esteso | `packages/engine/src/itinerary/catalogo.ts` |
| `caricaViaggio`, `validaItinerario` ed `esportaCatalogo` accettano anche un catalogo esteso | `packages/engine/src/itinerary/viaggio.ts`, `packages/engine/src/itinerary/esporta.ts` |
| Export di `caricaCatalogoEsteso` | `packages/engine/src/itinerary/index.ts` |
| Avviso `ORARI_DA_VERIFICARE` (codici in `CODICI_AVVISO_CATALOGO`), controllo che accetta un catalogo esteso | `packages/engine/src/feasibility/controllo.ts`, `packages/engine/src/feasibility/index.ts` |
| Tabella di classificazione, orari predefiniti per tipo di luogo, soglie per sentieri e prezzi (solo dati) | `packages/engine/src/catalog/tabella.ts` |
| Lettura di `opening_hours` | `packages/engine/src/catalog/orari-osm.ts` |
| Applicazione della tabella a un elemento OSM (`classificaLuogoOsm`) e regole derivate (sentieri, prezzo, accessibilità, opzioni alimentari) | `packages/engine/src/catalog/classifica.ts` |
| Punto d'ingresso del modulo `catalog` | `packages/engine/src/catalog/index.ts` |
| Export del modulo dal pacchetto (una riga) | `packages/engine/src/index.ts` |
| Catalogo di riferimento con i valori della §7.3 | `packages/engine/data/reference/estensioni/catalogo-esteso.json` |
| Esempi OSM registrati (17 luoghi, formato Overpass) | `packages/engine/data/reference/estensioni/osm-esempi-orari.json` |
| Descrizione dei dati aggiunti | `packages/engine/data/reference/estensioni/README.md` |
| Supporto ai test del catalogo esteso | `packages/engine/test/catalog/supporto.ts` |
| Test di CA-2 | `packages/engine/test/catalog/classificazione.test.ts` |
| Test di CA-3 | `packages/engine/test/catalog/orari-osm.test.ts` |
| Test di CA-4 | `packages/engine/test/feasibility/orari-da-verificare.test.ts` |
| Test di CA-5 | `packages/engine/test/catalog/valori-ondata-1.test.ts` |
| Test di CA-1 (compatibilità), dei tipi estesi e della validazione dei campi nuovi | `packages/engine/test/catalog/modello-esteso.test.ts` |
| Prove di consegna | `evidence/ST-CAT-001.md` |

I dati di riferimento dell'ondata 1 (`packages/engine/data/reference/*.json`) e i test esistenti non sono cambiati.

## Perché

### Interfaccia

| Operazione | Funzione |
| --- | --- |
| Carica un catalogo con i campi della §7.3 | `caricaCatalogo(json)` (tipi e categorie dell'ondata 1), `caricaCatalogoEsteso(json)` (anche quelli della §7.3) |
| Classifica un luogo OSM | `classificaLuogoOsm(elemento, zonaId)` → `{ regola, luogo, attivita }` oppure `null` |
| Regola applicabile a dei tag | `regolaPerTag(tag)` |
| Leggi `opening_hours` | `leggiOrariOsm(testo)` → orari del motore oppure `null` |
| Orari di un luogo (letti o predefiniti) | `orariDelLuogo(tag, tipo)` → `{ apertura, orariVerificati }` |
| Regole derivate | `intensitaSentiero(km, dislivello)`, `durataSentiero(km)`, `costoDaPrezzo(price)` |
| Dati della tabella | `TABELLA_CLASSIFICAZIONE`, `ORARI_PREDEFINITI`, `REGOLE_SENTIERI`, `REGOLE_PREZZO` |

### Scelte

- **Campi nuovi tutti facoltativi.** Un catalogo dell'ondata 1 si carica identico (nessun valore aggiunto al caricamento), si esporta con lo stesso testo e dà gli stessi risultati in fattibilità, ripianificazione e modifiche. Un luogo senza `orariVerificati` vale verificato.
- **Tipi estesi separati (`TipoLuogoEsteso`, `CategoriaEstesa`, `CatalogoEsteso`).** `TipoLuogo` e `Categoria` restano quelli dell'ondata 1. Allargarli avrebbe rotto due cose fuori dal perimetro di questa story: un test esistente di REQ-ITIN-001 (CA-2) richiede che `caricaCatalogo` rifiuti il tipo `spiaggia`, e la web app ha etichette `Record<Categoria, string>` e `Record<TipoLuogo, string>`, che senza le chiavi nuove non compilano (la build di `apps/web` fallirebbe). Per questo `caricaCatalogo` resta dell'ondata 1 e `caricaCatalogoEsteso` ammette i valori nuovi; ogni `Catalogo` è anche un `CatalogoEsteso`, e le operazioni che lo ricevono (controllo di fattibilità, validazione del viaggio, interrogazioni, esportazione) accettano il catalogo esteso senza cambiare per chi passa un `Catalogo`.
  - *Alternativa scartata:* allargare `TipoLuogo` e `Categoria` aggiornando le etichette della web app; richiedeva di toccare `apps/` e di cambiare un test esistente.
- **Avviso con un codice separato.** `ORARI_DA_VERIFICARE` ha gravità `avviso` in `GRAVITA_PROBLEMI_FATTIBILITA` ma sta in `CODICI_AVVISO_CATALOGO`, non in `CODICI_PROBLEMA_FATTIBILITA`: quell'elenco è quello delle regole R-1…R-8 di REQ-FEAS-001 e un test esistente verifica che il suo unico avviso sia `METEO_AVVERSO`. Il messaggio in italiano contiene la frase della §7.3 "ti consiglio di controllare gli orari prima di andare".
- **Tabella come dati.** Tutte le regole stanno in `tabella.ts`: righe in ordine di precedenza (vale la prima che il luogo rispetta, così `shop=wine` è una cantina prima che un negozio), orari predefiniti per tipo di luogo, soglie per sentieri e prezzi. `classifica.ts` le applica senza valori scritti nel codice. È un modulo TypeScript e non un file JSON perché così la classificazione resta una funzione pura, senza accesso al file system, e i valori sono controllati dal compilatore.
  - *Alternativa scartata:* un JSON in `data/`, da leggere con il file system o importare fuori da `src`.
- **Righe oltre gli esempi minimi.** Oltre alle otto righe del requisito ci sono `tourism=gallery` (cultura) e le righe dei luoghi senza attività che la §8.1 chiede a ogni destinazione: alloggi, farmacia, ospedale, stazione, aeroporto, negozi. Ogni riga ha il suo test.
- **Lettura di `opening_hours` senza librerie.** Il motore traduce solo orari settimanali, quindi basta un lettore piccolo e deterministico per la parte del formato che si traduce senza perdere informazioni (giorni, intervalli ed elenchi di giorni, più fasce, oltre la mezzanotte, `off`, `open`, `24/7`, regole con `;` che sostituiscono e regole aggiuntive con `,` che si sommano; i festivi `PH` e `SH` si ignorano). Tutto il resto (mesi, settimane, alba e tramonto, commenti, `||`) dà `null` e il luogo prende l'orario predefinito non verificato, come chiede CA-3. Nessuna dipendenza nuova.
  - *Alternativa scartata:* la libreria `opening_hours` di npm, molto più grande del necessario, con dipendenze proprie e licenza LGPL.
- **Valori decisi qui dove il requisito non li fissa** (tutti nella tabella, facili da cambiare):
  - *sentieri:* `route=hiking` e `route=foot`; intensità = la più alta tra quella data dalla lunghezza (fino a 6 km facile, fino a 12 moderata, oltre impegnativa) e quella data dal dislivello (fino a 300 m, fino a 800 m, oltre); senza misure `moderata`. Durata 15 minuti per km (4 km/h), arrotondata per eccesso alla mezz'ora, minimo 60, senza lunghezza 120. Lunghezza e dislivello vengono dai campi `lunghezzaKm` e `dislivelloM` calcolati da chi costruisce la destinazione, altrimenti dai tag `distance` e `ascent`. Un sentiero impegnativo non è adatto ai bambini;
  - *ristoranti:* `price` con simboli (`€`…`€€€`, anche `$` e `£`), parole (`cheap`, `moderate`, `expensive`, …) o importi per persona (fino a 20 € `€`, fino a 45 € `€€`, oltre `€€€`; di un intervallo vale la media); senza `price` `€€`. Durata 75 minuti, stile `gastronomia` come i pranzi dell'ondata 1;
  - *impianti:* `aerialway=cable_car|gondola|chair_lift|mixed_lift` (non le stazioni né gli skilift), 60 minuti, `€€`;
  - *accessibilità:* dal tag `wheelchair` (`yes`/`designated` sì, `no`/`limited` no); senza tag sì per i luoghi al coperto e i parchi, no per spiagge, punti panoramici, sentieri e impianti (scelta prudente per chi ha mobilità ridotta);
  - *opzioni alimentari:* da `diet:vegetarian` e `diet:gluten_free` (`yes` o `only`);
  - *orari predefiniti:* musei mar–dom 10:00–18:00, ristoranti 12:00–14:30 e 19:00–22:30, cantine 10:00–19:00, impianti 08:30–17:00, negozi e farmacie lun–sab, all'aperto, alloggi, stazioni, aeroporti e ospedali sempre aperti;
  - *identificativi:* luogo `OSM-NODE-123`, attività `A-OSM-NODE-123`, `osmId` `node/123`.
- **Interpretazione di CA-4.** "Un luogo con orari non verificati genera solo un avviso, mai un problema bloccante": oltre a rendere `ORARI_DA_VERIFICARE` un avviso, per questi luoghi la regola R-5 `FUORI_ORARIO` non si applica agli orari predefiniti, che sono una stima. Se l'attività ne esce, lo dice il messaggio dell'avviso ("Secondo gli orari indicativi il lunedì è chiuso."). Le regole che non dipendono dagli orari del luogo restano invariate (durata, meteo, chiusure straordinarie, spostamenti). Per i luoghi con orari verificati, compresi quelli letti da `opening_hours`, R-5 resta bloccante. Il generatore della prima bozza (REQ-PLAN-001) potrà comunque usare gli orari predefiniti per scegliere gli orari.
- **Esempi OSM "registrati".** Senza rete, i 17 esempi di `osm-esempi-orari.json` sono trascritti nel formato di risposta di Overpass con valori di `opening_hours` del tipo che si trova nei dati reali: 13 leggibili (fasce multiple, giorni chiusi, `24/7`, oltre la mezzanotte, regole aggiuntive, festivi) e 4 per i casi di ripiego (stagionale, alba e tramonto, testo libero, tag assente). Identificativi, nomi e coordinate sono illustrativi, come dichiara il file stesso. Le istantanee con le risposte reali registrate arrivano con REQ-CAT-002.
- **Valori della §7.3 in un file separato.** `estensioni/catalogo-esteso.json` è il catalogo dell'ondata 1 con i campi della §7.3: luoghi con origine `riferimento` e orari verificati, ristoranti con costo indicativo `€€` (come i pranzi), attività con i valori della §7.3 e una descrizione breve. Un test verifica che, tolti i campi nuovi, coincide con `catalogo.json`, così le due copie non possono divergere. Il file si carica anche con `caricaCatalogo` perché usa solo tipi e categorie dell'ondata 1.

## Verifica

Comandi eseguiti dalla radice della copia di lavoro, dopo `npm ci`:

| Comando | Esito |
| --- | --- |
| `npm run build` | superato: motore compilato con `tsc`, web app compilata da Next.js con il controllo TypeScript |
| `npm test` | superato: motore 26 file, 508 test (328 dell'ondata 1 invariati + 180 nuovi); web app 15 file, 110 test |
| `npm run demo` | superato |
| `npm audit` | 0 vulnerabilità; nessuna dipendenza aggiunta |

| Criterio | Test | Esito |
| --- | --- | --- |
| **CA-1** I test dell'ondata 1 passano invariati | Tutti i test esistenti di `packages/engine/test` e `apps/web/test`, non modificati (`git diff` vuoto su quei file): 328 test del motore e 110 della web app. In più `test/catalog/modello-esteso.test.ts` "CA-1 …" (4 test): il catalogo dell'ondata 1 si carica identico con entrambe le funzioni, `caricaCatalogo` rifiuta ancora `spiaggia`, la versione 1 è valida e fattibile con il catalogo esteso, le interrogazioni funzionano | superato |
| **CA-2** Ogni riga della tabella di classificazione ha un test | `test/catalog/classificazione.test.ts`: un caso con i valori attesi per ciascuna delle 15 righe e un test che i casi coprono tutte e sole le righe; un test per ogni valore alternativo di ogni riga (24); precedenza `shop=wine`; luoghi non classificabili; valori ammessi; catalogo costruito dalla classificazione valido; determinismo; regole dei sentieri (10) e dei ristoranti, accessibilità e nomi (18). In tutto 73 test | superato |
| **CA-3** Almeno 10 orari OSM registrati si convertono correttamente; un orario non leggibile diventa un orario predefinito non verificato, mai un errore | `test/catalog/orari-osm.test.ts`: 13 esempi registrati leggibili con l'orario atteso scritto a mano (fasce multiple, giorni chiusi, `24/7`, oltre la mezzanotte, regole aggiuntive, festivi) e orari verificati; 4 esempi di ripiego con l'orario predefinito non verificato; 21 testi non leggibili che danno `null` senza eccezioni e l'orario predefinito; valori non testuali; 11 regole del formato; determinismo. In tutto 54 test | superato |
| **CA-4** Un luogo con orari non verificati genera solo un avviso, mai un problema bloccante | `test/feasibility/orari-da-verificare.test.ts` (11 test): avviso unico su `D1-E2` con il messaggio atteso e itinerario fattibile; tutti i luoghi non verificati (6 avvisi, nessun bloccante); con la pioggia di S1 due avvisi; attività fuori dagli orari predefiniti solo avviso (con le stesse fasce verificate sarebbe `FUORI_ORARIO`); museo OSM senza `opening_hours` e museo con orari stagionali solo avviso, anche il lunedì; luogo con orari verificati senza avviso e soggetto a `FUORI_ORARIO`; chiusura straordinaria ancora bloccante; nessun avviso sui dati dell'ondata 1; determinismo | superato |
| **CA-5** Le 8 attività dell'ondata 1 hanno i valori della §7.3 | `test/catalog/valori-ondata-1.test.ts` (13 test): stili, intensità, costo, adatta ai bambini e accessibile di ciascuna delle 8 attività, trascritti dalla §7.3; riepilogo (solo il Ponale impegnativo e non accessibile, solo la cantina non per bambini); origine e orari verificati dei luoghi; tolti i campi nuovi il catalogo coincide con `catalogo.json`; il file si carica con `caricaCatalogo` | superato |

Oltre ai criteri: `test/catalog/modello-esteso.test.ts` verifica i valori ammessi della §7.3, l'uso di un'istantanea (§7.8) come catalogo e la validazione dei campi nuovi (20 varianti con un solo difetto, ciascuna con esattamente un errore con il codice e l'`id` attesi, con entrambe le funzioni di caricamento; più difetti insieme; caricamento, esportazione e ricaricamento identici con tutti i campi).

## Collegamenti

- Requisito: [REQ-CAT-001](../docs/requirements/REQ-CAT-001-catalogo-esteso.md)
- Story: `ST-CAT-001`
- Contratto: `contract-ST-CAT-001-implementation`
- Profilo di autonomia: `AUT-PR-CAT-001`
- Branch: `feature/ST-CAT-001`
- Fonti: [modello-dominio-estensioni.md](../docs/requirements/modello-dominio-estensioni.md) §7.3, §7.8; [dati-di-riferimento-estensioni.md](../docs/requirements/dati-di-riferimento-estensioni.md) §8.1; [CR-001](../docs/CR-001-travelops-prodotto-demo.md) §9.5
