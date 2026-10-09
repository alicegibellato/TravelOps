# TravelOps — Dati di riferimento e scenari aggiuntivi (ondata 2)

| Campo | Valore |
|---|---|
| Tipo | **Fonte condivisa** dell'ondata 2: agganciata con `--source` a tutti i requisiti della CR-001 |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Origine | `docs/CR-001-travelops-prodotto-demo.md` §8 |

> Estende `dati-di-riferimento.md` senza modificarlo.
> Questo file è una fonte di più requisiti: modificarlo dopo l'approvazione rende "non aggiornati" tutti i requisiti che lo usano.
> Le correzioni si fanno con una nuova CR, non modificando questo file.
> La numerazione delle sezioni (§8.x) è la stessa della CR-001, così i rimandi nei requisiti restano validi.
> I risultati esatti degli scenari indicati come "fissati nel contratto" stanno nel contratto della storia, non qui.

---

> Dati inventati per la demo: nomi dei luoghi reali, orari e tempi no.

## 8.1 Destinazioni precaricate

Le prepara REQ-CAT-002 con la sorgente reale e le salva come istantanee nel repository: **Lago di Garda (Riva del Garda e dintorni)**, **Roma**, **Dolomiti – Val di Fassa**. Ogni istantanea, come ogni destinazione costruita al volo, deve rispettare i minimi:

- almeno 15 attività, almeno 2 per ciascuno dei 7 stili (se la destinazione non ne ha abbastanza per uno stile, lo dichiara);
- almeno 3 ristoranti adatti a pranzo e cena, di cui almeno uno con opzione vegetariana e, se esiste nei dati, uno senza glutine;
- almeno 2 alloggi di fascia diversa, una farmacia, un ospedale, la stazione o l'aeroporto di arrivo più vicini;
- tempi di percorrenza per tutte le coppie di luoghi che il generatore può usare.

Gli 8 elementi del catalogo dell'ondata 1 restano nel catalogo di riferimento, identici negli `id` e nei dati, con in più i campi della §7.3: servono ai test deterministici del motore e agli scenari S1–S14.

## 8.2 Profili di riferimento

| Profilo | Contenuto |
|---|---|
| **PR-1** Coppia sul Garda | Garda, 2026-06-12 → 2026-06-15 (4 giorni), 2 adulti, coppia, stili `natura`, `gastronomia`, `romantico`, ritmo `lento`, forma `moderato`, budget `€€`, orari `normale`, pranzo e cena sì. |
| **PR-2** Amici avventurosi | Dolomiti, agosto 2026, 5 giorni, 3 adulti, amici, stili `avventura`, `natura`, ritmo `intenso`, forma `impegnativo`, budget `€`, orari `mattiniero`. |
| **PR-3** Famiglia a Roma | Roma, ottobre 2026, 3 giorni, 2 adulti e 2 bambini (6 e 9 anni), famiglia, stili `cultura`, `famiglia`, ritmo `bilanciato`, forma `facile`, budget `€€`, pranzo sì, cena no. |
| **PR-4** Sorprendimi | "sorprendimi", maggio 2026, 3 giorni, 1 adulto, stili `relax`, `gastronomia`, ritmo `lento`, forma `facile`, budget `€€€`, da evitare `avventura`. |
| **PR-5** Destinazione nuova | Lisbona, maggio 2026, 4 giorni, 2 adulti, coppia, stili `cultura`, `gastronomia`, ritmo `bilanciato`, forma `moderato`, budget `€€`. Si usa nel collaudo per verificare la costruzione al volo di una destinazione non precaricata. |

## 8.3 Viaggi per la demo

Tutti costruiti sulle istantanee precaricate (§8.1), quindi con luoghi reali.

