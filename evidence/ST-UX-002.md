# Prove di consegna: ST-UX-002

## Cosa è stato chiesto

REQ-UX-002 "Token moderni del design system" (modifica a REQ-UX-001). Story `ST-UX-002`, con questi criteri:

1. i colori stanno solo in `apps/web/src/ui/token.css`, in OKLCH; nessun colore nei componenti (CA-1);
2. tutte le coppie testo/sfondo raggiungono 4.5:1 in entrambi i temi; i controlli axe di contrasto su home e stile passano (CA-2);
3. scala tipografica con `clamp()` per ogni passo; nessuno scorrimento orizzontale a 320 px (CA-3);
4. `prefers-reduced-motion` annulla durate e animazioni (CA-4);
5. axe senza violazioni gravi e navigazione da tastiera invariata; testi in italiano senza codici tecnici (CA-5);
6. nessuna nuova dipendenza di esecuzione (CA-6).

## Perimetro ed esclusioni

- **Comprende:**
  - i token (`token.css`): palette in OKLCH con luminosità fissata per ruolo, stati derivati (forte, attivo, tenue) con `color-mix(in oklch, …)`, scala tipografica, spaziature e raggi fluidi, livelli di elevazione e token di movimento;
  - il calcolatore del contrasto (`contrasto.ts`): lettura di OKLCH e `color-mix`, conversione in sRGB e luminanza relativa (WCAG 2.2); gli esadecimali restano leggibili;
  - container query nei componenti adattivi: schede dei viaggi della home, linea del tempo, pannello chat;
  - i test di REQ-UX-001 che riguardano colori, contrasto e movimento, e due file di test nuovi;
  - la correzione del testo di REQ-UX-001 che citava Tailwind e shadcn/ui.
- **Esclude:** nuovi componenti, nuovi caratteri, cambi di impaginazione, modifiche al motore o agli agenti.
- **Lasciato fuori di proposito:** nessuna modifica a `.sdlc`; nessuna dipendenza nuova, nessun Tailwind; le API dei componenti (proprietà e nomi delle classi) non cambiano.
- **Deviazioni:** nessuna.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Palette OKLCH, stati derivati, scala fluida, spaziature e raggi fluidi, elevazione, movimento | `apps/web/src/ui/token.css` |
| Lettura di OKLCH e `color-mix`, conversione in sRGB, luminanza; coppie `-attivo` | `apps/web/src/ui/contrasto.ts` |
| Contenitori e regole `@container` di linea del tempo e chat | `apps/web/src/ui/ui.css` |
| Contenitore e regole `@container` delle schede dei viaggi; soglia del riquadro in rem | `apps/web/app/globals.css` |
| Lettura dei token con `light-dark()` e `var()` annidati dentro `color-mix` | `apps/web/test/supporto-css.ts` |
| Test aggiornati: colori solo nei token e in OKLCH, contrasto sui token OKLCH, movimento, larghezze, colori nel browser, axe a dissolvenza finita | `apps/web/test/ux001-ca1-colori.test.ts`, `ux001-ca2-contrasto.test.ts`, `ux001-ca7-movimento.test.ts`, `ux001-ca4-larghezze.test.tsx`, `ux001-browser.test.tsx` |
| Test nuovi | `apps/web/test/ux002-token-moderni.test.ts`, `apps/web/test/ux002-browser.test.tsx` |
| Correzione del vincolo su Tailwind e shadcn/ui | `docs/requirements/REQ-UX-001-design-system.md` |
| Prove di consegna | `evidence/ST-UX-002.md` |

## Perché

### Dipendenze

- ST-UX-001: componenti, token, tema chiaro e scuro (`tema.ts`, `light-dark()`), pagina /stile e test di REQ-UX-001.

### Scelte

- **Luminosità fissata per ruolo.** Ogni colore di testo, di sfondo o di riempimento ha una luminosità (L) per tema decisa una volta; tinta e croma si cambiano senza perdere il contrasto. Tutte le coppie hanno almeno 0.35 di margine oltre la soglia di 4.5:1 (e 3:1 per bordi e focus).
- **Stati derivati dai colori di base.** `forte` (hover) e `attivo` (pressione) sono miscele verso il colore del testo, `tenue` è una miscela con la superficie; le quote stanno in `--mescola-*`. Verso il testo significa più scuro nel tema chiaro e più chiaro nello scuro, senza valori duplicati.
- **Tutti i colori dentro la gamma sRGB.** Un test controlla che nessun token esca dalla gamma, così il browser non lo ritocca e il contrasto calcolato è quello a schermo.
- **Meccanismo del tema invariato.** Resta `light-dark()` con `color-scheme` e `data-tema`; `tema.ts` non cambia.
- **Scala fluida tra 320 e 1280 px.** Ogni passo è `clamp(min, intercetta + pendenza vw, max)` in rem: a 320 px i valori sono quelli di prima (nessuna regressione sul telefono), a 1280 px crescono fino a un quarto (spaziature) o poco più (titoli). Il testo resta in rem, quindi segue le impostazioni di dimensione del carattere.
- **Elevazione e movimento.** Livelli `--elevazione-0…4` (le ombre `--ombra-1…3` ne sono alias), colore dell'ombra come token; `--durata-minima` (100 ms) e `--curva-entrata` si aggiungono ai token esistenti, e con la preferenza di movimento ridotto tutte le durate valgono 0.
- **Container query minime.** `.scheda-viaggio` (`scheda`), `.ui-linea-tempo` (`linea-tempo`) e `.ui-chat` (`chat`) sono contenitori `inline-size`; le regole cambiano solo respiro e proporzioni interne, in rem. Le media query della pagina (navigazione, layout del viaggio) restano, perché riguardano la finestra e non un componente.

