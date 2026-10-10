# Prove di consegna: ST-CAT-002C

## Cosa è stato chiesto

La parte web di REQ-CAT-002 "Destinazioni reali e istantanee" (ondata 2, CR-001 §9.5b). Story `ST-CAT-002C` "Destinazioni nella web app: ricerca, avanzamento, attribuzioni, Sorprendimi", con questi criteri:

1. ricerca della destinazione con suggerimenti mentre si scrive, con almeno 300 ms di attesa tra una battuta e la ricerca;
2. avanzamento della costruzione mostrato al viaggiatore e messaggio gentile con destinazioni vicine (CA-5 di REQ-CAT-002) nella web app;
3. attribuzioni: OpenStreetMap sulla mappa e nei dettagli, autore e licenza delle immagini, fonte delle descrizioni;
4. "Sorprendimi": elenco configurabile di 20 destinazioni candidate in `packages/sources/candidates.json`, ordinate col punteggio del profilo; si propongono le prime 3 (CA-7 di REQ-PREF-001).

## Perimetro ed esclusioni

- **Comprende:**
  - la pagina `/destinazione` ("Scegli la destinazione"), con una voce "Destinazione" nella navigazione;
  - la ricerca con attesa di 300 ms, la costruzione con avanzamento, il messaggio con le destinazioni vicine, le attribuzioni della destinazione costruita;
  - le attribuzioni sotto la mappa del giorno e nei dettagli di un'attività (pagina e pannello);
  - Sorprendimi: `packages/sources/candidates.json` (20 voci), il lettore validato, l'ordine col punteggio del profilo e le prime 3;
  - i test dei quattro criteri.
- **Esclude** (di altre storie):
  - la realizzazione reale con Nominatim, Overpass, Wikipedia, Wikimedia Commons e OSRM, le 3 istantanee precaricate, il limite di 1 richiesta al secondo (CA-4) e il calcolo delle destinazioni vicine reali (CA-5, lato sorgente): ST-CAT-002. La web app parla con l'interfaccia `SorgenteDestinazioni`: oggi è la sorgente registrata sulle istantanee del database, senza rete;
  - il percorso guidato in 5 passi, il riepilogo vivo e il profilo completo del viaggiatore: ST-PREF-001B. Sorprendimi raccoglie qui solo stili desiderati, stili da evitare e mese di partenza;
  - le immagini delle attività nelle schede (il catalogo di riferimento non ne ha e la CSP blocca quelle esterne): si mostrano solo autore e licenza quando i dati hanno un'immagine.
- **Lasciato fuori di proposito:**
  - nessuna modifica a `packages/engine`, a `.sdlc`, ai `package.json` della radice e a `.github`;
  - nessuna dipendenza npm nuova, nessun Tailwind, nessun colore o stile in linea: solo i token e i componenti di REQ-UX-001;
  - nessuna nuova chiamata di rete dal browser, nessun nuovo indirizzo esterno, la CSP non cambia (vedi "Scelte").
- **Deviazioni:** nessuna dai criteri. I limiti sono in "Interpretazioni del requisito".

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Elenco delle 20 destinazioni candidate (id, nome, descrizione, stili, mesi consigliati), esportato come `@travelops/sources/candidates.json` | `packages/sources/candidates.json`, `packages/sources/package.json` |
| Lettore validato, ordine col punteggio del profilo, prime 3 | `packages/sources/src/candidati.ts`, `packages/sources/src/index.ts` |
| Documentazione di Sorprendimi nel pacchetto | `packages/sources/README.md` |
| Tipi e costanti condivisi tra server e browser (`ATTESA_RICERCA_MS` = 300, lunghezza minima, esiti) | `apps/web/src/destinazioni/tipi.ts` |
| Servizio lato server: ricerca, costruzione con avanzamento, destinazioni vicine, attribuzioni, Sorprendimi | `apps/web/src/destinazioni/servizio.ts` |
| Sorgente della web app (registrata, sulle istantanee del database) e lettura di `candidates.json` | `apps/web/src/destinazioni/sorgente.ts`, `apps/web/src/destinazioni/candidati.ts` |
| Azioni lato server (le uniche che il browser chiama) e pagina | `apps/web/app/destinazione/azioni.ts`, `apps/web/app/destinazione/page.tsx` |
| Componenti: scelta con attesa, avanzamento, Sorprendimi, attribuzioni, pagina | `apps/web/src/componenti/SceltaDestinazione.tsx`, `AvanzamentoCostruzione.tsx`, `Sorprendimi.tsx`, `Attribuzioni.tsx`, `PaginaDestinazione.tsx` |
| Attribuzioni sotto la mappa e nei dettagli (pagina e pannello); view model | `apps/web/src/componenti/SezioneMappa.tsx`, `DettaglioElemento.tsx`, `ContenutoPannello.tsx`, `apps/web/src/viste/elemento.ts` |
| Testo e link dell'attribuzione di OpenStreetMap; indirizzo della pagina; voce di navigazione; mesi di partenza | `apps/web/src/rete.ts`, `apps/web/src/percorsi.ts`, `apps/web/src/ui/Navigazione.tsx`, `apps/web/src/viste/etichette.ts` |
| Stili (solo token) | `apps/web/app/globals.css` |
| Test | `apps/web/test/cat002c-*.test.ts(x)`, `apps/web/test/supporto-destinazioni.tsx`, `packages/sources/test/cat002c-candidati.test.ts` |
| Test esistenti aggiornati: la nuova voce di navigazione e la pagina tra quelle controllate dai test di REQ-UX-001 | `apps/web/test/ux001-guscio-home.test.tsx`, `apps/web/test/supporto-ux.tsx` |
| Prove di consegna | `evidence/ST-CAT-002C.md` |

