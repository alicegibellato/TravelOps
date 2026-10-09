# Prove di consegna: ST-PREF-001A

## Cosa è stato chiesto

La parte motore del requisito REQ-PREF-001 "Preferenze del viaggio" (ondata 2, CR-001 §9.6): "nel motore: tipo del profilo, validazione (campi obbligatori, valori ammessi), punteggio della §7.7". In concreto:

1. il tipo del profilo della §7.2 di `modello-dominio-estensioni.md` in un nuovo modulo `packages/engine/src/preferences`, con la validazione dei campi obbligatori e dei valori ammessi; un profilo incompleto restituisce l'elenco di cosa manca in parole semplici, in italiano, senza codici tecnici nel testo (CA-2, parte del motore);
2. il punteggio delle preferenze della §7.7 coperto da test, comprese le esclusioni (CA-4);
3. i profili PR-1…PR-5 della §8.2 di `dati-di-riferimento-estensioni.md` come dati di riferimento validi, con un punteggio deterministico.

Le API servono alla parte web (ST-PREF-001B: percorso guidato e riepilogo vivo) e al generatore della bozza (ST-PLAN-001): devono essere chiare e documentate. Story `ST-PREF-001A`, una pull request da `feature/ST-PREF-001A`.

## Perimetro ed esclusioni

- **Comprende:**
  - i tipi del profilo (`BozzaProfilo` per il profilo in costruzione, `ProfiloPreferenze` per quello completo), i valori ammessi, i predefiniti della §7.2, le etichette in italiano dei valori e il passo del percorso guidato di ogni campo;
  - `validaProfilo` e `cosaManca`: campi obbligatori, valori ammessi, predefiniti, normalizzazione, coerenza tra irrinunciabili e cose da evitare, problemi con testo semplice;
  - `valutaAttivita`, `punteggioAttivita`, `classificaAttivita`, `confrontaValutazioni`: punti, esclusioni e ordine della §7.7, con i motivi di esclusione in parole semplici;
  - i profili PR-1…PR-5 in `packages/engine/test/preferences/dati/profili-riferimento.json`;
  - la descrizione delle API in `docs/motore/preferenze.md`;
  - i test dei tre criteri.
- **Esclude** (di altre storie):
  - percorso guidato, riepilogo vivo, chat, "Sorprendimi" e criteri CA-1, CA-3 (inserimento dal percorso), CA-5, CA-6 (collaudo), CA-7 di REQ-PREF-001: ST-PREF-001B, REQ-CHAT-001, REQ-CAT-002;
  - il campo `profilo` sul viaggio (§7.1) e l'uso del punteggio in generatore, revisione e ripianificazione: REQ-PLAN-001, REQ-PLAN-002, REQ-REPLAN-004;
  - la scelta del ristorante secondo le esigenze alimentari (REQ-PLAN-001 R-5): le esigenze `vegetariano` e `senza_glutine` sono nel profilo, ma la §7.7 non le usa per le attività.
- **Lasciato fuori di proposito:**
  - nessun tipo nuovo in `packages/engine/src/model`: i tipi del profilo stanno nel modulo `preferences` (esportati dal pacchetto come gli altri), così il modello resta invariato mentre altre storie lavorano in parallelo; chi aggiungerà `profilo` al viaggio importerà `ProfiloPreferenze`;
  - il `README.md` di `data/reference/estensioni/` non è stato aggiornato (la storia può solo aggiungere file in `data/`): il nuovo file è descritto in `docs/motore/preferenze.md`;
  - nessun file fuori dai percorsi della storia; nessuna dipendenza nuova; nessun test esistente modificato.
