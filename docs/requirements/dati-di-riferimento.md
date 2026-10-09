# TravelOps — Dati di riferimento e scenari

| Campo | Valore |
|---|---|
| Tipo | **Fonte condivisa**: agganciata con `--source` a tutti i requisiti dell'ondata 1 e del filone web |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Origine | Dati di riferimento della collega, con varianti e scenari aggiunti (S6–S8, M1–M6) |

> Dati inventati per la demo. I nomi dei luoghi sono reali, **orari e tempi no**. Le coordinate sono approssimate:
> servono solo per la mappa e, nell'ondata 3, per il meteo reale.
> Questo file è una fonte di più requisiti: va cambiato solo insieme a una revisione dei requisiti.
> I risultati attesi stanno nei file dei singoli requisiti; qui ci sono solo i dati e gli scenari.

---

## 1. Viaggio

`TRIP-GARDA`: "Weekend sul Garda", da venerdì 2026-06-12 a domenica 2026-06-14, fuso `Europe/Rome`, 2 viaggiatori, prossimo numero per gli id nuovi: 1. Il primo giorno parte da `HOTEL`.

## 2. Catalogo

### 2.1 Zone

| id | Nome | Coordinate |
|---|---|---|
| `GARDA_NORD` | Alto Garda | 45.8850, 10.8450 |
| `TRENTO` | Trento | 46.0700, 11.1210 |
| `VERONA` | Verona | 45.4384, 10.9916 |
| `ROMA` | Roma | 41.9028, 12.4964 |

### 2.2 Luoghi

| id | Nome | Zona | Tipo | Apertura | Coordinate |
|---|---|---|---|---|---|
| `HOTEL` | Hotel sul lago, Riva del Garda | `GARDA_NORD` | alloggio | sempre | 45.8846, 10.8445 |
| `LUNGOLAGO` | Lungolago di Riva | `GARDA_NORD` | altro | sempre | 45.8838, 10.8428 |
| `PONALE` | Sentiero del Ponale, partenza | `GARDA_NORD` | sentiero | sempre | 45.8790, 10.8368 |
| `MAG` | MAG Museo Alto Garda | `GARDA_NORD` | museo | mar–dom 10:00–18:00; lun chiuso | 45.8852, 10.8433 |
| `CANTINA` | Cantina ad Arco | `GARDA_NORD` | cantina | tutti i giorni 10:00–19:00 | 45.9195, 10.8855 |
| `RIST-RIVA` | Ristorante sul lago | `GARDA_NORD` | ristorante | tutti i giorni 12:00–14:30 e 19:00–22:30 | 45.8857, 10.8418 |
| `BUONCONSIGLIO` | Castello del Buonconsiglio | `TRENTO` | museo | mar–sab 09:30–17:00; dom 09:30–13:00; lun chiuso | 46.0716, 11.1271 |
| `RIST-TRENTO` | Trattoria in centro a Trento | `TRENTO` | ristorante | tutti i giorni 12:00–14:30 | 46.0674, 11.1213 |
| `MUSE` | MUSE Museo delle Scienze | `TRENTO` | museo | mar–dom 10:00–18:00; lun chiuso | 46.0627, 11.1132 |
| `AEROPORTO-VRN` | Aeroporto di Verona | `VERONA` | aeroporto | sempre | 45.3957, 10.8885 |
| `AEROPORTO-FCO` | Aeroporto di Roma Fiumicino | `ROMA` | aeroporto | sempre | 41.8003, 12.2389 |

### 2.3 Attività

