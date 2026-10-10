# Prove di consegna: ST-DEMO-001B

## Cosa è stato chiesto

REQ-DEMO-001 "Copione e dati della demo" (`docs/requirements/REQ-DEMO-001-copione-demo.md`, revisione approvata REQ-DEMO-001-R2: i controlli con il modello vero usano OpenAI). Story `ST-DEMO-001B`, con questi criteri:

1. ogni prompt del copione dà il risultato atteso: in automatico con il client finto, con il modello OpenAI vero nel collaudo (CA-1);
2. da un clone pulito l'app si avvia con `npm ci`, `npm run build`, `npm run dev` (CA-2);
3. «Ripristina i viaggi demo» porta ogni viaggio demo allo stato iniziale senza toccare gli altri viaggi (CA-3).

## Perimetro ed esclusioni

- **Comprende:** i tre viaggi demo della CR-001 §8.3 (TRIP-DEMO-GARDA, TRIP-DEMO-DOLOMITI, TRIP-DEMO-ROMA) caricati al primo avvio e da «Ripristina i viaggi demo»; il copione della demo come fonte unica; i prompt del copione con «Copia» nella modalità presentazione; `docs/demo/copione-demo.md`; l'avvio in 3 comandi nel README.
- **Esclude:** prenotazioni, pagamenti, modifiche o cancellazioni presso fornitori; nessuna modifica a `packages/agents`, `packages/engine/src`, `.sdlc`.
- **Lasciato fuori di proposito:** nessuna dipendenza nuova, nessun Tailwind, nessuna logica del motore duplicata nella web app (voli e trekking si ottengono con le operazioni del motore).
- **Deviazioni:** il copione è in `docs/demo/copione-demo.md` (come chiesto dalla story) e non in `docs/demo/copione-demo.md` come scrive il requisito; la fonte è `apps/web/src/demo/copione.json` e il file Markdown si rigenera con `npm run copione -w @travelops/web`.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Specifiche dei viaggi demo (profili PR-1, PR-2, PR-3, voli, treni, luoghi aggiunti) | `packages/engine/data/reference/viaggi-demo.json` |
| Costruzione dei viaggi demo con `avviaBozza` e le operazioni del motore; caricamento e ripristino | `apps/web/src/stato/viaggi-demo-bozza.ts`, `apps/web/src/stato/viaggi-demo.ts`, `apps/web/src/bozza/chiavi.ts` (chiave spostata da `servizio.ts`) |
| Le istantanee derivate dei viaggi demo non sono destinazioni da scegliere | `apps/web/src/destinazioni/sorgente.ts`, `apps/web/src/preferenze/precaricate.ts` |
| Copione (fonte unica), generatore del Markdown, documento | `apps/web/src/demo/copione.json`, `apps/web/src/demo/copione.ts`, `apps/web/scripts/genera-copione.ts`, `docs/demo/copione-demo.md` |
| Modalità presentazione con prompt e «Copia» | `apps/web/src/componenti/PaginaDemo.tsx`, `apps/web/src/componenti/CopiaPrompt.tsx`, `apps/web/app/globals.css` (in fondo) |
| Avvio in 3 comandi | `README.md`, `apps/web/package.json` (script `copione`) |
| Test | `apps/web/test/demo001b-ca1-copione.test.ts`, `demo001b-ca1-presentazione.test.tsx`, `demo001b-ca2-avvio.test.ts`, `demo001b-ca3-ripristino.test.ts`, registrazione `apps/web/test/demo001b/atto-3-garda-demo.json` |
| Test esistenti adattati all'elenco più lungo dei viaggi demo | `data001-accesso`, `data001-ca1-primo-avvio`, `data001-ca2-riavvio`, `data001-ca3-esporta-importa`, `data001-ca5-stato-json`, `cat002a-istantanee-primo-avvio` |
| Prove di consegna | `evidence/ST-DEMO-001B.md` |

