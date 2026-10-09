# Prove di consegna: ST-PLAN-001

## Cosa è stato chiesto

Il requisito REQ-PLAN-001 "Prima bozza dell'itinerario" (ondata 2, CR-001 §9.7): dal profilo delle preferenze e dall'istantanea della destinazione già scelta, il motore genera una bozza completa, fattibile e ripetibile, con le regole R-1…R-9:

- R-1 profilo e istantanea già scelta (anche per "sorprendimi"), nessuna rete; R-2 alloggio con la fascia più vicina al budget; R-3 attività per giorno secondo il ritmo, con primo e ultimo giorno dimezzati se ci sono arrivo e partenza;
- R-4 scelta in ordine di punteggio, ogni attività una volta, prima gli irrinunciabili, uno stile del profilo ogni giorno, al più un'attività `impegnativa` al giorno;
- R-5 collocazione nella finestra del profilo, nell'ordine che minimizza gli spostamenti, negli orari di apertura, con pranzo (12:00–14:30) e cena (19:00–21:30) nel ristorante più vicino compatibile con le esigenze alimentari;
- R-6 verifica con REQ-FEAS-001, togliendo l'attività coinvolta col punteggio più basso e riprovando al massimo 3 volte; R-7 frase "perché te lo propongo" per ogni giorno; R-8 determinismo; R-9 "Mostrami un'alternativa".

