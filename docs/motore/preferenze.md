# Motore: profilo delle preferenze e punteggio

Modulo `packages/engine/src/preferences` (storia ST-PREF-001A, requisito REQ-PREF-001). Tutto è esportato da `@travelops/engine`. Riferimenti: `docs/requirements/modello-dominio-estensioni.md` §7.2 (profilo) e §7.7 (punteggio), `docs/requirements/dati-di-riferimento-estensioni.md` §8.2 (profili PR-1…PR-5).

Funzioni pure e deterministiche: nessuna rete, nessun orologio, nessuna casualità, nessun ordinamento che dipende dalla lingua del sistema. Non sollevano eccezioni sui dati ricevuti.

## Due forme del profilo

| Tipo | Chi lo usa | Cosa contiene |
| --- | --- | --- |
| `BozzaProfilo` | percorso guidato e chat (ST-PREF-001B, REQ-CHAT-001) | quello che è stato raccolto finora: ogni campo è facoltativo |
| `ProfiloPreferenze` | generatore della bozza (REQ-PLAN-001), revisione (REQ-PLAN-002), ripianificazione (REQ-REPLAN-004) | il profilo completo, validato e normalizzato |

La web app conserva la `BozzaProfilo`; il motore la trasforma in `ProfiloPreferenze` con `validaProfilo`. Filtri e chat scrivono nella stessa bozza: due bozze con le stesse scelte in ordine diverso danno lo stesso profilo.

### Campi (§7.2)

| Campo | Forma | Obbligatorio | Predefinito |
| --- | --- | --- | --- |
| `destinazione` | `{ tipo: "luogo", nome, riferimento? }` oppure `{ tipo: "sorprendimi" }` | sì | — |
| `date` | `{ tipo: "precise", inizio, fine }` (`AAAA-MM-GG`, estremi compresi) oppure `{ tipo: "mese", mese }` (`AAAA-MM`) | sì | — |
| `durata` | giorni, intero da 2 a 14 | sì; con date precise si ricava dalle date | — |
| `viaggiatori` | `{ adulti ≥ 1, bambini: età 0–17 }` | sì | 2 adulti, nessun bambino |
| `tipoGruppo` | `da_solo`, `coppia`, `amici`, `famiglia` | no | ricavato: con bambini `famiglia`, 1 adulto `da_solo`, 2 `coppia`, di più `amici` |
| `stili` | almeno uno di `STILI_VIAGGIO` | no | `cultura`, `natura` (senza quelli da evitare) |
| `ritmo` | `lento`, `bilanciato`, `intenso` (`ATTIVITA_PER_RITMO`: 2, 3, 4) | no | `bilanciato` |
| `formaFisica` | `facile`, `moderato`, `impegnativo` (`INTENSITA_MASSIMA`) | no | `moderato` |
| `budget` | `€`, `€€`, `€€€` | no | `€€` |
| `orari` | `mattiniero`, `normale`, `nottambulo` (`FINESTRA_GIORNATA`) | no | `normale` |
| `pasti` | `{ pranzo, cena }` | no | entrambi sì |
| `mezzi` | almeno uno tra `piedi`, `mezzi_pubblici`, `treno`, `auto` | no | tutti |
| `irrinunciabili` | `{ attivita: id[], stili }` | no | nessuno |
| `daEvitare` | `{ attivita: id[], categorie, stili }` | no | nessuno |
| `esigenze` | `mobilita_ridotta`, `adatto_ai_bambini`, `vegetariano`, `senza_glutine` | no | nessuna |

Nel profilo completo gli elenchi non hanno ripetizioni e sono nell'ordine canonico dei valori ammessi; gli `id` di attività sono in ordine alfabetico, le età dei bambini in ordine crescente, i testi senza spazi ai lati.

## Validazione

```ts
validaProfilo(bozza: unknown, opzioni?: { catalogo?: CatalogoEsteso }): EsitoProfilo
type EsitoProfilo = { ok: true; profilo: ProfiloPreferenze } | { ok: false; problemi: ProblemaProfilo[] };
interface ProblemaProfilo {
  campo: CampoProfilo;               // per collegare il problema al controllo giusto
  tipo: "mancante" | "non_valido";
  passo: 1 | 2 | 3 | 4 | 5;          // passo del percorso guidato in cui si corregge
  testo: string;                     // italiano semplice, da mostrare così com'è
}
cosaManca(bozza: unknown, opzioni?): string[]   // solo i testi; vuoto se il profilo è completo
```