## Perché

### Dipendenze

- ST-CAT-002A/B: istantanee precaricate (`packages/sources/snapshots`) e loro caricamento al primo avvio.
- ST-PLAN-001 e ST-PLAN-002: `generaBozza`, `avviaBozza`, `applicaOperazioneBozza` (sposta, sblocca).
- ST-DATA-001: viaggi, profili, revisioni, storici e impostazioni nella base dati SQLite.
- ST-ORCH-001C e ST-CHAT-001C: agenti, client finto e conversazioni registrate degli Atti 1 e 2; chat della web app.
- ST-WEB-004, ST-IMPR-001, ST-TODAY-001: modalità presentazione, imprevisti da chat, «Oggi».

### Scelte

- **Una sola fonte per il copione.** `copione.json` è letto dalla pagina e dai test; i test controllano che i prompt dei test degli agenti coincidano e che `docs/demo/copione-demo.md` sia quello generato.
- **Viaggi demo dal motore.** Profilo e istantanea precaricata producono la prima bozza (`avviaBozza`); il trekking impegnativo del sabato (Sentér de Chelina) entra con `mantieni`, si sposta alle 09:00 con l'operazione `sposta` e perde il lucchetto con `sblocca`, così la pioggia e la caviglia lo sostituiscono. Nessun calcolo di orari nella web app.
- **Luoghi aggiunti.** Le istantanee precaricate non hanno gli aeroporti di Verona e Fiumicino né la stazione di Verona Porta Nuova: i viaggi demo usano un'istantanea derivata (`<id>-demo`: precaricata più questi luoghi e i loro tempi), salvata nella base dati e nascosta tra le destinazioni. Le istantanee del repository non cambiano. Gli identificativi OpenStreetMap di questi tre luoghi sono illustrativi, gli orari e i codici di prenotazione dei voli e dei treni sono di esempio.
- **Senza rete.** Il primo avvio non usa la rete (test con `fetch` bloccato). Se la cartella delle istantanee non si trova, i tre viaggi della §8.3 si saltano invece di far fallire l'avvio.
- **Stati.** Garda e Dolomiti `confermato` con la sola versione 1 e la revisione B1; Roma `bozza` con la sola B1.

### Interpretazioni del requisito

- **CA-1 con il client finto.** Si passa dalla chat della web app (endpoint, agenti, strumenti, motore, SQLite) con conversazioni registrate: Atti 1 e 2 e prompt 3, 3b, 4, 4b sono quelle di `packages/agents`, l'Atto 3 è registrato per il viaggio demo. Il client finto prova le chiamate agli strumenti attese; il giudizio sul testo vero lo dà il collaudo.
- **Atto 4** (sciopero treni, confronto versioni) non è una chat: ha già i suoi test (`impr001`, `web004-ca4`); nel copione non ha «Copia».
- **Limiti noti dell'assistente, dichiarati dai test e non nascosti:** prompt 6 (nessun museo nella bozza del Garda: l'assistente lo dice), 8 (scambio di giornate intere non disponibile) e 10 (si torna indietro con «Annulla») non cambiano la bozza; il requisito atteso per questi tre resta quello della CR-001.

### Alternative scartate

- Aggiungere gli aeroporti alle istantanee del repository: le istantanee non cambiano mai e sarebbero entrate tra le destinazioni.
- Spostare il trekking al mattino con calcoli di orari nella web app: duplicava la logica del motore (CA-9 di REQ-WEB-002).
- Leggere le specifiche dal disco a runtime: la cartella di lavoro cambia nei test e nella build, il JSON del motore entra invece nella build.

## Verifica

Comandi eseguiti dalla radice: `npm ci`, `npm run build`, `npm test -w @travelops/engine`, `npm test -w @travelops/sources`, `npm test -w @travelops/agents`; in `apps/web`: `npx vitest run -t '^(?!.*axe-core con tutte le regole \(anche il contrasto\) su (home|stile) in tema).*$'`.

