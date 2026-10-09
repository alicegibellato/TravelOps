# REQ-FOUND-001 — Fondamenta del progetto

| Campo | Valore |
|---|---|
| Stato | Bozza per `requirement propose` |
| Versione | 1.0 |
| Ondata | 1 — Motore |
| Area suggerita | B |
| Dipende da | — |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-FOUND-001`, una pull request |

## Obiettivo

Un repository TypeScript/Node pronto perché l'area B, l'area C e il filone web lavorino in parallelo: monorepo con npm workspaces, motore come pacchetto, tipi del modello e dati di riferimento disponibili da subito. Così i requisiti di fattibilità e di impatto (area C) possono partire subito dopo questo, senza aspettare il caricamento e la validazione (REQ-ITIN-001).

## Struttura del repository

```
package.json              workspaces: packages/*, apps/*
packages/engine/          pacchetto @travelops/engine (il motore)
  src/model/              tipi del modello e interfaccia della sorgente dei dati di contesto
  src/itinerary/          caricamento, validazione, catalogo (area B)
  src/history/            versioni e storico (area B)
  src/feasibility/        controllo di fattibilità (area C)
  src/replanning/         impatto e ripianificazione (area C)
  src/editing/            modifiche richieste (area B)
  src/demo/               demo a terminale
  test/                   stesse cartelle di src/
  data/reference/         dati di riferimento in JSON
apps/                     web app (filone web, REQ-WEB-001)
.github/workflows/        integrazione continua
```

## Criteri di accettazione

- **CA-1** Su un clone pulito, su Windows, `npm ci`, `npm run build` e `npm test` terminano senza errori.
- **CA-2** Il repository usa npm workspaces (`packages/*`, `apps/*`); il pacchetto `@travelops/engine` sta in `packages/engine`.
- **CA-3** Esistono le cartelle `itinerary`, `history`, `feasibility`, `replanning` ed `editing` sia in `packages/engine/src` sia in `packages/engine/test`, ciascuna con almeno un test d'esempio che passa.
- **CA-4** TypeScript è in modalità `strict`; il campo `engines` richiede Node.js 20.12 o successivo.
- **CA-5** I tipi del modello (`modello-dominio.md` §2), compresi problema, proposta, alternativa e l'interfaccia della sorgente dei dati di contesto, sono in `packages/engine/src/model` e sono esportati dal pacchetto.
- **CA-6** I dati di riferimento sono file JSON in `packages/engine/data/reference`: catalogo, dati di contesto, versione 1, ciascuna variante (`V-IRR`, `V-FISSO`, `V-VOLO`), scenari S1–S8 e M1–M6, proposta P-S1.
- **CA-7** Un test legge i file di riferimento e ne controlla i conteggi: 4 zone, 11 luoghi, 8 attività, 15 tempi di percorrenza, 15 elementi nella versione 1, 8 scenari di imprevisto, 6 scenari di modifica.
- **CA-8** Una GitHub Action esegue build e test a ogni push e a ogni pull request verso `main`, e fallisce se un test fallisce.
- **CA-9** `npm run demo` esiste e stampa un messaggio di avvio; i contenuti arrivano con REQ-REPLAN-002 e REQ-EDIT-001.
- **CA-10** Il `README.md` spiega prerequisiti, installazione, struttura dei workspace e come lanciare test e demo.
- **CA-11** `node_modules`, i file compilati e i dati locali (`.data/`) sono esclusi da Git.

## Campi per il plugin

- **Sintesi** (`--summary`): repository TypeScript/Node in npm workspaces con il pacchetto del motore, i tipi del modello, i dati di riferimento in JSON, test d'esempio e integrazione continua, pronto per lo sviluppo in parallelo delle aree B e C e del filone web.
- **Criteri** (`--acceptance`): CA-1…CA-11.
- **Fuori perimetro** (`--non-goal`): logica del motore (caricamento, validazione, fattibilità, ripianificazione); web app (REQ-WEB-001); pubblicazione del pacchetto su npm.
- **Vincoli** (`--constraint`): regole comuni del motore (`modello-dominio.md` §3); test con Vitest, compilazione con `tsc`, demo con `tsx`; moduli ES.
- **Integrazioni** (`--integration`): GitHub Actions.
- **Percorsi** (`--write-path`): `package.json`, `package-lock.json`, `tsconfig.base.json`, `.gitignore`, `.nvmrc`, `README.md`, `.github`, `packages/engine`, `apps`, `docs`, `evidence`.