- **Deviazioni:** nessuna dai criteri. Le interpretazioni della §7.2 e della §7.7 sono in "Perché".

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Tipi del profilo, valori ammessi, predefiniti, significato dei valori (attività per ritmo, intensità massima, finestra della giornata), etichette per il viaggiatore, passo del percorso di ogni campo | `packages/engine/src/preferences/tipi.ts` |
| Validazione e normalizzazione del profilo (`validaProfilo`, `cosaManca`, `daEvitareComprende`) | `packages/engine/src/preferences/validazione.ts` |
| Punteggio della §7.7 (`valutaAttivita`, `punteggioAttivita`, `classificaAttivita`, `confrontaValutazioni`, `PUNTI`, `TESTO_ESCLUSIONE`) | `packages/engine/src/preferences/punteggio.ts` |
| Punto d'ingresso del modulo | `packages/engine/src/preferences/index.ts` |
| Export del modulo dal pacchetto (una riga) | `packages/engine/src/index.ts` |
| Profili di riferimento PR-1…PR-5 | `packages/engine/test/preferences/dati/profili-riferimento.json` |
| Supporto ai test | `packages/engine/test/preferences/supporto.ts` |
| Test del criterio 1 (CA-2) | `packages/engine/test/preferences/profilo.test.ts` |
| Test del criterio 2 (CA-4) | `packages/engine/test/preferences/punteggio.test.ts` |
| Test del criterio 3 (PR-1…PR-5) | `packages/engine/test/preferences/profili-riferimento.test.ts` |
| Descrizione delle API per ST-PREF-001B e ST-PLAN-001 | `docs/motore/preferenze.md` |
| Prove di consegna | `evidence/ST-PREF-001A.md` |

API principali:

```ts
validaProfilo(bozza: unknown, opzioni?: { catalogo?: CatalogoEsteso }): EsitoProfilo
// EsitoProfilo = { ok: true; profilo: ProfiloPreferenze } | { ok: false; problemi: ProblemaProfilo[] }
// ProblemaProfilo = { campo, tipo: "mancante" | "non_valido", passo: 1…5, testo }
cosaManca(bozza: unknown, opzioni?): string[]
valutaAttivita(attivita: AttivitaCatalogoEstesa, profilo: ProfiloPreferenze): ValutazioneAttivita
punteggioAttivita(attivita, profilo): number | null
classificaAttivita(catalogo: CatalogoEsteso | readonly AttivitaCatalogoEstesa[], profilo): { candidate; escluse }
confrontaValutazioni(a: ValutazioneAttivita, b: ValutazioneAttivita): number
```

## Perché

- **Due forme del profilo.** Il percorso guidato e la chat compilano un profilo un pezzo alla volta (`BozzaProfilo`, tutto facoltativo); il generatore ha bisogno di un profilo completo (`ProfiloPreferenze`). `validaProfilo` è l'unico passaggio tra le due: la web app non duplica predefiniti né regole.
- **Normalizzazione.** Elenchi senza ripetizioni e nell'ordine canonico, `id` in ordine alfabetico, età crescenti, testi senza spazi ai lati: filtri e chat che fanno le stesse scelte in ordine diverso danno lo stesso profilo (aiuta CA-3 e CA-6 di ST-PREF-001B) e il punteggio non dipende dall'ordine.
- **Problemi in parole semplici.** Ogni problema ha un campo e un passo (per portare il viaggiatore al controllo giusto) e un testo da mostrare così com'è; i testi non ripetono mai il valore ricevuto, che potrebbe essere un codice, e usano le etichette dei valori.
- **Interpretazioni della §7.2:**
  - "Viaggiatori" è obbligatorio ma ha il predefinito 2 adulti: non risulta mai mancante. Mancano solo destinazione, date e durata.
  - Con date precise la durata si ricava dalle date (se indicata deve coincidere); con il mese è obbligatoria. Con le date assenti si segnala solo il problema delle date, il cui testo chiede già anche quanti giorni.
  - Età dei bambini da 0 a 17 anni; un valore non ammesso non è mai sostituito in silenzio dal predefinito; "stili" e "mezzi" indicati vuoti non sono ammessi ("uno o più").
  - Gli stili predefiniti (`cultura`, `natura`) non comprendono quelli da evitare; uno stile o un'attività non può essere insieme scelto, o irrinunciabile, e da evitare.