- **TRIP-DEMO-GARDA**: 4 giorni (2026-06-12 → 2026-06-15) generato da PR-1, con volo di andata (Roma Fiumicino → Verona, venerdì mattina, orario fisso, prenotazione di esempio) e volo di ritorno (Verona → Roma Fiumicino, lunedì sera, orario fisso, prenotazione di esempio), con un trekking impegnativo il sabato mattina (serve alla demo della pioggia e dell'infortunio), stato `confermato`.
- **TRIP-DEMO-DOLOMITI**: generato da PR-2, con treno di andata e ritorno (orario fisso, prenotazione), stato `confermato`.
- **TRIP-DEMO-ROMA**: generato da PR-3, stato `bozza`.

## 8.4 Scenari nuovi

| Scenario | Itinerario | Imprevisto o richiesta | Risultato atteso |
|---|---|---|---|
| **S9** Caviglia slogata | versione 1 dell'ondata 1 | `SALUTE` dal 2026-06-13 per 2 giorni, intensità massima `facile`, mobilità ridotta no | Colpito solo `D2-E2` (Ponale, impegnativa). Candidate come in S1 ma con il filtro di intensità al posto di "al coperto": `A-MAG` e `A-CANTINA`; vince `A-MAG` per minor tempo di spostamento. Le modifiche coincidono con P-S1; la spiegazione cita l'infortunio. Fattibile. |
| **S10** Volo perso | `V-VOLO` | `VOLO_PERSO` su `D3-E9`, nessun arrivo previsto | Itinerario invariato; `D3-E9` a rischio; alternative come S7. Fattibile. |
| **S11** Sciopero | variante `V-BUS` (aggiunge un tempo di 80 minuti in `mezzi_pubblici` tra `HOTEL` e `BUONCONSIGLIO`; `D3-E1` diventa mezzi pubblici 08:40–10:00) | `SCIOPERO` `mezzi_pubblici` il 2026-06-14 | Colpito solo `D3-E1`. R-CAN-1: l'altro mezzo per `HOTEL`–`BUONCONSIGLIO` è l'auto (50 minuti), stessa partenza: `D3-E1` diventa auto 08:40–09:30, mantiene l'id. Arriva prima, quindi nessun ritardo: `D3-E2`…`D3-E7` invariati. Fattibile. |
| **S12** Bagaglio smarrito | versione 1 | `BAGAGLIO_SMARRITO` il 2026-06-13 alle 08:00 | Regola R2-BAG di §9.13. Risultato esatto fissato nel contratto della storia ST-REPLAN-004 e approvato prima dell'implementazione. |
| **S13** Documenti rubati | versione 1 | `DOCUMENTI_SMARRITI` il 2026-06-14 alle 08:30 | Regola R2-DOC di §9.13. Risultato esatto fissato nel contratto della storia ST-REPLAN-004. |
| **S14** Stanchezza | versione 1 | `STANCHEZZA` il 2026-06-14 | Regola R2-STA di §9.13. Risultato esatto fissato nel contratto della storia ST-REPLAN-004. |
| **M7** Resto un giorno in più | versione 1 | prolunga di 1 giorno dopo il 2026-06-13 | Regola R2-PRO di §9.11. Risultato esatto fissato nel contratto della storia ST-EDIT-002. |
| **M8** Resto un giorno in più, con volo | `V-VOLO` | come M7 | Come M7, ma `D3-E8` e `D3-E9` sono a orario fisso: restano il 2026-06-14, sono a rischio, la proposta è non fattibile e propone le alternative (gestione della prenotazione e ricerca voli per il 2026-06-15). Orari esatti fissati nel contratto della storia ST-EDIT-002. |

Per gli scenari con risultato "fissato nel contratto": nella fase di analisi della storia l'agente applica le regole ai dati di riferimento, scrive il risultato esatto **nel contratto della storia** (non in questo file) e lo fa approvare prima di scrivere codice. Questo file è una fonte condivisa: modificarlo dopo l'approvazione renderebbe "non aggiornati" tutti i requisiti che lo usano.

## 8.5 Dati di riferimento aggiunti

Servono agli scenari S12 e S13. Stanno in un file di dati separato (`packages/engine/data/reference/estensioni/`), che si unisce al catalogo di riferimento solo nei test dell'ondata 2: così i dati esistenti non cambiano e i conteggi di REQ-FOUND-001 CA-7 restano validi.

| id | Nome | Zona | Tipo | Apertura | Coordinate |
|---|---|---|---|---|---|
| `NEGOZIO-RIVA` | Negozio di abbigliamento e articoli da viaggio | `GARDA_NORD` | negozio | tutti i giorni 09:00–19:30 | 45.8860, 10.8425 |
| `COMMISSARIATO-RIVA` | Commissariato di Riva del Garda | `GARDA_NORD` | altro | tutti i giorni 08:00–20:00 | 45.8870, 10.8440 |

| id | Nome | Luogo | Categoria | Aperto/coperto | Durata tipica | Intensità | Costo |
|---|---|---|---|---|---|---|---|
| `A-ACQUISTI` | Acquisti essenziali | `NEGOZIO-RIVA` | servizio | al coperto | 90 | facile | €€ |
| `A-DENUNCIA` | Denuncia e documenti provvisori | `COMMISSARIATO-RIVA` | servizio | al coperto | 180 | facile | gratis |

Tempi di percorrenza a piedi: `HOTEL`–`NEGOZIO-RIVA` 5, `HOTEL`–`COMMISSARIATO-RIVA` 10, `NEGOZIO-RIVA`–`RIST-RIVA` 5, `COMMISSARIATO-RIVA`–`RIST-RIVA` 10.

Le attività di categoria `servizio` non sono mai candidate come sostituti (R-SOS-2) e non sono mai scelte dal generatore: le aggiungono solo le regole R2-BAG e R2-DOC.

---
