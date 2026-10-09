# CR-001 — TravelOps: da proof of concept a demo di prodotto

| Campo | Valore |
|---|---|
| Tipo | Richiesta di modifica (CR) unica: contiene tutto ciò che serve per eseguirla |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Richiedente | Valerio Riso |
| Destinatario | Un agente Claude Code con il plugin Agentic SDLC, aperto nella cartella del repository TravelOps |
| Stato | Fasi 1 e 2 eseguite il 2026-10-09: fonti, file dei requisiti in `docs/requirements/` e requisiti registrati nel plugin. Da qui in avanti fanno fede i file dei requisiti, non questo documento. |

---

## 0. Come usare questo documento (per te)

1. Apri Claude Code nella cartella `C:\Progetti\TravelOps`, con il plugin Agentic SDLC attivo. Se vuoi meno interruzioni, usa la modalità automatica.
2. Incolla questo messaggio:

   > Leggi `docs/CR-001-travelops-prodotto-demo.md` per intero ed eseguilo dall'inizio alla fine seguendo la sezione 1 "Istruzioni per l'agente". Fermati solo nei punti in cui il documento dice che serve una persona.

3. L'agente lavora da solo. Ti chiede qualcosa solo per le decisioni che il plugin riserva a una persona: approvare i requisiti, scegliere l'autonomia di una consegna, approvare un merge. Le raccoglie in blocchi, così rispondi poche volte.
4. Alla fine trovi l'app avviabile, il copione della demo con i prompt da incollare (sezione 10) e il collaudo da fare tu con l'app aperta (sezione 11). L'agente fa lo stesso collaudo prima di te e ti consegna il verbale.

---

## 1. Istruzioni per l'agente

Sei l'agente che esegue questa CR. Lavora in autonomia, in italiano, usando il plugin Agentic SDLC per ogni requisito, storia e consegna.

### 1.1 Regole che non si violano

- **Non riscrivere i requisiti esistenti e non toccare le loro storie.** Ogni modifica a un requisito approvato è una **CR**: un requisito nuovo (`requirement propose`) che nel titolo dice "CR su `<requisito>`", ne dipende e ne descrive solo le differenze. Non usare `requirement revise` né `requirement supersede` sui requisiti dell'ondata 1: il plugin accetta un solo requisito approvato per identificativo logico, quindi una revisione o una sostituzione bloccherebbe le storie già esistenti (per esempio ST-EDIT-001 e ST-REPLAN-002).
- **Non modificare le fonti condivise esistenti.** `docs/requirements/modello-dominio.md` e `docs/requirements/dati-di-riferimento.md` restano come sono: cambiarle rende "non aggiornati" tutti i requisiti dell'ondata 1. Le estensioni vanno in due fonti nuove (§1.3, fase 1).
- **Non approvare al posto della persona.** Approvazioni di requisiti, scelte di autonomia ed eccezioni le dà la persona. Raccoglile in blocchi (§1.4).
- **Non toccare il lavoro di altri.** Se una storia è assegnata a un altro agente o computer (per esempio ST-REPLAN-002 a `agente-replan-002`), aspetta che si chiuda; non riprenderla.
- **Principio del prodotto:** il motore decide e verifica, l'AI interpreta e racconta. Nessun itinerario mostrato al viaggiatore esce dall'AI senza essere passato dal motore e dal controllo di fattibilità.
- **Mai sulle prenotazioni:** TravelOps avvisa e propone link, non prenota, non paga, non cancella.
- **Nessun segreto nel codice.** La chiave dell'API di Claude sta solo in `apps/web/.env.local` (escluso da Git) come `ANTHROPIC_API_KEY`.
- **Servizi pubblici usati con rispetto.** Per OpenStreetMap e gli altri servizi gratuiti (§9.5b) rispetta le loro regole d'uso: al massimo 1 richiesta al secondo a Nominatim, un User-Agent che identifica TravelOps, cache obbligatoria, attribuzione visibile ("© OpenStreetMap contributors", licenze delle immagini). Nei test automatici nessuna chiamata di rete: si usano le istantanee registrate.
- Se il plugin rifiuta un comando, leggi il motivo, correggi e riprova. Non aggirare i controlli (niente `--force`, nessuna eccezione approvata da te).

### 1.2 Fase 0 — Chiudere l'ondata 1

1. Esegui `git pull` e lo status del plugin.
2. Per ogni storia che risulta unita su `main` ma ancora aperta (`merged_but_open`): verifica perché la ricevuta finale risulta "non valida o illeggibile", ripara i record con i comandi del plugin, poi registra i passaggi mancanti con `story complete-step` fino alla chiusura. Se esiste una consegna già avviata, chiedi alla persona di confermarla con `autonomy delivery reconcile` (lo lancia la persona, non tu).
3. Aggiorna i record che il plugin dichiara aggiornabili dall'agente (per esempio `baseline refresh`).
4. Consegna le storie dell'ondata 1 ancora aperte e non assegnate ad altri, nell'ordine permesso dalle dipendenze: tipicamente ST-EDIT-001 e ST-WEB-002, dopo che ST-REPLAN-002 è chiusa. Ogni storia si consegna con `/agentic-sdlc:deliver`.
5. La fase 0 è finita quando lo status non mostra storie dell'ondata 1 aperte o bloccate.

Le fasi 1 e 2 toccano solo documenti: puoi farle mentre aspetti che altri chiudano le loro storie della fase 0.

### 1.3 Fase 1 — Documenti

1. **Visione.** Aggiorna `docs/requirements/visione.md` come dice la §3 (non è una fonte di requisiti: si modifica liberamente).
2. **Fonti condivise nuove.** Crea:
   - `docs/requirements/modello-dominio-estensioni.md` con il contenuto della §7;
   - `docs/requirements/dati-di-riferimento-estensioni.md` con il contenuto della §8. Calcola tu i risultati attesi che la §8 ti chiede di calcolare applicando le regole, e scrivili nel file.
3. **Un file per requisito** in `docs/requirements/`, nello stesso formato di quelli esistenti (intestazione, obiettivo, operazioni o funzionalità, regole, risultati attesi, criteri di accettazione, **Campi per il plugin**). Il contenuto è nella §9. Nomi dei file: `REQ-<AREA>-<NNN>-<slug>.md`.
4. Fonti (`--source`) di ogni requisito: il suo file, `modello-dominio.md`, `dati-di-riferimento.md`, `modello-dominio-estensioni.md`, `dati-di-riferimento-estensioni.md`.
5. Fai commit dei documenti su un branch, apri la pull request dei documenti come fanno le altre storie del progetto.

### 1.4 Fase 2 — Requisiti nel plugin

1. Per ogni requisito nuovo: `requirement propose` con i campi della sezione "Campi per il plugin" del suo file.
2. Le CR su requisiti esistenti (REQ-WEB-003, REQ-WEB-004, REQ-EDIT-002, REQ-REPLAN-003, REQ-REPLAN-004) si registrano come gli altri requisiti nuovi (§1.1).
3. **Prima richiesta alla persona (un solo blocco):** mostra l'elenco dei requisiti proposti, con una riga di sintesi ciascuno, e il grafo delle dipendenze della §9.17, e chiedi l'approvazione di tutto. Dopo l'approvazione registra le approvazioni con i comandi del plugin come approvate dalla persona.
4. Registra le dipendenze della §9.17 (`dependency`), crea le storie `ST-<AREA>-<NNN>` (`story`) e controlla con `orchestrate` l'ordine di esecuzione.
5. **Seconda richiesta alla persona (un solo blocco):** l'autonomia di ogni consegna. Proponi `checkpointed` per tutte. Se il plugin offre una delega con limiti e scadenza (`authorization`), proponila alla persona per ridurre le richieste successive; non attivarla senza il suo sì.

### 1.5 Fase 3 — Consegne

1. Consegna le storie nell'ordine della §9.17 con `/agentic-sdlc:deliver`, una pull request per storia. Le storie dello stesso passo possono andare in parallelo se `orchestrate` lo permette.
2. Ogni storia: test automatici per ogni criterio, build e test verdi, revisione del codice, PR. Le storie con interfaccia includono anche la **prova nel browser** (§1.6) e gli screenshot in `evidence/`.
3. Per le parti che usano Claude: carica prima la skill `claude-api`. Nei test automatici l'AI è sostituita da un client finto con risposte registrate: nessuna chiamata di rete in CI.
4. Merge: segui ciò che la persona ha scelto nella seconda richiesta; se serve un'approvazione, raccogli più PR pronte in un'unica richiesta.

### 1.6 Fase 4 — Collaudo come una persona vera (UAT)

1. Avvia l'app come la avvierebbe la persona (§11.1), con la chiave di Claude se presente.
2. Apri l'app nel browser integrato e **comportati da utente finale non tecnico**: niente strumenti per sviluppatori, niente URL scritti a mano, solo ciò che si vede sullo schermo. Esegui tutti i casi della §11.3 con i prompt della §10, uno per uno.
3. Per ogni caso annota: esito (Superato / Non superato / Superato con note), cosa hai visto, screenshot. Controlla anche la versione da telefono (larghezza 375 px) e il tema scuro.
4. Ogni caso non superato è un difetto: correggilo con una storia o una PR di correzione tramite il plugin, poi ripeti il caso.
5. Scrivi il verbale in `docs/demo/verbale-uat.md` (modello in §11.4) con gli screenshot in `evidence/uat/`.
6. **Consegna finale alla persona:** link all'app, al copione (`docs/demo/copione-demo.md`) e al verbale, con l'elenco delle note aperte.

---

## 2. Decisioni già prese

Valgono finché la persona non le cambia. Se la persona ne cambia una, aggiorna i requisiti coinvolti prima di proporli.