### Interpretazioni del requisito

- **CA-2, i quattro controlli axe.** I controlli falliti nel browser erano tre su quattro (home chiara, stile chiaro, stile scuro; home scura passava per il momento in cui axe misurava). Il problema non erano i token: sulla pagina i colori letti da axe erano più chiari di quelli dei token (per esempio `#579499` invece di `#0a6670`), cioè a metà della dissolvenza di ingresso di 250 ms (`ui-comparsa`) di schede, badge e testi. Il test ora aspetta la fine delle animazioni finite prima di lanciare axe; i token, già sopra 4.5:1, ora lo sono con più margine. Il contrasto vero resta garantito sui token da `ux001-ca2-contrasto`.

### Alternative scartate

- **Trasformare `forte` e `attivo` con la sintassi dei colori relativi** (`oklch(from …)`): richiede un segno diverso per i due temi e una regola in più per il tema di sistema; la miscela verso il testo ha già il verso giusto in entrambi.
- **Un aiuto di sviluppo per generare i colori:** non serve, il calcolo sta in `contrasto.ts` e i valori sono scritti una volta nel foglio dei token.
- **Togliere la dissolvenza di ingresso per far passare axe:** cambierebbe l'identità visiva per un problema di misura del test.

## Verifica

Comandi eseguiti nella copia di lavoro: `npm ci --offline`, `npm run build` (dalla radice); in `apps/web`: `npx vitest run` (tutti i test, nessuna esclusione) e `npx tsc --noEmit -p .`.

- `npm run build`: riuscito.
- Web: 77 file e 518 test superati, 0 saltati, con il Chrome locale presente. Nuovi o ampliati in questa storia: 18 test in `ux002-*` e 4 in `ux001-ca1-colori` e `ux001-ca2-contrasto`.
- I quattro controlli axe di contrasto su home e /stile (tema chiaro e scuro) passano; prima ne fallivano tre.
- Senza un browser di sistema i test in `ux001-browser` e `ux002-browser` si saltano in locale con un avviso e falliscono nella CI.

Contrasto delle coppie dei controlli che fallivano (rapporto testo/sfondo calcolato sui token, prima e dopo):

| Elemento | Coppia | Chiaro prima | Chiaro dopo | Scuro prima | Scuro dopo |
| --- | --- | --- | --- | --- | --- |
| `.ui-badge--primario` | testo primario su tinta primaria | 5.66 | 5.77 | 7.29 | 8.75 |
| `.scheda-viaggio__variante` | testo primario su superficie | 6.67 | 6.90 | 9.97 | 10.95 |
| `.scheda-viaggio__descrizione` e `.ui-scheda-attivita__dati span` | testo tenue su superficie | 7.64 | 7.16 | 8.18 | 8.64 |

Misurati da axe a metà della dissolvenza (prima della correzione del test), nel tema chiaro: badge 3.01, variante 3.36, descrizione 3.49.

Corrispondenza criteri e test:

| Criterio | Test |
| --- | --- |
| CA-1 colori solo nei token, in OKLCH | `ux001-ca1-colori` (un solo posto per i colori, ogni colore con valore chiaro e scuro o derivato; nel file dei token nessun esadecimale, `rgb()` o colore con nome; nei fogli di stile e nei componenti nessun colore scritto a mano) |
| CA-2 contrasto 4.5:1 in entrambi i temi | `ux001-ca2-contrasto` (conversione OKLCH, miscele e gamma sRGB; ogni coppia di testo a 4.5:1 e bordi e focus a 3:1; stati derivati), `ux001-browser` (axe con tutte le regole, contrasto compreso, su home e /stile, chiaro e scuro) |
| CA-3 scala fluida con `clamp()`, niente scorrimento a 320 px | `ux002-token-moderni` (ogni passo è un `clamp()` in rem che tocca minimo e massimo a 320 e 1280 px; font-size solo dai token; spaziature e raggi fluidi), `ux002-browser` (nessun scorrimento a 320 e 375 px su tutte le pagine principali; dimensioni misurate a 320, 800 e 1280 px), `ux001-ca4-larghezze`, `ux001-browser` (375 px e griglia a 1280 px) |
| CA-4 movimento ridotto | `ux001-ca7-movimento` (durate da 100 a 250 ms, curve solo dai token, ogni durata a zero con la preferenza), `ux002-token-moderni` (elevazione e movimento), `ux002-browser` (durate dei token calcolate nel browser, con e senza preferenza), `ux001-browser` (animazioni e transizioni a zero) |
| CA-5 axe e tastiera invariati | `ux001-ca5-axe`, `ux001-ca5-tastiera`, `ux001-browser` (Tab e focus visibile), `ux001-ca6-codici` (nessun codice a vista) |
| CA-6 nessuna nuova dipendenza | `ux002-token-moderni` (elenco delle dipendenze di esecuzione invariato, nessun Tailwind) |
| Container query | `ux002-token-moderni` (contenitori `scheda`, `linea-tempo`, `chat` con regole `@container` in rem), `ux002-browser` (griglia a 4 colonne a 1280 px e a una a 375 e 320 px; la regola segue il contenitore e non la finestra) |

## Collegamenti

- Requisito: REQ-UX-002 (modifica a REQ-UX-001)
- Story: ST-UX-002
- Dipendenze: ST-UX-001
