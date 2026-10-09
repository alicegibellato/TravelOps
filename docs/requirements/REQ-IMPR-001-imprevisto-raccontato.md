# REQ-IMPR-001 — Imprevisto raccontato o scelto

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Ondata | 2 — Prodotto (CR-001) |
| Tipo | Nuovo |
| Dipende da | REQ-ORCH-001 (ST-ORCH-001), REQ-CHAT-001 (ST-CHAT-001), REQ-REPLAN-004 (ST-REPLAN-004), REQ-EDIT-002 (ST-EDIT-002) |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md`, `modello-dominio-estensioni.md`, `dati-di-riferimento-estensioni.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-IMPR-001`, una pull request |
| Origine | `docs/CR-001-travelops-prodotto-demo.md` §9.14 |

> I rimandi §7.x sono a `modello-dominio-estensioni.md`, i rimandi §8.x a `dati-di-riferimento-estensioni.md`, gli altri alla CR-001.

## Funzionalità

- Pulsante **Ho un imprevisto** sempre visibile in un viaggio confermato: griglia di schede con icona: Volo cancellato, Ho perso il volo o il treno, Sono in ritardo, Maltempo, Posto chiuso, Sciopero, Non sto bene / mi sono fatto male, Bagaglio smarrito, Documenti persi o rubati, Sono stanco, Voglio restare di più, Voglio tornare prima. Ogni scheda apre un breve modulo con i soli dati necessari, già precompilati con oggi e l'elemento in corso.
- In chat: il racconto ("si è bucata una gomma, ci vorranno due ore") diventa l'imprevisto strutturato; l'agente fa al massimo 2 domande per i dati mancanti e chiede conferma con una frase ("Ho capito: ritardo di 2 ore da adesso. Procedo?").
- Poi la proposta (REQ-WEB-004) in chat e nella vista.

## Criteri di accettazione

- **CA-1** Ogni prompt di imprevisto del copione della demo produce, con il client finto, l'imprevisto strutturato atteso.
- **CA-2** Ogni tipo di imprevisto e di richiesta di modello-dominio-estensioni.md §7.4 ha la sua scheda e il suo modulo.
- **CA-3** Nessuna proposta parte senza la conferma del viaggiatore.
- **CA-4** Un racconto ambiguo porta a una domanda, mai a un'ipotesi silenziosa.

## Campi per il plugin

- **Sintesi** (`--summary`): Il viaggiatore segnala un imprevisto con il pulsante Ho un imprevisto (schede con moduli brevi e precompilati) o raccontandolo in chat; l'agente lo traduce in un imprevisto strutturato, chiede conferma e poi mostra la proposta.
- **Criteri** (`--acceptance`): CA-1…CA-4.
- **Fuori perimetro** (`--non-goal`): Rilevamento automatico degli imprevisti (ondata 3). Prenotazioni, pagamenti, modifiche o cancellazioni presso fornitori.
- **Vincoli** (`--constraint`): Nessuna logica del motore duplicata nella web app: proposte, controlli e versioni vengono dal motore. Testi in italiano e in linguaggio semplice; nessun codice tecnico a vista per il viaggiatore. L'agente fa al massimo 2 domande per i dati mancanti.
- **Percorsi** (`--write-path`): `packages/agents`, `apps/web`, `docs`, `evidence`.
