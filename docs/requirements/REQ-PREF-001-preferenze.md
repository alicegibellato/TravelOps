# REQ-PREF-001 — Preferenze del viaggio

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Ondata | 2 — Prodotto (CR-001) |
| Tipo | Nuovo |
| Dipende da | REQ-CAT-001 (ST-CAT-001), REQ-CAT-002 (ST-CAT-002), REQ-UX-001 (ST-UX-001) |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md`, `modello-dominio-estensioni.md`, `dati-di-riferimento-estensioni.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-PREF-001`, una pull request |
| Origine | `docs/CR-001-travelops-prodotto-demo.md` §9.6 |

> I rimandi §7.x sono a `modello-dominio-estensioni.md`, i rimandi §8.x a `dati-di-riferimento-estensioni.md`, gli altri alla CR-001.

## Obiettivo

Raccogliere il profilo della §7.2 in modo semplice e piacevole, con pulsanti e filtri.

## Funzionalità

- **Filtri e chat sullo stesso schermo** (D-2): percorso guidato a sinistra o al centro, chat accanto (su telefono: un pulsante "Preferisci scrivere?" apre la chat a tutto schermo e torna al percorso con le risposte già compilate). Entrambi scrivono nello stesso profilo, e il passo del percorso già compilato dalla chat si segna come fatto.
- Percorso guidato in **5 passi** con barra di avanzamento: (1) Dove: campo di ricerca con suggerimenti per qualsiasi destinazione reale (REQ-CAT-002), le 3 destinazioni precaricate come schede con immagine, e "Sorprendimi"; (2) Quando e quanto: date precise o mese + durata con slider 2–14 giorni; (3) Chi: contatori adulti e bambini (età), tipo di gruppo; (4) Che viaggio: chip degli stili con icona e colore, ritmo, forma fisica, budget; (5) Dettagli facoltativi: orari, pasti, mezzi, irrinunciabili, da evitare, esigenze. Pulsante "Salta" sui passi facoltativi.
- **Riepilogo vivo** delle preferenze a lato (desktop) o in alto comprimibile (telefono), modificabile con un tocco.
- Le stesse preferenze si possono raccogliere dalla chat (REQ-CHAT-001): il riepilogo si aggiorna mentre si parla.
- Pulsante finale "Crea la mia bozza".
- Nel motore: tipo del profilo, validazione (campi obbligatori, valori ammessi), punteggio della §7.7.

## Criteri di accettazione

- **CA-1** Si arriva a Crea la mia bozza con al massimo 5 schermate compilando i soli campi obbligatori.
- **CA-2** Un profilo incompleto mostra cosa manca, in parole semplici.
- **CA-3** Ognuno dei profili PR-1…PR-5 si inserisce dal percorso guidato e il profilo salvato coincide.
- **CA-4** Il punteggio delle preferenze (modello-dominio-estensioni.md §7.7) è coperto da test, comprese le esclusioni.
- **CA-5** Il percorso guidato funziona da tastiera e su telefono.
- **CA-6** Filtri e chat scrivono nello stesso profilo: iniziando dai filtri e finendo in chat, o viceversa, si ottiene lo stesso profilo (lo stato del profilo è verificato da test; il passaggio in chat nel collaudo).
- **CA-7** Sorprendimi propone 3 destinazioni tra cui scegliere.

## Campi per il plugin

- **Sintesi** (`--summary`): Profilo del viaggio raccolto con filtri e chat insieme sullo stesso schermo: percorso guidato in 5 passi con ricerca di qualsiasi destinazione reale o Sorprendimi, riepilogo vivo, validazione e punteggio delle attività rispetto alle preferenze.
- **Criteri** (`--acceptance`): CA-1…CA-7.
- **Fuori perimetro** (`--non-goal`): Account e profili salvati tra viaggi diversi.
- **Vincoli** (`--constraint`): Regole comuni del motore (modello-dominio.md §3): TypeScript strict, determinismo, nessuna chiamata di rete nel motore, messaggi in italiano, ogni criterio coperto da test automatici. Nessuna logica del motore duplicata nella web app: proposte, controlli e versioni vengono dal motore. Testi in italiano e in linguaggio semplice; nessun codice tecnico a vista per il viaggiatore.
- **Percorsi** (`--write-path`): `packages/engine/src/model`, `packages/engine/src/preferences`, `packages/engine/src/index.ts`, `packages/engine/test`, `apps/web`, `docs`, `evidence`.
