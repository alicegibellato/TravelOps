# REQ-PLAN-001 — Prima bozza dell'itinerario

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Ondata | 2 — Prodotto (CR-001) |
| Tipo | Nuovo |
| Dipende da | REQ-CAT-001 (ST-CAT-001), REQ-CAT-002 (ST-CAT-002), REQ-PREF-001 (ST-PREF-001), REQ-FEAS-001 (ST-FEAS-001B, ondata 1) |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md`, `modello-dominio-estensioni.md`, `dati-di-riferimento-estensioni.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-PLAN-001`, una pull request |
| Origine | `docs/CR-001-travelops-prodotto-demo.md` §9.7 |

> I rimandi §7.x sono a `modello-dominio-estensioni.md`, i rimandi §8.x a `dati-di-riferimento-estensioni.md`, gli altri alla CR-001.

## Obiettivo

Dal profilo, il motore genera una bozza completa, fattibile e ripetibile.

## Regole del generatore

- **R-1** *Destinazione e catalogo:* il generatore riceve il profilo e l'istantanea della destinazione già scelta (REQ-CAT-002, anche per "sorprendimi"). Non chiama la rete.
- **R-2** *Alloggio:* quello della destinazione con la fascia più vicina al budget.
- **R-3** *Giorni:* il primo e l'ultimo giorno hanno metà delle attività (arrotondata per eccesso) se ci sono spostamenti di arrivo e partenza; gli altri hanno il numero del ritmo.
- **R-4** *Scelta:* attività in ordine di punteggio, ognuna usata una sola volta per viaggio; prima gli irrinunciabili; almeno uno stile del profilo rappresentato ogni giorno; nello stesso giorno non più di un'attività `impegnativa`.
- **R-5** *Collocazione:* nella finestra degli orari del profilo, nell'ordine che minimizza gli spostamenti, rispettando gli orari di apertura; pranzo tra le 12:00 e le 14:30 e cena tra le 19:00 e le 21:30 se richiesti, nel ristorante più vicino compatibile con le esigenze alimentari.
- **R-6** *Verifica:* la bozza passa dal controllo di REQ-FEAS-001; se ha problemi bloccanti, il generatore toglie l'attività col punteggio più basso tra quelle coinvolte e riprova (al massimo 3 volte); se restano problemi, la bozza è comunque restituita con i problemi e la spiegazione.
- **R-7** *Spiegazione:* per ogni giorno una frase "perché te lo propongo" costruita dai dati (stili in comune, irrinunciabili); l'agente (REQ-ORCH-001) può riscriverla in modo più naturale senza cambiare i fatti.
- **R-8** *Determinismo:* stesso profilo e catalogo → stessa bozza.
- **R-9** *Alternativa:* "Mostrami un'alternativa" genera una bozza escludendo le attività già scelte nella bozza corrente quando esistono sostituti con punteggio positivo.

## Criteri di accettazione

- **CA-1** Per PR-1, PR-2 e PR-3 sulle istantanee precaricate, e per PR-4 sull'istantanea della prima destinazione proposta, la bozza non ha problemi bloccanti.
- **CA-2** La bozza contiene tutti gli irrinunciabili e nessuna attività da evitare.
- **CA-3** Il numero di attività per giorno rispetta il ritmo, con il primo e l'ultimo giorno ridotti come da regola R-3.
- **CA-4** Nessuna attività supera la forma fisica; con bambini solo attività adatte ai bambini.
- **CA-5** Lo stesso profilo con la stessa istantanea dà sempre la stessa bozza.
- **CA-6** La bozza di PR-1 è salvata come istantanea di riferimento nei test.
- **CA-7** La generazione richiede meno di 2 secondi per un viaggio di 14 giorni.

## Campi per il plugin

- **Sintesi** (`--summary`): Dal profilo e dall'istantanea della destinazione il motore genera con regole deterministiche una bozza completa e fattibile, giorno per giorno, con la spiegazione di ogni giornata e la possibilità di chiedere un'alternativa.
- **Criteri** (`--acceptance`): CA-1…CA-7.
- **Fuori perimetro** (`--non-goal`): Più destinazioni nello stesso viaggio. Prenotazioni, pagamenti, modifiche o cancellazioni presso fornitori. Chiamate di rete.
- **Vincoli** (`--constraint`): Regole comuni del motore (modello-dominio.md §3): TypeScript strict, determinismo, nessuna chiamata di rete nel motore, messaggi in italiano, ogni criterio coperto da test automatici.
- **Percorsi** (`--write-path`): `packages/engine/src/planning`, `packages/engine/src/model`, `packages/engine/src/index.ts`, `packages/engine/test/planning`, `packages/engine/data`, `docs`, `evidence`.
