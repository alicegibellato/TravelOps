# REQ-CAT-001 — Catalogo esteso: modello e regole di classificazione

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Ondata | 2 — Prodotto (CR-001) |
| Tipo | Nuovo |
| Dipende da | REQ-ITIN-001 (ST-ITIN-001B, ondata 1), REQ-FEAS-001 (ST-FEAS-001B, ondata 1) |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md`, `modello-dominio-estensioni.md`, `dati-di-riferimento-estensioni.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-CAT-001`, una pull request |
| Origine | `docs/CR-001-travelops-prodotto-demo.md` §9.5 |

> I rimandi §7.x sono a `modello-dominio-estensioni.md`, i rimandi §8.x a `dati-di-riferimento-estensioni.md`, gli altri alla CR-001.

## Obiettivo

Estendere il catalogo del motore con i campi della §7.3 e definire le regole deterministiche che trasformano un luogo reale in un'attività di catalogo. Tutto dentro il motore, senza rete.

## Funzionalità

- Tipi del motore estesi (§7.3, §7.8), compatibili con l'ondata 1; validazione dei campi nuovi in REQ-ITIN-001 (stili, intensità, costo validi).
- Avviso "orari da verificare" nel controllo di fattibilità per i luoghi con orari non verificati (§7.3).
- **Tabella di classificazione** (dati, non codice sparso) da tag OpenStreetMap a: tipo di luogo, categoria, stili, all'aperto o al coperto, intensità, durata tipica, costo. Esempi minimi: `tourism=museum` → cultura, al coperto, facile, 120 min, €; `tourism=viewpoint` → natura e romantico, all'aperto, facile, 30 min, gratis; `leisure=park` → natura, relax e famiglia, all'aperto, facile, 60 min, gratis; `natural=beach` → relax e famiglia, all'aperto, facile, 120 min, gratis; percorsi escursionistici → natura e avventura, all'aperto, intensità secondo lunghezza e dislivello, durata secondo lunghezza; `craft=winery` o `shop=wine` → gastronomia e romantico, al coperto, facile, 90 min, €€; `amenity=restaurant` → pasto, costo da `price` se presente; `aerialway` → avventura e natura, `impianto`.
- **Orari predefiniti** per tipo di luogo quando manca `opening_hours` (per esempio musei mar–dom 10:00–18:00, ristoranti 12:00–14:30 e 19:00–22:30, luoghi all'aperto sempre aperti), sempre marcati come non verificati.
- Lettura del formato `opening_hours` di OpenStreetMap nelle fasce di apertura del motore (una libreria esistente è ammessa).
- Valori della §7.3 sulle 8 attività dell'ondata 1, nei dati di riferimento JSON.

## Criteri di accettazione

- **CA-1** I test dell'ondata 1 passano invariati.
- **CA-2** Ogni riga della tabella di classificazione da tag OpenStreetMap ad attività di catalogo ha un test.
- **CA-3** Gli orari OpenStreetMap di almeno 10 esempi reali registrati (fasce multiple, giorni chiusi, 24/7) si convertono correttamente; un orario non leggibile diventa un orario predefinito non verificato, mai un errore.
- **CA-4** Un luogo con orari non verificati genera nel controllo di fattibilità solo un avviso, mai un problema bloccante.
- **CA-5** Le 8 attività dell'ondata 1 hanno i valori indicati in modello-dominio-estensioni.md §7.3.

## Campi per il plugin

- **Sintesi** (`--summary`): Catalogo del motore esteso con stili, intensità, costo, accessibilità, origine e orari verificati, più le regole deterministiche che trasformano un luogo reale di OpenStreetMap in un'attività di catalogo, senza chiamate di rete.
- **Criteri** (`--acceptance`): CA-1…CA-5.
- **Fuori perimetro** (`--non-goal`): Chiamate di rete. Scelta e costruzione delle destinazioni (REQ-CAT-002).
- **Vincoli** (`--constraint`): Regole comuni del motore (modello-dominio.md §3): TypeScript strict, determinismo, nessuna chiamata di rete nel motore, messaggi in italiano, ogni criterio coperto da test automatici. I dati di riferimento esistenti non cambiano: i dati aggiunti stanno in packages/engine/data/reference/estensioni/.
- **Percorsi** (`--write-path`): `packages/engine/src/model`, `packages/engine/src/itinerary`, `packages/engine/src/catalog`, `packages/engine/src/feasibility`, `packages/engine/src/index.ts`, `packages/engine/data`, `packages/engine/test`, `packages/engine/package.json`, `package-lock.json`, `docs`, `evidence`.