- Manca: destinazione, date, durata (solo con le date per mese). Con una bozza vuota i problemi sono due (destinazione e date): il testo delle date chiede già anche quanti giorni.
- Non valido: ogni valore fuori da quelli ammessi; mai sostituito in silenzio con il predefinito.
- Coerenza: uno stile non può essere insieme scelto (o irrinunciabile) e da evitare; un'attività non può essere insieme irrinunciabile e da evitare. Con `catalogo`: le attività indicate devono esistere e un'irrinunciabile non può rientrare in categorie o stili da evitare.
- I problemi sono nell'ordine dei campi della tabella. I testi non contengono codici, nomi di campo o valori grezzi ricevuti; usano le etichette di `ETICHETTE_PROFILO`.

Esempio: `cosaManca({})` restituisce "Manca la destinazione: scegli dove vuoi andare, oppure lasciati sorprendere." e "Mancano le date: scegli i giorni precisi, oppure il mese e quanti giorni.".

## Punteggio (§7.7)

```ts
valutaAttivita(attivita: AttivitaCatalogoEstesa, profilo: ProfiloPreferenze): ValutazioneAttivita
punteggioAttivita(attivita, profilo): number | null          // null se esclusa
classificaAttivita(catalogo | attivita[], profilo): { candidate: ValutazioneAttivita[]; escluse: ValutazioneAttivita[] }
confrontaValutazioni(a, b): number                             // ordine della §7.7
```

`ValutazioneAttivita` contiene `attivitaId`, `esclusa`, `esclusioni` (motivi), `punteggio`, `stiliInComune`, `irrinunciabile`, `livelliOltreIlBudget`: i fatti con cui il generatore scrive "perché te lo propongo" (REQ-PLAN-001 R-7).

| Regola | Effetto |
| --- | --- |
| ogni stile dell'attività presente nel profilo | +3 |
| attività irrinunciabile (per `id`, oppure con uno stile irrinunciabile) | +5, una volta sola |
| costo un livello sopra il budget (`gratis` < `€` < `€€` < `€€€`) | −1 |
| tra le cose da evitare (per `id`, categoria o uno dei suoi stili) | esclusa, motivo `da_evitare` |
| intensità oltre la forma fisica | esclusa, `troppo_impegnativa` |
| esigenza mobilità ridotta e attività non accessibile | esclusa, `non_accessibile` |
| bambini (o esigenza adatto ai bambini) e attività non adatta | esclusa, `non_adatta_ai_bambini` |
| costo più di un livello sopra il budget | esclusa, `troppo_cara` |

- Un'attività esclusa ha `punteggio: null` e tutti i motivi, nell'ordine della tabella; `TESTO_ESCLUSIONE` dà il testo per il viaggiatore.
- Un campo della §7.3 assente non si presume favorevole: senza intensità l'attività è esclusa se la forma fisica non è `impegnativo`; senza `accessibile` o `adattaAiBambini` è esclusa quando il profilo pone quel limite. Senza costo non c'è penalità; senza stili nessun punto.
- Ordine: punteggio decrescente; a parità, `id` in ordine alfabetico per codice del carattere. Le escluse sono a parte, in ordine di `id`. Il risultato non dipende dall'ordine delle attività nel catalogo.
- `classificaAttivita` non filtra per categoria: pasti e servizi hanno regole proprie nel generatore (REQ-PLAN-001 R-5, §8.5).
- Senza profilo il punteggio non si applica: chi non ha un profilo non chiama queste funzioni, e i risultati dell'ondata 1 non cambiano.

## Profili di riferimento

`packages/engine/test/preferences/dati/profili-riferimento.json`: PR-1…PR-5 della §8.2 come `BozzaProfilo` (`{ id, nome, profilo }`), con i soli campi indicati nella §8.2. Il resto viene dai predefiniti di `validaProfilo`. I test fissano il profilo completo di ognuno e la sua classifica sul catalogo esteso di riferimento.