Criteri CA-1…CA-7. Dopo il merge di ST-CAT-002 (PR #21) CA-1 e CA-6 sono verificati anche sulle 3 istantanee precaricate (Garda, Dolomiti – Val di Fassa, Roma); PR-4 ("sorprendimi") resta sull'istantanea di prova finché ST-CAT-002C non pubblica i candidati. Story `ST-PLAN-001`, una pull request da `feature/ST-PLAN-001`.

## Perimetro ed esclusioni

- **Comprende:**
  - il nuovo modulo `packages/engine/src/planning` con `generaBozza`, `generaAlternativa` e le funzioni di supporto `attivitaDaSostituire`, `attivitaPrevistePerGiorno`, `scegliAlloggio`;
  - l'export del modulo dal pacchetto (una riga in `packages/engine/src/index.ts`);
  - i test di R-1…R-9 e CA-1…CA-7, un'istantanea di prova (dato di test) e la bozza di riferimento di PR-1;
  - la descrizione delle API in `docs/motore/pianificazione.md`.
- **Esclude** (di altre storie):
  - revisioni della bozza (§7.5), conferma, operazioni di revisione, "rigenera questo giorno": REQ-PLAN-002;
  - riscrittura delle frasi da parte dell'agente e strumenti "genera bozza" e "alternativa": REQ-ORCH-001;
  - le istantanee vere di Garda, Roma e Dolomiti e la scelta della destinazione per "sorprendimi": ST-CAT-002, ST-PREF-001B;
  - più destinazioni nello stesso viaggio, prenotazioni, chiamate di rete (fuori perimetro del requisito).
- **Lasciato fuori di proposito:**
  - nessun tipo nuovo in `packages/engine/src/model`: i tipi della bozza stanno nel modulo `planning`; i campi `stato`, `profilo` e `istantanea` del viaggio (§7.1) arrivano con REQ-PLAN-002 e REQ-DATA-001, la bozza restituisce l'`id` dell'istantanea a parte (`istantaneaId`);
  - nessuna dipendenza del motore da `@travelops/sources`: l'istantanea arriva come `IstantaneaCatalogo` del motore. Solo un test (`istantanea-prova.test.ts`) importa il lettore da `packages/sources/src` per verificare che il dato di test rispetti formato e minimi; build e controllo dei tipi restano verdi;
  - nessun file in `packages/engine/data/`, nessuna dipendenza nuova, nessun test esistente modificato, nulla fuori dai percorsi della storia.
- **Deviazioni:** PR-4 ("sorprendimi") è verificato sull'istantanea di prova, perché la prima destinazione proposta dipende dai candidati di ST-CAT-002C, non ancora su main. Nessun'altra deviazione; le interpretazioni sono in "Perché".

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Tipi: opzioni, bozza, giorno della bozza, attività tolte, finestre dei pasti, predefiniti, `ErroreBozza` | `packages/engine/src/planning/tipi.ts` |
| Collocazione di una giornata (R-5): tempi coi mezzi del profilo, orari di apertura, finestre dei pasti, ristorante più vicino, ordine con meno spostamenti | `packages/engine/src/planning/giornata.ts` |
| Generatore (R-1…R-4, R-6…R-9): alloggio, giorni, scelta a giri, itinerario, verifica e nuovi tentativi, spiegazioni, alternativa | `packages/engine/src/planning/generatore.ts` |
| Punto d'ingresso del modulo | `packages/engine/src/planning/index.ts` |
| Export del modulo dal pacchetto (una riga) | `packages/engine/src/index.ts` |
| Istantanea di prova (DATO DI TEST: Borgo di Prova ampliato a 19 luoghi e 26 attività) | `packages/engine/test/planning/dati/istantanea-prova-planning.json` |
| Supporto ai test: profili PR-1…PR-4, elenco dei casi di CA-1/CA-6 (`CASI_ISTANTANEE`), istantanee sintetiche | `packages/engine/test/planning/supporto.ts` |
| Test di R-1…R-9, CA-2, CA-3, CA-4, CA-5, CA-7 | `packages/engine/test/planning/generatore.test.ts` |
| Test di CA-1 e CA-6 | `packages/engine/test/planning/riferimento.test.ts` |
| Bozza di riferimento di PR-1 (CA-6) | `packages/engine/test/planning/riferimento/bozza-PR-1-garda-2026-10-09.json` (istantanea vera del Garda) e `bozza-PR-1-istantanea-prova-planning.json` |
| L'istantanea di prova rispetta formato e minimi di `@travelops/sources` | `packages/engine/test/planning/istantanea-prova.test.ts` |
| Descrizione delle API per REQ-PLAN-002 e REQ-ORCH-001 | `docs/motore/pianificazione.md` |
| Prove di consegna | `evidence/ST-PLAN-001.md` |

API principali:

```ts
generaBozza(profilo: ProfiloPreferenze, istantanea: IstantaneaCatalogo, opzioni?: OpzioniBozza): BozzaItinerario
generaAlternativa(profilo: ProfiloPreferenze, istantanea: IstantaneaCatalogo,
                  corrente: BozzaItinerario | Viaggio, opzioni?: OpzioniBozza): BozzaItinerario
// OpzioniBozza = { dataInizio?, arrivoEPartenza?, orarioArrivo?, orarioPartenza?, escludi?, sorgente?, idViaggio?, titolo?, fusoOrario? }
// BozzaItinerario = { viaggio, istantaneaId, alloggioId, arrivoId, giorni: GiornoBozza[], problemi, fattibile,
//                     tolte, escluse, irrinunciabiliMancanti, avvisi, spiegazione }
// GiornoBozza = { data, attivitaPreviste, attivita, pasti: { pranzo, cena }, stiliInComune, irrinunciabili,
//                 arrivo, partenza, perche }
```

## Perché

- **Riuso del motore.** Il punteggio e l'ordine vengono da `classificaAttivita`/`valutaAttivita` (§7.7), il numero di attività da `ATTIVITA_PER_RITMO`, la finestra da `FINESTRA_GIORNATA`, la verifica da `controllaFattibilita`/`eFattibile`, i tempi da `creaSorgenteDaDati`: il generatore non duplica regole. La stessa sorgente serve a collocare e a verificare, così ciò che il generatore considera percorribile è ciò che il controllo accetta.
- **Scelta a giri.** Ogni giro dà a ogni giorno la migliore candidata ancora collocabile: le attività migliori e gli irrinunciabili si distribuiscono sui giorni invece di riempire il primo. Chi non trova posto lascia il giorno più leggero con un avviso, non blocca la bozza.
- **Ordine esatto, non euristico.** Con al più 4 attività e 2 pasti al giorno si possono provare tutte le combinazioni (al più 24 ordini × 15 posizioni dei pasti): l'ordine scelto è davvero quello con meno minuti di spostamento, e a parità la regola di scelta è fissa. 14 giorni a ritmo intenso richiedono meno di 50 ms.
- **Fattibile per costruzione.** La collocazione rispetta già continuità, tempi di percorrenza, sovrapposizioni, orari di apertura e durate: la verifica di R-6 interviene per ciò che l'istantanea non dice (chiusure straordinarie passate con la sorgente) e resta comunque il giudice finale.
- **Interpretazioni:**
  - *Arrivo e partenza (R-3).* Il profilo non descrive il viaggio di andata: l'arrivo è lo spostamento dalla stazione (o aeroporto) più vicina all'alloggio, alle 12:00, e la partenza lo spostamento dall'alloggio alla stazione, che arriva alle 17:00 (orari modificabili). I tempi alloggio–stazione sono tra i minimi della §8.1, quelli tra attività e stazione no: per questo l'ultimo giorno si passa dall'alloggio. Senza stazione o aeroporto raggiungibile, o con `arrivoEPartenza: false`, tutti i giorni hanno il numero del ritmo.
  - *Pasti (R-5).* La finestra della giornata del profilo limita le attività; i pasti seguono le loro finestre (con `mattiniero`, 08:00–20:00, la cena delle 19:00 può finire dopo le 20:00, altrimenti non ci starebbe mai). Il pasto inizia e finisce dentro la finestra e negli orari del ristorante. Un pasto la cui finestra finisce prima dell'arrivo o inizia dopo la partenza non è previsto quel giorno; uno che non si può collocare è un avviso. Il ristorante deve avere tutte le esigenze alimentari richieste e non essere escluso dal profilo (per esempio troppo caro o non adatto ai bambini).
  - *Alloggio (R-2).* Distanza tra fascia dell'alloggio e budget nella scala `gratis` < `€` < `€€` < `€€€`; a parità vince il più economico.
  - *Irrinunciabili per stile (R-4, CA-2).* Ogni attività di uno stile irrinunciabile ha i +5 e va tra le prime; il requisito è rispettato se almeno un'attività di quello stile è nella bozza.
  - *Stile ogni giorno (R-4).* All'ultimo posto libero di un giorno ancora senza stili del profilo si richiede una candidata con uno stile in comune; se nessuna è collocabile, si accetta la prima collocabile.
  - *Quale attività togliere (R-6).* Tra le coinvolte nei problemi bloccanti, prima le non irrinunciabili, poi il punteggio più basso, poi l'`id`. Dopo ogni rimozione si rigenera tutta la bozza senza quell'attività; al massimo 3 rimozioni.
  - *Alternativa (R-9).* Si escludono le attività non irrinunciabili della bozza corrente, una per ogni sostituto non usato con punteggio positivo; se i sostituti sono meno, si escludono prima le meno adatte, così l'alternativa resta vicina al profilo.
  - *Date per mese.* Con `{ tipo: "mese" }` la bozza parte il primo giorno del mese, salvo `opzioni.dataInizio`.
  - *"Sorprendimi" (R-1).* Il generatore non guarda `profilo.destinazione`: usa l'istantanea ricevuta, che per "sorprendimi" è quella della destinazione scelta tra le proposte.

## Verifica

Eseguito dalla radice della copia di lavoro: `npm ci`, `npm run build` (esito 0) e `npm test` con `CI=true` (esito 0): motore 33 file e 638 test superati, di cui 3 file e 65 test nuovi; sources 6 file e 56 test; web 37 file e 281 test. Prova a campione: con la metà per difetto in R-3 e senza il limite di un'attività impegnativa al giorno falliscono 3 test; il codice è stato ripristinato.

| Regola o criterio | Test (`packages/engine/test/planning/`) | Esito |
| --- | --- | --- |
| R-1 Profilo e istantanea già scelta, niente rete | `generatore.test.ts` › "R-1": `fetch` sostituito non viene mai chiamato e l'istantanea non cambia; PR-4 ("sorprendimi") usa l'istantanea ricevuta; viaggio valido per REQ-ITIN-001 per PR-1…PR-4; date precise, per mese e indicate | superato |
| R-2 Alloggio | "R-2": budget `€`, `€€` (parità → il più economico), `€€€`; stesso alloggio tutte le notti, nessuno l'ultima | superato |
| R-3 e CA-3 Attività per giorno | "R-3 e CA-3": `[1,2,2,1]` PR-1, `[2,4,4,4,2]` PR-2, `[2,3,2]` PR-3, `[1,2,1]` PR-4; spostamenti di arrivo (12:00) e partenza (17:00); senza arrivo e partenza tutti i giorni pieni | superato |
| R-4 Scelta | "R-4": ogni attività una volta, uno stile del profilo ogni giorno, al più un'impegnativa al giorno (anche su un'istantanea sintetica dove tre impegnative sono le migliori); nessuna esclusa con punteggio più alto di una scelta; irrinunciabile a punteggio basso inserito con priorità `irrinunciabile` | superato |
| R-5 Collocazione | "R-5": attività dentro la finestra del profilo e pasti nelle loro finestre per PR-1…PR-4; pranzo e cena se richiesti (PR-3 senza cena); vegetariano + senza glutine → solo la trattoria; ristorante più vicino; ordine con il minimo dei minuti di spostamento rispetto a tutti gli ordini possibili; museo chiuso il lunedì mai collocato di lunedì; nessun problema bloccante | superato |
| R-6 Verifica | "R-6": chiusura straordinaria → attività tolta (`LUOGO_CHIUSO`), bozza fattibile e spiegazione; tolta quella col punteggio più basso; con tutto chiuso 3 tentativi e bozza restituita con problemi e spiegazione; avvisi `ORARI_DA_VERIFICARE` senza rimozioni | superato |
| R-7 Perché te lo propongo | "R-7": frase per ogni giorno con gli stili in comune, l'irrinunciabile del giorno, arrivo e partenza | superato |
| R-8 e CA-5 Determinismo | "R-8 e CA-5": stessa bozza 5 volte per PR-1…PR-4; stessa bozza con luoghi, attività e tempi in ordine rovesciato | superato |
| R-9 Alternativa | "R-9": nessuna attività della bozza corrente se ci sono sostituti; stessa forma dei giorni; irrinunciabili tenuti; con pochi sostituti si escludono solo quante si possono sostituire, le meno adatte | superato |
| CA-1 Nessun problema bloccante (PR-1…PR-4) | `riferimento.test.ts` › "CA-1" sui casi di `CASI_ISTANTANEE`: PR-1, PR-2, PR-3, PR-4 sull'istantanea di prova | superato: PR-1 su `garda-2026-10-09`, PR-2 su `dolomiti-val-di-fassa-2026-10-09`, PR-3 su `roma-2026-10-09` senza problemi bloccanti; PR-1…PR-4 anche sull'istantanea di prova |
| CA-2 Irrinunciabili sì, da evitare no | "CA-2": irrinunciabili per attività e per stile presenti, nulla da evitare per attività, categoria o stile; nessuna da evitare per PR-1…PR-4; irrinunciabile impossibile segnalato | superato |
| CA-4 Forma fisica e bambini | "CA-4": intensità entro la forma fisica per PR-1…PR-4; con bambini (PR-3) solo attività adatte, pasti compresi; mobilità ridotta solo accessibili | superato |
| CA-6 Bozza di PR-1 come riferimento | `riferimento.test.ts` › "CA-6": `riferimento/bozza-PR-1-istantanea-prova-planning.json` | superato: bozza di PR-1 sul Garda salvata e confrontata (4 giorni, fattibile, solo avvisi non bloccanti) |
| CA-7 Meno di 2 secondi per 14 giorni | "CA-7": 14 giorni a ritmo intenso su un'istantanea sintetica di 70 attività (meno di 50 ms, 52 attività, fattibile) e sull'istantanea di prova (attività che finiscono: giorni più leggeri con avviso) | superato |
| Dato di test valido | `istantanea-prova.test.ts`: `leggiIstantanea` di `@travelops/sources` con i minimi della §8.1 | superato |
| Nessuna regressione | `npm test` dalla radice | superato (motore 638/638, sources 56/56, web 281/281) |

**CA-1 e CA-6 sulle istantanee vere.** Le istantanee di Garda, Roma e Dolomiti non esistono ancora (ST-CAT-002). Dopo il merge di ST-CAT-002 basta aggiungere a `CASI_ISTANTANEE` in `packages/engine/test/planning/supporto.ts` una riga per PR-1 (Garda), PR-2 (Dolomiti), PR-3 (Roma) e PR-4 (prima destinazione proposta da "sorprendimi") con `istantaneaPrecaricata("<id>")`, poi lanciare una volta `npx vitest run -u` in `packages/engine` per creare `riferimento/bozza-PR-1-<id del Garda>.json`, rileggerlo e aggiungerlo alla pull request.

## Collegamenti

- Requisito: `REQ-PLAN-001` (`docs/requirements/REQ-PLAN-001-prima-bozza.md`)
- Storia: `ST-PLAN-001`
- Contratto: `contract-ST-PLAN-001-implementation`
- Autonomia: `AUT-PR-PLAN-001`
- Branch: `feature/ST-PLAN-001`
- Documentazione: `docs/motore/pianificazione.md`