## Perché

### Dipendenze

- ST-CAT-002A: interfaccia `SorgenteDestinazioni`, sorgente registrata, passi e messaggi di avanzamento, lettore delle istantanee e delle aree, attribuzione OSM, autore e licenza delle immagini.
- ST-PREF-001A: `validaProfilo` e `valutaAttivita` (punteggio della §7.7) del motore.
- ST-UX-001: token, `Pulsante`, `ChipSelezionabile`, `Avviso`, campi, icone Lucide. Nessuna dipendenza npm nuova.

### Scelte

- **Nessuna rete dal browser.** Il browser chiama solo tre azioni lato server (`app/destinazione/azioni.ts`), nello stesso modo in cui la Demo chiama le sue; la sorgente di destinazioni gira sul server. La CSP (`connect-src 'self'`), `src/rete.ts` e `next.config.mjs` non cambiano, e il test `ca6-rete` passa senza modifiche. Il componente riceve il servizio come proprietà (come la chat riceve la sua sorgente): nei test si sostituisce, in produzione sono le azioni.
- **Attesa nel componente, non nella sorgente.** L'interfaccia della sorgente assegna l'attesa di 300 ms all'interfaccia: un `setTimeout` ripartito a ogni battuta, con la risposta di una ricerca già superata scartata. La costante è `ATTESA_RICERCA_MS` in un solo punto.
- **Punteggio di Sorprendimi dal motore, non riscritto.** Ogni candidata è valutata con `valutaAttivita` come un'attività neutra con i soli stili della destinazione: i punti e le esclusioni sono quelli della §7.7. Nel pacchetto sources, accanto all'elenco, perché il pacchetto già dipende dal motore; la web app chiama `proponiSorprendimi`.
- **Elenco solo nel file.** `candidates.json` è letto e validato da `leggiCandidati`; un test verifica che nessun nome delle 20 voci compaia nel codice di `apps/web` e di `packages/sources/src`.
- **Il profilo di Sorprendimi si completa con il motore.** Gli stili e il mese scelti dal viaggiatore diventano una bozza che passa da `validaProfilo` (predefiniti compresi: senza stili, cultura e natura). La durata serve solo a completare il profilo (si usa il minimo del motore) e non influisce sulla scelta.
- **Mese di partenza dall'orologio simulato.** I 12 mesi proposti partono dal mese dell'orologio dello stato locale (come il resto dell'app): la web app non legge l'orologio di sistema (CA-9 di REQ-WEB-002).
- **Attribuzioni solo se i dati le hanno.** Nei dettagli compaiono "© OpenStreetMap contributors" (luogo con origine `osm`), la fonte della descrizione e autore e licenza dell'immagine, solo se registrati. I viaggi di riferimento non vengono da OpenStreetMap e non hanno immagini: non si inventa nulla. Sotto la mappa del giorno l'attribuzione c'è sempre, perché le tessere sono di OpenStreetMap, e si aggiunge a quella interna di Leaflet.
- **`@travelops/sources` non è dichiarato in `apps/web/package.json`**, come già annotato da ST-CAT-002A: il test CA-9 di REQ-WEB-002 elenca le sole dipendenze ammesse. Il pacchetto si risolve dal collegamento del workspace.

### Interpretazioni del requisito

- **Avanzamento.** Le azioni lato server non trasmettono dati a pezzi: la costruzione restituisce l'elenco dei passi fatti insieme all'esito. Mentre lavora, la pagina mostra una barra indeterminata e "Sto preparando…"; a fine lavoro mostra la barra piena e i passi con i messaggi della sorgente ("Cerco i luoghi…", "Scelgo i ristoranti…", "Calcolo i percorsi…"). Con la sorgente reale (ST-CAT-002) l'avanzamento passo per passo in tempo reale richiederà un canale a flusso: oggi non c'è nell'architettura e non è stato aggiunto.
- **Messaggio gentile.** Il testo è quello della sorgente (`EsitoCostruzione`, motivo `minimi_non_rispettati`), mostrato in un avviso informativo con le destinazioni vicine (al massimo 3) come pulsanti: un clic costruisce la vicina. Nessun codice delle mancanze è mostrato.
- **Sorprendimi.** "Ordinate col punteggio del profilo": punteggio decrescente; a parità prima chi ha il mese del viaggio tra i consigliati, poi l'`id`. Le candidate con uno stile da evitare sono escluse; se ne restano meno di 3, se ne propongono meno. Scegliere una proposta riempie il campo di ricerca con il nome, che passa dalla ricerca come ogni altra destinazione.
- **Ricerca.** Servono almeno 2 caratteri (come la sorgente). Senza risultati un messaggio gentile invita a controllare il nome o provare una città vicina. Nel repository `snapshots/` è ancora vuota (le 3 destinazioni arrivano con ST-CAT-002): finché non ci sono, la ricerca non trova nulla.

### Alternative scartate

- Chiamare Nominatim o altri servizi dal browser: vietato da CSP e da REQ-CAT-002 (le chiamate di rete stanno solo in `packages/sources`).
- Riscrivere il punteggio in `apps/web`: duplicherebbe la logica del motore (vincolo di REQ-PREF-001 e REQ-UX-001).
- Mettere l'elenco delle candidate nel codice o in un file della web app: il requisito lo vuole in `packages/sources/candidates.json`.
- Un flusso di dati dal server per l'avanzamento in tempo reale: nuova infrastruttura non prevista dall'architettura di ST-CAT-002A.
- Una libreria per il ritardo della ricerca: bastano `setTimeout` e `clearTimeout`.

## Verifica

Comandi eseguiti dalla radice della copia di lavoro (`/Users/antonioantenore/Documents/Projects/TravelOps-cat002c`): `npm ci`, `npm run build`, `npm run typecheck -w apps/web`, `npm test`.

- `npm run build`: riuscito (motore, sources e web app; la pagina `/destinazione` è dinamica).
- `npm run typecheck -w apps/web`: riuscito.
- `npm test`:
  - `@travelops/engine`: 30 file, 573 test, tutti superati;
  - `@travelops/sources`: 7 file, 65 test, tutti superati (9 nuovi);
  - `@travelops/web`: 48 file, 343 test, 339 superati e 4 falliti. I 4 sono i controlli di contrasto axe nel browser su home e /stile (`ux001-browser`), che falliscono solo con il Chrome locale e passano in CI; non riguardano questa storia. I test nuovi di questa storia sono 29.

Corrispondenza criteri e test:

| Criterio | Test |
| --- | --- |
| 1. Suggerimenti mentre si scrive, almeno 300 ms | `cat002c-debounce` (orologio finto: nessuna ricerca a 299 ms, una a 300 ms; più battute danno una sola ricerca; sotto 2 caratteri non si cerca; risposte superate scartate; nessun risultato) |
| 2. Avanzamento e messaggio gentile con destinazioni vicine | `cat002c-avanzamento` (passi e messaggi della sorgente, avanzamento in corso e finito, barra, avviso gentile, vicine cliccabili, errore della sorgente), `cat002c-sorgente-locale` (sorgente sul database) |
| 3. Attribuzioni | `cat002c-attribuzioni` (OpenStreetMap sotto la mappa, nel dettaglio e nel pannello; autore e licenza delle immagini; fonte delle descrizioni; destinazione costruita; nessuna attribuzione inventata) |
| 4. Sorprendimi: 20 candidate, prime 3 per punteggio | `cat002c-candidati` (sources: 20 voci valide, lettore, punteggio del motore, esclusioni, parità, prime 3), `cat002c-sorprendimi` (web: 20 voci, nessun nome nel codice, 3 proposte nell'ordine atteso, scelta) |
| Vincoli di rete e di design | `ca6-rete`, `ux001-ca1-colori`, `ux001-ca4-larghezze`, `ux001-ca6-codici`, `ux001-ca7-movimento`, `web002-ca9-motore` (invariati, la pagina nuova è tra quelle controllate) |

## Collegamenti

- Requisito: REQ-CAT-002 (con REQ-PREF-001 CA-7)
- Story: ST-CAT-002C
- Contratto: contract-ST-CAT-002C-implementation
- Esecuzione autonoma: AUT-PR-CAT-002C
- Dipendenze: ST-CAT-002A, ST-PREF-001A, ST-UX-001
