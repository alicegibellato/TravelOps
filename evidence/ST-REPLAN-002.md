# Prove di consegna: ST-REPLAN-002

## Cosa è stato chiesto

Il requisito REQ-REPLAN-002 "Ripianificazione minima con spiegazione": dato un imprevisto, proporre una nuova versione dell'itinerario che cambia solo ciò che serve e spiega perché, rispettando priorità del viaggiatore ed elementi a orario fisso. Per meteo avverso e chiusure si sostituisce l'attività colpita (o la si rimuove); per i ritardi si posticipa o si rimuove il minimo; per le cancellazioni si cambia mezzo. Quando un imprevisto tocca una prenotazione, un volo o un treno, la proposta segnala l'elemento a rischio e propone alternative con link, senza mai agire sulle prenotazioni. La proposta diventa una versione solo se accettata (REQ-ITIN-002). La demo a terminale (`npm run demo`) mostra gli scenari S1–S8. Story `ST-REPLAN-002`, una pull request da `feature/ST-REPLAN-002` verso `main`.

## Perimetro ed esclusioni

- **Comprende:** l'operazione "Proponi ripianificazione" con le regole R-1…R-8, R-SOS-1…R-SOS-6, R-RIT-2…R-RIT-4, R-CAN-1…R-CAN-2, R-ALT-1…R-ALT-3; la spiegazione in italiano; l'accettazione e il rifiuto tramite le funzioni dello storico già esistenti (`applicaProposta`, `rifiutaProposta`); la demo degli scenari S1–S8 con la versione 2 dopo l'accettazione di S1; i test di CA-1…CA-14.
- **Esclude:** prenotazioni, cancellazioni o pagamenti presso fornitori; apertura dei link; più imprevisti nella stessa proposta; modifiche richieste dal viaggiatore (REQ-EDIT-001, scenari M1–M6); la web app (`apps/`).
- **Deviazioni:** nessuna dal requisito. Non sono stati toccati `src/model/index.ts` (i tipi nuovi stanno nel modulo replanning) né `src/index.ts`, che esporta già `./replanning/index.js` con `export *`: bastano gli export aggiunti in `src/replanning/index.ts`. Nessuna dipendenza nuova.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Operazione "Proponi ripianificazione": impatto, scelta della regola, modifiche, fattibilità, elementi a rischio, alternative, spiegazione | `packages/engine/src/replanning/proposta.ts` |
| Sostituzione o rimozione dell'attività colpita (R-SOS-1…R-SOS-6, R-2, R-7, R-8) | `packages/engine/src/replanning/sostituzione.ts` |
| Ritardo: posticipo con orari fissi fermi, insieme minimo di rimozioni, posticipo non fattibile (R-RIT-2…R-RIT-4) | `packages/engine/src/replanning/ritardo.ts` |
| Cancellazione di uno spostamento: mezzo più veloce alternativo o itinerario invariato (R-CAN-1, R-CAN-2) | `packages/engine/src/replanning/cancellazione.ts` |
| Alternative con link costruiti senza rete (R-ALT-1…R-ALT-3) | `packages/engine/src/replanning/alternative.ts` |
| Sorgente dei dati di contesto arricchita con l'imprevisto e valutazione della fattibilità (R-3) | `packages/engine/src/replanning/contesto.ts` |
| Spiegazione in linguaggio semplice (R-4, CA-12) e descrizione dell'imprevisto | `packages/engine/src/replanning/spiegazione.ts` |
| Stato di lavoro della ripianificazione (copia del viaggio e ragioni raccolte) | `packages/engine/src/replanning/lavoro.ts` |
| Supporto: orari, indice del catalogo, posizione del viaggiatore, ordinamenti stabili | `packages/engine/src/replanning/supporto.ts` |
| Export del modulo: `proponiRipianificazione`, `PropostaRipianificazione`, `arricchisciSorgente`, `costruisciAlternative`, `INDIRIZZO_RICERCA_VOLI`, `INDIRIZZO_RICERCA_TRENI`, `descriviImprevisto` | `packages/engine/src/replanning/index.ts` |
| Testo della demo S1–S8 con accettazione di S1 (funzione `testoDemo`) | `packages/engine/src/demo/scenari.ts` |
| `npm run demo` stampa il testo della demo | `packages/engine/src/demo/main.ts` |
| Test di CA-1…CA-13 e di altre regole | `packages/engine/test/replanning/ripianificazione.test.ts` |
| Test di CA-14 sul testo della demo | `packages/engine/test/replanning/demo.test.ts` |
| Prove di consegna | `evidence/ST-REPLAN-002.md` |

