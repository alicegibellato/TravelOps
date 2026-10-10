# Versioni (`TB-VER`) · gruppo C

`/versioni` («Versioni dell'itinerario», «Cronologia delle versioni», badge «Corrente», «Confronta»), `/versioni/<numero>`, confronto `?a=N&b=M` con «Aggiunti», «Rimossi», «Modificati».

### TB-VER-001 · La conferma crea la versione 1 con la data

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: Valerio (PC2), caso 9; collaudo di Alice (PC1), commit `acb8da7` (versione 1 senza data).
- **Precondizioni**: una bozza dell'utente.
- **Azioni**:
  1. Conferma la bozza.
  2. Apri «Versioni» dal menu.
- **Atteso**: c'è una sola versione, la 1, con badge «Corrente», data e ora di creazione e causa (conferma).

### TB-VER-002 · Modifica accettata: versione 2 con differenze e causa

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì (e2e `ca3-proposta`)
- **Fonte**: Valerio (PC2), caso 10.
- **Precondizioni**: viaggio confermato con versione 1.
- **Azioni**:
  1. Dal viaggio chiedi una modifica («Proponi una modifica» → «Giornata più leggera») e premi «Accetta».
  2. In «Versioni» premi «Confronta» sulla versione 2.
- **Atteso**: compare la versione 2 «Corrente» con la causa; il confronto con la 1 elenca negli «Aggiunti»/«Rimossi»/«Modificati» solo gli elementi cambiati.

### TB-VER-003 · Proposta rifiutata: nessuna versione

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: Valerio (PC2), caso 11.
- **Precondizioni**: viaggio confermato con N versioni.
- **Azioni**:
  1. Genera una proposta (modifica o scenario) e premi «Rifiuta».
  2. Apri «Versioni».
- **Atteso**: le versioni sono ancora N; la proposta risulta «Rifiutata»; l'itinerario corrente non cambia.

### TB-VER-004 · Confronto senza differenze e numeri non validi

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: viaggio con almeno 2 versioni.
- **Azioni**:
  1. Apri `/versioni?a=1&b=1`.
  2. Apri `/versioni/999`.
- **Atteso**: il primo mostra «Nessuna differenza tra le due versioni.»; il secondo «Pagina non trovata» con «Torna ai miei viaggi».

### TB-VER-005 · Versioni del viaggio scelto

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7` (Versioni e Itinerario corrente agganciati al viaggio della presentazione).
- **Precondizioni**: un viaggio dell'utente con 2 versioni e i viaggi demo con 1 versione.
- **Azioni**:
  1. Apri il viaggio dell'utente dalla home, poi «Versioni» e «Itinerario corrente».
- **Atteso**: entrambe mostrano le versioni del viaggio dell'utente (2), non quelle dell'itinerario della presentazione.
