# Prove di consegna: ST-UX-003B (criteri CB-1, CB-2, CB-3, CB-4, CB-5, CB-6, CB-7 e CB-8)

## Cosa è stato chiesto

REQ-UX-003, story `ST-UX-003B`: un'app bella, chiara e coinvolgente. Questa parte copre:

1. CB-1 /pianifica: riepilogo preferenze compatto (chip modificabili) e bozza visibile senza scorrere a 1280×800, affiancata ai filtri;
2. CB-2 Destinazioni pronte: immagini in proporzione e testo leggibile (almeno il testo base);
3. CB-4 Home e card dei viaggi: titoli senza punteggiatura orfana, un'immagine o illustrazione per ogni viaggio o luogo (asset locali o CSS/SVG, configurabili);
4. CB-6 Demo e Oggi: gerarchia visiva più forte, momento attuale in evidenza, immagini dei luoghi, token OKLCH di UX-002;
5. CB-7 per queste schermate: micro-interazioni, stati vuoto/caricamento/errore, contrasto e accessibilità;
6. CB-8 per queste schermate: prove a 375 e 1280 px e screenshot come evidenza.

CB-3 (/bozza) e CB-5 (conferma) sono descritti nella sezione «Bozza e conferma (CB-3, CB-5)».

## Perimetro ed esclusioni

- **Comprende:** /bozza (menu, selettore, festa della conferma, loading/error), /pianifica (pagina, riepilogo, passo «Dove»), home, Demo, Oggi, un componente condiviso per le immagini dei luoghi, i token dei colori dei luoghi, `app/loading.tsx` e `app/error.tsx`.
- **Esclude:** `SchedaAttivita` (condivisa con la bozza), il motore e gli agenti, `.sdlc`. Nessuna dipendenza nuova.
- **Deviazioni:** nessuna. Due correzioni di contorno, necessarie per le pagine toccate (vedi «Perché»).

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Illustrazione dei luoghi: configurazione (tipi, parole, immagini locali, ripiego per stile), disegno deterministico, componente | `apps/web/src/ui/luoghi-config.ts`, `luogo-forme.ts`, `IllustrazioneLuogo.tsx` |
| Colori dei luoghi (token OKLCH, chiaro e scuro) e stili `.ui-luogo*` | `apps/web/src/ui/token.css`, `ui.css` |
| Contrasto: i colori dei luoghi tra le coppie grafiche (3:1) | `apps/web/src/ui/contrasto.ts` |
| CB-1: pagina Pianifica a colonne, bozza fissa e scorrevole, scheletro e stato vuoto con immagine | `apps/web/src/chat/PaginaPianifica.tsx`, `ui.css` |
| CB-1: riepilogo a chip con le voci predefinite raccolte (`predefinita`) | `apps/web/src/componenti/RiepilogoPreferenze.tsx`, `src/preferenze/percorso.ts`, `app/globals.css` |
| CB-2: schede delle destinazioni pronte | `apps/web/src/componenti/PassiPreferenze.tsx`, `app/globals.css` |
| CB-4: home | `apps/web/src/componenti/PaginaHome.tsx`, `app/globals.css` |
| CB-6: Oggi (eroe «Adesso», «Dopo», linea del tempo) e Demo (momento attuale, immagini degli scenari) | `apps/web/src/componenti/PannelloOggi.tsx`, `PaginaDemo.tsx`, `src/viste/demo.ts`, `app/globals.css` |
| CB-7: caricamento ed errore globali; titoli senza livelli saltati (chat, Sorprendimi, Oggi) | `apps/web/app/loading.tsx`, `app/error.tsx`, `src/ui/PannelloChat.tsx`, `src/componenti/Sorprendimi.tsx` |
| Test | `apps/web/e2e/ux003b-pianifica.e2e.ts`, `ux003b-home-oggi.e2e.ts`, `ux003b-scatti.e2e.ts`, `ux003b-supporto.ts`; `apps/web/test/ux003b-luoghi.test.tsx`; `ux001-guscio-home.test.tsx` aggiornato |
| Screenshot | `evidence/ST-UX-003B/screenshots/prima/`, `evidence/ST-UX-003B/screenshots/dopo/` |

## Perché