| id | Nome | Luogo | Categoria | Aperto/coperto | Durata tipica |
|---|---|---|---|---|---|
| `A-LUNGOLAGO` | Passeggiata sul lungolago | `LUNGOLAGO` | natura | all'aperto | 120 |
| `A-PONALE` | Trekking sul Sentiero del Ponale | `PONALE` | natura | all'aperto | 240 |
| `A-MAG` | Visita al MAG | `MAG` | cultura | al coperto | 120 |
| `A-CANTINA` | Degustazione in cantina | `CANTINA` | gastronomia | al coperto | 90 |
| `A-PRANZO-RIVA` | Pranzo sul lago | `RIST-RIVA` | pasto | al coperto | 70 |
| `A-BUONCONSIGLIO` | Visita al Castello del Buonconsiglio | `BUONCONSIGLIO` | cultura | al coperto | 120 |
| `A-PRANZO-TRENTO` | Pranzo in centro | `RIST-TRENTO` | pasto | al coperto | 60 |
| `A-MUSE` | Visita al MUSE | `MUSE` | cultura | al coperto | 150 |

## 3. Dati di contesto

### 3.1 Tempi di percorrenza (minuti, validi nei due sensi)

| Da | A | Mezzo | Minuti |
|---|---|---|---|
| `HOTEL` | `LUNGOLAGO` | piedi | 10 |
| `HOTEL` | `PONALE` | piedi | 20 |
| `HOTEL` | `MAG` | piedi | 10 |
| `HOTEL` | `RIST-RIVA` | piedi | 5 |
| `PONALE` | `RIST-RIVA` | piedi | 20 |
| `MAG` | `RIST-RIVA` | piedi | 5 |
| `HOTEL` | `CANTINA` | auto | 15 |
| `CANTINA` | `RIST-RIVA` | auto | 15 |
| `HOTEL` | `BUONCONSIGLIO` | auto | 50 |
| `BUONCONSIGLIO` | `RIST-TRENTO` | piedi | 10 |
| `RIST-TRENTO` | `MUSE` | piedi | 15 |
| `RIST-TRENTO` | `HOTEL` | auto | 50 |
| `MUSE` | `HOTEL` | auto | 50 |
| `HOTEL` | `AEROPORTO-VRN` | auto | 75 |
| `AEROPORTO-VRN` | `AEROPORTO-FCO` | volo | 65 |

### 3.2 Meteo di riferimento

Nessuna previsione: tutto sereno.

### 3.3 Chiusure straordinarie di riferimento

Nessuna.

## 4. Itinerario (versione 1)

Nessun elemento è a orario fisso, nessun elemento ha una prenotazione, tutte le attività hanno priorità `desiderata`.

**Giorno 1, venerdì 2026-06-12**: parte da `HOTEL`, alloggio `HOTEL`.

| id | Orario | Elemento |
|---|---|---|
| `D1-E1` | 16:00–16:10 | piedi `HOTEL` → `LUNGOLAGO` |
| `D1-E2` | 16:10–18:10 | `A-LUNGOLAGO` |
| `D1-E3` | 18:10–18:20 | piedi `LUNGOLAGO` → `HOTEL` |

**Giorno 2, sabato 2026-06-13**: parte da `HOTEL`, alloggio `HOTEL`.

| id | Orario | Elemento |
|---|---|---|
| `D2-E1` | 08:40–09:00 | piedi `HOTEL` → `PONALE` |
| `D2-E2` | 09:00–13:00 | `A-PONALE` |
| `D2-E3` | 13:00–13:20 | piedi `PONALE` → `RIST-RIVA` |
| `D2-E4` | 13:20–14:30 | `A-PRANZO-RIVA` |
| `D2-E5` | 14:30–14:35 | piedi `RIST-RIVA` → `HOTEL` |

**Giorno 3, domenica 2026-06-14**: parte da `HOTEL`, nessun alloggio (fine viaggio).

| id | Orario | Elemento |
|---|---|---|
| `D3-E1` | 09:00–09:50 | auto `HOTEL` → `BUONCONSIGLIO` |
| `D3-E2` | 10:00–12:00 | `A-BUONCONSIGLIO` |
| `D3-E3` | 12:00–12:10 | piedi `BUONCONSIGLIO` → `RIST-TRENTO` |
| `D3-E4` | 12:15–13:15 | `A-PRANZO-TRENTO` |
| `D3-E5` | 13:30–13:45 | piedi `RIST-TRENTO` → `MUSE` |
| `D3-E6` | 14:00–16:30 | `A-MUSE` |
| `D3-E7` | 16:30–17:20 | auto `MUSE` → `HOTEL` |

