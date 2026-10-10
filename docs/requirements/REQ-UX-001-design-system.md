# REQ-UX-001 — Design system e guscio dell'app

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Ondata | 2 — Prodotto (CR-001) |
| Tipo | Nuovo |
| Dipende da | REQ-WEB-002 (ST-WEB-002, ondata 1) |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md`, `modello-dominio-estensioni.md`, `dati-di-riferimento-estensioni.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-UX-001`, una pull request |
| Origine | `docs/CR-001-travelops-prodotto-demo.md` §9.1 |

> I rimandi §7.x sono a `modello-dominio-estensioni.md`, i rimandi §8.x a `dati-di-riferimento-estensioni.md`, gli altri alla CR-001.

## Obiettivo

Dare a TravelOps l'aspetto e la sensazione di un prodotto: identità visiva, componenti riusabili e struttura delle pagine della §6.

## Funzionalità

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

## Riferimento: 6. Design system e principi di esperienza

Riportato dalla CR-001 perché fa parte di questo requisito.

Riferimenti: le linee guida di Material Design 3 e Apple Human Interface Guidelines, i pattern delle app di viaggio più diffuse (filtri a chip e schede di Airbnb e Booking, chat affiancata all'itinerario di Mindtrip e Layla), WCAG 2.2 livello AA.

### 6.1 Identità visiva

- **Colori:** colorati e caldi, mai infantili. Un colore primario (blu-turchese "lago"), un secondario (corallo "tramonto") e un accento (giallo "sole"), più neutri caldi. Ogni **stile di viaggio** ha il suo colore (relax, cultura, natura, avventura, gastronomia, romantico, famiglia), usato per chip, icone e linee sulla mappa. Tutti i colori sono **token** (variabili CSS) con versione chiara e scura; il contrasto del testo è almeno 4.5:1.
- **Tipografia:** un sans-serif moderno da Google Fonts (per esempio Plus Jakarta Sans per i titoli e Inter per il testo), scala tipografica coerente.
- **Forme:** angoli arrotondati (12–16 px sulle schede), ombre leggere, spaziatura su griglia da 4/8 px.
- **Immagini:** ogni attività e destinazione ha un'immagine o un'illustrazione. Si usano solo immagini con licenza libera e attribuzione registrata (Wikimedia Commons, Unsplash) oppure illustrazioni generate (gradienti e icone). Mai immagini senza licenza.
- **Movimento:** transizioni brevi (150–250 ms) per comparsa di schede, aggiornamenti dell'itinerario, evidenziazione delle modifiche. Tutto si disattiva con `prefers-reduced-motion`.

### 6.2 Componenti

CSS con variabili (token) e componenti accessibili basati su Radix UI, icone Lucide (superato da REQ-UX-002: la formulazione originale indicava Tailwind CSS e lo stile shadcn/ui, non adottati). Componenti minimi: pulsanti (primario, secondario, testo), chip selezionabili, slider, selettore di date e periodi, contatori (+/−), schede attività, linea del tempo del giorno, mappa, pannello chat con bolle e risposte rapide, scheda proposta con "prima → dopo", badge di stato, avvisi, finestre modali e pannelli laterali, notifiche brevi (toast), indicatore di caricamento a scheletro, stato vuoto illustrato.

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

## Criteri di accettazione

- **CA-1** Tutti i colori dell'app vengono dai token; nessun colore scritto direttamente nei componenti.
- **CA-2** Il contrasto del testo è almeno 4.5:1 in tema chiaro e scuro, verificato da un test automatico sui token.
- **CA-3** La pagina /stile mostra tutti i componenti del design system in tema chiaro e scuro.
- **CA-4** A 375 px di larghezza nessuna pagina scorre in orizzontale; a 1280 px la home mostra le schede dei viaggi in griglia.
- **CA-5** Ogni componente interattivo si usa da tastiera con focus visibile; un controllo automatico di accessibilità (axe) non trova violazioni gravi nella home e in /stile.
- **CA-6** Nessun codice tecnico del motore (id degli elementi come D2-E4 o N1, codici dei problemi) compare nel testo visibile delle pagine principali, verificato da un test.
- **CA-7** Con prefers-reduced-motion le animazioni sono disattivate.

## Campi per il plugin

- **Sintesi** (`--summary`): Identità visiva colorata e accessibile pensata per un cliente finale non tecnico: token di colore, tipografia e movimento in tema chiaro e scuro, libreria di componenti accessibili, guscio dell'app con home e I miei viaggi, testi del motore tradotti in linguaggio semplice.
- **Criteri** (`--acceptance`): CA-1…CA-7.
- **Fuori perimetro** (`--non-goal`): Preferenze, chat e generazione dell'itinerario (altri requisiti della CR-001). Lingue diverse dall'italiano.
- **Vincoli** (`--constraint`): Nessuna logica del motore duplicata nella web app: proposte, controlli e versioni vengono dal motore. Testi in italiano e in linguaggio semplice; nessun codice tecnico a vista per il viaggiatore. Colori, spaziature e movimento solo da token; CSS con variabili, componenti accessibili basati su Radix UI, icone Lucide (superato da REQ-UX-002: CSS con variabili e Radix; il vincolo originale citava Tailwind CSS e shadcn/ui). Immagini solo con licenza libera e attribuzione registrata, oppure illustrazioni generate.
- **Requisiti non funzionali** (`--nfr`): Accessibilità WCAG 2.2 livello AA.
- **Percorsi** (`--write-path`): `apps/web`, `package.json`, `package-lock.json`, `docs`, `evidence`.
