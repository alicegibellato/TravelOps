# Prove di consegna: ST-TODAY-001

## Cosa è stato chiesto

REQ-TODAY-001 "Vista Oggi". Story `ST-TODAY-001`, con questi criteri:

1. con l'orologio simulato al 2026-06-13 alle 10:30 su TRIP-DEMO-GARDA, le schede "Adesso" e "Dopo" sono corrette (CA-1);
2. "Sono in ritardo di 30 minuti" produce la stessa proposta di un imprevisto `RITARDO` di 30 minuti in quel momento (CA-2);
3. su telefono "Oggi" è la scheda iniziale di un viaggio in corso (CA-3).

## Perimetro ed esclusioni

- **Comprende:**
  - la vista Oggi di un viaggio all'orologio simulato: scheda "Adesso" (attività o spostamento in corso e tempo rimanente, oppure tempo libero fino al prossimo elemento) con la posizione prevista; scheda "Dopo" (prossima attività, quando partire e con che mezzo); mappa di oggi; pulsanti rapidi "Sono in ritardo di 15 / 30 / 60 minuti", "Ho un imprevisto", "Oggi sono stanco";
  - fuori dal viaggio: quanti giorni mancano alla partenza, oppure il riepilogo del viaggio concluso;
  - la pagina `/viaggi/<viaggio>/oggi`, l'indirizzo `/oggi` (porta al viaggio della modalità presentazione) e la voce "Oggi" nella navigazione;
  - la vista viaggio `/viaggi/<viaggio>`: se il viaggio è in corso usa il layout delle pagine di viaggio e sul telefono si apre sulla scheda "Oggi";
  - i test dei criteri CA-1, CA-2 e CA-3.
- **Esclude** (di altre storie o fuori perimetro del requisito):
  - posizione reale del viaggiatore (GPS) e notifiche fuori dall'app (non-goal del requisito);
  - il viaggio demo completo TRIP-DEMO-GARDA della §8.3 (voli, trekking, caricamento tra i viaggi demo): REQ-DEMO-001;
  - "Ho un imprevisto" raccontato o scelto con schede e moduli: ST-IMPR-001. Qui il pulsante porta alla modalità presentazione, dove si sceglie l'imprevisto;
  - "Oggi sono stanco" come proposta: l'imprevisto `STANCHEZZA` dà una proposta estesa del motore che lo stato della web app (`PropostaSalvata`, pagina della proposta) non gestisce ancora. Anche questo pulsante porta, per ora, alla modalità presentazione.
- **Lasciato fuori di proposito:** nessuna modifica a `packages/`, a `src/chat`, alle pagine della bozza, a `.sdlc`; nessuna dipendenza nuova, nessun Tailwind, nessun colore in linea (solo i token). Nei file condivisi (`src/percorsi.ts`, `src/ui/Navigazione.tsx`, `app/globals.css`) solo righe aggiunte; gli stili sono in fondo a `globals.css`.
- **Deviazioni:** nessuna dai criteri. I limiti sono in "Interpretazioni del requisito".

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Logica pura della vista: fase del viaggio, Adesso, Dopo, posizione prevista | `apps/web/src/oggi/vista.ts` |
| Minuti e giorni che mancano, in parole | `apps/web/src/oggi/tempo.ts` |
| Pulsanti rapidi: ritardi 15/30/60 e imprevisto `RITARDO` nel momento dell'orologio simulato | `apps/web/src/oggi/ritardi.ts` |
| Operazioni sullo stato: momento e itinerario da mostrare, proposta per il ritardo (`proponiRipianificazione`) | `apps/web/src/oggi/operazioni.ts` |
| Componenti: pannello Oggi, pagina Oggi e vista viaggio in corso | `apps/web/src/componenti/PannelloOggi.tsx`, `apps/web/src/componenti/ContenutiOggi.tsx` |
| Scheda iniziale del layout delle pagine di viaggio (`iniziale`) | `apps/web/src/ui/LayoutViaggio.tsx` |
| Pagine e azione lato server | `apps/web/app/viaggi/[viaggio]/oggi/page.tsx`, `apps/web/app/viaggi/[viaggio]/oggi/azioni.ts`, `apps/web/app/oggi/page.tsx`, `apps/web/app/viaggi/[viaggio]/page.tsx` |
| Indirizzi e voce di navigazione | `apps/web/src/percorsi.ts`, `apps/web/src/ui/Navigazione.tsx` |
| Stili (solo token, in fondo al file) | `apps/web/app/globals.css` |
| Test | `apps/web/test/today001-ca1-adesso-dopo.test.tsx`, `today001-ca2-ritardo.test.tsx`, `today001-ca3-telefono.test.tsx`, `today001-ca3-pagina.test.tsx`, `apps/web/test/supporto-oggi.ts` |
| Test esistente aggiornato: la nuova voce di navigazione | `apps/web/test/ux001-guscio-home.test.tsx` |
| Prove di consegna | `evidence/ST-TODAY-001.md` |

