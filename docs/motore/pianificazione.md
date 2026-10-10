# Motore: prima bozza dell'itinerario

Modulo `packages/engine/src/planning` (storia ST-PLAN-001, requisito REQ-PLAN-001). Tutto è esportato da `@travelops/engine`. Riferimenti: `docs/requirements/REQ-PLAN-001-prima-bozza.md` (regole R-1…R-9), `modello-dominio-estensioni.md` §7.2 (profilo), §7.7 (punteggio), §7.8 (istantanea), `dati-di-riferimento-estensioni.md` §8.1 (minimi) e §8.2 (profili PR-1…PR-5).

Funzioni pure e deterministiche: nessuna rete, nessun orologio, nessuna casualità, nessun ordinamento che dipende dalla lingua del sistema. Il modulo usa ciò che c'è già nel motore: `classificaAttivita`/`valutaAttivita` (punteggio), `ATTIVITA_PER_RITMO`, `FINESTRA_GIORNATA`, `controllaFattibilita`/`eFattibile` (REQ-FEAS-001), `creaSorgenteDaDati` (dati di contesto). Non dipende da `@travelops/sources`: riceve l'istantanea come `IstantaneaCatalogo` (un `IstantaneaDestinazione` di `@travelops/sources` lo è già).

## API

```ts
generaBozza(profilo: ProfiloPreferenze, istantanea: IstantaneaCatalogo, opzioni?: OpzioniBozza): BozzaItinerario
generaAlternativa(profilo: ProfiloPreferenze, istantanea: IstantaneaCatalogo,
                  corrente: BozzaItinerario | Viaggio, opzioni?: OpzioniBozza): BozzaItinerario
attivitaDaSostituire(profilo, istantanea, corrente): string[]       // gli id che l'alternativa esclude (R-9)
attivitaPrevistePerGiorno(profilo, conArrivoEPartenza: boolean): number[]   // R-3
scegliAlloggio(istantanea, profilo): LuogoEsteso                     // R-2
```

`profilo` è quello restituito da `validaProfilo` (REQ-PREF-001). `generaBozza` solleva `ErroreBozza` solo se non può proprio partire (istantanea senza alloggi, data non valida, alloggio irraggiungibile con i mezzi del profilo); in ogni altro caso restituisce una bozza, anche con problemi.

### Opzioni (`OpzioniBozza`, tutte facoltative)

| Campo | Predefinito | Uso |
| --- | --- | --- |
| `dataInizio` | inizio delle date precise; con il mese, il primo giorno del mese | data del primo giorno |
| `arrivoEPartenza` | sì, se c'è una stazione o un aeroporto raggiungibile dall'alloggio | spostamenti di arrivo e partenza (R-3) |
| `orarioArrivo` / `orarioPartenza` | `12:00` / `17:00` | arrivo alla stazione il primo giorno, partenza l'ultimo |
| `escludi` | nessuno | `id` di attività (anche pasti) da non usare; lo usa l'alternativa |
| `sorgente` | tempi dell'istantanea, senza meteo né chiusure | dati di contesto per collocazione e verifica |
| `idViaggio`, `titolo`, `fusoOrario` | `BOZZA-<id istantanea>`, "Bozza del viaggio: <destinazione>", `Europe/Rome` | campi del viaggio |

### Risultato (`BozzaItinerario`)

