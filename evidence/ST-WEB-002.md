# Prove di consegna: ST-WEB-002

## Cosa è stato chiesto

Il requisito REQ-WEB-002 "Web app: proposte, versioni e pagina Demo" chiede di mostrare il motore all'opera dalla web app: lanciare gli scenari di imprevisto, vedere la proposta con spiegazione, elementi a rischio e alternative, accettarla o rifiutarla, consultare e confrontare le versioni. Le funzionalità sono sei:

- **Stato locale:** viaggio corrente e storico (REQ-ITIN-002) salvati in un file JSON in `apps/web/.data/`, escluso da Git, tramite esporta e importa; "Ripristina" riporta all'itinerario di partenza.
- **Pagina Demo:** gli scenari S1–S8 con la loro descrizione; avviare uno scenario carica il suo itinerario di partenza e mostra la proposta; un orologio simulato imposta data e ora correnti, usate come momento di accettazione.
- **Vista proposta:** imprevisto, impatto, modifiche (prima → dopo), itinerario risultante del giorno, spiegazione, esito con i problemi, elementi a rischio evidenziati, alternative come link che il browser apre in una nuova scheda.
- **Accetta / Rifiuta:** con il nome di chi accetta (predefinito "Viaggiatore", modificabile).
- **Versioni:** elenco con numero, momento, causa e autore; confronto tra due versioni.
- **Problemi nella vista giorno:** i problemi di fattibilità del giorno accanto agli elementi coinvolti.

Criteri di accettazione CA-1…CA-9. Story `ST-WEB-002`, una pull request da `feature/ST-WEB-002` verso `main`.

## Perimetro ed esclusioni

- **Comprende:**
  - la pagina Demo (`/demo`), la vista della proposta (`/demo/proposte/<n>`), le versioni (`/versioni`, `/versioni/<n>`, il giorno e il dettaglio di un elemento di una versione) e l'itinerario corrente (`/itinerario`);
  - le azioni lato server di Next.js per avviare uno scenario, impostare l'orologio, accettare, rifiutare e ripristinare;
  - lo stato locale in `apps/web/.data/stato.json`, con lo storico esportato e importato dal motore;
  - i problemi di fattibilità accanto agli elementi nella vista giorno delle versioni;
  - la documentazione nel `README.md` e i test di ogni criterio CA-1…CA-9.