## Perché

- **Firma.** `proponiRipianificazione(viaggio, versioneBase, catalogo, sorgente, imprevisto)` segue la tabella delle operazioni e restituisce una `Proposta` del modello (`PropostaRipianificazione` la estende solo tipizzando l'impatto come `ImpattoDettagliato`). Accettazione e rifiuto restano quelle di REQ-ITIN-002: nessun doppione.
- **Riuso del motore.** L'impatto e lo slittamento R-RIT-1 vengono da `calcolaImpatto`; la fattibilità da `controllaFattibilita`/`eFattibile`; le modifiche (aggiunti, rimossi, modificati con prima e dopo) da `confrontaItinerari` dello storico; il giorno della settimana da `feasibility/orari.ts`. Dopo una rimozione (R-RIT-3) lo slittamento si ricalcola richiamando `calcolaImpatto` sul giorno ridotto, così "gli elementi tornano al loro orario se lo slittamento non li raggiunge più" senza riscrivere la simulazione. *Scartato:* una seconda simulazione del ritardo nel modulo, che avrebbe duplicato R-RIT-1.
- **R-3, dati arricchiti.** `arricchisciSorgente` avvolge la sorgente ricevuta: un `METEO_AVVERSO` diventa una previsione avversa, una `CHIUSURA_LUOGO` una chiusura straordinaria; la sorgente originale non cambia. L'esito "fattibile" è: nessun problema bloccante e nessun avviso `METEO_AVVERSO` sugli elementi aggiunti o modificati.
- **Elementi a rischio** (`modello-dominio.md` §2.6): (a) elementi a orario fisso colpiti dall'imprevisto (anche da un ritardo derivato da R-CAN-1); (b) se la proposta non è fattibile, gli elementi dei problemi bloccanti; (c) R-7 (irrinunciabile colpita), R-CAN-2 (nessun altro mezzo), R-SOS-5 (manca il percorso: l'elemento successivo). Sono ordinati per data, inizio e `id`.
- **Alternative.** Si costruiscono per lo spostamento cancellato (com'era prima, con la prenotazione) e per ogni elemento a rischio, nell'ordine dell'itinerario e, per elemento, nell'ordine di R-ALT-2; un elemento compare una volta sola. L'indirizzo della ricerca voli usa `encodeURIComponent`, che codifica gli spazi come `%20`.
- **Id nuovi (R-8).** La sostituta riceve `N<prossimo numero>` e il numero aumenta; le attività colpite si trattano in ordine di data e inizio, quindi gli id nuovi seguono l'ordine di inizio. In S1 la sostituta è `N1` e il prossimo numero diventa 2, come in P-S1.
- **Spiegazione (R-4).** Il testo nasce da dati strutturati raccolti durante la ripianificazione (un "perché" per ogni elemento cambiato, una nota per ogni scelta) e dalle modifiche finali: imprevisto con i nomi di zone e luoghi, elementi colpiti, scelta della sostituta con le candidate e il criterio decisivo, modifiche in ordine di orario con "prima → dopo" e perché, esito e problemi, elementi a rischio con il perché, alternative con etichetta e indirizzo, la domanda "Come vuoi procedere?" quando serve una decisione del viaggiatore, e il promemoria che la proposta diventa versione solo se accettata.
- **Determinismo (CA-13).** Nessun orologio, nessuna casualità, nessuna rete; ordinamenti stabili con confronti sui caratteri (niente `localeCompare`); il viaggio ricevuto viene copiato e mai modificato.
- **Demo testabile (CA-14).** Il testo della demo è prodotto da `testoDemo()` in `src/demo/scenari.ts`, che legge i dati di riferimento del pacchetto; `main.ts` lo stampa soltanto. Così il test copre la stessa funzione che usa `npm run demo`.

### Interpretazioni del requisito

- **Sostituzione senza spostamento di andata o di ritorno.** R-SOS-1 dice che senza ritorno "non c'è un luogo di uscita" ma non dice come raggiungere una sostituta in un altro luogo. Per non creare spostamenti nuovi (R-1 permette di modificare solo quelli esistenti) una candidata è collocabile senza andata solo se è nel luogo in cui si trova il viaggiatore, e senza ritorno solo se è nel luogo dell'elemento successivo (o dell'alloggio); se non segue nulla non c'è vincolo. *Scartato:* creare spostamenti nuovi, non previsto dalle regole.
- **Spostamenti a orario fisso** accanto all'attività colpita non vengono trattati come andata o ritorno (R-2: non si spostano); valgono come elemento precedente o successivo.
- **Sostituta nello stesso luogo di ingresso o di uscita.** Lo spostamento che non serve più (da un luogo a sé stesso) viene rimosso, come in R-SOS-5 quando i luoghi coincidono.
- **Priorità della sostituta.** Eredita quella dell'attività sostituita (in S1 `desiderata`, come in P-S1).
- **Fasce di apertura.** Una candidata si colloca nella prima fascia del giorno in cui sta interamente (R-SOS-3); "sempre aperto" vale come 00:00–24:00.
- **Etichette delle alternative.** In "Cerca voli da `<partenza>` a `<arrivo>` il `<data>`" si usano i nomi dei luoghi (come nel testo della ricerca) e la data `AAAA-MM-GG`; il requisito fissa esattamente solo l'indirizzo.
- **R-CAN-1 con arrivo più tardi.** Lo spostamento, con il nuovo mezzo ma ancora la vecchia fine, si tratta come "in corso" al momento della partenza: il ritardo di `differenza` minuti lo porta alla nuova fine e fa slittare i successivi (R-RIT-2…R-RIT-4). Uno spostamento cancellato che era a orario fisso resta tra gli elementi a rischio per la regola (a) di §2.6, anche se il nuovo mezzo lo sostituisce.
- **Ritardo oltre la mezzanotte.** Un posticipo che porta un elemento oltre le 24:00 (non ammesso, §2.5) produce un problema bloccante `FUORI_GIORNATA` (codice di REQ-ITIN-001) su quell'elemento; il resto della giornata passa dal controllo di REQ-FEAS-001.
- **Irrinunciabile sotto la pioggia (R-7).** L'attività resta al suo posto con l'avviso `METEO_AVVERSO`, che non è bloccante e non riguarda un elemento cambiato: la proposta risulta fattibile, ma l'elemento è a rischio e la spiegazione chiede come procedere.