| Campo | Contenuto |
| --- | --- |
| `viaggio` | l'itinerario (`Viaggio`), valido per REQ-ITIN-001; `id` degli elementi `D<giorno>-E<n>`, `prossimoNumeroId: 1` |
| `istantaneaId`, `alloggioId`, `arrivoId` | istantanea usata, alloggio di tutte le notti, stazione o aeroporto (`null` senza arrivo e partenza) |
| `giorni[]` | per giorno: `data`, `attivitaPreviste` (R-3), `attivita` (id, pasti esclusi, in ordine), `pasti.pranzo`/`pasti.cena` (id dell'attività di pasto o `null`), `stiliInComune`, `irrinunciabili`, `arrivo`, `partenza`, `perche` |
| `problemi`, `fattibile` | esito di `controllaFattibilita` sulla bozza restituita (avvisi compresi); `fattibile` = nessun bloccante |
| `tolte[]` | attività tolte dalla verifica (R-6): `attivitaId`, `punteggio`, `problema` |
| `escluse` | gli `id` di `opzioni.escludi`, in ordine alfabetico |
| `irrinunciabiliMancanti` | `{ attivita, stili }` che non è stato possibile inserire |
| `avvisi` | note in italiano: pasti non collocati, giorni con meno attività, irrinunciabili mancanti |
| `spiegazione` | esito complessivo in parole semplici (fattibile o no, attività tolte, avvisi del controllo) |

`giorni[].perche` e `spiegazione` sono costruiti dai dati: l'agente (REQ-ORCH-001) li può riscrivere in modo più naturale, usando `stiliInComune`, `irrinunciabili`, `arrivo`, `partenza` come fatti da non cambiare.

## Regole come sono realizzate

- **R-1** Riceve profilo e istantanea già scelta, anche per "sorprendimi" (il generatore non guarda `profilo.destinazione`). Nessuna rete.
- **R-2** Alloggio: tra i luoghi `alloggio`, la minima distanza tra `costoIndicativo` e il budget nella scala `gratis` < `€` < `€€` < `€€€`; a parità il più economico, poi l'`id`. Lo stesso per tutte le notti.
- **R-3** Attività per giorno (pasti esclusi) = `ATTIVITA_PER_RITMO[ritmo]`; con arrivo e partenza il primo e l'ultimo giorno ne hanno la metà per eccesso. Primo giorno: spostamento stazione → alloggio all'orario di arrivo; ultimo giorno: ritorno all'alloggio e spostamento alloggio → stazione che arriva all'orario di partenza (i tempi alloggio–stazione sono tra i minimi della §8.1).
- **R-4** Candidate = `classificaAttivita` senza pasti, servizi ed escluse; prima gli irrinunciabili, poi in ordine di punteggio. La scelta procede a giri: a ogni giro ogni giorno riceve la prima candidata non usata che si può collocare, così le migliori si distribuiscono su tutti i giorni. Ogni attività una sola volta; mai due `impegnativa` nello stesso giorno; all'ultimo posto libero di un giorno senza stili del profilo si chiede una candidata con uno stile in comune (se non ce ne sono collocabili, si accetta la prima collocabile).
- **R-5** Per ogni giorno si provano tutti gli ordini delle attività (al più 4! = 24) e tutte le posizioni di pranzo e cena; vince l'ordine con meno minuti di percorrenza, poi quello che finisce prima, poi la sequenza di `id` minore. Ogni attività sta in una fascia di apertura del suo luogo in quel giorno della settimana e finisce entro la fine della finestra del profilo (e prima della partenza l'ultimo giorno). Il pasto sta nella sua finestra (pranzo 12:00–14:30, cena 19:00–21:30) e negli orari del ristorante, nel ristorante più vicino al punto in cui ci si trova tra quelli non esclusi dal profilo e con tutte le esigenze alimentari richieste (`vegetariano`, `senza_glutine`). Mezzi: il più veloce tra quelli del profilo. Orari a multipli di 5 minuti; ogni spostamento dura il tempo di percorrenza arrotondato per eccesso ai 5 minuti (almeno 5) e finisce all'inizio dell'attività.
- **R-6** La bozza passa da `controllaFattibilita` con la stessa sorgente. Se ci sono problemi bloccanti, tra le attività coinvolte si toglie (prima le non irrinunciabili) quella col punteggio più basso (a parità l'`id`) e si rigenera la bozza senza; al massimo 3 volte. Se restano problemi, la bozza è restituita con `fattibile: false`, `problemi` e `spiegazione`.
- **R-7** `perche`: "Te lo propongo perché unisce Natura e Romantico, alcuni degli stili che hai scelto, e c'è "…", che non vuoi perdere." con le frasi di arrivo e partenza; giornata libera se non ci sono attività.
- **R-8** Stesso profilo, istantanea e opzioni → stessa bozza; l'ordine di luoghi, attività e tempi nell'istantanea non conta.
- **R-9** `generaAlternativa` esclude le attività (non irrinunciabili) della bozza corrente, una per ogni sostituto non usato con punteggio positivo; con meno sostituti si escludono prima le meno adatte. Poi `generaBozza` con le stesse regole.

## Varietà della giornata (ST-UX-004A)

Dopo R-4 la scelta rispetta due soglie, in `planning/configurazione.ts` (`VARIETA_PREDEFINITA`) e sostituibili con `OpzioniBozza.varieta`:

| Soglia | Predefinito | Effetto |
|---|---|---|
| `maxAttivitaStessoTipo` | 2 | al massimo tante attività della stessa categoria di fila nello stesso giorno (i pasti non contano) |
| `tragittoMassimoMinuti` | 45 | nessun tragitto più lungo tra due attività vicine di valore simile |
| `differenzaValoreSimile` | 3 | due attività hanno valore simile se i punteggi della §7.7 differiscono al massimo di tanto |

Una candidata che introdurrebbe una violazione nuova è saltata; se il giorno resterebbe senza attività, le soglie si rilassano per quel giorno. Le attività bloccate dal viaggiatore non sono mai tolte per varietà.

Per provare:

```bash
cd packages/engine
npx vitest run test/planning/varieta.test.ts
```

```ts
import { generaBozza } from "@travelops/engine";
// Più permissivo: fino a 3 attività dello stesso tipo e tragitti fino a 60 minuti.
generaBozza(profilo, istantanea, { varieta: { maxAttivitaStessoTipo: 3, tragittoMassimoMinuti: 60 } });
```

Testi leggibili (`planning/leggibilita.ts`): `raggruppaNoteBozza` unisce le note uguali di «Da sapere» (gli orari non verificati diventano una sola nota con l'elenco dei luoghi, testo in `TESTI_NOTE`); `etichettaRevisione` e `cronologiaBozza` danno a ogni revisione un'etichetta breve ("Più leggera lunedì", "Sostituita Degustazione") e una causa senza rimandi tecnici alle altre revisioni. Le proposte di ripianificazione hanno `riepilogo` (al massimo tre frasi) e, per un ritardo che non cambia nessuna attività, `informativa: true`: la web app mostra una nota e non offre Accetta.

## Interpretazioni

- **Arrivo e partenza.** Il profilo non dice come si arriva: gli spostamenti di arrivo e partenza sono quelli tra la stazione (o l'aeroporto) più vicina e l'alloggio, con orari predefiniti modificabili. Senza stazione o aeroporto raggiungibile, o con `arrivoEPartenza: false`, non ci sono e tutti i giorni hanno il numero del ritmo.
- **Pasti.** La finestra della giornata del profilo vale per le attività; i pasti seguono le loro finestre (con `mattiniero`, 08:00–20:00, la cena delle 19:00 può finire dopo le 20:00). Un pasto la cui finestra finisce prima dell'arrivo o inizia dopo la partenza non è previsto quel giorno; un pasto che non si può collocare (nessun ristorante compatibile aperto) è segnalato in `avvisi`. Lo stesso ristorante può servire più pasti.
- **Irrinunciabili per stile.** Ogni attività con uno stile irrinunciabile ha i +5 della §7.7 e va tra le prime; il requisito è soddisfatto se almeno un'attività di quello stile è nella bozza.
- **Date per mese.** Con `{ tipo: "mese" }` la bozza parte il primo giorno del mese, salvo `opzioni.dataInizio`.
- **Chiusure e meteo.** La collocazione usa solo gli orari di apertura dell'istantanea; chiusure straordinarie e previsioni passate con `opzioni.sorgente` le trova la verifica (R-6). Gli orari non verificati (§7.3) si rispettano come indicativi e generano l'avviso `ORARI_DA_VERIFICARE`, mai bloccante.

## Test

`packages/engine/test/planning`:

- `generatore.test.ts`: R-1…R-9, CA-2, CA-3, CA-4, CA-5, CA-7 sull'istantanea di prova e su istantanee sintetiche (tutte dati di test);
- `riferimento.test.ts`: CA-1 e CA-6 sui casi di `CASI_ISTANTANEE` (`supporto.ts`); la bozza di riferimento di PR-1 è in `riferimento/bozza-PR-1-<istantanea>.json`;
- `varieta.test.ts`, `leggibilita.test.ts`: varietà (soglie configurabili), note raggruppate, etichette e cronologia delle revisioni;
- `istantanea-prova.test.ts`: l'istantanea di prova rispetta formato e minimi di `@travelops/sources`.

`dati/istantanea-prova-planning.json` è un DATO DI TEST: il "Borgo di Prova" di `packages/sources/test/dati` ampliato a 19 luoghi e 26 attività. Quando ST-CAT-002 avrà salvato le istantanee in `packages/sources/snapshots/`, CA-1 e CA-6 si completano aggiungendo una riga per profilo a `CASI_ISTANTANEE` e lanciando una volta `npx vitest run -u` in `packages/engine` per creare il file di riferimento di PR-1 sul Garda.