- **Interpretazioni della §7.7:**
  - "Tra gli irrinunciabili": l'`id` è tra le attività irrinunciabili oppure uno stile dell'attività è tra gli stili irrinunciabili; i +5 valgono una volta sola.
  - "Tra le cose da evitare": per `id`, per categoria o per uno degli stili dell'attività.
  - "Ci sono bambini": bambini tra i viaggiatori oppure l'esigenza "adatto ai bambini".
  - Un campo della §7.3 assente non si presume favorevole (intensità, accessibile, adatta ai bambini escludono quando il profilo pone quel limite); senza costo nessuna penalità, senza stili nessun punto. Le istantanee della §7.8 hanno sempre questi campi; un catalogo dell'ondata 1 non usa il punteggio.
  - Ordine a parità di punteggio: `id` per codice del carattere (non `localeCompare`), così non dipende dalla lingua del sistema.
  - `classificaAttivita` non toglie pasti e servizi: hanno regole proprie nel generatore (REQ-PLAN-001 R-5, §8.5).
- **Profili di riferimento come file.** PR-1…PR-5 sono scritti con i soli campi della §8.2: i test verificano che i predefiniti completino il resto come atteso, con i predefiniti riscritti per esteso nei test e non presi dal motore.

## Verifica

Eseguito dalla radice della copia di lavoro: `npm ci`, `npm run build` (esito 0) e `npm test` (esito 0): motore 29 file e 558 test superati, di cui 3 file e 50 test nuovi; web 21 file e 149 test superati. Il controllo dei tipi dei test nuovi con le opzioni strette di `tsconfig.base.json` non dà errori. Una prova a campione (+3 cambiato in +2 e soglia di esclusione del costo spostata) fa fallire 12 test, poi il codice è stato ripristinato.

| Criterio | Test | Esito |
| --- | --- | --- |
| 1. Tipo del profilo, campi obbligatori, valori ammessi; cosa manca in parole semplici (CA-2) | `test/preferences/profilo.test.ts` (22 test): bozza vuota e ingressi non oggetto; durata con mese e date precise; campi vuoti come mancanti; ogni valore non ammesso nel suo campo e nell'ordine della §7.2; date, durata, viaggiatori ai limiti; predefiniti della §7.2; tipo di gruppo ricavato; normalizzazione (stesso profilo da filtri e chat); idempotenza e ingresso non modificato; coerenza irrinunciabili e da evitare, anche con il catalogo; testi senza codici, nomi di campo o valori grezzi | superato (22/22) |
| 2. Punteggio della §7.7, comprese le esclusioni (CA-4) | `test/preferences/punteggio.test.ts` (16 test): +3 per stile, +5 irrinunciabile una volta sola, −1 un livello oltre il budget, somma completa; esclusioni per cose da evitare (id, categoria, stile), intensità (9 combinazioni), mobilità ridotta, bambini, costo oltre un livello; più motivi insieme e punteggio `null`; campi assenti; ordine con parità per `id` indipendente dalla lingua e dall'ordine d'ingresso; codice senza rete, orologio, casualità | superato (16/16) |
| 3. PR-1…PR-5 dati validi con punteggio deterministico | `test/preferences/profili-riferimento.test.ts` (12 test): i cinque profili nel file; ognuno valido, anche con il catalogo, e uguale al profilo atteso; classifica fissata di ognuno sul catalogo esteso di riferimento; stesso risultato ripetuto e con le attività in ordine diverso | superato (12/12) |
| Nessuna regressione | `npm test` dalla radice: tutti i test esistenti di motore e web | superato (motore 558/558, web 149/149) |

## Collegamenti

- Requisito: REQ-PREF-001 (`docs/requirements/REQ-PREF-001-preferenze.md`)
- Story: ST-PREF-001A
- Contratto: contract-ST-PREF-001A-implementation
- Autorizzazione: AUT-PR-PREF-001A
- Branch: feature/ST-PREF-001A