- **Esclude (fuori perimetro del requisito):** modifiche richieste dall'interfaccia e chat (ondata 2); database (ondata 2); imprevisti rilevati automaticamente (ondata 3); azioni sulle prenotazioni.
- **Lasciato fuori di proposito:**
  - `packages/` non è stato toccato (in parallelo c'è EDIT-001 nel motore);
  - `package.json` della radice, `apps/README.md`, `.github` non sono cambiati: la CI esegue già build e test di tutti i workspace;
  - `package-lock.json` non è cambiato: nessuna dipendenza nuova;
  - nessun test nel browser: come in WEB-001, i test verificano i dati preparati per le viste, l'HTML dei componenti (React lato server) e le operazioni e azioni lato server.
- **Deviazioni:** nessuna dal requisito. Le pagine dei viaggi di riferimento di WEB-001 (`/viaggi/...`) restano statiche e identiche; i loro componenti hanno solo una proprietà facoltativa in più (vedi "Perché").

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Pagina Demo, vista proposta, versioni, viste di una versione, itinerario corrente | `apps/web/app/demo/page.tsx`, `apps/web/app/demo/proposte/[id]/page.tsx`, `apps/web/app/versioni/page.tsx`, `apps/web/app/versioni/[numero]/page.tsx`, `apps/web/app/versioni/[numero]/giorni/[data]/page.tsx`, `apps/web/app/versioni/[numero]/elementi/[elemento]/page.tsx`, `apps/web/app/itinerario/page.tsx` |
| Azioni lato server: avvia scenario, orologio, accetta, rifiuta, ripristina | `apps/web/app/demo/azioni.ts` |
| Navigazione nella testata (Viaggi di riferimento, Demo, Itinerario corrente, Versioni) e stili nuovi | `apps/web/app/layout.tsx`, `apps/web/app/globals.css` |
| Stato locale: modello, serializzazione con `esportaStorico`/`importaStorico`, stato iniziale | `apps/web/src/stato/stato.ts` |
| File dello stato in `apps/web/.data/stato.json`, scrittura atomica | `apps/web/src/stato/archivio.ts` |
| Operazioni della Demo, che chiamano il motore | `apps/web/src/stato/operazioni.ts` |
| Scenari S1–S8, sorgente dei dati di contesto, catalogo di riferimento (dal motore) | `apps/web/src/dati/scenari.ts` |
| Dati per le viste: Demo, proposta, versioni e confronto, segnalazioni accanto agli elementi | `apps/web/src/viste/demo.ts`, `apps/web/src/viste/proposta.ts`, `apps/web/src/viste/versioni.ts`, `apps/web/src/viste/segnalazioni.ts` |
| Componenti: pagine Demo, proposta, versioni, contenuti che leggono lo stato, avvisi, tipi delle azioni | `apps/web/src/componenti/PaginaDemo.tsx`, `PaginaProposta.tsx`, `PaginaVersioni.tsx`, `ContenutiStato.tsx`, `Avvisi.tsx`, `azioni.ts` (in `apps/web/src/componenti/`) |
| Tabella degli elementi riusabile, con la colonna facoltativa delle segnalazioni | `apps/web/src/componenti/TabellaElementi.tsx` (estratta da `VistaGiorno.tsx`) |
| Viste di WEB-001 riusate per le versioni: proprietà facoltativa `radice` (e `segnali` nella vista giorno) | `apps/web/src/componenti/VistaGiorno.tsx`, `VistaViaggio.tsx`, `DettaglioElemento.tsx` |
| Indirizzi delle pagine nuove | `apps/web/src/percorsi.ts` |
| `.data/` escluso da Git anche nella web app | `apps/web/.gitignore` |
| Test di CA-1…CA-9, della Demo e dei problemi nella vista giorno, con il loro supporto | `apps/web/test/web002-ca1-proposta-s1.test.tsx`, `web002-ca2-accettazione.test.tsx`, `web002-ca3-confronto.test.tsx`, `web002-ca4-ca5-rischio.test.tsx`, `web002-ca6-ca7-decisioni.test.tsx`, `web002-ca8-stato.test.tsx`, `web002-ca9-motore.test.ts`, `web002-demo.test.tsx`, `supporto-stato.ts` (in `apps/web/test/`) |
| Documentazione della Demo e della struttura | `README.md` |
| Prove di consegna | `evidence/ST-WEB-002.md` |

## Perché

### Dipendenze

Nessuna dipendenza nuova: Next.js 16 (azioni lato server), React 19 e `node:fs` bastano. `package-lock.json` non cambia; `npm audit` resta a 0 vulnerabilità.

### Scelte

- **Tutto dal motore (CA-9).** La web app non decide nulla su proposte, fattibilità e versioni:
  - la proposta è quella di `proponiRipianificazione`, salvata così com'è;
  - accettare è `applicaProposta` con il nome e il momento dell'orologio simulato; rifiutare è `rifiutaProposta`. Lo storico salvato è sempre quello restituito dal motore, anche quando non nasce una versione;
  - elenco, lettura e confronto delle versioni sono `elencaVersioni`, `leggiVersione`, `confrontaVersioni`;
  - i problemi della vista giorno sono `controllaFattibilita`; la descrizione degli scenari è `descriviImprevisto`;
  - avvisi ed errori (`PROPOSTA_SUPERATA`, `NESSUNA_MODIFICA`, `ACCETTAZIONE_NON_VALIDA`, `VERSIONE_INESISTENTE`) si mostrano con il messaggio del motore: il codice della web app non contiene i codici.

  La web app aggiunge solo presentazione (testi, date estese, etichette) e la gestione del file.
- **Stato locale.** `apps/web/.data/stato.json` contiene il viaggio di partenza, lo scenario in corso, l'orologio, lo storico (il JSON di `esportaStorico`, riletto con `importaStorico`, che lo valida) e le proposte dello scenario in corso. Il file si rilegge a ogni richiesta, quindi sopravvive al riavvio (CA-8). La scrittura passa da un file temporaneo rinominato, così il file non resta mai scritto a metà. Senza file si parte dalla versione 1 di riferimento senza scrivere nulla; un file non valido mostra il motivo e il pulsante "Ripristina". La cartella è `.data` nella cartella di lavoro di Next.js, che `scripts/next.mjs` imposta sulla cartella della web app.
- **Proposte salvate e CA-7.** Ogni proposta ha un numero progressivo mai riutilizzato, che va nell'indirizzo e nei moduli. Dopo la decisione la proposta resta salvata, così un "Accetta" da una pagina rimasta aperta (un'altra scheda, il tasto Indietro) arriva al motore, che risponde `PROPOSTA_SUPERATA` se la versione corrente è cambiata. La pagina mostra il messaggio e lo storico non cambia. Avviare uno scenario o ripristinare scarta le proposte: una proposta che non esiste più dà "Proposta non disponibile", senza toccare lo storico.
- **Azioni lato server sottili.** `app/demo/azioni.ts` legge i campi del modulo, chiama `src/stato/operazioni.ts` e reindirizza alla pagina da mostrare. Funziona anche senza JavaScript nel browser e con la CSP di WEB-001 (`form-action 'self'`). I componenti ricevono le azioni come proprietà, così i test li disegnano con React lato server senza Next.js.
- **Pagine a ogni richiesta.** Le pagine nuove usano `dynamic = "force-dynamic"` perché leggono il file; quelle dei viaggi di riferimento restano generate in build (81 pagine statiche, come in WEB-001).
- **Riuso delle viste di WEB-001.** La vista viaggio, la vista giorno (con la mappa) e il dettaglio servono anche per le versioni: hanno una proprietà facoltativa `radice` (l'indirizzo della vista viaggio, `/versioni/<n>` invece di `/viaggi/<chiave>`). La tabella degli elementi è stata estratta in `TabellaElementi`, con una colonna "Segnalazioni" che compare solo se ci sono segnalazioni. Senza le proprietà nuove l'HTML delle pagine di WEB-001 è lo stesso: i loro 46 test passano senza modifiche.
- **Rete (CA-6 di WEB-001).** Nessuna chiamata nuova: dati di riferimento, scenari e contesto sono importati dai JSON del motore ed entrano nella build. I link delle alternative sono `<a target="_blank" rel="noopener noreferrer">` con l'indirizzo costruito dal motore: li apre il browser, solo su clic. Nel codice della web app non compaiono indirizzi esterni.

### Interpretazioni del requisito

- **Ripristina.** Torna all'itinerario di partenza dello scenario avviato (versione 1 di riferimento o variante; senza scenario, la versione 1), con la sola versione 1, e scarta le proposte. Lo scenario in corso e l'orologio restano, così si può riavviare lo scenario subito.
- **Avviare uno scenario** riparte sempre dal suo itinerario di partenza, come dice il requisito: crea un nuovo storico con la versione 1 e chiede al motore la proposta sulla versione corrente. L'orologio non cambia.
- **Orologio simulato.** Il valore iniziale è il primo giorno del viaggio alle 08:00 (2026-06-12 08:00). La web app controlla solo il formato `AAAA-MM-GG` / `HH:mm`; la validità piena del momento la controlla il motore all'accettazione.
- **Problemi nella vista giorno.** Si mostrano nelle viste giorno delle versioni (`/versioni/<n>/giorni/<data>`), con `controllaFattibilita`. Se uno scenario è in corso, il controllo usa i dati di contesto arricchiti con il suo imprevisto (`arricchisciSorgente` del motore), come la ripianificazione. Esempi: con S1 in corso il trekking della versione 1 ha l'avviso `METEO_AVVERSO`; con S4 il MUSE ha `LUOGO_CHIUSO`. Un ritardo non è un dato di contesto: con S2, S3, S6, S8 si vedono i problemi solo dopo aver accettato un itinerario che li ha (per esempio la proposta non fattibile di S6). Le pagine dei viaggi di riferimento di WEB-001 restano senza segnalazioni.
- **Itinerario risultante del giorno.** È il giorno dell'imprevisto (per una cancellazione, quello dello spostamento cancellato), con accanto agli elementi "Aggiunto", "Modificato", "A rischio" e i problemi della proposta.
- **Decisione già presa.** Dopo l'accettazione o il rifiuto la pagina della proposta non offre più i pulsanti e mostra la decisione con i link alla versione, al giorno e al confronto. Una proposta che non cambia l'itinerario (S5, S7) si può accettare: il motore risponde con l'avviso `NESSUNA_MODIFICA` e non crea versioni.
- **Confronto.** Senza parametri confronta la versione precedente con la corrente; i campi cambiati si mostrano in parole (nomi dei luoghi e delle attività, mezzi, date estese).

### Alternative scartate

| Alternativa | Perché è stata scartata |
| --- | --- |
| Ricalcolare la proposta all'accettazione invece di salvarla | Accetterebbe una proposta diversa da quella mostrata; e con la versione corrente cambiata non si vedrebbe mai `PROPOSTA_SUPERATA` (CA-7) |
| Stato nella memoria del server o nel browser (`localStorage`) | Non sopravvive al riavvio (CA-8) o non è il file JSON richiesto |
| `useActionState` e componenti client per gli esiti | Più codice nel browser; il reindirizzamento con l'esito salvato nella proposta funziona anche senza JavaScript |
| Rendere dinamiche le pagine `/viaggi/...` di WEB-001 con una chiave "corrente" | Avrebbe cambiato pagine statiche già consegnate; le versioni hanno indirizzi propri |
| Messaggi d'errore nell'indirizzo (`?errore=<testo>`) | Si potrebbero falsificare; l'indirizzo porta solo un codice tradotto dalla pagina |
| Controllare il momento con una copia delle regole del motore | Duplicherebbe logica del motore; la web app controlla solo il formato e il motore il resto |

## Verifica

Eseguito su Windows 11, Node 22.22.2, npm 10.9.7, dalla radice della copia di lavoro:

- `npm ci`: verde, 0 vulnerabilità.
- `npm run build`: verde.
  - Motore compilato con `tsc` (non modificato).
  - Web app compilata con Next.js 16.4.0 (Turbopack) e il controllo dei tipi: 81 pagine statiche (come prima) e 7 pagine nuove a ogni richiesta (`/demo`, `/demo/proposte/[id]`, `/itinerario`, `/versioni`, `/versioni/[numero]` e il giorno e l'elemento di una versione).
  - Nessun avviso.
- `npm test`: verde.
  - Motore: 19 file, 284 test superati (non toccato).
  - Web app: 15 file, 110 test superati: i 46 di WEB-001, senza modifiche, e 64 nuovi in 8 file.
- `npm run typecheck --workspace @travelops/web` (anche sui test): nessun errore.
- `npm audit`: **0 vulnerabilità** (anche con `--omit=dev`).
- File con a capo LF, nessun CRLF.
- Prova manuale con `PORT=3108 npm run dev` nel browser:
  - orologio impostato al 2026-06-13 07:30;
  - "Avvia S1": la proposta di P-S1, con esito "Fattibile" e la spiegazione. La stessa proposta è stata aperta anche in una seconda scheda;
  - "Accetta" come "Alice": "creata la versione 2". `/itinerario` porta a `/versioni/2`; il giorno 2026-06-13 mostra `D2-E1`, `N1`, `D2-E3`, `D2-E4`, `D2-E5` senza problemi. Il confronto 1 → 2 mostra aggiunto `N1`, rimosso `D2-E2`, modificati `D2-E1` (inizio, fine, arrivo) e `D2-E3` (inizio, fine, partenza);
  - "Accetta" dalla seconda scheda: il messaggio `[PROPOSTA_SUPERATA] …` e le versioni restano due;
  - "Avvia S7": `D3-E9` a rischio ed evidenziato, i due link con `target="_blank"` e `rel="noopener noreferrer"` e gli indirizzi attesi;
  - la dev server è stata fermata e riavviata: la Demo mostrava ancora S7 e l'orologio;
  - poi S1 accettato con il nome predefinito "Viaggiatore" (versione 2) e "Ripristina": versione corrente 1, giorno 2026-06-13 con `D2-E2` e l'avviso `METEO_AVVERSO` accanto;
  - richieste solo verso `localhost:3108`, nessun errore in console;
  - alla fine la dev server è stata fermata, nessun processo node in ascolto sulla porta 3108, `apps/web/.data/` cancellata.

| Criterio | Test o verifica (file › nome del test) | Esito |
| --- | --- | --- |
| CA-1 avviando S1 dalla Demo la proposta coincide con P-S1, con la spiegazione e l'esito "fattibile" | `web002-ca1-proposta-s1.test.tsx` › "CA-1 la Demo offre S1 con il suo itinerario di partenza e il pulsante per avviarlo"; "CA-1 l'azione Avvia S1 salva la proposta e porta alla sua pagina"; "CA-1 la proposta salvata coincide con P-S1: versione base, origine, modifiche, itinerario, esito fattibile"; "CA-1 la pagina della proposta mostra modifiche, giorno risultante, spiegazione ed esito \"Fattibile\""; "CA-1 dopo l'avvio la Demo indica S1 come scenario in corso e porta alla proposta in attesa di decisione". Prova manuale | superato |
| CA-2 accettando S1 come "Alice" il 2026-06-13 alle 07:30 si crea la versione 2 con causa e autore di REQ-ITIN-002 CA-2; la vista giorno mostra il nuovo itinerario | `web002-ca2-accettazione.test.tsx` › "CA-2 la versione 2 ha la causa e l'autore di REQ-ITIN-002 CA-2 e il momento dell'orologio simulato"; "CA-2 con le azioni dei moduli: orologio, poi Accetta con il nome \"Alice\""; "CA-2 la vista giorno della versione 2 mostra il nuovo itinerario del 2026-06-13"; "CA-2 la proposta accettata indica autore, momento e versione 2, e non offre più Accetta e Rifiuta"; "il nome di chi accetta è \"Viaggiatore\" se non lo si cambia". Prova manuale | superato |
| CA-3 il confronto 1 → 2 mostra le differenze di REQ-ITIN-002 CA-3 | `web002-ca3-confronto.test.tsx` › "CA-3 modificati D2-E1 (arrivo e orario) e D2-E3 (partenza e orario), rimosso D2-E2, aggiunto N1 con A-MAG; nient'altro"; "CA-3 le differenze mostrate sono quelle del motore (confrontaVersioni), una per una"; "CA-3 la pagina Versioni elenca numero, momento, causa e autore e mostra il confronto 1 → 2". Prova manuale | superato |
| CA-4 avviando S7 la proposta mostra `D3-E9` a rischio e i due link, cliccabili | `web002-ca4-ca5-rischio.test.tsx` › "CA-4 la proposta del motore ha D3-E9 a rischio, la gestione della prenotazione e la ricerca su Google Flights"; "CA-4 la pagina evidenzia D3-E9 a rischio, nell'elenco e accanto all'elemento nel giorno"; "CA-4 i due link si aprono nel browser, in una nuova scheda, solo su clic". Prova manuale | superato |
| CA-5 avviando S6 o S8 la proposta è non fattibile e mostra i suoi problemi | `web002-ca4-ca5-rischio.test.tsx` › "CA-5 %s: non fattibile, con i problemi e gli elementi a rischio del motore" (S6: `FUORI_ORARIO` su `D3-E2` e `D3-E4`; S8: `SOVRAPPOSIZIONE` su `D3-E8`, `D3-E9`); "CA-5 S8 mostra anche le alternative per il volo a rischio" | superato |
| CA-6 rifiutare una proposta non crea versioni | `web002-ca6-ca7-decisioni.test.tsx` › "CA-6 rifiutando la proposta di %s lo storico resta alla sola versione 1, identico" (S1, S2, S6, S8); "CA-6 con l'azione Rifiuta: la proposta risulta rifiutata e la versione corrente resta la 1" | superato |
| CA-7 accettare una proposta costruita su una versione non più corrente mostra il messaggio di proposta superata e non cambia lo storico | `web002-ca6-ca7-decisioni.test.tsx` › "CA-7 la proposta di S1 (versione 1) accettata di nuovo quando la corrente è la 2: PROPOSTA_SUPERATA, storico invariato"; "CA-7 con l'azione Accetta di una pagina rimasta aperta: la pagina mostra il messaggio di proposta superata"; "CA-7 una proposta che non esiste più (scenario riavviato) non cambia lo storico". Prova manuale con due schede | superato |
| CA-8 lo stato sopravvive al riavvio; "Ripristina" torna all'itinerario di partenza | `web002-ca8-stato.test.tsx` › "CA-8 lo stato è un file JSON in apps/web/.data, escluso da Git"; "CA-8 riletto dopo il riavvio (moduli ricaricati), lo stato è identico: storico, orologio, scenario e proposte"; "CA-8 lo storico nel file è quello di esportaStorico e la pagina Demo lo mostra dopo il riavvio"; "CA-8 dopo la versione 2 di S1, Ripristina lascia la sola versione 1 della versione 1 di riferimento"; "CA-8 con uno scenario su una variante (S8, V-VOLO) Ripristina torna alla variante"; "CA-8 con l'azione Ripristina, anche dopo il riavvio". Prova manuale: riavvio della dev server e "Ripristina" | superato |
| CA-9 la web app non contiene logica di ripianificazione: proposte, controlli e versioni vengono dal motore | `web002-ca9-motore.test.ts` › analisi del codice: "CA-9 la web app usa il motore solo come pacchetto: \"@travelops/engine\" e i suoi dati di riferimento"; "CA-9 ogni operazione su proposte, controlli e versioni è importata dal motore dove si usa, e tutte sono usate"; "CA-9 la web app non ridefinisce funzioni o valori del motore"; "CA-9 nel codice della web app non compaiono i codici dei problemi e dello storico: esiti e messaggi sono del motore"; "CA-9 nessun calcolo sugli orari e nessun orologio di sistema: il momento è l'orologio simulato". Dipendenze: "CA-9 nessuna dipendenza in più: oltre al motore solo Next.js, React e Leaflet". Confronto con il motore: "CA-9 %s: la proposta salvata è quella di proponiRipianificazione" (S1…S8); "CA-9 la versione 2 salvata è quella di applicaProposta" | superato |

Gli altri test nuovi coprono le funzionalità senza un criterio dedicato:

- `web002-demo.test.tsx`, pagina Demo e orologio: scenari S1–S8 in ordine con la descrizione del motore; orologio iniziale e impostato (avviare uno scenario non lo cambia); orologio non valido segnalato.
- `web002-demo.test.tsx`, problemi nella vista giorno: nessun problema senza scenario; `METEO_AVVERSO` accanto a `D2-E2` con S1 in corso; versione 2 senza problemi e versione 1 ancora consultabile; `LUOGO_CHIUSO` accanto a `D3-E6` con S4; `FUORI_ORARIO` accanto a `D3-E2` e `D3-E4` nella versione 2 di S6, uguali a `controllaFattibilita`.
- `web002-demo.test.tsx`, viste di una versione: vista viaggio e dettaglio di `N1` nella versione 2; versione inesistente con il messaggio del motore.
- `web002-ca2-accettazione.test.tsx`: senza nome la proposta non è accettata (`ACCETTAZIONE_NON_VALIDA`).
- `web002-ca3-confronto.test.tsx`: confronto predefinito e versione inesistente.
- `web002-ca6-ca7-decisioni.test.tsx`: S7 accettata dà `NESSUNA_MODIFICA` senza versioni; S6 non fattibile si può accettare e la versione lo registra.
- `web002-ca8-stato.test.tsx`: senza file si parte dalla versione 1 senza scrivere nulla; file non valido con "Ripristina"; storico manomesso rifiutato da `importaStorico`.

## Collegamenti

- Requisito `REQ-WEB-002`, fonte `docs/requirements/REQ-WEB-002-proposte-demo.md`
- Story `ST-WEB-002`
- Contratto `contract-ST-WEB-002-implementation`
- Profilo di consegna `AUT-PR-WEB-002` (pull request su `alicegibellato/TravelOps`, branch `feature/ST-WEB-002`)
- Dipendenze: `REQ-WEB-001` (web app di consultazione), `REQ-ITIN-002` (storico, versioni, esporta e importa), `REQ-FEAS-001` (fattibilità), `REQ-REPLAN-001` e `REQ-REPLAN-002` (impatto e ripianificazione)
- Fonti condivise: `docs/requirements/visione.md` §7, `docs/requirements/modello-dominio.md`, `docs/requirements/dati-di-riferimento.md`