| # | Tema | Decisione |
|---|---|---|
| D-1 | Natura del prodotto | Da proof of concept a **demo di prodotto**: deve sembrare un'app vendibile a un cliente finale non tecnico. Restano un solo utente e nessun accesso. |
| D-2 | Raccolta delle preferenze | **Filtri e chat insieme, sullo stesso schermo**: il percorso guidato a pulsanti e filtri e la chat sono due modi di compilare lo stesso profilo, e il riepilogo si aggiorna da entrambi. Si può iniziare in uno e finire nell'altro. Ogni cosa che si fa in chat si può fare anche con i pulsanti, così la demo regge anche senza AI. |
| D-3 | Destinazioni | **Dati reali, qualsiasi destinazione.** Luoghi, coordinate e orari da OpenStreetMap; descrizioni da Wikipedia e Wikivoyage; immagini da Wikimedia Commons; tempi di percorrenza da un servizio di percorsi (§9.5b). Nessuna chiave a pagamento. Il catalogo di una destinazione si costruisce alla prima richiesta e si salva come **istantanea**: da lì in poi motore, bozza e ripianificazione lavorano su quell'istantanea, quindi restano deterministici. Tre destinazioni (Lago di Garda, Roma, Dolomiti – Val di Fassa) sono **precaricate** come istantanee nel repository: la demo funziona anche senza rete. L'AI non inventa luoghi: usa solo quelli che la sorgente reale restituisce. |
| D-4 | Prima bozza | La genera il **motore** con regole deterministiche a partire dalle preferenze e dall'istantanea della destinazione; l'agente la racconta e la personalizza usando le operazioni del motore. Così la demo è ripetibile. |
| D-5 | Cicli di revisione | Illimitati. Durante la bozza le modifiche si applicano subito (con annulla e confronto); dopo la conferma ogni modifica diventa una proposta da accettare o rifiutare. |
| D-6 | Imprevisti | Si ripianifica **solo la parte colpita**. Se la giornata non si salva, si propone di rigenerare quella giornata rispettando le preferenze; mai l'intero viaggio senza che il viaggiatore lo chieda. |
| D-7 | AI | Claude tramite API Anthropic, chiave lato server. Modello configurabile con `TRAVELOPS_MODEL`, predefinito `claude-sonnet-5-5`. Senza chiave la chat mostra un messaggio gentile e tutto il resto funziona. |
| D-8 | Dati | SQLite al posto del file JSON locale. |
| D-9 | Lingua | Interfaccia in italiano. Nessun codice tecnico visibile al viaggiatore (niente `D2-E4`, `FUORI_ORARIO`, `N1`). |
| D-10 | Una destinazione per viaggio | Un viaggio ha una sola destinazione (zona principale più zone raggiungibili in giornata, entro circa 60 minuti), da 2 a 14 giorni. Il viaggio su più destinazioni è fuori perimetro. |
| D-11 | Rete e motore | Il motore resta senza chiamate di rete (regola comune dell'ondata 1). Le chiamate ai servizi reali stanno in un pacchetto separato, `packages/sources`, che produce le istantanee del catalogo. |
| D-12 | Meteo | Nella demo il meteo resta simulato (modalità presentazione). Il meteo reale con Open-Meteo resta nell'ondata 3 (REQ-EXT-001). |

---

## 3. Aggiornamento della visione (`visione.md`)

- §1 Obiettivo: "Proof of concept" diventa "demo di prodotto pensata per un cliente finale non tecnico". Il principio architetturale resta identico.
- Aggiungi il percorso del viaggiatore in quattro momenti (§4 di questa CR).
- §2 Principi: aggiungi "**Comprensibile a chiunque**: linguaggio semplice, nessun codice tecnico a vista" e "**Sempre un'alternativa a pulsanti**: la chat aiuta, non è obbligatoria".
- §3 Mappa dei requisiti: aggiungi l'**ondata 2 — Prodotto** con i requisiti della §9.
- §5: le voci ORCH-001, PLAN-001, CHAT-001, IMPR-001, DATA-001 e TODAY-001 non sono più "da dettagliare": rimanda ai loro file.
- §6 Fuori dal PoC: togli "Requisiti su lingue multiple e accessibilità" (l'accessibilità ora è un requisito, REQ-UX-001; le lingue multiple restano fuori) e togli "Catalogo reale: il PoC pianifica solo sulle destinazioni del catalogo demo" (ora le destinazioni sono reali, D-3). Il resto rimane.
- §7 Scelte tecniche: aggiungi Tailwind CSS, componenti accessibili basati su Radix UI (stile shadcn/ui), icone Lucide, SQLite con `better-sqlite3`, `@anthropic-ai/sdk`, pacchetto `packages/agents`, pacchetto `packages/sources` (OpenStreetMap con Nominatim e Overpass, Wikipedia e Wikivoyage, Wikimedia Commons, OSRM per i percorsi).

---

## 4. Il percorso del viaggiatore

| Momento | Cosa vive il viaggiatore | Requisiti |
|---|---|---|
| **1. Raccontami il viaggio** | Una home accogliente con "Pianifica un viaggio". Un percorso guidato a schede (chi viaggia, quando, quanto, che stile, ritmo, budget, esigenze) oppure una chat che fa le stesse domande in modo naturale. Si vede in tempo reale un riepilogo delle preferenze raccolte. | PREF-001, CHAT-001, ORCH-001 |
| **2. Ecco la tua bozza** | Se la destinazione è nuova, l'app mostra per qualche secondo "Sto esplorando Lisbona…" con i passi (luoghi, ristoranti, percorsi). Poi arriva un itinerario giorno per giorno con mappa, orari, schede delle attività con immagine, e una breve spiegazione "perché te lo propongo". | CAT-001, CAT-002, PLAN-001, UX-001 |
| **3. Sistemiamola insieme** | Il viaggiatore chiede cambi in chat o con i pulsanti su ogni scheda: sostituisci, rimuovi, sposta, giornata più leggera, rigenera il giorno, mostrami un'alternativa. Tutte le volte che vuole. Può annullare e confrontare. Quando è contento preme **Conferma l'itinerario**. | PLAN-002, EDIT-002, CHAT-001 |
| **4. In viaggio** | Vista "Oggi" con cosa sta succedendo e cosa viene dopo. Il pulsante **Ho un imprevisto** (o un messaggio in chat) genera una proposta che cambia solo ciò che serve, spiegata in parole semplici, da accettare o rifiutare. Lo storico delle versioni resta consultabile. | TODAY-001, IMPR-001, REPLAN-003, REPLAN-004, EDIT-002 |

---

## 5. Ricerca di riferimento

### 5.1 Cosa chiedono le app di pianificazione

Le app di pianificazione con AI (per esempio Layla e Mindtrip) partono da destinazione, date, budget, interessi e compagni di viaggio, fanno domande di chiarimento e adattano il piano man mano che le preferenze diventano chiare. I profili di viaggiatore suggeriti dalle guide coprono stile di viaggio, ritmo, budget, alloggio, cibo, accessibilità e composizione del gruppo, con poche domande obbligatorie e le altre facoltative.

Fonti: [Pointspath — profilo del viaggiatore per l'AI](https://pointspath.com/blog/ai-trip-planning-traveler-profile), [Unite.AI — strumenti AI per pianificare viaggi](https://www.unite.ai/best-ai-tools-for-travel-planning/), [Axios — Mindtrip](https://www.axios.com/2024/07/31/ai-trip-planner-travel-itinerary-mindtrip).

### 5.2 Imprevisti più comuni

Ritardi e cancellazioni dei voli sono l'imprevisto più frequente (circa un terzo dei passeggeri ha avuto ritardi o coincidenze perse); seguono bagagli smarriti o in ritardo; la malattia o l'infortunio è meno frequente ma il più costoso; il meteo pesa in modo rilevante. Sono sondaggi di assicurazioni, quindi indicativi.

Fonti: [AXA Travel Insurance](https://axatravelinsurance.com/en/resources/101/americans-face-travel-disruptions), [PR Newswire — 68% dei passeggeri UK e USA](https://prnewswire.co.uk/news-releases/more-travel-disruption-feared-as-passengers-take-to-the-skies-this-holiday-season-301696582.html), [Southern Cross Travel Insurance](https://scti.com.au/about-us/news/3-in-4-australian-overseas-travellers-experienced-an-issue-with-their-travel-in-2022), [Newstalk ZB](https://newstalkzb.co.nz/lifestyle/travel/southern-cross-travel-insurance-reveals-most-common-cause-of-travel-disruption).

### 5.3 Fonti di dati reali senza chiavi a pagamento

| Dato | Fonte | Regole d'uso da rispettare |
|---|---|---|
| Ricerca della destinazione e area | Nominatim (OpenStreetMap) | massimo 1 richiesta al secondo, User-Agent identificativo, risultati in cache ([regole](https://operations.osmfoundation.org/policies/nominatim/)) |
| Luoghi, tipi, coordinate, orari di apertura (`opening_hours`), opzioni alimentari, accessibilità (`wheelchair`) | Overpass API (OpenStreetMap) | uso moderato, query limitate all'area ([wiki](https://wiki.openstreetmap.org/wiki/Overpass_API)) |
| Descrizioni | Wikipedia e Wikivoyage in italiano (in inglese se manca), API pubbliche | citazione della fonte |
| Immagini | Wikimedia Commons | licenza e autore salvati e mostrati |
| Tempi di percorrenza a piedi e in auto | OSRM (server dimostrativo pubblico o istanza propria) | uso leggero, in cache ([regole del server dimostrativo](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server)) |
| Licenza dei dati OSM | ODbL | attribuzione "© OpenStreetMap contributors" visibile sulla mappa e nei dettagli |

Da qui l'elenco degli imprevisti gestiti (§7.4): oltre a meteo, ritardo, chiusura e cancellazione già presenti, si aggiungono volo o coincidenza persi, problema di salute o infortunio, sciopero dei mezzi, bagaglio smarrito, documenti smarriti o rubati, stanchezza; e tra le richieste del viaggiatore "resto più giorni" o "riparto prima".

---

## 6. Design system e principi di esperienza

Riferimenti: le linee guida di Material Design 3 e Apple Human Interface Guidelines, i pattern delle app di viaggio più diffuse (filtri a chip e schede di Airbnb e Booking, chat affiancata all'itinerario di Mindtrip e Layla), WCAG 2.2 livello AA.

### 6.1 Identità visiva

- **Colori:** colorati e caldi, mai infantili. Un colore primario (blu-turchese "lago"), un secondario (corallo "tramonto") e un accento (giallo "sole"), più neutri caldi. Ogni **stile di viaggio** ha il suo colore (relax, cultura, natura, avventura, gastronomia, romantico, famiglia), usato per chip, icone e linee sulla mappa. Tutti i colori sono **token** (variabili CSS) con versione chiara e scura; il contrasto del testo è almeno 4.5:1.
- **Tipografia:** un sans-serif moderno da Google Fonts (per esempio Plus Jakarta Sans per i titoli e Inter per il testo), scala tipografica coerente.
- **Forme:** angoli arrotondati (12–16 px sulle schede), ombre leggere, spaziatura su griglia da 4/8 px.
- **Immagini:** ogni attività e destinazione ha un'immagine o un'illustrazione. Si usano solo immagini con licenza libera e attribuzione registrata (Wikimedia Commons, Unsplash) oppure illustrazioni generate (gradienti e icone). Mai immagini senza licenza.
- **Movimento:** transizioni brevi (150–250 ms) per comparsa di schede, aggiornamenti dell'itinerario, evidenziazione delle modifiche. Tutto si disattiva con `prefers-reduced-motion`.

### 6.2 Componenti

Tailwind CSS e componenti accessibili basati su Radix UI (stile shadcn/ui), icone Lucide. Componenti minimi: pulsanti (primario, secondario, testo), chip selezionabili, slider, selettore di date e periodi, contatori (+/−), schede attività, linea del tempo del giorno, mappa, pannello chat con bolle e risposte rapide, scheda proposta con "prima → dopo", badge di stato, avvisi, finestre modali e pannelli laterali, notifiche brevi (toast), indicatore di caricamento a scheletro, stato vuoto illustrato.

### 6.3 Layout

- **Desktop:** chat a sinistra (circa 1/3), itinerario e mappa a destra. La chat si può chiudere.
- **Telefono:** schede in basso ("Itinerario", "Mappa", "Chat", "Oggi"), chat a tutto schermo, pannelli dal basso (bottom sheet). Nessuno scorrimento orizzontale della pagina.
- Tema chiaro e scuro, scelto dal sistema e modificabile.

### 6.4 Linguaggio e comportamento

- Frasi brevi, seconda persona, tono amichevole. Niente codici, niente gergo: "Il Castello chiude alle 13 la domenica, quindi non ci stiamo dentro" invece di `FUORI_ORARIO`.
- Ogni azione importante ha un riscontro visibile ("Ho sostituito il trekking con la visita al MAG").
- Ogni azione distruttiva si può annullare.
- Stati sempre gestiti: caricamento, vuoto, errore (con cosa fare), AI non disponibile.
- Accessibilità: tutto usabile da tastiera, focus visibile, etichette per lettori di schermo, aree cliccabili di almeno 44×44 px.

---

## 7. Contenuto di `modello-dominio-estensioni.md` (fonte condivisa nuova)

> Estende `modello-dominio.md` senza modificarlo. Dove le due fonti parlano della stessa cosa, vale questa estensione solo per i requisiti dell'ondata 2.

### 7.1 Viaggio

Campi aggiunti al viaggio:

- **stato**: `bozza`, `confermato`, `in_corso`, `concluso`. Un viaggio nasce in `bozza`; diventa `confermato` con "Conferma l'itinerario"; è `in_corso` quando l'orologio (reale o simulato) è tra inizio e fine; `concluso` dopo la fine.
- **profilo**: le preferenze del viaggiatore (§7.2). Facoltativo: i viaggi dell'ondata 1 non ce l'hanno e si comportano esattamente come prima.
- **destinazione**: la zona principale.
- **istantanea del catalogo**: l'identificativo dell'istantanea (§7.8) su cui il viaggio è costruito. Bozza, modifiche e ripianificazioni usano sempre questa istantanea, così lo stesso input dà sempre lo stesso risultato anche se i dati reali cambiano.
- **revisioni della bozza**: elenco numerato delle bozze (§7.5), separato dallo storico delle versioni, che parte alla conferma.

### 7.2 Profilo delle preferenze

| Campo | Valori | Obbligatorio | Predefinito |
|---|---|---|---|
| Destinazione | qualsiasi città o area reale trovata dalla ricerca (§9.5b), oppure "sorprendimi" | sì | — |
| Date | date precise, oppure mese e durata | sì | — |
| Durata | da 2 a 14 giorni | sì | — |
| Viaggiatori | adulti (≥1), bambini con età | sì | 2 adulti |
| Tipo di gruppo | da solo, coppia, amici, famiglia | no | ricavato dai viaggiatori |
| Stili di viaggio | uno o più tra `relax`, `cultura`, `natura`, `avventura`, `gastronomia`, `romantico`, `famiglia` | no | `cultura`, `natura` |
| Ritmo | `lento` (2 attività al giorno), `bilanciato` (3), `intenso` (4), pasti esclusi | no | `bilanciato` |
| Forma fisica | `facile`, `moderato`, `impegnativo` (intensità massima accettata) | no | `moderato` |
| Budget | `€`, `€€`, `€€€` (fascia indicativa per persona al giorno, attività escluso alloggio) | no | `€€` |
| Orari | `mattiniero` (giornata 08:00–20:00), `normale` (09:30–21:30), `nottambulo` (11:00–23:30) | no | `normale` |
| Pasti nel piano | pranzo sì/no, cena sì/no | no | pranzo sì, cena sì |
| Mezzi | a piedi, mezzi pubblici, treno, auto | no | tutti |
| Irrinunciabili | attività del catalogo o stili che devono esserci | no | nessuno |
| Da evitare | attività, categorie o stili | no | nessuno |
| Esigenze | mobilità ridotta, adatto ai bambini, vegetariano, senza glutine | no | nessuna |

### 7.3 Catalogo

Campi aggiunti all'attività di catalogo: **stili** (uno o più), **intensità** (`facile`, `moderata`, `impegnativa`), **costo** (`gratis`, `€`, `€€`, `€€€`), **adatta ai bambini** (sì/no), **accessibile** (sì/no), **mesi consigliati** (facoltativo), **descrizione breve** (una frase per il viaggiatore), **immagine** (percorso locale e attribuzione).

Campi aggiunti al luogo: **costo indicativo** per i ristoranti, **opzioni alimentari** (vegetariano, senza glutine), **origine** (`riferimento` per i dati dell'ondata 1, `osm` con l'identificativo OpenStreetMap), **orari verificati** (sì se vengono dal tag `opening_hours`, no se sono orari predefiniti per tipo di luogo), **fonte della descrizione** e **attribuzione dell'immagine**.

Un luogo con orari non verificati genera nel controllo di fattibilità un **avviso** (mai un problema bloccante) "orari da verificare", mostrato al viaggiatore come "Ti consiglio di controllare gli orari prima di andare".

Categoria di attività aggiunta: `servizio` (§8.5). Tipi di luogo aggiunti: `spiaggia`, `punto_panoramico`, `parco`, `impianto` (funivie, seggiovie), `negozio`, `farmacia`, `ospedale`.

Valori per le 8 attività esistenti: `A-PONALE` impegnativa, tutte le altre facili; `A-LUNGOLAGO` e `A-PONALE` stili `natura`, `A-PONALE` anche `avventura`; `A-MAG`, `A-BUONCONSIGLIO`, `A-MUSE` stile `cultura`, `A-MUSE` anche `famiglia`; `A-CANTINA` stili `gastronomia` e `romantico`; i pranzi stile `gastronomia`. Costi: lungolago e Ponale `gratis`, musei e castello `€`, cantina `€€`, pranzi `€€`. Adatte ai bambini: tutte tranne `A-CANTINA`; accessibili: tutte tranne `A-PONALE`.

### 7.4 Imprevisti

Ai quattro tipi esistenti si aggiungono:

| Tipo | Dati | Giorni | Elementi colpiti |
|---|---|---|---|
| `VOLO_PERSO` | `id` dello spostamento in volo o treno; arrivo previsto con il nuovo mezzo (facoltativo) | uno o più | Lo spostamento perso; se l'arrivo previsto è indicato, gli elementi che iniziano prima dell'arrivo previsto. |
| `SALUTE` | data di inizio, numero di giorni (o fino alla fine del viaggio), intensità massima consentita, mobilità ridotta sì/no, descrizione | uno o più | Le attività in quei giorni con intensità superiore alla massima consentita o, con mobilità ridotta, non accessibili. |
| `SCIOPERO` | mezzo (`mezzi_pubblici` o `treno`), data, zona (facoltativa) | uno | Gli spostamenti con quel mezzo in quella data (e zona). |
| `BAGAGLIO_SMARRITO` | data, momento | uno | Nessun elemento colpito: serve tempo libero per gli acquisti essenziali (§9.11). |
| `DOCUMENTI_SMARRITI` | data, momento | uno | Come il bagaglio smarrito, con un tempo maggiore (§9.13). |
| `STANCHEZZA` | data | uno | Le attività di quel giorno non irrinunciabili e non a orario fisso. |

Le regole di `modello-dominio.md` §2.4 ("ogni imprevisto riguarda un solo giorno") valgono per tutti i tipi tranne `VOLO_PERSO` e `SALUTE`, che possono riguardare più giorni consecutivi.

### 7.5 Bozza e revisioni della bozza

- Ogni cambio alla bozza crea una **revisione della bozza** numerata (B1, B2, …) con la causa ("Bozza iniziale", "Sostituito il museo con il lungolago", …).
- Si può tornare a una revisione precedente (annulla) e confrontare due revisioni con lo stesso confronto di REQ-ITIN-002.
- Alla conferma, la revisione corrente diventa la **versione 1** dello storico di REQ-ITIN-002. Le revisioni della bozza restano consultabili.

### 7.6 Livelli di ripianificazione

Ogni proposta dichiara il suo livello, mostrato al viaggiatore in parole semplici:

1. **Minimo**: le regole di REQ-REPLAN-002 (cambiano solo gli elementi colpiti e gli spostamenti attorno).
2. **Giornata**: se il livello minimo non è fattibile, il viaggiatore può chiedere "Rigenera questa giornata". Il generatore di REQ-PLAN-001 ricostruisce solo quella giornata, mantenendo elementi a orario fisso, irrinunciabili e prenotazioni.
3. **Resto del viaggio**: solo su richiesta esplicita del viaggiatore.

### 7.7 Punteggio delle preferenze

Il **punteggio** di un'attività di catalogo rispetto a un profilo serve sia al generatore sia alla scelta dei sostituti:

- +3 per ogni stile in comune con il profilo;
- +5 se è tra gli irrinunciabili;
- esclusa se è tra le cose da evitare, se l'intensità supera la forma fisica, se il profilo chiede mobilità ridotta e non è accessibile, se ci sono bambini e non è adatta, se il costo supera la fascia di budget di più di un livello;
- −1 se il costo supera la fascia di budget di un livello.

A parità di punteggio vale l'ordine alfabetico dell'`id`. Senza profilo il punteggio non si applica: i risultati dell'ondata 1 non cambiano.

### 7.8 Istantanea del catalogo

- Un'**istantanea** è il catalogo completo di una destinazione (zone, luoghi, attività, tempi di percorrenza) in un unico JSON con: identificativo, destinazione, data di creazione, fonti usate e loro attribuzioni.
- Si crea alla prima richiesta di una destinazione (§9.5b) e si salva nel database. Le tre destinazioni precaricate sono anche file nel repository (`packages/sources/snapshots/`).
- Un'istantanea non cambia mai. Aggiornare una destinazione crea una nuova istantanea; i viaggi già creati restano sulla loro.
- Il motore riceve l'istantanea come un normale catalogo (`modello-dominio.md` §2.2 più §7.3) e i tempi di percorrenza come dati di contesto: non sa da dove vengono.

---

## 8. Contenuto di `dati-di-riferimento-estensioni.md` (fonte condivisa nuova)

> Dati inventati per la demo: nomi dei luoghi reali, orari e tempi no.

### 8.1 Destinazioni precaricate

Le prepara REQ-CAT-002 con la sorgente reale e le salva come istantanee nel repository: **Lago di Garda (Riva del Garda e dintorni)**, **Roma**, **Dolomiti – Val di Fassa**. Ogni istantanea, come ogni destinazione costruita al volo, deve rispettare i minimi:

- almeno 15 attività, almeno 2 per ciascuno dei 7 stili (se la destinazione non ne ha abbastanza per uno stile, lo dichiara);
- almeno 3 ristoranti adatti a pranzo e cena, di cui almeno uno con opzione vegetariana e, se esiste nei dati, uno senza glutine;
- almeno 2 alloggi di fascia diversa, una farmacia, un ospedale, la stazione o l'aeroporto di arrivo più vicini;
- tempi di percorrenza per tutte le coppie di luoghi che il generatore può usare.

Gli 8 elementi del catalogo dell'ondata 1 restano nel catalogo di riferimento, identici negli `id` e nei dati, con in più i campi della §7.3: servono ai test deterministici del motore e agli scenari S1–S14.

### 8.2 Profili di riferimento

| Profilo | Contenuto |
|---|---|
| **PR-1** Coppia sul Garda | Garda, 2026-06-12 → 2026-06-15 (4 giorni), 2 adulti, coppia, stili `natura`, `gastronomia`, `romantico`, ritmo `lento`, forma `moderato`, budget `€€`, orari `normale`, pranzo e cena sì. |
| **PR-2** Amici avventurosi | Dolomiti, agosto 2026, 5 giorni, 3 adulti, amici, stili `avventura`, `natura`, ritmo `intenso`, forma `impegnativo`, budget `€`, orari `mattiniero`. |
| **PR-3** Famiglia a Roma | Roma, ottobre 2026, 3 giorni, 2 adulti e 2 bambini (6 e 9 anni), famiglia, stili `cultura`, `famiglia`, ritmo `bilanciato`, forma `facile`, budget `€€`, pranzo sì, cena no. |
| **PR-4** Sorprendimi | "sorprendimi", maggio 2026, 3 giorni, 1 adulto, stili `relax`, `gastronomia`, ritmo `lento`, forma `facile`, budget `€€€`, da evitare `avventura`. |
| **PR-5** Destinazione nuova | Lisbona, maggio 2026, 4 giorni, 2 adulti, coppia, stili `cultura`, `gastronomia`, ritmo `bilanciato`, forma `moderato`, budget `€€`. Si usa nel collaudo per verificare la costruzione al volo di una destinazione non precaricata. |

### 8.3 Viaggi per la demo

Tutti costruiti sulle istantanee precaricate (§8.1), quindi con luoghi reali.

- **TRIP-DEMO-GARDA**: 4 giorni (2026-06-12 → 2026-06-15) generato da PR-1, con volo di andata (Roma Fiumicino → Verona, venerdì mattina, orario fisso, prenotazione di esempio) e volo di ritorno (Verona → Roma Fiumicino, lunedì sera, orario fisso, prenotazione di esempio), con un trekking impegnativo il sabato mattina (serve alla demo della pioggia e dell'infortunio), stato `confermato`.
- **TRIP-DEMO-DOLOMITI**: generato da PR-2, con treno di andata e ritorno (orario fisso, prenotazione), stato `confermato`.
- **TRIP-DEMO-ROMA**: generato da PR-3, stato `bozza`.

### 8.4 Scenari nuovi

| Scenario | Itinerario | Imprevisto o richiesta | Risultato atteso |
|---|---|---|---|
| **S9** Caviglia slogata | versione 1 dell'ondata 1 | `SALUTE` dal 2026-06-13 per 2 giorni, intensità massima `facile`, mobilità ridotta no | Colpito solo `D2-E2` (Ponale, impegnativa). Candidate come in S1 ma con il filtro di intensità al posto di "al coperto": `A-MAG` e `A-CANTINA`; vince `A-MAG` per minor tempo di spostamento. Le modifiche coincidono con P-S1; la spiegazione cita l'infortunio. Fattibile. |
| **S10** Volo perso | `V-VOLO` | `VOLO_PERSO` su `D3-E9`, nessun arrivo previsto | Itinerario invariato; `D3-E9` a rischio; alternative come S7. Fattibile. |
| **S11** Sciopero | variante `V-BUS` (aggiunge un tempo di 80 minuti in `mezzi_pubblici` tra `HOTEL` e `BUONCONSIGLIO`; `D3-E1` diventa mezzi pubblici 08:40–10:00) | `SCIOPERO` `mezzi_pubblici` il 2026-06-14 | Colpito solo `D3-E1`. R-CAN-1: l'altro mezzo per `HOTEL`–`BUONCONSIGLIO` è l'auto (50 minuti), stessa partenza: `D3-E1` diventa auto 08:40–09:30, mantiene l'id. Arriva prima, quindi nessun ritardo: `D3-E2`…`D3-E7` invariati. Fattibile. |
| **S12** Bagaglio smarrito | versione 1 | `BAGAGLIO_SMARRITO` il 2026-06-13 alle 08:00 | Regola R2-BAG di §9.13. Risultato esatto fissato nel contratto della storia ST-REPLAN-004 e approvato prima dell'implementazione. |
| **S13** Documenti rubati | versione 1 | `DOCUMENTI_SMARRITI` il 2026-06-14 alle 08:30 | Regola R2-DOC di §9.13. Risultato esatto fissato nel contratto della storia ST-REPLAN-004. |
| **S14** Stanchezza | versione 1 | `STANCHEZZA` il 2026-06-14 | Regola R2-STA di §9.13. Risultato esatto fissato nel contratto della storia ST-REPLAN-004. |
| **M7** Resto un giorno in più | versione 1 | prolunga di 1 giorno dopo il 2026-06-13 | Regola R2-PRO di §9.11. Risultato esatto fissato nel contratto della storia ST-EDIT-002. |
| **M8** Resto un giorno in più, con volo | `V-VOLO` | come M7 | Come M7, ma `D3-E8` e `D3-E9` sono a orario fisso: restano il 2026-06-14, sono a rischio, la proposta è non fattibile e propone le alternative (gestione della prenotazione e ricerca voli per il 2026-06-15). Orari esatti fissati nel contratto della storia ST-EDIT-002. |

Per gli scenari con risultato "fissato nel contratto": nella fase di analisi della storia l'agente applica le regole ai dati di riferimento, scrive il risultato esatto **nel contratto della storia** (non in questo file) e lo fa approvare prima di scrivere codice. Questo file è una fonte condivisa: modificarlo dopo l'approvazione renderebbe "non aggiornati" tutti i requisiti che lo usano.

### 8.5 Dati di riferimento aggiunti

Servono agli scenari S12 e S13. Stanno in un file di dati separato (`packages/engine/data/reference/estensioni/`), che si unisce al catalogo di riferimento solo nei test dell'ondata 2: così i dati esistenti non cambiano e i conteggi di REQ-FOUND-001 CA-7 restano validi.

| id | Nome | Zona | Tipo | Apertura | Coordinate |
|---|---|---|---|---|---|
| `NEGOZIO-RIVA` | Negozio di abbigliamento e articoli da viaggio | `GARDA_NORD` | negozio | tutti i giorni 09:00–19:30 | 45.8860, 10.8425 |
| `COMMISSARIATO-RIVA` | Commissariato di Riva del Garda | `GARDA_NORD` | altro | tutti i giorni 08:00–20:00 | 45.8870, 10.8440 |

| id | Nome | Luogo | Categoria | Aperto/coperto | Durata tipica | Intensità | Costo |
|---|---|---|---|---|---|---|---|
| `A-ACQUISTI` | Acquisti essenziali | `NEGOZIO-RIVA` | servizio | al coperto | 90 | facile | €€ |
| `A-DENUNCIA` | Denuncia e documenti provvisori | `COMMISSARIATO-RIVA` | servizio | al coperto | 180 | facile | gratis |

Tempi di percorrenza a piedi: `HOTEL`–`NEGOZIO-RIVA` 5, `HOTEL`–`COMMISSARIATO-RIVA` 10, `NEGOZIO-RIVA`–`RIST-RIVA` 5, `COMMISSARIATO-RIVA`–`RIST-RIVA` 10.

Le attività di categoria `servizio` non sono mai candidate come sostituti (R-SOS-2) e non sono mai scelte dal generatore: le aggiungono solo le regole R2-BAG e R2-DOC.

---

## 9. I requisiti della CR

### 9.0 Mappa

| ID | Tipo | Titolo | Modifica (CR su) |
|---|---|---|---|
| REQ-UX-001 | nuovo | Design system e guscio dell'app | — |
| REQ-WEB-003 | CR | Consultazione con il nuovo design | REQ-WEB-001 |
| REQ-WEB-004 | CR | Proposte, versioni e modalità presentazione con il nuovo design | REQ-WEB-002 |
| REQ-DATA-001 | nuovo | Base dati | — (era in ondata 2) |
| REQ-CAT-001 | nuovo | Catalogo esteso: modello e regole di classificazione | — |
| REQ-CAT-002 | nuovo | Destinazioni reali e istantanee | — |
| REQ-PREF-001 | nuovo | Preferenze del viaggio | — |
| REQ-PLAN-001 | nuovo | Prima bozza dell'itinerario | — (era in ondata 2) |
| REQ-ORCH-001 | nuovo | Agenti e orchestratore | — (era in ondata 2) |
| REQ-CHAT-001 | nuovo | Chat | — (era in ondata 2) |
| REQ-PLAN-002 | nuovo | Revisione e conferma della bozza | — |
| REQ-EDIT-002 | CR | Modifiche richieste, ampliate | REQ-EDIT-001 |
| REQ-REPLAN-003 | CR | Impatto dei nuovi imprevisti | REQ-REPLAN-001 |
| REQ-REPLAN-004 | CR | Ripianificazione dei nuovi imprevisti, con preferenze | REQ-REPLAN-002 |
| REQ-IMPR-001 | nuovo | Imprevisto raccontato o scelto | — (era in ondata 2) |
| REQ-TODAY-001 | nuovo | Vista "Oggi" | — (era in ondata 2) |
| REQ-DEMO-001 | nuovo | Copione e dati della demo | — |

Per tutti: tetto di autonomia `checkpointed`; vincoli comuni = regole comuni del motore (`modello-dominio.md` §3) per il motore, e per la web app "nessuna logica del motore duplicata nella web app"; percorsi sempre comprendenti `docs` ed `evidence`.

### 9.1 REQ-UX-001 — Design system e guscio dell'app

**Obiettivo.** Dare a TravelOps l'aspetto e la sensazione di un prodotto: identità visiva, componenti riusabili e struttura delle pagine della §6.

**Funzionalità.**
- Token di colore, tipografia, spaziatura, raggi, ombre, movimento, in tema chiaro e scuro (§6.1).
- Libreria di componenti della §6.2 in `apps/web/src/ui`, con una pagina interna `/stile` che li mostra tutti (non collegata dal menu).
- Guscio dell'app: intestazione con logo TravelOps e "I miei viaggi", layout desktop e telefono della §6.3, selettore del tema.
- **Home**: titolo accogliente, pulsante principale "Pianifica un viaggio", schede dei viaggi esistenti con immagine, date, stato (Bozza, Confermato, In corso, Concluso), stato vuoto illustrato.
- Traduzione in linguaggio semplice di tutti i codici del motore (problemi, tipi di imprevisto, tipi di alternativa) in un unico modulo di testi.

**Criteri di accettazione.**
- **CA-1** Tutti i colori dell'app vengono dai token; nessun colore scritto direttamente nei componenti.
- **CA-2** Contrasto del testo almeno 4.5:1 in tema chiaro e scuro, verificato da un test automatico sui token.
- **CA-3** La pagina `/stile` mostra tutti i componenti della §6.2 in tema chiaro e scuro.
- **CA-4** A 375 px di larghezza nessuna pagina scorre in orizzontale; a 1280 px la home mostra le schede in griglia.
- **CA-5** Ogni componente interattivo si usa da tastiera con focus visibile; un controllo automatico di accessibilità (axe) non trova violazioni gravi nella home e in `/stile`.
- **CA-6** Nessun codice tecnico del motore (`id` degli elementi, codici dei problemi) compare nel testo visibile: un test cerca i pattern `D\d-E\d`, `N\d+` e i codici dei problemi nel DOM delle pagine principali.
- **CA-7** Con `prefers-reduced-motion` le animazioni sono disattivate.

**Campi per il plugin.** Sintesi: design system con token chiari e scuri, componenti accessibili, guscio dell'app, home e testi in linguaggio semplice. Fuori perimetro: preferenze, chat, generazione; lingue diverse dall'italiano. Percorsi: `apps/web`, `package.json`, `package-lock.json`, `docs`, `evidence`.

### 9.2 REQ-WEB-003 — Consultazione con il nuovo design

**Cambia rispetto a REQ-WEB-001.** Le stesse funzioni (scelta del viaggio, vista viaggio, vista giorno, mappa, dettaglio) rifatte con i componenti di REQ-UX-001:
- vista giorno come **linea del tempo** con schede attività (immagine, nome, orario, durata, stile colorato, costo, icona all'aperto o al coperto) e spostamenti come connettori sottili con icona del mezzo e durata;
- mappa con indicatori numerati colorati per stile e linee del colore del giorno; al passaggio o tocco su una scheda si evidenzia il punto sulla mappa e viceversa;
- dettaglio in pannello laterale (desktop) o dal basso (telefono), con descrizione, orari di apertura in linguaggio naturale, prenotazione con pulsante "Gestisci prenotazione".

**Criteri.** I criteri di REQ-WEB-001 restano validi con il nuovo aspetto; in più: **CA-R2-1** scheda attività e punto sulla mappa si evidenziano a vicenda; **CA-R2-2** nessun codice tecnico a vista (come UX-001 CA-6); **CA-R2-3** layout telefono e desktop come §6.3.

**Campi per il plugin.** Percorsi: `apps/web`, `docs`, `evidence`. Dipende da REQ-UX-001.

### 9.3 REQ-WEB-004 — Proposte, versioni e modalità presentazione

**Cambia rispetto a REQ-WEB-002.**
- La **vista proposta** diventa una scheda chiara: titolo in parole semplici ("Pioggia sabato mattina: ti propongo il MAG al posto del trekking"), livello di ripianificazione (§7.6), modifiche "prima → dopo" evidenziate nella linea del tempo (rimossi barrati in rosso, aggiunti in verde, spostati in giallo), elementi a rischio con un avviso chiaro, alternative come pulsanti, **Accetta** e **Rifiuta** ben visibili.
- **Versioni** come cronologia con data, causa in parole semplici e "Confronta".
- La **pagina Demo** diventa **Modalità presentazione**, raggiungibile da un'icona discreta nell'intestazione: orologio simulato, "Ripristina i viaggi demo", elenco degli scenari con descrizione in parole semplici. Il nome del viaggiatore predefinito resta modificabile.
- Lo stato si salva nel database (REQ-DATA-001) invece che nel file JSON.

**Criteri.** CA-1…CA-9 di REQ-WEB-002 restano validi (CA-8 riferito al database); in più: **CA-R2-1** ogni proposta mostra il livello di ripianificazione; **CA-R2-2** Accetta e Rifiuta sono raggiungibili senza scorrere su telefono (barra fissa in basso); **CA-R2-3** nessun codice tecnico a vista.

**Campi per il plugin.** Dipende da REQ-UX-001, REQ-WEB-003, REQ-DATA-001. Percorsi: `apps/web`, `docs`, `evidence`.

### 9.4 REQ-DATA-001 — Base dati

**Obiettivo.** Salvare viaggi, profili, revisioni della bozza, storici, proposte, conversazioni della chat e impostazioni della modalità presentazione in SQLite.

**Regole.** File in `apps/web/.data/travelops.db` (escluso da Git); migrazioni numerate e ripetibili; uno strato di accesso unico (nessuna query sparsa nelle pagine); il primo avvio crea il database e carica i viaggi demo (§8.3); "Ripristina i viaggi demo" li ricarica senza toccare gli altri viaggi.

**Criteri.** **CA-1** Primo avvio su clone pulito crea il database con i viaggi demo. **CA-2** Lo stato sopravvive al riavvio. **CA-3** Un viaggio esportato e reimportato è identico (stesso JSON del motore). **CA-4** Le migrazioni applicate due volte non cambiano nulla. **CA-5** Il file JSON locale di REQ-WEB-002 viene importato una volta, se presente, poi non è più usato.

**Campi per il plugin.** Fuori perimetro: più utenti, server di database, sincronizzazione. Percorsi: `apps/web`, `package.json`, `package-lock.json`, `.gitignore`, `docs`, `evidence`. Dipende da REQ-ITIN-002.

### 9.5 REQ-CAT-001 — Catalogo esteso: modello e regole di classificazione

**Obiettivo.** Estendere il catalogo del motore con i campi della §7.3 e definire le regole deterministiche che trasformano un luogo reale in un'attività di catalogo. Tutto dentro il motore, senza rete.

**Funzionalità.**
- Tipi del motore estesi (§7.3, §7.8), compatibili con l'ondata 1; validazione dei campi nuovi in REQ-ITIN-001 (stili, intensità, costo validi).
- Avviso "orari da verificare" nel controllo di fattibilità per i luoghi con orari non verificati (§7.3).
- **Tabella di classificazione** (dati, non codice sparso) da tag OpenStreetMap a: tipo di luogo, categoria, stili, all'aperto o al coperto, intensità, durata tipica, costo. Esempi minimi: `tourism=museum` → cultura, al coperto, facile, 120 min, €; `tourism=viewpoint` → natura e romantico, all'aperto, facile, 30 min, gratis; `leisure=park` → natura, relax e famiglia, all'aperto, facile, 60 min, gratis; `natural=beach` → relax e famiglia, all'aperto, facile, 120 min, gratis; percorsi escursionistici → natura e avventura, all'aperto, intensità secondo lunghezza e dislivello, durata secondo lunghezza; `craft=winery` o `shop=wine` → gastronomia e romantico, al coperto, facile, 90 min, €€; `amenity=restaurant` → pasto, costo da `price` se presente; `aerialway` → avventura e natura, `impianto`.
- **Orari predefiniti** per tipo di luogo quando manca `opening_hours` (per esempio musei mar–dom 10:00–18:00, ristoranti 12:00–14:30 e 19:00–22:30, luoghi all'aperto sempre aperti), sempre marcati come non verificati.
- Lettura del formato `opening_hours` di OpenStreetMap nelle fasce di apertura del motore (una libreria esistente è ammessa).
- Valori della §7.3 sulle 8 attività dell'ondata 1, nei dati di riferimento JSON.

**Criteri.** **CA-1** I test dell'ondata 1 passano invariati. **CA-2** Ogni riga della tabella di classificazione ha un test. **CA-3** Gli orari OSM di almeno 10 esempi reali registrati (fasce multiple, giorni chiusi, `24/7`) si convertono correttamente; un orario non leggibile diventa un orario predefinito non verificato, mai un errore. **CA-4** Un luogo con orari non verificati genera solo un avviso. **CA-5** I valori della §7.3 sulle 8 attività esistenti sono quelli indicati.

**Campi per il plugin.** Fuori perimetro: chiamate di rete; scelta delle destinazioni. Percorsi: `packages/engine/src/model`, `packages/engine/src/itinerary`, `packages/engine/src/catalog`, `packages/engine/src/feasibility`, `packages/engine/data`, `packages/engine/test`, `packages/engine/package.json`, `package-lock.json`, `docs`, `evidence`. Dipende da REQ-ITIN-001, REQ-FEAS-001.

### 9.5b REQ-CAT-002 — Destinazioni reali e istantanee

**Obiettivo.** Costruire il catalogo di qualsiasi destinazione reale dalle fonti della §5.3 e salvarlo come istantanea (§7.8).

**Funzionalità.**
- Pacchetto `packages/sources` (fuori dal motore) con un'interfaccia unica "sorgente di destinazioni" e due realizzazioni: **reale** (fonti della §5.3) e **registrata** (legge istantanee e risposte salvate: per i test e per lavorare senza rete).
- **Ricerca della destinazione** con suggerimenti mentre si scrive (Nominatim, con attesa di almeno 300 ms tra una battuta e la ricerca e massimo 1 richiesta al secondo).
- **Costruzione della destinazione:** area dalla ricerca → luoghi con Overpass entro circa 60 minuti dal centro → classificazione con le regole di REQ-CAT-001 → selezione delle migliori attività per stile (prima quelle con pagina Wikipedia o Wikidata, poi con orari verificati, poi più vicine al centro) fino a un massimo di 120 attività → descrizioni da Wikipedia o Wikivoyage (in italiano, altrimenti in inglese) → immagini da Wikimedia Commons con licenza → tempi di percorrenza con OSRM (a piedi e in auto) tra le coppie utili; per i mezzi pubblici una **stima** dichiarata (tempo in auto × 1,5 + 10 minuti) marcata come stima → controllo dei minimi della §8.1 → istantanea.
- Avanzamento mostrato al viaggiatore ("Cerco i luoghi… Scelgo i ristoranti… Calcolo i percorsi…"); obiettivo meno di 60 secondi; dopo la prima volta la destinazione è immediata.
- Se la destinazione non raggiunge i minimi: messaggio gentile e proposta di 2–3 destinazioni vicine più grandi.
- **Sorprendimi:** un elenco configurabile di 20 destinazioni candidate (in `packages/sources/candidates.json`, con stili prevalenti e mesi consigliati) ordinate col punteggio del profilo; si propongono le prime 3 al viaggiatore, che ne sceglie una.
- L'AI può solo riscrivere la descrizione breve di un luogo in italiano a partire dal testo della fonte; non aggiunge luoghi e non cambia orari, coordinate o classificazione.
- Le 3 istantanee precaricate (§8.1) nel repository; il primo avvio le carica nel database.
- Attribuzioni: "© OpenStreetMap contributors" sulla mappa e nei dettagli; autore e licenza di ogni immagine; fonte di ogni descrizione.

**Criteri.** **CA-1** Con la sorgente registrata, la costruzione di Garda, Roma e Dolomiti dà esattamente le istantanee nel repository (test deterministico, senza rete). **CA-2** Ogni istantanea rispetta i minimi della §8.1. **CA-3** Il generatore di REQ-PLAN-001 produce bozze senza problemi bloccanti su tutte e 3 le istantanee con i profili PR-1…PR-3. **CA-4** Il limite di 1 richiesta al secondo verso Nominatim è rispettato (test con orologio finto). **CA-5** Una destinazione con pochi luoghi dà il messaggio gentile con le alternative. **CA-6** Ogni luogo dell'istantanea ha origine `osm` e un identificativo OpenStreetMap; ogni immagine ha licenza e autore. **CA-7** Nessuna chiamata di rete nei test automatici. **CA-8** Con rete, la costruzione di Lisbona (PR-5) termina in meno di 60 secondi e rispetta i minimi (prova manuale nel collaudo, UAT-08b).

**Campi per il plugin.** Integrazioni: Nominatim, Overpass API, Wikipedia e Wikivoyage, Wikimedia Commons, OSRM. Fuori perimetro: prezzi reali, disponibilità e prenotazione; mezzi pubblici con orari reali; più destinazioni in un viaggio. Percorsi: `packages/sources`, `apps/web`, `package.json`, `package-lock.json`, `.gitignore`, `docs`, `evidence`. Dipende da REQ-CAT-001, REQ-DATA-001.

### 9.6 REQ-PREF-001 — Preferenze del viaggio

**Obiettivo.** Raccogliere il profilo della §7.2 in modo semplice e piacevole, con pulsanti e filtri.

**Funzionalità.**
- **Filtri e chat sullo stesso schermo** (D-2): percorso guidato a sinistra o al centro, chat accanto (su telefono: un pulsante "Preferisci scrivere?" apre la chat a tutto schermo e torna al percorso con le risposte già compilate). Entrambi scrivono nello stesso profilo, e il passo del percorso già compilato dalla chat si segna come fatto.
- Percorso guidato in **5 passi** con barra di avanzamento: (1) Dove: campo di ricerca con suggerimenti per qualsiasi destinazione reale (REQ-CAT-002), le 3 destinazioni precaricate come schede con immagine, e "Sorprendimi"; (2) Quando e quanto: date precise o mese + durata con slider 2–14 giorni; (3) Chi: contatori adulti e bambini (età), tipo di gruppo; (4) Che viaggio: chip degli stili con icona e colore, ritmo, forma fisica, budget; (5) Dettagli facoltativi: orari, pasti, mezzi, irrinunciabili, da evitare, esigenze. Pulsante "Salta" sui passi facoltativi.
- **Riepilogo vivo** delle preferenze a lato (desktop) o in alto comprimibile (telefono), modificabile con un tocco.
- Le stesse preferenze si possono raccogliere dalla chat (REQ-CHAT-001): il riepilogo si aggiorna mentre si parla.
- Pulsante finale "Crea la mia bozza".
- Nel motore: tipo del profilo, validazione (campi obbligatori, valori ammessi), punteggio della §7.7.

**Criteri.** **CA-1** Si arriva a "Crea la mia bozza" con al massimo 5 schermate e i soli campi obbligatori. **CA-2** Un profilo incompleto mostra cosa manca, in parole semplici. **CA-3** Ognuno dei profili PR-1…PR-5 si inserisce dal percorso guidato e il profilo salvato coincide. **CA-4** Il punteggio della §7.7 è coperto da test, comprese le esclusioni. **CA-5** Il percorso funziona da tastiera e su telefono. **CA-6** Iniziando dai filtri e finendo in chat (e viceversa) si ottiene lo stesso profilo (verificato nel collaudo e, per lo stato del profilo, da test). **CA-7** "Sorprendimi" propone 3 destinazioni tra cui scegliere.

**Campi per il plugin.** Fuori perimetro: account e profili salvati tra viaggi diversi. Percorsi: `packages/engine/src/model`, `packages/engine/src/preferences`, `packages/engine/test`, `apps/web`, `docs`, `evidence`. Dipende da REQ-CAT-001, REQ-CAT-002, REQ-UX-001. La parte chat del percorso arriva con REQ-CHAT-001: fino ad allora il posto della chat mostra "In arrivo".

### 9.7 REQ-PLAN-001 — Prima bozza dell'itinerario

**Obiettivo.** Dal profilo, il motore genera una bozza completa, fattibile e ripetibile.

**Regole del generatore.**
- **R-1** *Destinazione e catalogo:* il generatore riceve il profilo e l'istantanea della destinazione già scelta (REQ-CAT-002, anche per "sorprendimi"). Non chiama la rete.
- **R-2** *Alloggio:* quello della destinazione con la fascia più vicina al budget.
- **R-3** *Giorni:* il primo e l'ultimo giorno hanno metà delle attività (arrotondata per eccesso) se ci sono spostamenti di arrivo e partenza; gli altri hanno il numero del ritmo.
- **R-4** *Scelta:* attività in ordine di punteggio, ognuna usata una sola volta per viaggio; prima gli irrinunciabili; almeno uno stile del profilo rappresentato ogni giorno; nello stesso giorno non più di un'attività `impegnativa`.
- **R-5** *Collocazione:* nella finestra degli orari del profilo, nell'ordine che minimizza gli spostamenti, rispettando gli orari di apertura; pranzo tra le 12:00 e le 14:30 e cena tra le 19:00 e le 21:30 se richiesti, nel ristorante più vicino compatibile con le esigenze alimentari.
- **R-6** *Verifica:* la bozza passa dal controllo di REQ-FEAS-001; se ha problemi bloccanti, il generatore toglie l'attività col punteggio più basso tra quelle coinvolte e riprova (al massimo 3 volte); se restano problemi, la bozza è comunque restituita con i problemi e la spiegazione.
- **R-7** *Spiegazione:* per ogni giorno una frase "perché te lo propongo" costruita dai dati (stili in comune, irrinunciabili); l'agente (REQ-ORCH-001) può riscriverla in modo più naturale senza cambiare i fatti.
- **R-8** *Determinismo:* stesso profilo e catalogo → stessa bozza.
- **R-9** *Alternativa:* "Mostrami un'alternativa" genera una bozza escludendo le attività già scelte nella bozza corrente quando esistono sostituti con punteggio positivo.

**Criteri.** **CA-1** Per PR-1…PR-3 sulle istantanee precaricate, e per PR-4 sull'istantanea della prima destinazione proposta, la bozza non ha problemi bloccanti. **CA-2** Contiene tutti gli irrinunciabili e nessuna attività da evitare. **CA-3** Il numero di attività per giorno rispetta il ritmo (R-3). **CA-4** Nessuna attività supera la forma fisica; con bambini solo attività adatte. **CA-5** Stesso input → stessa bozza (test ripetuto). **CA-6** La bozza di PR-1 è salvata come istantanea di riferimento nei test. **CA-7** La generazione richiede meno di 2 secondi per un viaggio di 14 giorni.

**Campi per il plugin.** Fuori perimetro: più destinazioni nello stesso viaggio; prenotazioni; chiamate di rete. Percorsi: `packages/engine/src/planning`, `packages/engine/src/model`, `packages/engine/src/index.ts`, `packages/engine/test/planning`, `docs`, `evidence`. Dipende da REQ-CAT-001, REQ-CAT-002 (per le istantanee usate nei test), REQ-PREF-001, REQ-FEAS-001.

### 9.8 REQ-ORCH-001 — Agenti e orchestratore

**Obiettivo.** Un orchestratore Claude interpreta i messaggi e li affida ad agenti specializzati che usano il motore come strumento.

**Funzionalità.**
- Pacchetto `packages/agents` con: **Orchestratore** (capisce l'intento, sceglie l'agente), **Consulente** (raccoglie le preferenze facendo al massimo 2 domande per messaggio), **Planner** (genera e rifinisce la bozza con REQ-PLAN-001 e REQ-PLAN-002), **Gestione imprevisti** (traduce il racconto in imprevisto strutturato e chiede la ripianificazione).
- Strumenti esposti agli agenti: cerca destinazione, prepara destinazione (REQ-CAT-002), proponi destinazioni per "sorprendimi", aggiorna profilo, genera bozza, alternativa, modifiche della bozza, conferma, proponi modifica, proponi ripianificazione, rigenera giornata, cerca nel catalogo, leggi viaggio e versioni. Gli agenti non hanno altri modi di cambiare un viaggio.
- Istruzioni di sistema in italiano: tono amichevole, frasi brevi, nessun codice tecnico, mai nominare luoghi che non vengono dall'istantanea della destinazione, mai dire di aver prenotato o cancellato qualcosa, prima di applicare un'azione importante riassumerla.
- Chiave `ANTHROPIC_API_KEY` e modello `TRAVELOPS_MODEL` (predefinito `claude-sonnet-5-5`) letti solo lato server.
- Senza chiave o con errore dell'API: messaggio gentile ("La chat non è disponibile in questo momento: puoi continuare con i pulsanti") e nessun blocco del resto.

**Criteri.** **CA-1** Con un client finto, i prompt della §10 producono le chiamate agli strumenti attese (test con conversazioni registrate). **CA-2** Nessuna risposta dell'agente contiene un itinerario che non viene dal motore (test: il testo cita solo attività presenti nel viaggio o nell'istantanea della destinazione). **CA-3** Senza chiave l'app si avvia e la chat mostra il messaggio previsto. **CA-4** Nessuna chiave nel codice o nei log. **CA-5** Nessuna chiamata di rete nei test.

**Campi per il plugin.** Integrazioni: API Anthropic. Fuori perimetro: altri fornitori di modelli; memoria tra viaggi diversi. Percorsi: `packages/agents`, `apps/web`, `package.json`, `package-lock.json`, `.gitignore`, `docs`, `evidence`. Dipende da REQ-PLAN-001, REQ-CAT-002, REQ-EDIT-001, REQ-REPLAN-002.

### 9.9 REQ-CHAT-001 — Chat

**Funzionalità.**
- Pannello chat (§6.3) con bolle, risposte in streaming, indicatore "sta scrivendo", **risposte rapide** a chip sotto le domande ("Coppia", "Famiglia", "Sorprendimi"…), messaggio di benvenuto con 3 suggerimenti cliccabili.
- **Schede ricche** nella conversazione: riepilogo preferenze, bozza (miniatura dei giorni con "Apri"), proposta con prima → dopo e pulsanti Accetta/Rifiuta, conferma dell'azione fatta con "Annulla".
- Ogni azione dalla chat si riflette subito nell'itinerario a lato, con evidenziazione delle parti cambiate.
- Conversazione salvata per viaggio (REQ-DATA-001).

**Criteri.** **CA-1** Dal messaggio di PR-1 scritto in linguaggio naturale (§10, prompt 1) si arriva a una bozza senza usare il percorso guidato. **CA-2** Una proposta accettata dalla chat crea la stessa versione che si crea dal pulsante. **CA-3** Le risposte rapide inviano il testo del chip. **CA-4** Su telefono la chat è a tutto schermo e la tastiera non copre il campo di testo. **CA-5** Tutti gli stati (vuoto, caricamento, errore, AI non disponibile) sono gestiti.

**Campi per il plugin.** Percorsi: `apps/web`, `docs`, `evidence`. Dipende da REQ-ORCH-001, REQ-UX-001, REQ-DATA-001.

### 9.10 REQ-PLAN-002 — Revisione e conferma della bozza

**Operazioni sulla bozza** (dalla scheda dell'attività, dal giorno o dalla chat):
- **Sostituisci**: mostra le 3 migliori alternative per punteggio collocabili nello stesso spazio; il viaggiatore ne sceglie una.
- **Rimuovi**, **Sposta** (anche trascinando la scheda su un altro orario o giorno), **Aggiungi** (dalle attività suggerite della destinazione).
- **Blocca** (lucchetto): l'attività diventa irrinunciabile e non viene toccata dalle rigenerazioni.
- **Giornata più leggera / più piena**: toglie l'attività col punteggio più basso non bloccata, o aggiunge la migliore collocabile.
- **Rigenera questo giorno**: rigenera solo quel giorno con REQ-PLAN-001, mantenendo le attività bloccate.
- **Scambia due giorni**.
- **Cambia preferenze**: aggiorna il profilo e rigenera tutto mantenendo le attività bloccate.
- **Mostrami un'alternativa** (R-9 di REQ-PLAN-001).
- **Annulla / torna alla revisione Bn / confronta**.
- **Conferma l'itinerario**: stato `confermato`, nasce la versione 1 dello storico, festa visiva leggera (coriandoli disattivabili), messaggio "Buon viaggio!".

**Regole.** Ogni operazione crea una revisione della bozza (§7.5) con causa in parole semplici; passa dal controllo di fattibilità; se il risultato ha problemi bloccanti l'operazione è applicata ma i problemi sono segnalati sulla scheda con un'azione suggerita ("Sposta la cena alle 20:00"). Nessun limite al numero di revisioni.

**Criteri.** **CA-1** Ogni operazione è disponibile sia da pulsante sia da chat. **CA-2** Annulla riporta esattamente alla revisione precedente. **CA-3** Le attività bloccate sopravvivono a "rigenera giorno" e "cambia preferenze". **CA-4** Dopo la conferma, la versione 1 coincide con l'ultima revisione della bozza. **CA-5** Dopo la conferma le modifiche diventano proposte (REQ-EDIT-002), non più modifiche dirette. **CA-6** Almeno 10 revisioni consecutive senza degrado (test).

**Campi per il plugin.** Percorsi: `packages/engine/src/planning`, `packages/engine/src/editing`, `packages/engine/test`, `apps/web`, `docs`, `evidence`. Dipende da REQ-PLAN-001, REQ-CHAT-001, REQ-EDIT-002, REQ-DATA-001.

### 9.11 REQ-EDIT-002 — Modifiche richieste, ampliate

**Aggiunge a REQ-EDIT-001** (le operazioni e i risultati M1–M6 restano identici):
- **R2-PRO Prolunga il soggiorno** di N giorni dopo una data: si inseriscono N giorni liberi (generabili con "Riempi questo giorno" tramite REQ-PLAN-001) dopo quella data; i giorni successivi slittano di N giorni con gli stessi elementi; la data di fine del viaggio cresce di N. Gli elementi a orario fisso nei giorni slittati restano nella loro data e ora originale, sono a rischio, la proposta è non fattibile e propone le alternative (gestione prenotazione, ricerca voli o treni per la nuova data). Scenari M7 e M8.
- **R2-ACC Accorcia il viaggio** di N giorni: si tolgono gli ultimi N giorni tranne gli elementi a orario fisso, che restano a rischio con le alternative.
- **R2-RIT Cambia ritmo di un giorno** (più leggero / più pieno), con le regole di PLAN-002 come proposta.
- **R2-RIG Rigenera un giorno** come proposta (livello "giornata" della §7.6).
- Tutte le modifiche dopo la conferma sono proposte da accettare o rifiutare.

**Criteri.** CA-1…CA-11 di REQ-EDIT-001 invariati; **CA-R2-1** M7 e M8 come in `dati-di-riferimento-estensioni.md`; **CA-R2-2** accorcia di 1 giorno su `V-VOLO` lascia `D3-E8`, `D3-E9` a rischio con alternative; **CA-R2-3** ogni nuova operazione ha spiegazione in parole semplici.

**Campi per il plugin.** Percorsi: come REQ-EDIT-001 più `packages/engine/src/planning`. Dipende da REQ-EDIT-001, REQ-PLAN-001.

### 9.12 REQ-REPLAN-003 — Impatto dei nuovi imprevisti

**Aggiunge a REQ-REPLAN-001** il calcolo dell'impatto per i tipi della §7.4, compresi gli imprevisti su più giorni (`VOLO_PERSO`, `SALUTE`).

**Criteri.** I criteri di REQ-REPLAN-001 invariati; **CA-R2-1** l'impatto di S9…S14 coincide con quello scritto in `dati-di-riferimento-estensioni.md`; **CA-R2-2** un `SALUTE` di 3 giorni colpisce solo le attività non compatibili in quei 3 giorni.

**Campi per il plugin.** Percorsi: `packages/engine/src/replanning`, `packages/engine/src/model`, `packages/engine/test/replanning`, `docs`, `evidence`. Dipende da REQ-REPLAN-001, REQ-CAT-001.

### 9.13 REQ-REPLAN-004 — Ripianificazione dei nuovi imprevisti, con preferenze

**Aggiunge a REQ-REPLAN-002:**
- **R2-PREF** Se il viaggio ha un profilo, nella scelta dei sostituti (R-SOS-4) il punteggio della §7.7 viene prima della categoria; le attività escluse dal profilo non sono candidate. Senza profilo i risultati S1–S8 sono identici.
- **R2-SAL** `SALUTE`: le attività colpite si sostituiscono con R-SOS (filtro intensità e accessibilità al posto di "al coperto"); con "riposo" (intensità massima nessuna) il giorno resta solo con pasti, elementi a orario fisso e irrinunciabili (questi ultimi a rischio). Alternative: link "Farmacie vicine" e "Pronto soccorso vicino" (ricerca Google Maps con il nome della zona), costruiti senza aprirli.
- **R2-VOL** `VOLO_PERSO`: come R-CAN-2 con le alternative di R-ALT; se è indicato un arrivo previsto, gli elementi prima dell'arrivo si trattano come un ritardo che inizia all'orario originale dello spostamento (R-RIT-2…R-RIT-4), anche sul giorno successivo.
- **R2-SCI** `SCIOPERO`: R-CAN-1 su ogni spostamento colpito, in ordine di inizio.
- **R2-BAG** `BAGAGLIO_SMARRITO`: serve una finestra libera di 90 minuti entro le 13:00 del giorno vicino all'alloggio; se non c'è, si rimuove l'attività `opzionale`, poi `desiderata`, col punteggio più basso che la libera (R-RIT-3 per le parità); si aggiunge l'attività "Acquisti essenziali" nel `negozio` più vicino. Alternativa: link alla gestione della prenotazione del volo di arrivo, se c'è.
- **R2-DOC** `DOCUMENTI_SMARRITI`: come R2-BAG con 180 minuti e l'attività "Denuncia e documenti provvisori"; alternativa: link "Polizia di Stato — denuncia" (`https://www.poliziadistato.it`). Gli elementi a orario fisso dei giorni successivi sono a rischio con la spiegazione "serve un documento valido".
- **R2-STA** `STANCHEZZA`: si rimuovono le attività colpite fino a lasciare il numero del ritmo `lento`, partendo dalle `opzionali` e dall'intensità più alta; pasti, irrinunciabili e orari fissi restano.
- **R2-LIV** Ogni proposta dichiara il livello (§7.6); quando il livello minimo è non fattibile, la spiegazione offre "Rigenera questa giornata".

**Criteri.** CA-1…CA-14 di REQ-REPLAN-002 invariati senza profilo; **CA-R2-1…CA-R2-6** S9…S14 come in `dati-di-riferimento-estensioni.md`; **CA-R2-7** con il profilo PR-1 su TRIP-DEMO-GARDA, lo scenario pioggia sceglie un sostituto con stile `gastronomia` o `romantico` se collocabile; **CA-R2-8** `npm run demo` mostra anche S9–S14.

**Campi per il plugin.** Percorsi: come REQ-REPLAN-002 più `packages/engine/src/planning`. Dipende da REQ-REPLAN-002, REQ-REPLAN-003, REQ-PREF-001, REQ-PLAN-001.

### 9.14 REQ-IMPR-001 — Imprevisto raccontato o scelto

**Funzionalità.**
- Pulsante **Ho un imprevisto** sempre visibile in un viaggio confermato: griglia di schede con icona: Volo cancellato, Ho perso il volo o il treno, Sono in ritardo, Maltempo, Posto chiuso, Sciopero, Non sto bene / mi sono fatto male, Bagaglio smarrito, Documenti persi o rubati, Sono stanco, Voglio restare di più, Voglio tornare prima. Ogni scheda apre un breve modulo con i soli dati necessari, già precompilati con oggi e l'elemento in corso.
- In chat: il racconto ("si è bucata una gomma, ci vorranno due ore") diventa l'imprevisto strutturato; l'agente fa al massimo 2 domande per i dati mancanti e chiede conferma con una frase ("Ho capito: ritardo di 2 ore da adesso. Procedo?").
- Poi la proposta (REQ-WEB-004) in chat e nella vista.

**Criteri.** **CA-1** Ogni prompt di imprevisto della §10 produce, con il client finto, l'imprevisto strutturato atteso. **CA-2** Ogni tipo della §7.4 ha la sua scheda e il suo modulo. **CA-3** Nessuna proposta parte senza conferma del viaggiatore. **CA-4** Racconti ambigui portano a una domanda, non a un'ipotesi silenziosa.

**Campi per il plugin.** Percorsi: `packages/agents`, `apps/web`, `docs`, `evidence`. Dipende da REQ-ORCH-001, REQ-CHAT-001, REQ-REPLAN-004, REQ-EDIT-002.

### 9.15 REQ-TODAY-001 — Vista "Oggi"

**Funzionalità.** Per un viaggio `in_corso` (orologio reale o simulato): scheda "Adesso" con l'attività in corso e il tempo rimanente, scheda "Dopo" con la prossima e quando partire, mappa del giorno con la posizione prevista, pulsanti rapidi "Sono in ritardo di 15 / 30 / 60 minuti" (imprevisto `RITARDO`), "Ho un imprevisto", "Oggi sono stanco". Fuori dal viaggio: conto alla rovescia alla partenza o riepilogo del viaggio concluso.

**Criteri.** **CA-1** Con l'orologio simulato al 2026-06-13 10:30 su TRIP-DEMO-GARDA "Adesso" e "Dopo" sono corretti. **CA-2** "Sono in ritardo di 30 minuti" produce la stessa proposta di un `RITARDO` di 30 minuti in quel momento. **CA-3** Su telefono "Oggi" è la scheda iniziale di un viaggio in corso.

**Campi per il plugin.** Percorsi: `apps/web`, `docs`, `evidence`. Dipende da REQ-UX-001, REQ-DATA-001, REQ-REPLAN-004.

### 9.16 REQ-DEMO-001 — Copione e dati della demo

**Funzionalità.** Istantanee precaricate e viaggi demo della §8.3 caricati al primo avvio e con "Ripristina"; la demo funziona anche senza rete, tranne la costruzione di destinazioni nuove; `docs/demo/copione-demo.md` con il copione della §10 aggiornato ai dati reali del catalogo; modalità presentazione che elenca anche i prompt del copione con "Copia" accanto; README con l'avvio in 3 comandi.

**Criteri.** **CA-1** Ogni prompt della §10 dà il risultato atteso (con il client finto in modo automatico; con Claude vero nel collaudo della §11). **CA-2** Da clone pulito l'app si avvia con i comandi della §11.1. **CA-3** "Ripristina i viaggi demo" porta ogni viaggio demo allo stato iniziale.

**Campi per il plugin.** Percorsi: `apps/web`, `packages/engine/data`, `docs`, `evidence`, `README.md`. Dipende da tutti gli altri requisiti della CR.

### 9.17 Dipendenze e sequenza

| Passo | Requisiti (in parallelo dentro lo stesso passo) | Dipendono da |
|---|---|---|
| 0 | Chiusura dell'ondata 1 (§1.2) | — |
| 1 | UX-001, DATA-001, CAT-001 | WEB-002 · ITIN-002 · ITIN-001, FEAS-001 |
| 2 | CAT-002, WEB-003, REPLAN-003 | CAT-001, DATA-001 · UX-001 · REPLAN-001, CAT-001 |
| 3 | PREF-001, WEB-004 | CAT-001, CAT-002, UX-001 · UX-001, WEB-003, DATA-001 |
| 4 | PLAN-001 | CAT-001, CAT-002, PREF-001, FEAS-001 |
| 5 | ORCH-001, EDIT-002, REPLAN-004 | PLAN-001, CAT-002, EDIT-001, REPLAN-002 · EDIT-001, PLAN-001 · REPLAN-002, REPLAN-003, PREF-001, PLAN-001 |
| 6 | CHAT-001, TODAY-001 | ORCH-001, UX-001, DATA-001, PREF-001 · UX-001, DATA-001, REPLAN-004 |
| 7 | PLAN-002, IMPR-001 | PLAN-001, CHAT-001, EDIT-002, DATA-001 · ORCH-001, CHAT-001, REPLAN-004, EDIT-002 |
| 8 | DEMO-001 | tutti |
| 9 | Collaudo UAT (§11) | DEMO-001 |

---

## 10. Copione della demo: prompt da incollare

Prima della demo: apri l'app, vai in **Modalità presentazione** → **Ripristina i viaggi demo**. I prompt si incollano nella chat. Il risultato atteso è quello che il pubblico deve vedere.

### Atto 1 — Raccontami il viaggio (nuovo viaggio, dalla home)

| # | Prompt | Cosa deve succedere |
|---|---|---|
| 1 | Ciao! Vorrei organizzare 4 giorni sul Lago di Garda dal 12 al 15 giugno con la mia compagna. Ci piacciono la natura e il buon vino, vogliamo un ritmo rilassato e niente levatacce. Budget medio. | Il riepilogo delle preferenze si compila (Garda, date, 2 adulti, coppia, natura, gastronomia, lento, €€). L'assistente chiede al massimo 1–2 dettagli (per esempio la forma fisica o le cene) con risposte rapide. |
| 2 | Forma fisica normale, e sì, mettici anche le cene. Crea pure la bozza. | Appare la bozza di 4 giorni con mappa, immagini, una frase "perché te lo propongo" per ogni giorno, e una degustazione in cantina. |
| 3 | Siamo 3 amici, vogliamo una cosa wild in montagna, 5 giorni ad agosto. Camminiamo tanto e la fatica non ci spaventa, budget basso. Sorprendici tu! | (Nuovo viaggio.) L'assistente propone 3 destinazioni di montagna con una riga ciascuna e le schede da scegliere. |
| 3b | Andiamo in Val di Fassa. | Bozza nelle Dolomiti con attività di avventura impegnative, ritmo intenso, partenze mattiniere, luoghi reali sulla mappa. |
| 4 | Weekend lungo a Roma a ottobre con due bambini di 6 e 9 anni. Niente musei lunghissimi, ci serve la pausa pranzo e la sera vogliamo stare in hotel. | (Nuovo viaggio.) Bozza a Roma con attività adatte ai bambini, pranzi sì e cene no, nessuna attività impegnativa. |
| 4b | 4 giorni a Lisbona a maggio in coppia, ci piacciono i musei e mangiare bene, ritmo normale. | (Nuovo viaggio, **serve la rete**.) "Sto esplorando Lisbona…" con i passi, poi una bozza con luoghi reali di Lisbona, immagini con attribuzione e "© OpenStreetMap contributors" sulla mappa. È il momento "wow" della demo: qualsiasi destinazione. |

### Atto 2 — Sistemiamola insieme (sulla bozza del Garda)

| # | Prompt | Cosa deve succedere |
|---|---|---|
| 5 | Il secondo giorno è troppo pieno, alleggeriscilo. | Il giorno 2 perde un'attività; la modifica è evidenziata; compare "Annulla". |
| 6 | Sostituisci il museo con qualcosa all'aperto. | Il museo è sostituito da un'attività all'aperto compatibile; la scheda spiega perché. |
| 7 | Questa degustazione non la togliere per nessun motivo. | La degustazione riceve il lucchetto (irrinunciabile). |
| 8 | Scambia il terzo giorno con il secondo. | I giorni 2 e 3 si scambiano; mappa e orari si aggiornano. |
| 9 | Mostrami un'alternativa per tutto il viaggio. | Una bozza diversa, con la degustazione bloccata ancora presente; si può confrontare con la precedente. |
| 10 | Torna alla versione di prima. | Si torna alla bozza precedente. |
| 11 | Perfetto, confermo l'itinerario! | Stato "Confermato", messaggio "Buon viaggio!", nasce la versione 1. |

### Atto 3 — In viaggio (su TRIP-DEMO-GARDA, orologio simulato a sabato 2026-06-13 ore 08:00)

| # | Prompt | Cosa deve succedere |
|---|---|---|
| 12 | Sta piovendo fortissimo, che facciamo stamattina? | Proposta: il trekking al Ponale lascia il posto a un'attività al coperto coerente con le preferenze; cambia solo la mattina; Accetta/Rifiuta. Accetta → versione 2. |
| 13 | Mi sono slogato una caviglia, per due giorni niente camminate impegnative. | Proposta: solo le attività impegnative dei due giorni sono sostituite; link a farmacie e pronto soccorso. |
| 14 | Si è bucata una gomma, ci vorranno due ore. | L'assistente chiede conferma ("ritardo di 2 ore da adesso, procedo?"); poi proposta che sposta o toglie solo ciò che serve. |
| 15 | Stiamo benissimo qui, vorremmo restare un giorno in più. | Proposta non fattibile: il volo di ritorno è a orario fisso ed è a rischio; pulsanti "Gestisci la prenotazione" e "Cerca voli" per il giorno dopo. |
| 16 | Il volo di ritorno è stato cancellato! | Il volo è a rischio, l'itinerario non cambia, ci sono le alternative con link. TravelOps dice chiaramente che non prenota. |
| 17 | Mi hanno rubato il portafoglio con la carta d'identità. | Proposta con mezza giornata libera per la denuncia, link alla Polizia di Stato, volo segnalato a rischio "serve un documento valido". |
| 18 | Oggi siamo distrutti, facciamo meno cose. | Il giorno resta con poche attività, pasti e cose irrinunciabili. |
| 19 | (Pulsante) Sono in ritardo di 30 minuti. | Proposta di posticipo della giornata. |

### Atto 4 — Senza chat (sul viaggio delle Dolomiti)

| # | Azione | Cosa deve succedere |
|---|---|---|
| 20 | Ho un imprevisto → Sciopero → treni, data di oggi | Proposta che sostituisce il treno con il mezzo alternativo più veloce, oppure segnala il treno a rischio con il link a Trainline. |
| 21 | Versioni → Confronta 1 e l'ultima | Elenco chiaro di cosa è cambiato e perché. |

---

## 11. Collaudo utente (UAT)

Il collaudo lo fa **prima l'agente** (§1.6), poi **la persona**. Si fa con l'app aperta nel browser come la usa un cliente: niente terminale, niente strumenti per sviluppatori, solo ciò che si vede.

### 11.1 Avviare l'app

Una sola volta: nella cartella del progetto crea il file `apps/web/.env.local` con la riga `ANTHROPIC_API_KEY=<la tua chiave>`. Senza chiave l'app funziona lo stesso, ma la chat no.

```bash
npm ci
```

```bash
npm run build
```

```bash
npm run dev
```

Poi apri `http://localhost:3000` nel browser.

### 11.2 Come leggere i casi

- **Passi:** cosa fai, esattamente come lo faresti tu.
- **Atteso:** cosa devi vedere. Se vedi altro, il caso è **Non superato**: annota cosa hai visto e fai uno screenshot.
- Prova ogni caso su computer; i casi segnati con 📱 anche su telefono (o restringendo la finestra del browser).

### 11.3 Casi di collaudo

**Primo impatto**

| ID | Passi | Atteso |
|---|---|---|
| UAT-01 📱 | Apri l'app. | Una home curata, colorata, con un titolo accogliente e il pulsante "Pianifica un viaggio". Ci sono le schede dei 3 viaggi demo con immagine, date e stato. Nessun testo tecnico o in inglese. |
| UAT-02 | Cambia il tema da chiaro a scuro. | Tutto resta leggibile e coerente; nessun testo scompare. |
| UAT-03 📱 | Restringi la finestra a misura di telefono e scorri la home. | Nessuno scorrimento orizzontale; il menu diventa una barra in basso. |

**Momento 1 — Raccontami il viaggio**

| ID | Passi | Atteso |
|---|---|---|
| UAT-04 📱 | "Pianifica un viaggio" → percorso guidato. Scegli Garda, 12–15 giugno, 2 adulti, Natura e Gastronomia, ritmo lento. Salta i dettagli. "Crea la mia bozza". | Al massimo 5 schermate, barra di avanzamento, riepilogo sempre visibile. In pochi secondi una bozza di 4 giorni. |
| UAT-05 | Torna indietro di un passo e cambia il ritmo. | Il riepilogo si aggiorna; nulla di già inserito va perso. |
| UAT-06 | Prova a proseguire senza scegliere le date. | Un messaggio chiaro dice cosa manca; non si va avanti. |
| UAT-07 | Nuovo viaggio, usa solo la chat: prompt 1 e 2 del copione. | Il riepilogo si compila mentre scrivi; arriva la bozza senza toccare il percorso guidato. |
| UAT-08 | Prompt 3, 3b e 4 del copione, in due nuovi viaggi. | "Sorprendici" propone 3 destinazioni; poi bozze coerenti: Dolomiti avventurose e intense; Roma adatta ai bambini, senza cene. |
| UAT-08b | Con la connessione a internet attiva: prompt 4b (Lisbona). | Vedi l'avanzamento "Sto esplorando Lisbona…", entro un minuto arriva una bozza con luoghi veri di Lisbona (controllane 3 su una mappa qualsiasi), immagini con autore e licenza nel dettaglio, attribuzione OpenStreetMap sulla mappa. Riaprendo la stessa destinazione è immediata. |
| UAT-08c | Nel percorso guidato inizia a compilare i filtri (destinazione e date), poi passa alla chat e scrivi "siamo in 4 con due bambini, ci piace il mare". Torna ai filtri. | I filtri mostrano già 2 adulti e 2 bambini e gli stili scelti dalla chat; il riepilogo è uno solo e coerente. |
| UAT-08d | Scrivi nella ricerca della destinazione un posto inesistente o minuscolo. | Un messaggio gentile e 2–3 destinazioni vicine suggerite. Nessun errore tecnico. |

**Momento 2 — Ecco la tua bozza**

| ID | Passi | Atteso |
|---|---|---|
| UAT-09 📱 | Sulla bozza del Garda guarda ogni giorno. | Linea del tempo con orari plausibili, immagini, spostamenti con mezzo e durata, una frase "perché te lo propongo" per giorno. |
| UAT-10 | Tocca una scheda attività, poi un punto sulla mappa. | Scheda e punto si evidenziano a vicenda; il dettaglio mostra descrizione, orari di apertura, costo. |
| UAT-11 | Cerca in tutta la bozza codici come `D2-E4`, `N1`, `FUORI_ORARIO`. | Non ce n'è nessuno. |

**Momento 3 — Sistemiamola insieme**

| ID | Passi | Atteso |
|---|---|---|
| UAT-12 | Prompt 5–10 del copione, uno alla volta. | Ogni richiesta cambia solo ciò che hai chiesto, la modifica è evidenziata, la chat conferma in una frase. |
| UAT-13 | Fai le stesse cose con i pulsanti delle schede (Sostituisci, Rimuovi, lucchetto, Giornata più leggera, Rigenera giorno) e trascina un'attività su un altro orario. | Stesso comportamento della chat. Sostituisci propone 3 alternative. |
| UAT-14 | Premi Annulla più volte, poi apri il confronto tra due bozze. | Ogni Annulla torna esattamente indietro; il confronto mostra cosa è stato aggiunto, tolto, spostato. |
| UAT-15 | Rigenera un giorno con un'attività bloccata. | L'attività bloccata resta al suo posto. |
| UAT-16 | Prompt 11 (conferma). | Stato "Confermato", messaggio di festa, nella cronologia c'è la versione 1. |

**Momento 4 — In viaggio**

| ID | Passi | Atteso |
|---|---|---|
| UAT-17 | Modalità presentazione → orologio a sabato 13 giugno 08:00 → apri TRIP-DEMO-GARDA. | Si apre "Oggi" con "Adesso" e "Dopo" corretti. |
| UAT-18 | Prompt 12 (pioggia). Leggi la proposta, poi Accetta. | La proposta cambia solo la mattina, spiega perché in parole semplici, dice "ho cambiato solo la mattina". Dopo Accetta c'è la versione 2. |
| UAT-19 | Prompt 13 (caviglia). Rifiuta. | Cambiano solo le attività impegnative dei due giorni; ci sono i link a farmacie e pronto soccorso. Dopo Rifiuta l'itinerario non cambia. |
| UAT-20 | Prompt 14 (gomma bucata). | Prima la domanda di conferma, poi la proposta. |
| UAT-21 | Prompt 15 (resto un giorno in più). | Proposta non fattibile perché il volo è fisso; volo a rischio; pulsanti per gestire la prenotazione e cercare voli. Cliccando un pulsante si apre una nuova scheda del browser. |
| UAT-22 | Prompt 16 e 17. | Volo a rischio con alternative; per il documento, mezza giornata libera e link alla Polizia di Stato. L'app non dice mai di aver prenotato o cancellato qualcosa. |
| UAT-23 | Prompt 18 e pulsante "Sono in ritardo di 30 minuti". | Giornata alleggerita; posticipo di 30 minuti. |
| UAT-24 | Ho un imprevisto: apri tutte le schede degli imprevisti una per una. | Ogni scheda ha un modulo breve e comprensibile, già precompilato con oggi. |
| UAT-25 | Versioni → confronta la 1 con l'ultima. | Elenco chiaro dei cambiamenti con la causa di ognuno. |

**Robustezza**

| ID | Passi | Atteso |
|---|---|---|
| UAT-26 | Ricarica la pagina e riavvia l'app. | Tutto è come l'avevi lasciato. |
| UAT-27 | Modalità presentazione → Ripristina i viaggi demo. | I viaggi demo tornano allo stato iniziale; i tuoi viaggi nuovi restano. |
| UAT-28 | Togli la chiave da `.env.local`, riavvia, scrivi in chat. | Un messaggio gentile dice che la chat non è disponibile e di usare i pulsanti; tutto il resto funziona. |
| UAT-29 | Scrivi in chat una richiesta fuori tema ("prenotami il volo", "fammi un viaggio in tre paesi diversi"). | Risposta gentile: TravelOps non prenota e organizza una destinazione per viaggio; suggerisce cosa può fare. |
| UAT-29b | Stacca la rete e apri un viaggio demo, modificalo e prova un imprevisto. | Tutto funziona sui viaggi e sulle destinazioni già pronte; cercando una destinazione nuova un messaggio dice che serve la connessione. |
| UAT-30 | Usa l'app solo con la tastiera per creare un viaggio. | Tutto raggiungibile, il focus si vede sempre. |

### 11.4 Modello del verbale (`docs/demo/verbale-uat.md`)

```markdown
# Verbale di collaudo — TravelOps CR-001

| Campo | Valore |
|---|---|
| Data | AAAA-MM-GG |
| Collaudatore | <nome> (agente o persona) |
| Versione | commit <hash> |
| Ambiente | Windows, browser <nome e versione>, con / senza chiave di Claude |

## Esiti

| ID | Esito | Note | Screenshot |
|---|---|---|---|
| UAT-01 | Superato / Non superato / Superato con note | cosa ho visto | evidence/uat/UAT-01.png |

## Difetti aperti

| Difetto | Caso | Gravità (bloccante / importante / minore) | Stato |
|---|---|---|---|

## Giudizio finale

Pronto per la demo: sì / no, con quali riserve.
```

**Criterio di uscita:** tutti i casi Superati o Superati con note minori; nessun difetto bloccante o importante aperto.

---

## 12. Fuori perimetro

- Prenotazioni, pagamenti, modifiche o cancellazioni presso fornitori; apertura automatica dei link.
- Account, accesso, più utenti, condivisione del viaggio.
- Viaggi su più destinazioni.
- Prezzi reali, disponibilità e orari reali dei mezzi pubblici (i tempi dei mezzi pubblici sono stime dichiarate).
- Meteo reale, stato reale dei voli e monitoraggio automatico (restano nell'ondata 3: REQ-EXT-001, REQ-EXT-003, REQ-MON-001, REQ-NOTIF-001). I percorsi reali a piedi e in auto (REQ-EXT-002) sono anticipati in REQ-CAT-002.
- App nativa, notifiche fuori dall'app, funzionamento offline, lingue diverse dall'italiano.
- Più imprevisti nella stessa proposta; accettazione parziale di una proposta.
