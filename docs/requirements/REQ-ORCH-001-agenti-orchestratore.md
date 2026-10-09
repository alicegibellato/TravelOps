# REQ-ORCH-001 — Agenti e orchestratore

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Ondata | 2 — Prodotto (CR-001) |
| Tipo | Nuovo |
| Dipende da | REQ-PLAN-001 (ST-PLAN-001), REQ-CAT-002 (ST-CAT-002), REQ-EDIT-001 (ST-EDIT-001, ondata 1), REQ-REPLAN-002 (ST-REPLAN-002, ondata 1) |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md`, `modello-dominio-estensioni.md`, `dati-di-riferimento-estensioni.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-ORCH-001`, una pull request |
| Origine | `docs/CR-001-travelops-prodotto-demo.md` §9.8 |

> I rimandi §7.x sono a `modello-dominio-estensioni.md`, i rimandi §8.x a `dati-di-riferimento-estensioni.md`, gli altri alla CR-001.

## Obiettivo

Un orchestratore Claude interpreta i messaggi e li affida ad agenti specializzati che usano il motore come strumento.

## Funzionalità

- Pacchetto `packages/agents` con: **Orchestratore** (capisce l'intento, sceglie l'agente), **Consulente** (raccoglie le preferenze facendo al massimo 2 domande per messaggio), **Planner** (genera e rifinisce la bozza con REQ-PLAN-001 e REQ-PLAN-002), **Gestione imprevisti** (traduce il racconto in imprevisto strutturato e chiede la ripianificazione).
- Strumenti esposti agli agenti: cerca destinazione, prepara destinazione (REQ-CAT-002), proponi destinazioni per "sorprendimi", aggiorna profilo, genera bozza, alternativa, modifiche della bozza, conferma, proponi modifica, proponi ripianificazione, rigenera giornata, cerca nel catalogo, leggi viaggio e versioni. Gli agenti non hanno altri modi di cambiare un viaggio.
- Istruzioni di sistema in italiano: tono amichevole, frasi brevi, nessun codice tecnico, mai nominare luoghi che non vengono dall'istantanea della destinazione, mai dire di aver prenotato o cancellato qualcosa, prima di applicare un'azione importante riassumerla.
- Chiave `ANTHROPIC_API_KEY` e modello `TRAVELOPS_MODEL` (predefinito `claude-sonnet-5-5`) letti solo lato server.
- Senza chiave o con errore dell'API: messaggio gentile ("La chat non è disponibile in questo momento: puoi continuare con i pulsanti") e nessun blocco del resto.

## Criteri di accettazione

- **CA-1** Con un client finto, i prompt del copione della demo producono le chiamate agli strumenti attese, verificate con conversazioni registrate.
- **CA-2** Nessuna risposta dell'agente contiene un itinerario che non viene dal motore: il testo cita solo attività presenti nel viaggio o nell'istantanea della destinazione.
- **CA-3** Senza chiave l'app si avvia e la chat mostra il messaggio previsto, mentre il resto funziona.
- **CA-4** Nessuna chiave nel codice o nei log.
- **CA-5** Nessuna chiamata di rete nei test automatici.

## Campi per il plugin

- **Sintesi** (`--summary`): Un orchestratore Claude interpreta i messaggi e li affida ad agenti specializzati (Consulente, Planner, Gestione imprevisti) che usano il motore e la sorgente delle destinazioni come unici strumenti; l'app resta usabile senza chiave.
- **Criteri** (`--acceptance`): CA-1…CA-5.
- **Fuori perimetro** (`--non-goal`): Altri fornitori di modelli. Memoria tra viaggi diversi. Prenotazioni, pagamenti, modifiche o cancellazioni presso fornitori.
- **Vincoli** (`--constraint`): Nessun segreto nel codice o nei log. Chiave ANTHROPIC_API_KEY e modello TRAVELOPS_MODEL (predefinito claude-sonnet-5-5) letti solo lato server. Gli agenti cambiano un viaggio solo tramite gli strumenti del motore; mai luoghi che non vengono dall'istantanea; mai dire di aver prenotato o cancellato qualcosa.
- **Integrazioni** (`--integration`): API Anthropic (Claude).
- **Percorsi** (`--write-path`): `packages/agents`, `apps/web`, `package.json`, `package-lock.json`, `.gitignore`, `docs`, `evidence`.
