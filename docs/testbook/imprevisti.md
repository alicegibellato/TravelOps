# Imprevisti (`TB-IMPR`) · gruppo C

`/imprevisti` («Ho un imprevisto», griglia «Che cosa è successo» con 12 schede), «Prepara la proposta» → `/demo/proposte/<id>` con «Decisione», «Imprevisto», «Impatto», «Cosa cambia», «Problemi», «Elementi a rischio», «Alternative», pulsanti «Accetta» / «Rifiuta». Scenari della Demo («Avvia lo scenario …»).

### TB-IMPR-001 · Come si arriva agli imprevisti

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: lettura di `Navigazione.tsx` (`/imprevisti` non è nel menu «Sezioni»).
- **Precondizioni**: viaggio confermato.
- **Azioni**:
  1. Cerca «Ho un imprevisto» partendo dalla home, dal viaggio, da «Oggi» e da «Versioni».
- **Atteso**: l'utente arriva a `/imprevisti` in al massimo due clic da «Oggi» e dalla pagina del viaggio (non solo dalla versione corrente in `/versioni`); i link non portano a `/demo`.

### TB-IMPR-002 · Maltempo

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: stato pulito, orologio `2026-06-13 08:00` (venerdì 12 giugno dalle 10 non ci sono elementi colpiti; PC3, ST-QA-001C).
- **Azioni**:
  1. In `/imprevisti` apri «Maltempo», indica «Quando» = oggi e «Dalle» = 10:00.
  2. Premi «Prepara la proposta».
- **Atteso**: si apre la proposta; «Impatto» elenca le attività all'aperto colpite; «Cosa cambia» propone attività al chiuso; il programma non cambia prima di «Accetta».

### TB-IMPR-003 · Sono in ritardo

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. Apri «Sono in ritardo», indica data, ora e «Quanti minuti di ritardo» = 45; ripeti con 120 minuti, dove un elemento a orario fisso (il volo) è colpito (PC3, ST-QA-001C).
  2. Premi «Prepara la proposta».
- **Atteso**: la proposta sposta o accorcia gli elementi successivi; gli elementi con «Orario fisso» non vengono spostati e, se colpiti, compaiono in «Elementi a rischio».

### TB-IMPR-004 · Posto chiuso

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. Apri «Posto chiuso», in «Quale posto» scegli un luogo del programma, indica la data.
  2. Premi «Prepara la proposta».
- **Atteso**: «Cosa cambia» sostituisce l'attività in quel luogo con un'alternativa nello stesso giorno; gli altri giorni non cambiano.

### TB-IMPR-005 · Volo cancellato o perso

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: in `/demo` carica l'itinerario «Volo di ritorno».
- **Azioni**:
  1. Apri «Volo cancellato», in «Quale spostamento» scegli il volo di ritorno, «Prepara la proposta».
  2. Ripeti con «Ho perso il volo o il treno».
- **Atteso**: la proposta indica le alternative di viaggio come link di ricerca; il testo dice che i link si aprono solo quando li scegli e che TravelOps non agisce sulle prenotazioni.

### TB-IMPR-006 · Non sto bene / Sono stanco

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. Apri «Sono stanco», scegli «Solo attività facili», «Prepara la proposta».
  2. Apri «Non sto bene / mi sono fatto male», scegli «Solo riposo», «Prepara la proposta».
- **Atteso**: la prima proposta tiene solo attività facili nel giorno indicato; la seconda toglie le attività del giorno e lo spiega in «Perché questa proposta».

### TB-IMPR-007 · Voglio restare di più / tornare prima

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. Apri «Voglio restare di più», compila i campi, «Prepara la proposta».
  2. Apri «Voglio tornare prima», compila i campi, «Prepara la proposta».
- **Atteso**: la prima aggiunge giorni dopo l'ultimo, la seconda li toglie dalla fine; «Cosa cambia» elenca i giorni aggiunti o rimossi; l'alloggio delle notti cambiate è segnalato.

### TB-IMPR-008 · Imprevisti solo informativi

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. Prova «Bagaglio smarrito», «Documenti persi o rubati» e «Sciopero».
- **Atteso**: quando non c'è nulla da cambiare la proposta dice «È solo un'informazione: non c'è nessuna modifica da accettare e l'itinerario resta com'è.» e non offre «Accetta»; quando lo sciopero colpisce uno spostamento, propone come sistemarlo.

### TB-IMPR-009 · Modulo incompleto e stato non leggibile

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: stato pulito; poi stato salvato corrotto.
- **Azioni**:
  1. Apri «Maltempo» e premi «Prepara la proposta» senza «Quando».
  2. Premi «Annulla».
  3. Con lo stato salvato non valido apri `/imprevisti`.
- **Atteso**: compare «Controlla il modulo» con il campo da sistemare, e i dati scritti restano; «Annulla» chiude la scheda senza proposte; con stato non valido la pagina dice «Lo stato del viaggio non è leggibile: apri la modalità presentazione e usa «Ripristina».».

### TB-IMPR-010 · Scenario avviato: proposta con spiegazione

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì (e2e `ca6-presentazione`)
- **Fonte**: Valerio (PC2), caso 12.
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. In `/demo` premi «Avvia lo scenario Pioggia sul trekking».
- **Atteso**: si apre `/demo/proposte/<id>` con «Imprevisto», «Impatto», «Cosa cambia» e «Perché questa proposta» compilati in italiano; «Scenario in corso» in `/demo` diventa «Pioggia sul trekking».

### TB-IMPR-011 · Proposta accettata: nuova versione e Oggi aggiornato

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: Valerio (PC2), caso 13.
- **Precondizioni**: TB-IMPR-010 eseguito.
- **Azioni**:
  1. Lascia «Nome di chi accetta» = «Viaggiatore» e premi «Accetta».
  2. Apri «Versioni» e «Oggi».
- **Atteso**: nasce la versione 2 «Corrente» con causa lo scenario; «Oggi» mostra il programma nuovo; riaprendo la proposta risulta «Accettata» e non si può accettare due volte.

### TB-IMPR-012 · Elementi a rischio e alternative come link

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: Valerio (PC2), caso 14.
- **Precondizioni**: in `/demo` avvia «Volo cancellato».
- **Azioni**:
  1. Leggi «Elementi a rischio» e «Alternative», apri «Mostra i dettagli».
- **Atteso**: elementi a rischio e alternative sono elencati; le alternative sono link esterni che si aprono in una nuova scheda solo al clic; nessuna prenotazione o pagamento viene avviato.

### TB-IMPR-013 · Imprevisto sul viaggio dell'utente

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7` (Imprevisti agganciati al viaggio della presentazione).
- **Precondizioni**: un viaggio dell'utente confermato.
- **Azioni**:
  1. Dal viaggio dell'utente apri «Ho un imprevisto», scegli «Maltempo» e prepara la proposta.
  2. Premi «Accetta».
- **Atteso**: la proposta parla delle attività del viaggio dell'utente; la nuova versione nasce su quel viaggio; l'itinerario della presentazione non cambia.