## 5. Varianti

| Variante | Differenza rispetto alla versione 1 |
|---|---|
| `V-IRR` | `D3-E2` (castello) ha priorità `irrinunciabile`. |
| `V-FISSO` | `D2-E4` (pranzo sul lago) è a orario fisso. |
| `V-VOLO` | Al giorno 3 si aggiungono `D3-E8` e `D3-E9` (tabella sotto). |

| id | Orario | Elemento | Note |
|---|---|---|---|
| `D3-E8` | 17:30–18:45 | auto `HOTEL` → `AEROPORTO-VRN` | |
| `D3-E9` | 19:30–20:35 | volo `AEROPORTO-VRN` → `AEROPORTO-FCO` | orario fisso; prenotazione: fornitore "Compagnia aerea di esempio", codice `XY123`, link di gestione `https://example.com/prenotazioni/XY123` |

## 6. Scenari di imprevisto

| Scenario | Itinerario | Imprevisto |
|---|---|---|
| **S1** Pioggia sul trekking | versione 1 | `METEO_AVVERSO`, zona `GARDA_NORD`, 2026-06-13, 08:00–13:00, `pioggia` |
| **S2** Ritardo breve | versione 1 | `RITARDO`, 2026-06-14 alle 09:20, 30 minuti, "traffico" |
| **S3** Foratura | versione 1 | `RITARDO`, 2026-06-14 alle 09:20, 120 minuti, "foratura dell'auto a noleggio" |
| **S4** Chiusura del MUSE | versione 1 | `CHIUSURA_LUOGO`, `MUSE`, 2026-06-14, 00:00–24:00 |
| **S5** Cancellazione dello spostamento | versione 1 | `CANCELLAZIONE_SPOSTAMENTO`, `D3-E1` |
| **S6** Foratura con castello irrinunciabile | `V-IRR` | come S3 |
| **S7** Volo cancellato | `V-VOLO` | `CANCELLAZIONE_SPOSTAMENTO`, `D3-E9` |
| **S8** Ritardo verso l'aeroporto | `V-VOLO` | `RITARDO`, 2026-06-14 alle 17:40, 60 minuti, "coda in autostrada" |

## 7. Scenari di modifica richiesta

| Scenario | Itinerario | Modifica richiesta |
|---|---|---|
| **M1** Aggiungi | versione 1 | aggiungi `A-CANTINA` il 2026-06-13 alle 16:00, priorità `opzionale` |
| **M2** Rimuovi | versione 1 | rimuovi `D2-E4` |
| **M3** Sposta | versione 1 | sposta `D1-E2` al 2026-06-12 alle 17:00 |
| **M4** Aggiungi in sovrapposizione | versione 1 | aggiungi `A-MAG` il 2026-06-13 alle 13:30 |
| **M5** Cambia priorità | versione 1 | priorità di `D3-E2` a `irrinunciabile` |
| **M6** Fissa l'orario | versione 1 | orario fisso su `D2-E4` |

## 8. Proposta di riferimento P-S1

Proposta attesa per lo scenario S1, usata da REQ-ITIN-002 e REQ-REPLAN-002. È costruita sulla versione 1; i giorni 1 e 3 sono identici; `D2-E2` (trekking) è rimosso; il prossimo numero per gli id nuovi diventa 2.

| id | Orario | Elemento | Cambio |
|---|---|---|---|
| `D2-E1` | 09:50–10:00 | piedi `HOTEL` → `MAG` | modificato |
| `N1` | 10:00–12:00 | `A-MAG`, priorità `desiderata` | aggiunto |
| `D2-E3` | 12:00–12:05 | piedi `MAG` → `RIST-RIVA` | modificato |
| `D2-E4` | 13:20–14:30 | `A-PRANZO-RIVA` | invariato |
| `D2-E5` | 14:30–14:35 | piedi `RIST-RIVA` → `HOTEL` | invariato |
