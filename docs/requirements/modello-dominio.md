# TravelOps — Modello del dominio e regole comuni del motore

| Campo | Valore |
|---|---|
| Tipo | **Fonte condivisa**: agganciata con `--source` a tutti i requisiti dell'ondata 1 e del filone web |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Origine | Requisiti funzionali della collega (glossario, modello, regole comuni) con le integrazioni concordate |

> Questo file è una fonte di più requisiti: modificarlo rende "non aggiornati" tutti i requisiti che lo usano.
> Va cambiato solo insieme a una revisione dei requisiti (`requirement revise`).

---

## 1. Glossario

| Termine | Significato |
|---|---|
| Viaggio | Un viaggio con date di inizio e fine, un fuso orario e un itinerario. |
| Itinerario | L'insieme dei giorni del viaggio, ciascuno con i suoi elementi in ordine di orario. |
| Giorno | Una data del viaggio: luogo di partenza, elementi, alloggio della notte. |
| Elemento | Una voce dell'itinerario con inizio e fine: **attività** o **spostamento**. |
| Attività | Qualcosa da fare in un luogo, presa dal catalogo (visita, trekking, pasto…). |
| Spostamento | Il trasferimento da un luogo a un altro con un mezzo. |
| Luogo | Un posto con nome, zona, orari di apertura e, facoltative, coordinate. |
| Zona | Un'area geografica; il meteo si riferisce a una zona. |
| Catalogo | L'elenco di zone, luoghi e attività disponibili. |
| Dati di contesto | Tempi di percorrenza, previsioni meteo e chiusure straordinarie. |
| Versione | Una fotografia dell'itinerario; ogni proposta accettata crea una nuova versione. |
| Imprevisto | Un evento che cambia le condizioni del viaggio (pioggia, ritardo, chiusura, cancellazione). |
| Impatto | L'elenco degli elementi colpiti da un imprevisto, con il motivo. |
| Modifica richiesta | Un cambiamento chiesto dal viaggiatore: aggiungere, rimuovere o spostare un'attività, cambiarne la priorità, fissarne l'orario. |
| Proposta | Una nuova versione dell'itinerario suggerita da TravelOps, con la spiegazione; il viaggiatore la accetta o la rifiuta. |
| Problema di fattibilità | Qualcosa che non sta in piedi nel mondo reale; è **bloccante** o un **avviso**. |
| Priorità | Quanto il viaggiatore tiene a un'attività: **irrinunciabile**, **desiderata** (valore predefinito) o **opzionale**. |
| Orario fisso | Proprietà di un elemento (per esempio un volo) che TravelOps non sposta né rimuove mai. |
| Prenotazione | Dati di una prenotazione già fatta dal viaggiatore e collegata a un elemento. TravelOps non la modifica mai. |
| Elemento a rischio | Elemento che una proposta non riesce a rendere sicuro (§2.6). |
| Alternativa | Link utile proposto al viaggiatore (gestione della prenotazione, ricerca di voli o treni). TravelOps lo costruisce ma non lo apre e non agisce. |

## 2. Modello

### 2.1 Viaggio, giorni, elementi