### Verifica dei risultati attesi con i dati

Tutti i risultati attesi della tabella del requisito tornano con i dati di riferimento, compresi i dettagli: in S1 la finestra 08:40–13:20 e le candidate `A-MAG` (10:00–12:00, 10 + 5 minuti) e `A-CANTINA` (10:00–11:30, 15 + 15 minuti); in S3 l'unico insieme di una sola attività che funziona è {`D3-E2`} (togliere il pranzo o il MUSE lascia il castello fuori orario); in S6 né {`D3-E4`}, né {`D3-E6`}, né {`D3-E4`, `D3-E6`} rendono fattibile la giornata.

## Verifica

Eseguito su Windows 11 con Node 22.22.2 e npm 10.9.7, dalla radice della copia di lavoro: `npm ci` (0 vulnerabilità), `npm run build` (nessun errore, motore e web app), `npm test` (motore: 19 file, 284 test superati, di cui 37 nei due file nuovi; web app: 7 file, 46 test superati), `npm run demo` (stampa gli scenari S1–S8 e, dopo S1, la versione 2 creata dall'accettazione di "Alice" il 2026-06-13 alle 07:30). Prima della modifica il motore aveva 17 file e 247 test.

| Criterio | Test che lo copre (file › nome) | Esito |
| --- | --- | --- |
| CA-1 S1 pioggia: coincide con P-S1 | `test/replanning/ripianificazione.test.ts` › "CA-1 S1 pioggia: sostituzione con A-MAG, la proposta coincide con P-S1" | superato |
| CA-2 S2 ritardo breve: posticipo | › "CA-2 S2 ritardo breve: posticipo di D3-E1…D3-E4, D3-E5…D3-E7 invariati, fattibile" | superato |
| CA-3 S3 foratura: rimozione di `D3-E2` | › "CA-3 S3 foratura: il posticipo non basta, si rimuove D3-E2 e il resto torna in orario" | superato |
| CA-4 S4 chiusura: nessuna candidata, unico spostamento | › "CA-4 S4 chiusura del MUSE: nessuna candidata, D3-E6 e D3-E7 rimossi, D3-E5 auto RIST-TRENTO → HOTEL 13:30–14:20" | superato |
| CA-5 S5 cancellazione: invariato, `D3-E1` a rischio | › "CA-5 S5 cancellazione senza altro mezzo: itinerario invariato, D3-E1 a rischio, nessuna alternativa" | superato |
| CA-6 S6 castello irrinunciabile: non fattibile | › "CA-6 S6 castello irrinunciabile: nessuna rimozione funziona, posticipo con gli orari di S3, non fattibile" | superato |
| CA-7 S7 volo cancellato: alternative con link | › "CA-7 S7 volo cancellato: itinerario invariato, D3-E9 a rischio, alternative con link" | superato |
| CA-8 S8 ritardo verso l'aeroporto: sovrapposizione | › "CA-8 S8 ritardo verso l'aeroporto: D3-E8 17:30–19:45, D3-E9 fermo, sovrapposizione, non fattibile" | superato |
| CA-9 variante di S4 con `D3-E6` irrinunciabile | › "CA-9 variante di S4 con D3-E6 irrinunciabile: itinerario invariato, LUOGO_CHIUSO su D3-E6, a rischio" | superato |
| CA-10 variante di S5 con mezzi pubblici 80 minuti | › "CA-10 variante di S5 con mezzi pubblici HOTEL–BUONCONSIGLIO in 80 minuti: D3-E1 09:00–10:20, posticipo come S2" | superato |
| CA-11 elemento a orario fisso fermo e a rischio | › "CA-11 un elemento a orario fisso colpito da un ritardo resta al suo orario ed è a rischio (S8)" | superato |
| CA-12 spiegazione completa | › "CA-12 la spiegazione nomina elementi cambiati, orari prima e dopo, imprevisto, elementi a rischio e alternative" (8 casi, S1…S8) | superato |
| CA-13 determinismo | › "CA-13 a parità di input la proposta è identica, compresi id nuovi e spiegazione; l'input non cambia"; `test/replanning/demo.test.ts` › "è deterministica" | superato |
| CA-14 demo S1–S8 e versione 2 | `test/replanning/demo.test.ts` › "mostra gli scenari S1–S8 in ordine", "per ogni scenario mostra imprevisto, impatto, modifiche, spiegazione, esito, elementi a rischio e alternative", "mostra esiti, elementi a rischio e alternative attesi", "per S1 mostra la versione 2 creata dopo l'accettazione"; prova manuale di `npm run demo` (uscita 0, 8 scenari stampati) | superato |

Altri test nello stesso file: accettazione e rifiuto (R-5), id nuovi dal prossimo numero (R-8), stessa categoria prima di tutto (R-SOS-4), irrinunciabile sotto la pioggia (R-7), attività a orario fisso colpita (R-2), i tre criteri di scelta tra insiemi della stessa dimensione (R-RIT-3), ricerca treni (R-ALT-2), sorgente arricchita (R-3), imprevisto senza elementi colpiti, ritardo oltre la mezzanotte.

## Collegamenti

- Requisito `REQ-REPLAN-002`, fonte `docs/requirements/REQ-REPLAN-002-ripianificazione.md`
- Story `ST-REPLAN-002`
- Contratto `contract-ST-REPLAN-002-implementation`
- Consegna `AUT-PR-REPLAN-002` (branch `feature/ST-REPLAN-002` verso `main`)
- Dipendenze: `REQ-REPLAN-001` (impatto), `REQ-FEAS-001` (fattibilità), `REQ-ITIN-002` (versioni e storico)
- Fonti condivise: `docs/requirements/modello-dominio.md`, `docs/requirements/dati-di-riferimento.md`
