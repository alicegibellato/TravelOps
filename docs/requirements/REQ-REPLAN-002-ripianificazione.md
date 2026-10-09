# REQ-REPLAN-002 — Ripianificazione minima con spiegazione

| Campo | Valore |
|---|---|
| Stato | Bozza per `requirement propose` |
| Versione | 1.0 |
| Ondata | 1 — Motore |
| Dipende da | REQ-ITIN-002, REQ-FEAS-001, REQ-REPLAN-001 |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-REPLAN-002`, una pull request |

## Obiettivo

Dato un imprevisto, proporre una nuova versione dell'itinerario che cambia solo ciò che serve e spiega perché. Rispettare le priorità del viaggiatore e gli elementi a orario fisso. Quando un imprevisto tocca una prenotazione, un volo o un treno, segnalarlo e proporre alternative con link. TravelOps non agisce mai sulle prenotazioni.

## Operazioni

| Operazione | Input | Output |
|---|---|---|
| Proponi ripianificazione | viaggio (versione corrente) e numero della versione, catalogo, sorgente dei dati di contesto, imprevisto | proposta (`modello-dominio.md` §2.6) |
| Accetta / rifiuta | storico, proposta, nome, momento | con REQ-ITIN-002: nuova versione / nessuna versione |
| Demo | — | gli scenari S1–S8 stampati a terminale |

## Regole generali

- **R-1** *Cambia il minimo.* Si modificano solo gli elementi colpiti e gli spostamenti immediatamente prima e dopo di essi nella stessa giornata. Per un ritardo si possono modificare anche gli elementi successivi della stessa giornata, ma solo se servono a renderla fattibile. Gli altri giorni restano identici.
- **R-2** *Orario fisso.* Un elemento a orario fisso non viene mai spostato né rimosso; se è colpito, è a rischio.
- **R-3** *Fattibilità.* L'itinerario proposto non ha problemi bloccanti né avvisi `METEO_AVVERSO` sugli elementi cambiati. Il controllo usa i dati di contesto arricchiti con l'imprevisto: un `METEO_AVVERSO` vale come previsione avversa nella sua zona e nel suo intervallo, una `CHIUSURA_LUOGO` come chiusura straordinaria. Se non è possibile, la proposta è "non fattibile" e indica problemi ed elementi a rischio (`modello-dominio.md` §2.6).
- **R-4** *Spiegazione.* Per ogni modifica dice cosa cambia (prima → dopo) e perché, citando l'imprevisto, in linguaggio semplice. Spiega anche perché un elemento è a rischio ed elenca le alternative.
- **R-5** *Accettazione.* La proposta diventa una versione solo se accettata (REQ-ITIN-002).
- **R-6** Le attività non vengono mai accorciate sotto la durata tipica.
- **R-7** *Irrinunciabili.* Un'attività irrinunciabile non viene mai sostituita né rimossa. Se è colpita da un meteo avverso o da una chiusura, la proposta la lascia al suo posto, la segnala a rischio e la spiegazione chiede al viaggiatore come vuole procedere.
- **R-8** Gli elementi creati ricevono gli id nuovi secondo `modello-dominio.md` §2.1.

## Sostituzione di un'attività (`METEO_AVVERSO`, `CHIUSURA_LUOGO`)

- **R-SOS-1** *Finestra.* Va dalla fine dell'elemento non colpito che precede lo spostamento di andata (se non c'è, dall'inizio dello spostamento di andata) all'inizio dell'elemento non colpito che segue lo spostamento di ritorno (se non c'è, fino alle 24:00). Senza spostamento di andata, la finestra parte dalla fine dell'elemento che precede l'attività colpita o, se non c'è, dal suo inizio. Il viaggiatore entra nella finestra dal luogo in cui si trova e ne esce verso il luogo dell'elemento successivo; se non c'è, verso l'alloggio della notte; se manca anche quello (ultimo giorno), verso il luogo di arrivo dello spostamento di ritorno originale. Senza spostamento di ritorno non c'è un luogo di uscita.
- **R-SOS-2** *Candidate.* Attività del catalogo nella **stessa zona**, non già presenti nell'itinerario, mai di categoria `pasto`, al coperto se l'imprevisto è meteo, in un luogo diverso se l'imprevisto è una chiusura.
- **R-SOS-3** *Collocazione.* Inizio = il più tardi tra (inizio finestra + tempo di andata) e apertura del luogo; durata = durata tipica; deve finire entro la chiusura, e fine + tempo di ritorno deve stare entro la fine della finestra. Lo spostamento di andata termina all'inizio dell'attività; quello di ritorno parte alla sua fine. I tempi sono quelli del mezzo più veloce.
- **R-SOS-4** *Scelta.* Tra le candidate collocabili: prima quelle della stessa categoria; poi minor tempo totale di spostamento; poi inizio più vicino a quello originale; poi `id` alfabetico.
- **R-SOS-5** *Nessuna candidata.* L'attività viene rimossa. I due spostamenti attorno diventano uno solo, dal luogo precedente al luogo di uscita (R-SOS-1), con il mezzo più veloce, che parte all'orario dello spostamento di andata originale (o, se non c'è, all'inizio dell'attività rimossa). Lo spostamento unico mantiene l'id di quello di andata (o, se non c'è, di quello di ritorno); l'altro viene rimosso. Se i due luoghi coincidono, entrambi gli spostamenti vengono rimossi. Se tra i due luoghi non c'è percorso, lo spostamento unico non viene creato e l'elemento successivo, se c'è, è a rischio.
- **R-SOS-6** L'attività sostituita viene rimossa e la nuova è un elemento nuovo, con un id nuovo; gli spostamenti ricalcolati mantengono il loro `id`.

## Ritardo (`RITARDO`)

- **R-RIT-2** Prima si prova a **posticipare**: si applica lo slittamento di R-RIT-1 (REQ-REPLAN-001), tranne agli elementi a orario fisso, che restano al loro orario; l'elemento che segue un elemento a orario fisso inizia al più tardi tra il suo inizio previsto e la fine dell'elemento precedente. Se la giornata risulta fattibile, la proposta è quella.
- **R-RIT-3** Altrimenti si cerca il più piccolo insieme di attività colpite **rimovibili** (non irrinunciabili e non a orario fisso) la cui rimozione rende la giornata fattibile. Dopo le rimozioni si ricalcola lo slittamento: gli elementi tornano al loro orario previsto se lo slittamento non li raggiunge più. Gli spostamenti restano dove sono. Tra insiemi della stessa dimensione si sceglie, nell'ordine: quello con meno attività di categoria `pasto`; quello con meno attività `desiderate` (cioè si tolgono prima le `opzionali`); quello le cui attività iniziano prima; l'ordine alfabetico degli `id`.
- **R-RIT-4** Se nessun insieme funziona, la proposta è il posticipo di R-RIT-2: è "non fattibile", indica i problemi e gli elementi a rischio, e la spiegazione chiede al viaggiatore come vuole procedere.

## Cancellazione di uno spostamento (`CANCELLAZIONE_SPOSTAMENTO`)

- **R-CAN-1** Si usa il mezzo più veloce tra gli altri disponibili per la stessa coppia di luoghi, con la stessa partenza. Lo spostamento mantiene l'id, cambia mezzo e durata, perde prenotazione e orario fisso. Se arriva più tardi, i successivi si trattano come un `RITARDO` con momento uguale all'inizio dello spostamento e minuti pari alla differenza tra il nuovo e il vecchio arrivo (R-RIT-2…R-RIT-4).
- **R-CAN-2** Se non c'è un altro mezzo, la proposta non cambia l'itinerario, segnala lo spostamento a rischio e la spiegazione chiede al viaggiatore come vuole procedere.

## Alternative con link

- **R-ALT-1** Le alternative si aggiungono per lo spostamento cancellato e per ogni elemento a rischio che ha una prenotazione o è uno spostamento in `volo` o in `treno`.
- **R-ALT-2** Per ogni elemento, in quest'ordine:
  1. `gestione_prenotazione`, se la prenotazione ha un link di gestione. Etichetta "Gestisci la prenotazione `<codice>` (`<fornitore>`)"; indirizzo: il link.
  2. `ricerca_voli`, se lo spostamento è in volo. Etichetta "Cerca voli da `<partenza>` a `<arrivo>` il `<data>`"; indirizzo `https://www.google.com/travel/flights?q=` seguito dal testo "Voli da `<nome partenza>` a `<nome arrivo>` il `<AAAA-MM-GG>`" codificato per URL (spazi come `%20`).
  3. `ricerca_treni`, se lo spostamento è in treno. Etichetta "Cerca treni da `<partenza>` a `<arrivo>` il `<data>` su Trainline"; indirizzo `https://www.thetrainline.com/it`.