## Perché

### Dipendenze

- ST-UX-001: `LayoutViaggio` (con il posto per la scheda "Oggi"), `SchedaAttivita`, `Pulsante`, `PulsanteLink`, `Avviso`, token.
- ST-WEB-002 / ST-WEB-004 / ST-DATA-001: orologio simulato e stato della modalità presentazione (`impostaOrologio`, `leggiStato`, `salvaStato`, `statoIniziale`), pagina della proposta, `accettaProposta`.
- ST-REPLAN-004: `proponiRipianificazione` con l'imprevisto `RITARDO`; TRIP-DEMO-GARDA come bozza di PR-1 sull'istantanea del Garda (CA-6 di quella storia).
- Nessuna dipendenza npm nuova.

### Scelte

- **Nessuna logica del motore duplicata.** Il ritardo segnalato è l'imprevisto `RITARDO` del motore con data e ora dell'orologio simulato; la proposta la costruisce `proponiRipianificazione` sulla versione corrente, come `avviaScenario` per gli scenari. Si salva tra le proposte dello stato e si decide nella stessa pagina (`/demo/proposte/<id>`): accettarla passa da `applicaProposta`.
- **Logica in un modulo puro** (`src/oggi/vista.ts`): legge l'itinerario così com'è e usa le viste esistenti (`vistaGiorno`, `riferimentoLuogo`, `momentoEsteso`), testabile senza Next.js.
- **Il momento è l'orologio simulato**, mai quello di sistema (vincolo CA-9 di REQ-WEB-002). Con uno stato non leggibile si usa l'orologio iniziale.
- **Quale itinerario.** Per il viaggio della modalità presentazione la vista Oggi mostra la versione corrente (dopo una proposta accettata il programma è quello nuovo); per gli altri, quello di riferimento.
- **Ritardo su un altro viaggio.** Se il viaggio non è quello della modalità presentazione, lo diventa con la sola versione 1, come quando si avvia uno scenario. Le proposte già presenti restano se il viaggio è lo stesso.
- **Scheda iniziale.** `LayoutViaggio` riceve `iniziale`; la vista viaggio di un viaggio in corso passa `"oggi"`. Su schermo grande il riquadro "Oggi" resta nascosto (regola esistente) e la pagina `/viaggi/<viaggio>/oggi` mostra la vista Oggi su tutti gli schermi.
- **Vista viaggio dinamica.** `/viaggi/<viaggio>` legge l'orologio simulato a ogni richiesta (`force-dynamic`); fuori dal viaggio il contenuto è quello di prima.

### Interpretazioni del requisito

