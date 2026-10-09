# TravelOps — Estensioni del modello del dominio (ondata 2)

| Campo | Valore |
|---|---|
| Tipo | **Fonte condivisa** dell'ondata 2: agganciata con `--source` a tutti i requisiti della CR-001 |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Origine | `docs/CR-001-travelops-prodotto-demo.md` §7 |

> Estende `modello-dominio.md` senza modificarlo.
> Questo file è una fonte di più requisiti: modificarlo dopo l'approvazione rende "non aggiornati" tutti i requisiti che lo usano.
> Le correzioni si fanno con una nuova CR, non modificando questo file.
> La numerazione delle sezioni (§7.x) è la stessa della CR-001, così i rimandi nei requisiti restano validi.

---

> Estende `modello-dominio.md` senza modificarlo. Dove le due fonti parlano della stessa cosa, vale questa estensione solo per i requisiti dell'ondata 2.

## 7.1 Viaggio

Campi aggiunti al viaggio:

- **stato**: `bozza`, `confermato`, `in_corso`, `concluso`. Un viaggio nasce in `bozza`; diventa `confermato` con "Conferma l'itinerario"; è `in_corso` quando l'orologio (reale o simulato) è tra inizio e fine; `concluso` dopo la fine.
- **profilo**: le preferenze del viaggiatore (§7.2). Facoltativo: i viaggi dell'ondata 1 non ce l'hanno e si comportano esattamente come prima.
- **destinazione**: la zona principale.
- **istantanea del catalogo**: l'identificativo dell'istantanea (§7.8) su cui il viaggio è costruito. Bozza, modifiche e ripianificazioni usano sempre questa istantanea, così lo stesso input dà sempre lo stesso risultato anche se i dati reali cambiano.
- **revisioni della bozza**: elenco numerato delle bozze (§7.5), separato dallo storico delle versioni, che parte alla conferma.

## 7.2 Profilo delle preferenze

| Campo | Valori | Obbligatorio | Predefinito |
|---|---|---|---|
| Destinazione | qualsiasi città o area reale trovata dalla ricerca (§9.5b), oppure "sorprendimi" | sì | — |
| Date | date precise, oppure mese e durata | sì | — |
| Durata | da 2 a 14 giorni | sì | — |
| Viaggiatori | adulti (≥1), bambini con età | sì | 2 adulti |
| Tipo di gruppo | da solo, coppia, amici, famiglia | no | ricavato dai viaggiatori |
| Stili di viaggio | uno o più tra `relax`, `cultura`, `natura`, `avventura`, `gastronomia`, `romantico`, `famiglia` | no | `cultura`, `natura` |
| Ritmo | `lento` (2 attività al giorno), `bilanciato` (3), `intenso` (4), pasti esclusi | no | `bilanciato` |
| Forma fisica | `facile`, `moderato`, `impegnativo` (intensità massima accettata) | no | `moderato` |
| Budget | `€`, `€€`, `€€€` (fascia indicativa per persona al giorno, attività escluso alloggio) | no | `€€` |
| Orari | `mattiniero` (giornata 08:00–20:00), `normale` (09:30–21:30), `nottambulo` (11:00–23:30) | no | `normale` |
| Pasti nel piano | pranzo sì/no, cena sì/no | no | pranzo sì, cena sì |
| Mezzi | a piedi, mezzi pubblici, treno, auto | no | tutti |
| Irrinunciabili | attività del catalogo o stili che devono esserci | no | nessuno |
| Da evitare | attività, categorie o stili | no | nessuno |
| Esigenze | mobilità ridotta, adatto ai bambini, vegetariano, senza glutine | no | nessuna |

## 7.3 Catalogo

Campi aggiunti all'attività di catalogo: **stili** (uno o più), **intensità** (`facile`, `moderata`, `impegnativa`), **costo** (`gratis`, `€`, `€€`, `€€€`), **adatta ai bambini** (sì/no), **accessibile** (sì/no), **mesi consigliati** (facoltativo), **descrizione breve** (una frase per il viaggiatore), **immagine** (percorso locale e attribuzione).

Campi aggiunti al luogo: **costo indicativo** per i ristoranti, **opzioni alimentari** (vegetariano, senza glutine), **origine** (`riferimento` per i dati dell'ondata 1, `osm` con l'identificativo OpenStreetMap), **orari verificati** (sì se vengono dal tag `opening_hours`, no se sono orari predefiniti per tipo di luogo), **fonte della descrizione** e **attribuzione dell'immagine**.

Un luogo con orari non verificati genera nel controllo di fattibilità un **avviso** (mai un problema bloccante) "orari da verificare", mostrato al viaggiatore come "Ti consiglio di controllare gli orari prima di andare".

Categoria di attività aggiunta: `servizio` (§8.5). Tipi di luogo aggiunti: `spiaggia`, `punto_panoramico`, `parco`, `impianto` (funivie, seggiovie), `negozio`, `farmacia`, `ospedale`.

