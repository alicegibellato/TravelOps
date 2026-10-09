# REQ-CHAT-001 — Chat

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Ondata | 2 — Prodotto (CR-001) |
| Tipo | Nuovo |
| Dipende da | REQ-ORCH-001 (ST-ORCH-001), REQ-UX-001 (ST-UX-001), REQ-DATA-001 (ST-DATA-001), REQ-PREF-001 (ST-PREF-001) |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md`, `modello-dominio-estensioni.md`, `dati-di-riferimento-estensioni.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-CHAT-001`, una pull request |
| Origine | `docs/CR-001-travelops-prodotto-demo.md` §9.9 |

> I rimandi §7.x sono a `modello-dominio-estensioni.md`, i rimandi §8.x a `dati-di-riferimento-estensioni.md`, gli altri alla CR-001.

## Funzionalità

- Pannello chat (§6.3) con bolle, risposte in streaming, indicatore "sta scrivendo", **risposte rapide** a chip sotto le domande ("Coppia", "Famiglia", "Sorprendimi"…), messaggio di benvenuto con 3 suggerimenti cliccabili.
- **Schede ricche** nella conversazione: riepilogo preferenze, bozza (miniatura dei giorni con "Apri"), proposta con prima → dopo e pulsanti Accetta/Rifiuta, conferma dell'azione fatta con "Annulla".
- Ogni azione dalla chat si riflette subito nell'itinerario a lato, con evidenziazione delle parti cambiate.
- Conversazione salvata per viaggio (REQ-DATA-001).

## Criteri di accettazione

- **CA-1** Dal prompt 1 del copione, scritto in linguaggio naturale, si arriva a una bozza senza usare il percorso guidato.
- **CA-2** Una proposta accettata dalla chat crea la stessa versione che si crea dal pulsante.
- **CA-3** Le risposte rapide inviano il testo del chip.
- **CA-4** Su telefono la chat è a tutto schermo e la tastiera non copre il campo di testo.
- **CA-5** Gli stati vuoto, caricamento, errore e AI non disponibile sono tutti gestiti.
- **CA-6** Filtri e chat stanno sullo stesso schermo e compilano lo stesso profilo (REQ-PREF-001 CA-6).

## Campi per il plugin

- **Sintesi** (`--summary`): Pannello chat con risposte in streaming, risposte rapide a chip e schede ricche (preferenze, bozza, proposta con Accetta e Rifiuta), affiancato al percorso guidato e all'itinerario, con la conversazione salvata per viaggio.
- **Criteri** (`--acceptance`): CA-1…CA-6.
- **Fuori perimetro** (`--non-goal`): Notifiche fuori dall'app.
- **Vincoli** (`--constraint`): Nessuna logica del motore duplicata nella web app: proposte, controlli e versioni vengono dal motore. Testi in italiano e in linguaggio semplice; nessun codice tecnico a vista per il viaggiatore.
- **Percorsi** (`--write-path`): `apps/web`, `docs`, `evidence`.
