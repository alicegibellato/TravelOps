# Oggi (`TB-TODAY`) · gruppo C

`/oggi` reindirizza a `/viaggi/<viaggio>/oggi`. Pannello «Oggi» con schede «Adesso» e «Dopo», sezione «Qualcosa è cambiato?» (ritardi 15/30/60 minuti, «Ho un imprevisto», «Oggi sono stanco»), «Mappa di oggi». Orologio: viaggi demo sempre sull'orologio simulato della Demo; viaggi dell'utente secondo `TRAVELOPS_OROLOGIO` (`automatico` predefinito, `simulato`, `reale`).

### TB-TODAY-001 · Viaggio demo sull'orologio simulato

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì (e2e `ca4-oggi`)
- **Fonte**: Valerio (PC2), caso 5.
- **Precondizioni**: stato pulito; in `/demo` imposta l'orologio a `2026-06-12 17:00` (alle 10:00 il viaggio non ha elementi in corso: il primo è alle 16:00; ST-QA-001C).
- **Azioni**:
  1. Apri «Oggi» dal menu (viaggio demo di riferimento).
- **Atteso**: il giorno mostrato è quello dell'orologio simulato; «Adesso» mostra l'elemento in corso alle 17:00, anche se la data reale è diversa.

### TB-TODAY-002 · Viaggio dell'utente con orologio automatico

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì (istante reale iniettabile nei test)
- **Fonte**: Valerio (PC2), caso 6.
- **Precondizioni**: `TRAVELOPS_OROLOGIO` non impostata (`automatico`); due viaggi dell'utente confermati: A con date che comprendono oggi, B nel futuro.
- **Azioni**:
  1. Apri `/viaggi/<A>/oggi`.
  2. Apri `/viaggi/<B>/oggi`.
- **Atteso**: A usa la data e l'ora reali (fuso `Europe/Rome`); B, fuori dalle sue date, usa l'orologio simulato riportato sulle sue date.

### TB-TODAY-003 · Orologio forzato reale o simulato

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: Valerio (PC2), caso 7.
- **Precondizioni**: un viaggio dell'utente confermato fuori dalle date di oggi; un viaggio demo.
- **Azioni**:
  1. Avvia con `TRAVELOPS_OROLOGIO=reale` e apri «Oggi» di entrambi.
  2. Avvia con `TRAVELOPS_OROLOGIO=simulato` e ripeti.
  3. Avvia con `TRAVELOPS_OROLOGIO=boh` e ripeti.
- **Atteso**: con `reale` il viaggio dell'utente usa sempre l'ora reale, il demo resta simulato; con `simulato` entrambi usano l'orologio della Demo; il valore non valido vale come `automatico`, senza errore in pagina.

### TB-TODAY-004 · «Adesso» e «Dopo» coerenti con l'ora

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì (e2e `ca4-oggi`)
- **Fonte**: Valerio (PC2), caso 8.
- **Precondizioni**: viaggio demo; orologio simulato su un orario a metà di un'attività, poi in una pausa, poi dopo l'ultima attività.
- **Azioni**:
  1. Per ciascun orario apri «Oggi».
- **Atteso**: durante un'attività «Finisce alle <ora>: mancano <tempo>.» e «Dopo» mostra la successiva; in una pausa «Niente in programma fino alle <ora>: hai <tempo> di tempo libero.»; a fine giornata «Per oggi è tutto: goditi il resto della giornata.».

### TB-TODAY-005 · Ritardo di 30 minuti

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì (e2e `ca4-oggi`)
- **Precondizioni**: viaggio demo, orologio `2026-06-13 10:00` (il 12 giugno a metà mattina il ritardo non colpisce nulla e dà solo una nota; ST-QA-001C).
- **Azioni**:
  1. In «Qualcosa è cambiato?» premi «Sono in ritardo di 30 minuti».
- **Atteso**: si apre una proposta con «Spiegazione» / «Cosa cambia»; il programma non cambia finché non si preme «Accetta»; dopo «Accetta» gli orari di «Dopo» sono slittati.

### TB-TODAY-006 · «Ho un imprevisto» da Oggi

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: lettura di `PannelloOggi.tsx` (il link punta a `/demo`).
- **Precondizioni**: viaggio confermato, «Oggi» aperto.
- **Azioni**:
  1. Premi «Ho un imprevisto».
- **Atteso**: si apre `/imprevisti` con la griglia «Che cosa è successo», riferita al viaggio di Oggi; non la modalità presentazione `/demo`.

### TB-TODAY-007 · «Oggi sono stanco»

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: lettura di `PannelloOggi.tsx` (il link punta a `/demo`).
- **Precondizioni**: viaggio confermato, «Oggi» aperto.
- **Azioni**:
  1. Premi «Oggi sono stanco».
- **Atteso**: si apre `/imprevisti?scheda=<sono stanco>` con la scheda «Sono stanco» già aperta e le opzioni «Solo riposo», «Solo attività facili», «Fino ad attività moderate», «Nessun limite».

### TB-TODAY-008 · Oggi segue il viaggio scelto

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7` (Oggi agganciato al viaggio della presentazione).
- **Precondizioni**: un viaggio dell'utente confermato e i viaggi demo.
- **Azioni**:
  1. Apri il viaggio dell'utente dalla home, poi «Oggi» dal menu.
- **Atteso**: «Oggi» mostra il viaggio dell'utente appena aperto (titolo e attività sue), non l'itinerario di riferimento della presentazione.