Valori per le 8 attività esistenti: `A-PONALE` impegnativa, tutte le altre facili; `A-LUNGOLAGO` e `A-PONALE` stili `natura`, `A-PONALE` anche `avventura`; `A-MAG`, `A-BUONCONSIGLIO`, `A-MUSE` stile `cultura`, `A-MUSE` anche `famiglia`; `A-CANTINA` stili `gastronomia` e `romantico`; i pranzi stile `gastronomia`. Costi: lungolago e Ponale `gratis`, musei e castello `€`, cantina `€€`, pranzi `€€`. Adatte ai bambini: tutte tranne `A-CANTINA`; accessibili: tutte tranne `A-PONALE`.

## 7.4 Imprevisti

Ai quattro tipi esistenti si aggiungono:

| Tipo | Dati | Giorni | Elementi colpiti |
|---|---|---|---|
| `VOLO_PERSO` | `id` dello spostamento in volo o treno; arrivo previsto con il nuovo mezzo (facoltativo) | uno o più | Lo spostamento perso; se l'arrivo previsto è indicato, gli elementi che iniziano prima dell'arrivo previsto. |
| `SALUTE` | data di inizio, numero di giorni (o fino alla fine del viaggio), intensità massima consentita, mobilità ridotta sì/no, descrizione | uno o più | Le attività in quei giorni con intensità superiore alla massima consentita o, con mobilità ridotta, non accessibili. |
| `SCIOPERO` | mezzo (`mezzi_pubblici` o `treno`), data, zona (facoltativa) | uno | Gli spostamenti con quel mezzo in quella data (e zona). |
| `BAGAGLIO_SMARRITO` | data, momento | uno | Nessun elemento colpito: serve tempo libero per gli acquisti essenziali (§9.11). |
| `DOCUMENTI_SMARRITI` | data, momento | uno | Come il bagaglio smarrito, con un tempo maggiore (§9.13). |
| `STANCHEZZA` | data | uno | Le attività di quel giorno non irrinunciabili e non a orario fisso. |

Le regole di `modello-dominio.md` §2.4 ("ogni imprevisto riguarda un solo giorno") valgono per tutti i tipi tranne `VOLO_PERSO` e `SALUTE`, che possono riguardare più giorni consecutivi.

## 7.5 Bozza e revisioni della bozza

- Ogni cambio alla bozza crea una **revisione della bozza** numerata (B1, B2, …) con la causa ("Bozza iniziale", "Sostituito il museo con il lungolago", …).
- Si può tornare a una revisione precedente (annulla) e confrontare due revisioni con lo stesso confronto di REQ-ITIN-002.
- Alla conferma, la revisione corrente diventa la **versione 1** dello storico di REQ-ITIN-002. Le revisioni della bozza restano consultabili.

## 7.6 Livelli di ripianificazione

Ogni proposta dichiara il suo livello, mostrato al viaggiatore in parole semplici:

1. **Minimo**: le regole di REQ-REPLAN-002 (cambiano solo gli elementi colpiti e gli spostamenti attorno).
2. **Giornata**: se il livello minimo non è fattibile, il viaggiatore può chiedere "Rigenera questa giornata". Il generatore di REQ-PLAN-001 ricostruisce solo quella giornata, mantenendo elementi a orario fisso, irrinunciabili e prenotazioni.
3. **Resto del viaggio**: solo su richiesta esplicita del viaggiatore.

## 7.7 Punteggio delle preferenze

Il **punteggio** di un'attività di catalogo rispetto a un profilo serve sia al generatore sia alla scelta dei sostituti:

- +3 per ogni stile in comune con il profilo;
- +5 se è tra gli irrinunciabili;
- esclusa se è tra le cose da evitare, se l'intensità supera la forma fisica, se il profilo chiede mobilità ridotta e non è accessibile, se ci sono bambini e non è adatta, se il costo supera la fascia di budget di più di un livello;
- −1 se il costo supera la fascia di budget di un livello.

A parità di punteggio vale l'ordine alfabetico dell'`id`. Senza profilo il punteggio non si applica: i risultati dell'ondata 1 non cambiano.

## 7.8 Istantanea del catalogo

- Un'**istantanea** è il catalogo completo di una destinazione (zone, luoghi, attività, tempi di percorrenza) in un unico JSON con: identificativo, destinazione, data di creazione, fonti usate e loro attribuzioni.
- Si crea alla prima richiesta di una destinazione (§9.5b) e si salva nel database. Le tre destinazioni precaricate sono anche file nel repository (`packages/sources/snapshots/`).
- Un'istantanea non cambia mai. Aggiornare una destinazione crea una nuova istantanea; i viaggi già creati restano sulla loro.
- Il motore riceve l'istantanea come un normale catalogo (`modello-dominio.md` §2.2 più §7.3) e i tempi di percorrenza come dati di contesto: non sa da dove vengono.

---