- **R-ALT-3** Le alternative non cambiano l'itinerario. Il motore costruisce gli indirizzi senza aprirli né chiamare la rete.

## Risultati attesi

| Scenario | Proposta attesa | Esito |
|---|---|---|
| S1 pioggia | Finestra 08:40–13:20, da `HOTEL` a `RIST-RIVA`. Candidate `A-MAG` (10:00–12:00, spostamenti 10 + 5 minuti) e `A-CANTINA` (10:00–11:30, 15 + 15 minuti); nessuna è di categoria natura, vince il minor tempo di spostamento: `A-MAG`. La proposta coincide con P-S1. | fattibile |
| S2 ritardo breve | Posticipo: `D3-E1` 09:00–10:20, `D3-E2` 10:20–12:20, `D3-E3` 12:20–12:30, `D3-E4` 12:30–13:30; `D3-E5`…`D3-E7` invariati. | fattibile |
| S3 foratura | Il posticipo non funziona (`D3-E2` finirebbe alle 13:50, il castello la domenica chiude alle 13:00). Si rimuove `D3-E2`: `D3-E1` termina alle 11:50, `D3-E3`…`D3-E7` restano agli orari previsti. | fattibile |
| S4 chiusura | Nessuna candidata (in zona `TRENTO` il castello è già nell'itinerario, il pranzo è un pasto). `D3-E6` e `D3-E7` rimossi; `D3-E5` diventa auto `RIST-TRENTO` → `HOTEL`, 13:30–14:20. | fattibile |
| S5 cancellazione | Itinerario invariato; `D3-E1` a rischio; nessuna alternativa (auto, senza prenotazione). | fattibile |
| S6 castello irrinunciabile | Nessun insieme di rimozioni funziona: posticipo con gli orari di S3 (REQ-REPLAN-001 CA-3). | non fattibile: `FUORI_ORARIO` su `D3-E2` e su `D3-E4`; a rischio `D3-E2` e `D3-E4` |
| S7 volo cancellato | Itinerario invariato; `D3-E9` a rischio. Alternative: `gestione_prenotazione` "Gestisci la prenotazione XY123 (Compagnia aerea di esempio)" → `https://example.com/prenotazioni/XY123`; `ricerca_voli` → `https://www.google.com/travel/flights?q=Voli%20da%20Aeroporto%20di%20Verona%20a%20Aeroporto%20di%20Roma%20Fiumicino%20il%202026-06-14`. | fattibile |
| S8 ritardo verso l'aeroporto | `D3-E8` 17:30–19:45; `D3-E9` resta 19:30–20:35 (orario fisso). Alternative per `D3-E9` come in S7. | non fattibile: `SOVRAPPOSIZIONE` tra `D3-E8` e `D3-E9`; a rischio `D3-E8` e `D3-E9` |

## Criteri di accettazione

- **CA-1…CA-8** Per ciascuno degli scenari S1…S8 la proposta coincide con quella attesa: modifiche, orari, esito, problemi, elementi a rischio e alternative.
- **CA-9** In una variante di S4 con `D3-E6` irrinunciabile, la proposta non cambia l'itinerario, è non fattibile (`LUOGO_CHIUSO` su `D3-E6`) e segnala `D3-E6` a rischio.
- **CA-10** In una variante che aggiunge tra `HOTEL` e `BUONCONSIGLIO` un tempo di 80 minuti in `mezzi_pubblici`, lo scenario S5 propone `D3-E1` in mezzi pubblici 09:00–10:20 e posticipa `D3-E2`…`D3-E4` come in S2; fattibile.
- **CA-11** Un elemento a orario fisso colpito da un ritardo resta al suo orario ed è a rischio (verificato da S8).
- **CA-12** Ogni proposta ha una spiegazione che nomina ogni elemento cambiato, l'orario prima e dopo, l'imprevisto, gli elementi a rischio e le etichette delle alternative.
- **CA-13** A parità di input la proposta è identica, compresi id nuovi e testo della spiegazione.
- **CA-14** `npm run demo` mostra a terminale, per ciascuno degli scenari S1–S8: imprevisto, impatto, modifiche proposte, spiegazione, esito, elementi a rischio e alternative; per S1 mostra anche la versione 2 creata dopo l'accettazione.

## Campi per il plugin

- **Sintesi** (`--summary`): ripianificazione minima per meteo avverso, chiusure, ritardi e cancellazioni: sostituzione, posticipo o rimozione secondo regole deterministiche, nel rispetto di priorità e orari fissi, con spiegazione, elementi a rischio e alternative con link; demo a terminale degli scenari S1–S8.
- **Criteri** (`--acceptance`): CA-1…CA-14.
- **Fuori perimetro** (`--non-goal`): prenotazioni, cancellazioni o pagamenti presso fornitori; apertura dei link; più imprevisti nella stessa proposta; modifiche richieste dal viaggiatore (REQ-EDIT-001).
- **Vincoli** (`--constraint`): regole comuni del motore (`modello-dominio.md` §3).
- **Percorsi** (`--write-path`): `packages/engine/src/replanning`, `packages/engine/src/demo`, `packages/engine/src/model`, `packages/engine/src/index.ts`, `packages/engine/test/replanning`, `packages/engine/package.json`, `package.json`, `package-lock.json`, `docs`, `evidence`.
