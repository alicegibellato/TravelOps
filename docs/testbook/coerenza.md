# Coerenza tra pagine e persistenza (`TB-XPAGE`) · gruppo D

Casi trasversali: lo stesso dato deve essere uguale su tutte le pagine e sopravvivere al ricaricamento e al riavvio del server.

### TB-XPAGE-001 · Conferma vista da tutte le pagine

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: una bozza dell'utente.
- **Azioni**:
  1. Conferma la bozza.
  2. Apri la home, `/viaggi/<viaggio>`, «Versioni», «Oggi».
- **Atteso**: home con stato «Confermato» (o «In corso» se le date comprendono oggi); stessi giorni e attività in viaggio, versione 1 e «Oggi».

### TB-XPAGE-002 · Modifiche della bozza dopo ricaricamento e riavvio

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: bozza aperta.
- **Azioni**:
  1. Sostituisci un'attività, blocca un'altra («Bloccata»), cambia il ritmo con «Rigenera con queste preferenze».
  2. Ricarica la pagina; poi riavvia il server e riapri la bozza.
- **Atteso**: tutte le modifiche e la cronologia restano; l'attività bloccata resta al suo posto dopo la rigenerazione.

### TB-XPAGE-003 · Accettazione di una proposta coerente ovunque

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: scenario «Chiusura del MUSE» avviato.
- **Azioni**:
  1. Accetta la proposta.
  2. Apri `/demo`, «Versioni», «Itinerario corrente», «Oggi» sul giorno del MUSE.
- **Atteso**: `/demo` mostra «Versione corrente» 2 e la proposta accettata; tutte le pagine mostrano l'alternativa al MUSE, nessuna mostra ancora il MUSE.

### TB-XPAGE-004 · Pagina non trovata e errore generico

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: nessuna.
- **Azioni**:
  1. Apri `/viaggi/non-esiste`, `/viaggi/<viaggio>/giorni/2000-01-01`, `/pagina-a-caso`.
- **Atteso**: «Pagina non trovata» con «Torna ai miei viaggi» che porta alla home; il menu resta utilizzabile.

### TB-XPAGE-005 · Menu e pagina attiva

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: nessuna.
- **Azioni**:
  1. Apri una per una le voci di «Sezioni»: «I miei viaggi», «Destinazione», «Preferenze», «Itinerario corrente», «Versioni», «Oggi», «Qualità».
- **Atteso**: ogni voce apre la pagina giusta, la voce attiva è evidenziata (`aria-current`), il logo «TravelOps, i miei viaggi» torna alla home.