- **Viaggio**: `id`, titolo, data di inizio, data di fine, fuso orario (uno solo per viaggio), numero di viaggiatori, **prossimo numero per gli id nuovi** (intero ≥ 1).
- **Giorno**: data, luogo di partenza, elementi in ordine di inizio, alloggio della notte (luogo; assente nell'ultimo giorno).
- **Elemento** (campi comuni): `id` univoco e stabile tra le versioni, tipo (`attivita` o `spostamento`), inizio, fine, orario fisso sì/no, prenotazione (facoltativa).
- **Attività** (in più): riferimento all'attività del catalogo; priorità (`irrinunciabile`, `desiderata`, `opzionale`; se assente vale `desiderata`). Il luogo è quello dell'attività.
- **Spostamento** (in più): luogo di partenza, luogo di arrivo, mezzo (`piedi`, `mezzi_pubblici`, `treno`, `auto`, `volo`).
- **Prenotazione**: fornitore, codice, link di gestione (facoltativo; indirizzo `https://`).

**Posizione del viaggiatore.** Un'attività inizia e finisce nel suo luogo; uno spostamento inizia nel luogo di partenza e finisce in quello di arrivo. Il primo giorno parte dal luogo indicato; ogni giorno successivo parte dall'alloggio della notte precedente.

**Id nuovi.** Ogni elemento creato dal motore riceve l'id `N<numero>`, usando il prossimo numero del viaggio, che poi aumenta di 1. Se una proposta crea più elementi, i numeri si assegnano in ordine di inizio. Un id non viene mai riutilizzato, neanche dopo la rimozione dell'elemento.

### 2.2 Catalogo

- **Zona**: `id`, nome, coordinate (facoltative: latitudine, longitudine).
- **Luogo**: `id`, nome, zona, tipo (`alloggio`, `ristorante`, `museo`, `sentiero`, `cantina`, `aeroporto`, `stazione`, `altro`), orari di apertura per giorno della settimana (una o più fasce; nessuna fascia = chiuso; "sempre aperto" ammesso), coordinate (facoltative).
- **Attività di catalogo**: `id`, nome, luogo, categoria (`natura`, `cultura`, `gastronomia`, `pasto`), all'aperto o al coperto, durata tipica in minuti.

### 2.3 Dati di contesto

- **Tempi di percorrenza**: per coppia di luoghi e mezzo, i minuti necessari; valgono in entrambe le direzioni. Se per una coppia esistono più mezzi, si usa il più veloce; a parità, l'ordine è `piedi`, `mezzi_pubblici`, `treno`, `auto`, `volo`.
- **Previsioni meteo**: per zona e intervallo (data, inizio, fine), una condizione tra `sereno`, `nuvoloso`, `pioggia`, `temporale`, `neve`. Sono **avverse** `pioggia`, `temporale` e `neve`. Dove non c'è previsione vale `sereno`.
- **Chiusure straordinarie**: luogo, data, inizio, fine. Valgono oltre agli orari di apertura del catalogo.
- **Sorgente sostituibile**: i dati di contesto si leggono attraverso un'unica interfaccia. Nell'ondata 1 la sorgente legge file simulati; nell'ondata 3 la stessa interfaccia si collega a servizi reali, senza cambiare chi la usa.

### 2.4 Imprevisti

| Tipo | Dati | Elementi colpiti |
|---|---|---|
| `METEO_AVVERSO` | zona, data, inizio, fine, condizione avversa | Le attività all'aperto nella zona che si sovrappongono all'intervallo. |
| `RITARDO` | data, momento, minuti, motivo | Vedi R-RIT-1 in REQ-REPLAN-001. |
| `CHIUSURA_LUOGO` | luogo, data, inizio, fine | Le attività in quel luogo che si sovrappongono all'intervallo. |
| `CANCELLAZIONE_SPOSTAMENTO` | `id` dello spostamento | Quello spostamento. |

Ogni imprevisto riguarda un solo giorno. Due intervalli si sovrappongono se uno inizia prima che l'altro finisca e viceversa; intervalli che si toccano (uno finisce alle 13:30, l'altro inizia alle 13:30) non si sovrappongono.

### 2.5 Orari

- Le date hanno formato `AAAA-MM-GG`; gli orari `HH:mm`, riferiti alla data del giorno e al fuso del viaggio.
- `24:00` è ammesso solo come fine. Nessun elemento attraversa la mezzanotte: nel PoC non è supportato.
- Gli errori di orario sono definiti in REQ-ITIN-001 (`ORARIO_NON_VALIDO`, `FUORI_GIORNATA`).
- Un'attività è **dentro** una fascia di apertura se inizia non prima dell'apertura e finisce non dopo la chiusura.
- Le durate sono in minuti interi.

### 2.6 Problemi, proposte, alternative

- **Problema**: codice, gravità (`bloccante` o `avviso`), `id` degli elementi coinvolti, messaggio.
- **Proposta**: numero della versione su cui è costruita, origine (imprevisto o modifica richiesta), impatto, modifiche (elementi aggiunti, rimossi, modificati con i campi prima e dopo), itinerario risultante, spiegazione, esito (fattibile sì/no), problemi, elementi a rischio, alternative.
- **Elementi a rischio**: (a) ogni elemento a orario fisso colpito da un imprevisto; (b) se la proposta non è fattibile, ogni elemento coinvolto in un problema bloccante; (c) i casi indicati dalle regole dei singoli requisiti.
- **Alternativa**: tipo (`gestione_prenotazione`, `ricerca_voli`, `ricerca_treni`), `id` dell'elemento, etichetta, indirizzo. Il motore costruisce l'indirizzo senza aprirlo né chiamare la rete.

## 3. Regole comuni del motore

Valgono per tutti i requisiti dell'ondata 1.

- **Esclusi**: prenotazioni e pagamenti (TravelOps non prenota, non modifica e non cancella nulla presso fornitori); API esterne reali e chiamate di rete; agenti AI e modelli linguistici; interfaccia grafica o chat (il filone web ha requisiti propri).
- **Vincoli**: TypeScript in modalità `strict` su Node.js 20.12 o successivo; solo dati simulati; nessun segreto nel codice. Il motore è il pacchetto `@travelops/engine` nella cartella `packages/engine`.
- **Determinismo**: a parità di input il risultato è identico. Il momento attuale non viene mai letto dall'orologio: quando serve, è un input. Nessuna scelta casuale; ogni parità si risolve con le regole indicate e, in ultima istanza, con l'ordine alfabetico degli `id`.
- **Decide il viaggiatore**: nessuna proposta cambia l'itinerario finché non viene accettata (REQ-ITIN-002).
- **Lingua**: messaggi di errore, problemi, spiegazioni ed etichette in italiano.
- **Verifica**: ogni criterio di accettazione è coperto da almeno un test automatico che usa i dati di riferimento (`dati-di-riferimento.md`) o una loro variante dichiarata nel test.