- **Parentesi graffa mancante in `globals.css`.** Dopo `.confronto__elenco` mancava una `}`: tutte le regole seguenti (riepilogo, percorso, Oggi, Demo, bozza…) venivano annidate sotto quel selettore e non si applicavano. È la causa principale dell'aspetto «grezzo» (pulsanti del browser, elenchi puntati, niente colonne). Una riga corregge; gli screenshot «prima» mostrano lo stato rotto.
- **Illustrazione dei luoghi generata, non servizi esterni.** Il repo non ha immagini locali: `IllustrazioneLuogo` disegna in SVG (lago, montagna, mare, città d'arte, borgo, parco, generico) da nome e seme, quindi stesso luogo = stesso disegno e viaggi nello stesso posto restano distinguibili. Tipi, parole chiave e immagini locali (`IMMAGINI_LUOGHI`, prop `immagine`) stanno in `luoghi-config.ts`; i colori sono token. Con un'immagine il componente usa `object-fit: cover`.
- **Proporzioni.** Ogni immagine ha `aspect-ratio` (16:9, 16:7, 1:1) e il disegno si ritaglia (`slice`) senza deformarsi.
- **Chip.** Le scelte fatte sono pochi chip (con la matita); le voci lasciate al valore predefinito si aprono su richiesta («Altre N preferenze»). Ogni chip porta al suo passo; la struttura `data-campo` è invariata.
- **Pianifica.** Il riquadro è un container: da 44 rem filtri e bozza sono affiancati, la bozza resta in vista (sticky) e scorre da sola; sotto, uno sotto l'altra. L'avviso introduttivo è diventato una riga sotto il titolo (che ora è visibile).
- **Oggi.** «Adesso» è l'eroe (immagine del luogo, nome grande, barra di avanzamento, tempo che manca); «Dopo» e i momenti successivi in una linea del tempo. Le sezioni stanno un livello sotto il titolo.
- **Movimento.** Ingresso a cascata delle schede, zoom lieve delle immagini, rialzo e cambio di bordo al passaggio: tutto con i token di durata, quindi a zero con `prefers-reduced-motion`.

### Alternative scartate

- Immagini da servizi esterni o fotografie: vietato dal requisito e senza licenza nel repo.
- Colori delle illustrazioni calcolati in TSX o CSS: violerebbe CA-1 di UX-001; sono token.
- Spostare la bozza nella scheda «Mappa» di `LayoutViaggio`: avrebbe mostrato l'etichetta sbagliata sul telefono.

## Verifica

Comandi nel worktree `TravelOps-ux003b`: `npm ci --prefer-offline`, `npm run build`; in `apps/web`: `npx tsc --noEmit`, `npx vitest run`; dalla radice `npm run e2e`.

- `npm run build`: riuscito.
- Typecheck: nessun errore.
- Unitari web (dopo l'unione): 85 file, 557 test superati (nuovi: `ux003b-luoghi`, 14). Per i token dei luoghi due colori sono stati abbassati di croma finché stavano nella gamma sRGB (test esistente).
- E2E (dopo l'unione di /bozza): 11 file, 36 test superati (18 esistenti + 9 nuovi di /pianifica, home e Oggi + 9 nuovi di /bozza). Log in `evidence/ST-UX-003B/log/` (`build.log`, `unit.log`, `e2e.log`).
- Server e browser di prova spenti a fine esecuzione.

| Criterio | Prova |
| --- | --- |
| CB-1 | `ux003b-pianifica`: al massimo 5 chip visibili, tutti bassi; «Altre N» mostra le predefinite; a 1280×800 la bozza sta accanto ai filtri e titolo e primo giorno stanno nella finestra senza scorrere; a 375 px la bozza è sotto i filtri; nessuno scorrimento orizzontale |
| CB-2 | `ux003b-pianifica`: ogni scheda ha immagine 16:9 (larghezza > 100 px) e nome con corpo ≥ `--testo-m`, non tagliato |
| CB-4 | `ux003b-home-oggi`: i titoli non hanno `:`/`;`/`,` orfani; 4 card, ciascuna con disegno (≥ 4 tracciati, 16:7), disegni tutti diversi, nessuna risorsa esterna; `ux003b-luoghi`: determinismo, tipi, assenza di URL/colori in linea |
| CB-6 | `ux003b-home-oggi`: eroe «Adesso» nella finestra, titolo ≥ 1.5× quello di «Dopo», almeno 2 immagini, ora simulata grande nella Demo e immagine per ognuno degli scenari |
| CB-7 | axe (WCAG 2.x AA e buone pratiche, contrasto compreso) senza violazioni su home, Oggi, Demo e Pianifica, a 375 e 1280 px; `ux001-ca2-contrasto` con i colori dei luoghi a 3:1; `ux001-ca1-colori` (nessun colore fuori dai token) |
| CB-8 | i test sopra girano a 375 e 1280 px; screenshot in `evidence/ST-UX-003B/screenshots/` |

Screenshot (`<nome>--375px.png` e `<nome>--1280px.png`; `prima/` sul codice di `main`, `dopo/` a fine lavoro; i `*-test` sono scattati dai test): `cb1-pianifica-vuota`, `cb1-pianifica-bozza` (finestra) e `cb1-pianifica-bozza-intera`, `cb2-destinazioni-pronte`, `cb4-home`, `cb6-oggi`, `cb6-demo`.

## Limiti

- Gli screenshot «prima» includono il difetto della parentesi mancante: non mostrano solo la differenza di design.
- L'intestazione a 1280 px va su due righe (il selettore del tema va a capo); non è stata toccata, quindi la bozza fissa parte sotto un margine di 9 rem.
- Le illustrazioni sono schematiche: con fotografie locali basta compilare `IMMAGINI_LUOGHI`.

## Bozza e conferma (CB-3, CB-5)
Perimetro: `/bozza/[viaggio]` e la festa della conferma (CB-3, CB-5, parte di CB-7 e CB-8).

### CB-3 Bozza
- Un menu «…» per attività (Sostituisci, Sposta, Blocca/Sblocca, Rimuovi) e un menu «Modifica giorno» (più leggera, più piena, rigenera, «Scambia con…» come sottomenu, «Aggiungi un'attività…»). Radix DropdownMenu (già nel progetto): ruoli `menu`/`menuitem`, frecce, Esc, focus all'attivatore alla chiusura; Sposta e Sostituisci portano il focus nel pannello che aprono.
- «Aggiungi un'attività» apre un selettore ricercabile (ricerca senza accenti) con due gruppi: «Consigliate per te» e «Altre idee».
- Spostamenti brevi (soglia `SOGLIA_SPOSTAMENTO_BREVE_MINUTI` in `src/bozza/configurazione.ts`, 15, o prop `sogliaSpostamentoBreve`): connettore compatto con icona e minuti; i lunghi restano una riga per esteso. Elenchi senza numerazione. `SpostamentoBozzaVista.minuti` calcolato con `minutiTra` esistente.
- Id e test preservati: `data-data`, `data-elemento`, `data-messaggio`, nomi accessibili «Azioni per «…»», «Alternative a «…»», «Sposta qui». Nuovi: `data-tipo`, `data-pasto`, `data-breve`.

### CB-5 Festa
Un solo controllo («Chiudi», icona X; anche Esc). Via «Togli i coriandoli». Il focus torna al titolo. Il messaggio duplicato «Buon viaggio!» non compare più.

### CB-7
- Caricamento (`loading.tsx` con scheletro), errore (`error.tsx`, Riprova/Torna ai viaggi), giorno vuoto («Giornata libera» con azione), stato «Aggiorno la bozza…» e `aria-busy`.
- Movimento: coriandoli e comparsa dei menu con durate dei token; con `prefers-reduced-motion` i coriandoli non si vedono. Colori solo da token già verificati (contrasto.ts); nessun valore nuovo.

### Correzione a globals.css
Mancava la `}` di chiusura di `.confronto__elenco` (riga ~1349): tutte le regole successive, bozza compresa, erano annidate e quindi senza effetto. Aggiunta la graffa.

### Prove
- E2E di /bozza: 9 nuovi (`ux003b-bozza-menu`, `ux003b-bozza-conferma`, a 375 e 1280 px). `ca2`/`ca3` aggiornati ai menu (stessa copertura).
- I test `plan002-*` adattati ai menu e alla festa a un solo controllo (helper in `test/supporto-bozza.tsx`).
- Screenshot in `evidence/ST-UX-003B/screenshots/bozza-*.png` (prima/dopo).

### Limiti
Le icone dei mezzi non sono distinte (la vista bozza porta il mezzo solo nel testo). Contrasto non misurato con uno strumento sul rendering, solo per token.

## Collegamenti

- Requisito: REQ-UX-003
- Story: ST-UX-003B
- Dipendenze: ST-UX-002