- `npm run build`: riuscito.
- Motore: 718 test superati. Sources: 96. Agents: 125.
- Web: 511 test superati e 4 esclusi (i controlli di contrasto axe nel browser su home e /stile); 19 nuovi di questa story, in 4 file `demo001b-*`.

| Criterio | Test |
| --- | --- |
| CA-1 prompt 1-2 e 5-11 (Garda) | `demo001b-ca1-copione` (chat della web app, base dati SQLite: preferenze, destinazione, bozza di 4 giorni con la degustazione, modifica, alternativa, conferma → versione 1) |
| CA-1 prompt 3, 3b, 4, 4b | `demo001b-ca1-copione` (tre destinazioni, Val di Fassa, Roma con bambini, Lisbona senza rete senza luoghi inventati) |
| CA-1 prompt 12-19 | `demo001b-ca1-copione` (su TRIP-DEMO-GARDA con l'orologio al 13 giugno 2026, ore 08:00: riepilogo con conferma, proposta dopo il «Sì»; la pioggia tocca il trekking, la cancellazione e la richiesta di restare toccano il volo di ritorno; Accetta crea la versione 2) |
| CA-1 prompt copiabili, fonte unica | `demo001b-ca1-presentazione` (ogni voce nella pagina, «Copia» solo sui prompt, `copione-demo.md` allineato) |
| CA-2 avvio | `demo001b-ca2-avvio` (script, README in ordine, viaggi demo senza rete, voli e treni a orario fisso, nessun problema bloccante); la build vera è `npm run build` |
| CA-3 ripristino | `demo001b-ca3-ripristino` (viaggio non demo creato, tutti i viaggi demo modificati e ripristinati uguali a prima, viaggio non demo invariato, cancellazione e doppio ripristino) |

### Collaudo con il modello OpenAI vero (da fare da Alice)

Non eseguito qui: questa macchina non ha una chiave. Passi esatti:

1. Dalla radice: `npm ci`, `npm run build`.
2. Avvio con la chiave solo nell'ambiente del server (mai nel codice né nei file): `OPENAI_API_KEY=<chiave> npm run dev` (modello predefinito `gpt-6-luna`, cambiabile con `TRAVELOPS_MODEL`).
3. Apri `http://localhost:3000/demo` → **Ripristina i viaggi demo**.
4. Atti 1 e 2: dalla home apri la chat «Raccontami il viaggio» e incolla in ordine i prompt 1, 2, 5, 6, 7, 8, 9, 10, 11 dal copione (pulsante «Copia» in fondo alla modalità presentazione). Poi, in nuovi viaggi, 3 e 3b, 4, 4b (il 4b richiede la rete).
5. Atto 3: in **Modalità presentazione** imposta l'orologio a sabato 13 giugno 2026, ore 08:00; apri il viaggio «Quattro giorni sul Lago di Garda», la sua chat, e incolla i prompt 12-19 rispondendo «Sì, procedi.» ai riepiloghi. Dopo il 12, **Accetta** deve creare la versione 2; poi **Ripristina i viaggi demo**.
6. Atto 4: dal viaggio delle Dolomiti, «Ho un imprevisto» → Sciopero → treni; poi Versioni → Confronta.
7. Per ogni prompt confronta con «Cosa deve succedere» in `docs/demo/copione-demo.md` e annota gli scarti.

## Collegamenti

- Requisito: REQ-DEMO-001 (revisione R2)
- Story: ST-DEMO-001B
- Dipendenze: ST-CAT-002A, ST-PLAN-001, ST-PLAN-002, ST-DATA-001, ST-ORCH-001C, ST-CHAT-001C, ST-WEB-004, ST-IMPR-001, ST-TODAY-001
- Aperti: collaudo con OpenAI (Alice); prompt 6, 8, 10 con i limiti dell'assistente sopra
