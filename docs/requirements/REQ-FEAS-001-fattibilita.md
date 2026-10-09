# REQ-FEAS-001 — Controllo di fattibilità

| Campo | Valore |
|---|---|
| Stato | Bozza per `requirement propose` |
| Versione | 1.0 |
| Ondata | 1 — Motore |
| Dipende da | REQ-FOUND-001 |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-FEAS-001`, una pull request |

## Obiettivo

Dato un viaggio, segnalare tutto ciò che non sta in piedi usando catalogo e dati di contesto. Il controllo usa solo i tipi e i dati di riferimento di REQ-FOUND-001, quindi può partire in parallelo con REQ-ITIN-001.

## Operazioni

| Operazione | Input | Output |
|---|---|---|
| Controlla fattibilità | viaggio, catalogo, sorgente dei dati di contesto | elenco di problemi |
| Sorgente su file | cartella dei dati simulati | sorgente dei dati di contesto |

Ogni problema ha codice, gravità, `id` degli elementi coinvolti e messaggio. I tempi di percorrenza, le previsioni meteo e le chiusure straordinarie si leggono solo attraverso l'interfaccia della sorgente (`modello-dominio.md` §2.3). Questo requisito realizza anche la sorgente che legge i file simulati; nell'ondata 3 la stessa interfaccia si collegherà ai servizi reali senza cambiare il controllo.

## Regole

| Regola | Codice | Gravità | Quando |
|---|---|---|---|
| R-1 | `MANCA_SPOSTAMENTO` | bloccante | Tra due elementi consecutivi il viaggiatore cambierebbe luogo senza spostamento; vale anche per il primo elemento rispetto al luogo di partenza del giorno e per l'ultimo rispetto all'alloggio della notte. |
| R-2 | `PERCORSO_SCONOSCIUTO` | bloccante | Uno spostamento collega due luoghi senza tempo di percorrenza per quel mezzo. |
| R-3 | `SPOSTAMENTO_TROPPO_BREVE` | bloccante | La durata di uno spostamento è inferiore al tempo di percorrenza. |
| R-4 | `SOVRAPPOSIZIONE` | bloccante | Due elementi dello stesso giorno si sovrappongono. |
| R-5 | `FUORI_ORARIO` | bloccante | Un'attività non è interamente dentro una fascia di apertura del suo luogo in quel giorno della settimana. |
| R-6 | `DURATA_INSUFFICIENTE` | bloccante | Un'attività dura meno della sua durata tipica. |
| R-7 | `METEO_AVVERSO` | avviso | Un'attività all'aperto si sovrappone a una previsione avversa nella sua zona. |
| R-8 | `LUOGO_CHIUSO` | bloccante | Un'attività si sovrappone a una chiusura straordinaria del suo luogo. |

- Un itinerario è **fattibile** se non ha problemi bloccanti.
- I problemi sono restituiti in ordine di data, poi di inizio del primo elemento coinvolto, poi di codice.
- Per una coppia di luoghi con più mezzi, la sorgente indica come più veloce quello con meno minuti; a parità vale l'ordine `piedi`, `mezzi_pubblici`, `treno`, `auto`, `volo`.

## Criteri di accettazione

- **CA-1** La versione 1 e le varianti `V-IRR`, `V-FISSO` e `V-VOLO`, con il meteo di riferimento (tutto sereno) e senza chiusure, non hanno problemi.
- **CA-2** Per ciascuna regola R-1…R-6 una variante della versione 1 con quel solo difetto restituisce esattamente un problema con quel codice, gravità bloccante e gli `id` coinvolti.
- **CA-3** Con la previsione dello scenario S1 (pioggia in `GARDA_NORD` il 2026-06-13, 08:00–13:00) il controllo restituisce un solo problema: avviso `METEO_AVVERSO` su `D2-E2`.
- **CA-4** Con la chiusura straordinaria dello scenario S4 (`MUSE`, 2026-06-14, 00:00–24:00) il controllo restituisce un solo problema: `LUOGO_CHIUSO` bloccante su `D3-E6`.
- **CA-5** Il controllo funziona con una sorgente dei dati di contesto finta passata nei test, senza leggere file né rete.
- **CA-6** La sorgente su file legge i dati di riferimento; per una coppia con più mezzi (variante di test) indica il più veloce e, a parità di minuti, segue l'ordine dei mezzi.
- **CA-7** A parità di input l'elenco dei problemi è identico, nello stesso ordine.

## Campi per il plugin

- **Sintesi** (`--summary`): controllo di fattibilità dell'itinerario con le regole R-1…R-8 e sorgente sostituibile dei dati di contesto, con la sorgente che legge i file simulati.
- **Criteri** (`--acceptance`): CA-1…CA-7.
- **Fuori perimetro** (`--non-goal`): correzione dei problemi (REQ-REPLAN-002); dati di contesto reali (ondata 3).
- **Vincoli** (`--constraint`): regole comuni del motore (`modello-dominio.md` §3); il controllo non legge file né rete direttamente.
- **Percorsi** (`--write-path`): `packages/engine/src/feasibility`, `packages/engine/src/context`, `packages/engine/src/model`, `packages/engine/src/index.ts`, `packages/engine/test/feasibility`, `packages/engine/test/context`, `packages/engine/package.json`, `package-lock.json`, `docs`, `evidence`.
