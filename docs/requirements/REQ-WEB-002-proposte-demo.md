# REQ-WEB-002 — Web app: proposte, versioni e pagina Demo

| Campo | Valore |
|---|---|
| Stato | Bozza per `requirement propose` |
| Versione | 1.0 |
| Ondata | Filone web, in parallelo all'ondata 1 |
| Dipende da | REQ-WEB-001, REQ-ITIN-002, REQ-FEAS-001, REQ-REPLAN-002 |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-WEB-002`, una pull request |

## Obiettivo

Mostrare il motore all'opera dalla web app: lanciare gli scenari di imprevisto, vedere la proposta con spiegazione, elementi a rischio e alternative, accettarla o rifiutarla, consultare e confrontare le versioni.

## Funzionalità

- **Stato locale**: viaggio corrente e storico (REQ-ITIN-002) salvati in un file JSON locale in `apps/web/.data/`, escluso da Git, tramite esporta e importa. "Ripristina" riporta all'itinerario di partenza. Nell'ondata 2 il file sarà sostituito dal database.
- **Pagina Demo**: elenco degli scenari S1–S8 con la loro descrizione. Avviare uno scenario carica il suo itinerario di partenza (versione 1 o variante) e mostra la proposta. Un **orologio simulato** imposta data e ora correnti del viaggio, usate come momento di accettazione.
- **Vista proposta**: imprevisto, impatto, modifiche (prima → dopo), itinerario risultante del giorno, spiegazione, esito con i problemi, elementi a rischio evidenziati, alternative come link cliccabili. I link li apre il browser del viaggiatore in una nuova scheda; il motore non li apre mai.
- **Accetta / Rifiuta**: nome di chi accetta (predefinito "Viaggiatore", modificabile).
- **Versioni**: elenco con numero, momento, causa e autore; confronto tra due versioni con elementi aggiunti, rimossi e modificati.
- **Problemi nella vista giorno**: i problemi di fattibilità del giorno sono segnalati accanto agli elementi coinvolti.

## Criteri di accettazione

- **CA-1** Avviando S1 dalla Demo, la proposta mostrata coincide con P-S1, con la spiegazione e l'esito "fattibile".
- **CA-2** Accettando S1 come "Alice" con l'orologio simulato sul 2026-06-13 alle 07:30 si crea la versione 2 con la causa e l'autore di REQ-ITIN-002 CA-2, e la vista giorno mostra il nuovo itinerario.
- **CA-3** Il confronto tra le versioni 1 e 2 mostra le stesse differenze di REQ-ITIN-002 CA-3.
- **CA-4** Avviando S7, la proposta mostra `D3-E9` a rischio e i due link di REQ-REPLAN-002 (gestione della prenotazione e Google Flights), cliccabili.
- **CA-5** Avviando S6 o S8, la proposta è indicata come non fattibile e mostra i suoi problemi.
- **CA-6** Rifiutare una proposta non crea versioni.
- **CA-7** Accettare una proposta costruita su una versione non più corrente mostra il messaggio di proposta superata e non cambia lo storico.
- **CA-8** Lo stato sopravvive al riavvio della web app; "Ripristina" torna all'itinerario di partenza.
- **CA-9** La web app non contiene logica di ripianificazione: proposte, controlli e versioni vengono dal motore.

## Campi per il plugin

- **Sintesi** (`--summary`): pagina Demo con gli scenari S1–S8 e orologio simulato, vista della proposta con spiegazione, problemi, elementi a rischio e alternative cliccabili, accettazione o rifiuto, elenco e confronto delle versioni, stato salvato in un file locale.
- **Criteri** (`--acceptance`): CA-1…CA-9.
- **Fuori perimetro** (`--non-goal`): modifiche richieste dall'interfaccia e chat (ondata 2); database (ondata 2); imprevisti rilevati automaticamente (ondata 3); azioni sulle prenotazioni.
- **Vincoli** (`--constraint`): come REQ-WEB-001; i link alle alternative si aprono solo su clic del viaggiatore.
- **Percorsi** (`--write-path`): `apps/web`, `.gitignore`, `package-lock.json`, `README.md`, `docs`, `evidence`.