- **TRIP-DEMO-GARDA.** Finché REQ-DEMO-001 non lo costruisce, è la bozza di `generaBozza` con PR-1 sull'istantanea `packages/sources/snapshots/garda-2026-10-09.json`, come in ST-REPLAN-004 (test, `supporto-oggi.ts`). Nella web app non è ancora tra i viaggi demo: la vista Oggi funziona sui viaggi di riferimento e i test di CA-1 e CA-2 la verificano anche su TRIP-DEMO-GARDA.
- **Adesso e Dopo al 2026-06-13 alle 10:30.** Il primo elemento del giorno è lo spostamento delle 11:55: "Adesso" dice che non c'è niente in programma fino alle 11:55 (1 ora e 25 minuti liberi) e che la posizione prevista è il luogo di partenza del giorno; "Dopo" è l'attività delle 12:00, con partenza alle 11:55 in auto.
- **Dopo.** La prossima attività (gli spostamenti non contano); "quando partire" è l'inizio dello spostamento che la precede, se non è ancora iniziato; durante lo spostamento si dice quando si arriva. Senza altre attività è il prossimo elemento; senza altro, "Per oggi è tutto".
- **Posizione prevista** in parole (il luogo dell'attività in corso, la destinazione dello spostamento, l'ultimo luogo raggiunto o il luogo di partenza del giorno): la mappa del giorno non ha un indicatore dedicato.
- **Tempo che manca.** È l'unico calcolo sugli orari della web app ed è solo per il testo (`src/oggi/tempo.ts`): orari e date restano quelli del motore e dell'orologio simulato.

### Alternative scartate

- Aggiungere TRIP-DEMO-GARDA ai viaggi demo della web app: richiede il profilo PR-1 e la generazione della bozza in esecuzione, che sono di REQ-DEMO-001 e di ST-PLAN-002.
- Mostrare il riquadro "Oggi" anche su schermo grande dentro `LayoutViaggio`: cambia il layout di REQ-UX-001 §6.3; su schermo grande c'è la pagina Oggi.
- "Oggi sono stanco" come proposta `STANCHEZZA`: servirebbe estendere lo stato della web app e la pagina della proposta alle proposte estese, fuori da questa storia.

## Verifica

Comandi eseguiti dalla radice della copia di lavoro: `npm ci`, `npm run build`; in `apps/web` `npx tsc --noEmit -p tsconfig.json` e `npx vitest run -t '^(?!.*axe-core con tutte le regole \(anche il contrasto\) su (home|stile) in tema).*$'`.

- `npm run build`: riuscito (`/oggi`, `/viaggi/[viaggio]` e `/viaggi/[viaggio]/oggi` sono dinamiche).
- `tsc --noEmit`: riuscito.
- `vitest`: 66 file, 446 test superati e 4 saltati (controlli nel browser senza Chrome locale); 24 test nuovi di questa storia. Esclusi dal filtro i 4 controlli di contrasto axe nel browser su home e /stile, che falliscono solo con il Chrome locale e non riguardano questa storia.

Corrispondenza criteri e test:

| Criterio | Test |
| --- | --- |
| CA-1 Adesso e Dopo al 2026-06-13 10:30 su TRIP-DEMO-GARDA | `today001-ca1-adesso-dopo` (programma del giorno; Adesso: libero fino alle 11:55, 85 minuti, posizione prevista; Dopo: D2-E2 alle 12:00, partenza 11:55 in auto; schede in parole senza codici; altri momenti: in attività, in spostamento, fine giornata; prima e dopo il viaggio) |
| CA-2 «Sono in ritardo di 30 minuti» = RITARDO di 30 minuti in quel momento | `today001-ca2-ritardo` (il pulsante è l'imprevisto RITARDO; stessa proposta del motore su TRIP-DEMO-GARDA; nella web app la proposta salvata coincide con quella del motore, anche dopo una versione accettata e su un altro viaggio; l'azione del modulo porta alla pagina della proposta e rifiuta ritardi diversi; la proposta si accetta come le altre) |
| CA-3 su telefono Oggi è la scheda iniziale di un viaggio in corso | `today001-ca3-telefono` (jsdom: scheda «Oggi» premuta e riquadro attivo all'apertura; si passa a itinerario e mappa), `today001-ca3-pagina` (la pagina del viaggio legge l'orologio simulato: in corso si apre su «Oggi», fuori dal viaggio resta com'era; regole CSS per telefono e schermo grande; pagina Oggi ed errore; axe senza violazioni gravi) |

## Collegamenti

- Requisito: REQ-TODAY-001
- Story: ST-TODAY-001
- Dipendenze: ST-UX-001, ST-DATA-001, ST-REPLAN-004
