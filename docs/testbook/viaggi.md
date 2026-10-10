# I miei viaggi (`TB-TRIP`) · gruppo C

Home `/` («I miei viaggi», card con stato «Bozza» / «Confermato» / «In corso» / «Concluso» e link «Apri») e pagine `/viaggi/<viaggio>`.

### TB-TRIP-001 · La bozza creata compare in home

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì (e2e `ux003b-home-oggi`)
- **Fonte**: Valerio (PC2), caso 1.
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. Crea una bozza da `/preferenze` (TB-PREF-001).
  2. Torna alla home e premi «Apri» sulla nuova card.
- **Atteso**: la card ha titolo, date e stato «Bozza»; «Apri» riapre `/bozza/<viaggio>` con lo stesso contenuto.

### TB-TRIP-002 · Il viaggio confermato si apre come viaggio

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: Valerio (PC2), caso 2; collaudo di Alice (PC1), commit `acb8da7` («Pagina non trovata» su `/viaggi/<id>`).
- **Precondizioni**: un viaggio dell'utente confermato e i viaggi demo.
- **Azioni**:
  1. Dalla home premi «Apri» sul viaggio confermato dell'utente.
  2. Premi «Apri» su «Quattro giorni sul Lago di Garda».
- **Atteso**: entrambi aprono `/viaggi/<viaggio>` con «Partenza da», «Alloggio della notte», «Programma» e la navigazione «Giorni del viaggio»; mai «Pagina non trovata», mai la bozza.

### TB-TRIP-003 · Viaggi demo e viaggi dell'utente distinti

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: Valerio (PC2), caso 3; collaudo di Alice (PC1), commit `acb8da7` (home con i soli 4 viaggi di riferimento).
- **Precondizioni**: almeno un viaggio dell'utente.
- **Azioni**:
  1. Apri la home.
- **Atteso**: i viaggi dell'utente sono elencati e riconoscibili rispetto ai viaggi demo; la home non mostra solo gli itinerari di riferimento della presentazione.

### TB-TRIP-004 · Home senza viaggi

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: stato vuoto.
- **Azioni**:
  1. Apri la home.
- **Atteso**: «Non hai ancora viaggi» con «Quando pianificherai un viaggio lo troverai qui, con le date e lo stato.» e il pulsante «Pianifica un viaggio».

### TB-TRIP-005 · «Ripristina i viaggi demo» non tocca i viaggi dell'utente

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì (e2e `ux003a-flussi`)
- **Fonte**: Valerio (PC2), caso 4.
- **Precondizioni**: un viaggio utente in bozza e uno confermato; uno scenario avviato in `/demo`.
- **Azioni**:
  1. Annota titolo, stato e contenuto dei viaggi dell'utente.
  2. In `/demo` premi «Ripristina i viaggi demo».
- **Atteso**: i viaggi dell'utente sono identici a prima; «Scenario in corso» torna «Nessuno»; i viaggi demo hanno la sola prima versione.

### TB-TRIP-006 · Viaggio con dati non validi

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì (seminando un viaggio non valido nella cartella dati di prova)
- **Precondizioni**: un viaggio salvato con un campo non valido.
- **Azioni**:
  1. Apri la home, poi premi «Apri» su quel viaggio.
- **Atteso**: la card dice «I dati di questo viaggio non sono validi: aprilo per vedere cosa correggere.»; la pagina del viaggio spiega cosa correggere senza errore generico; gli altri viaggi restano visibili.
