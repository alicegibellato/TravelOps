# Prove di consegna: ST-UX-001

## Cosa è stato chiesto

Il requisito REQ-UX-001 "Design system e guscio dell'app" (CR-001 §9.1, ondata 2) chiede di dare a TravelOps l'aspetto di un prodotto:

- **Token** di colore, tipografia, spaziatura, raggi, ombre e movimento, in tema chiaro e scuro (§6.1).
- **Libreria di componenti** della §6.2 in `apps/web/src/ui`, con una pagina interna `/stile` che li mostra tutti, non collegata dal menu.
- **Guscio dell'app**: intestazione con logo TravelOps e "I miei viaggi", layout desktop e telefono della §6.3, selettore del tema.
- **Home**: titolo accogliente, pulsante "Pianifica un viaggio", schede dei viaggi con immagine, date e stato (Bozza, Confermato, In corso, Concluso), stato vuoto illustrato.
- **Testi in linguaggio semplice**: tutti i codici del motore (problemi, tipi di imprevisto, tipi di alternativa) tradotti in un unico modulo.

Criteri di accettazione CA-1…CA-7. Story `ST-UX-001`, una pull request da `feature/ST-UX-001`.

## Perimetro ed esclusioni

- **Comprende:**
  - i token in `apps/web/src/ui/token.css`;
  - i 16 componenti della §6.2, il guscio, il layout delle pagine di viaggio e il selettore del tema in `apps/web/src/ui`;
  - la home e la pagina `/stile`;
  - il modulo dei testi `apps/web/src/testi.ts`;
  - il nuovo aspetto applicato a tutte le pagine esistenti: consultazione, Demo, proposte, versioni, pagina non trovata;
  - la rimozione dei codici tecnici dal testo visibile di tutte le pagine (CA-6);
  - i test di CA-1…CA-7.
- **Esclude (fuori perimetro del requisito o di altre storie):**
  - preferenze, chat e generazione dell'itinerario (PREF-001, CHAT-001, PLAN-001);
  - la vista giorno come linea del tempo, l'evidenziazione reciproca scheda/mappa, il dettaglio in pannello laterale (REQ-WEB-003);
  - la proposta come scheda "prima → dopo" nella pagina vera, la cronologia delle versioni, la modalità presentazione (REQ-WEB-004);
  - lingue diverse dall'italiano.
- **Lasciato fuori di proposito:**
  - `packages/` non è toccato: il motore resta la fonte di dati, regole e messaggi;
  - `apps/web/src/stato/` e il salvataggio dello stato non sono toccati: in parallelo c'è DATA-001;
  - `README.md`, `apps/README.md`, `.github`, `.gitignore` della radice e `package.json` della radice non sono cambiati. La CI esegue già `npm ci`, `npm run build` e `npm test` su `ubuntu-latest`, dove Google Chrome è preinstallato.
- **Deviazioni:**
  - **Tailwind CSS non è stato adottato, per decisione di Alice (2026-10-09).** Rifare stile e verifiche con Tailwind avrebbe richiesto tempo e portato rischi. I token sono variabili CSS e i componenti usano classi CSS proprie (`ui-*`); Tailwind v4 (`@theme` sopra gli stessi token) si potrà aggiungere in seguito. Radix UI e le icone Lucide del vincolo sono invece adottati.
  - **I caratteri non vengono da Google Fonts ma da file locali.** Plus Jakarta Sans e Inter arrivano dai pacchetti `@fontsource-variable/*`, con licenza OFL. Le regole del progetto vietano risorse da CDN, e la CSP lo impone.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Token chiari e scuri: colori (lago, tramonto, sole, neutri caldi, stati, 7 stili di viaggio), tipografia, spaziatura su griglia da 4 px, raggi, ombre, movimento; `prefers-reduced-motion` | `apps/web/src/ui/token.css` |
| Coppie testo/sfondo usate dall'interfaccia e calcolo del contrasto WCAG | `apps/web/src/ui/contrasto.ts` |
| Stili dei componenti e del guscio (solo token) | `apps/web/src/ui/ui.css` |
| Componenti §6.2: pulsanti, chip, slider (Radix), selettore di date e periodi, contatore, scheda attività, linea del tempo, pannello chat, scheda proposta, badge, avvisi, finestre e pannelli laterali (Radix), notifiche (Radix), scheletro, stato vuoto, illustrazioni generate, icone di stili e mezzi | `apps/web/src/ui/Pulsante.tsx`, `Chip.tsx`, `Slider.tsx`, `SelettoreDate.tsx`, `Contatore.tsx`, `SchedaAttivita.tsx`, `LineaTempo.tsx`, `PannelloChat.tsx`, `SchedaProposta.tsx`, `Badge.tsx`, `Avviso.tsx`, `Finestra.tsx`, `Notifica.tsx`, `Scheletro.tsx`, `StatoVuoto.tsx`, `Illustrazione.tsx`, `stili.tsx`, `catalogo.ts` (in `apps/web/src/ui/`) |
| Guscio: logo, intestazione, navigazione con la pagina corrente, link "Vai al contenuto", selettore del tema (ricordato nel browser), layout delle pagine di viaggio (§6.3) | `apps/web/src/ui/Logo.tsx`, `Guscio.tsx`, `Navigazione.tsx`, `SelettoreTema.tsx`, `tema.ts`, `LayoutViaggio.tsx` (in `apps/web/src/ui/`), `apps/web/app/layout.tsx` |
| Unico modulo dei testi: traduzione di tutti i codici del motore (fattibilità, errori dei dati, storico, modifiche), dei tipi di imprevisto, delle alternative, della gravità, degli stati del viaggio, degli stili e dei livelli; `inParole` riscrive i testi del motore senza codici | `apps/web/src/testi.ts` |
| Home: benvenuto, "Pianifica un viaggio" (finestra), schede dei viaggi, stato vuoto | `apps/web/app/page.tsx`, `apps/web/src/componenti/PaginaHome.tsx`, `PianificaViaggio.tsx`, `apps/web/src/viste/home.ts` |
| Pagina interna `/stile` (non indicizzata) | `apps/web/app/stile/page.tsx`, `apps/web/src/componenti/PaginaStile.tsx` |
| Pagine esistenti con il nuovo aspetto; tabelle che sul telefono e nelle colonne strette diventano schede | `apps/web/app/globals.css`, `apps/web/app/not-found.tsx`, componenti in `apps/web/src/componenti/` (`TabellaElementi`, `VistaViaggio`, `PaginaDemo`, `PaginaProposta`, `PaginaVersioni`, `ErroriDati`, `Avvisi`) |
| CA-6: niente id, codici o date `AAAA-MM-GG` a vista. Gli id restano negli attributi `data-*`; i messaggi del motore passano da `inParole`; anche i titoli delle schede del browser, i popup della mappa e le etichette dei viaggi di riferimento sono senza codici | `apps/web/src/viste/proposta.ts`, `versioni.ts`, `demo.ts`, `segnalazioni.ts`, `elemento.ts`, `mappa.ts`, `etichette.ts`; `apps/web/src/componenti/MappaGiorno.tsx`, `SezioneMappa.tsx`, `DettaglioElemento.tsx`, `Contenuti.tsx`, `ContenutiStato.tsx`; `apps/web/src/dati/viaggi.ts`; `apps/web/app/viaggi/…/page.tsx` e `apps/web/app/versioni/…/page.tsx` (i titoli) |
| Dipendenze | `apps/web/package.json`, `package-lock.json` |
| Test nuovi (91) e supporto | `apps/web/test/ux001-*.test.ts(x)`, `apps/web/test/supporto-ux.tsx`, `apps/web/test/supporto-css.ts` |
| Test esistenti adattati (vedi "Verifica") | 10 file in `apps/web/test/` |
| Prove di consegna | `evidence/ST-UX-001.md` |

## Perché

### Dipendenze

| Pacchetto | Versione | Tipo | Perché |
| --- | --- | --- | --- |
| `radix-ui` | ^1.6.7 | dipendenza | Vincolo del requisito: componenti accessibili per finestra modale, pannello laterale, notifiche e slider (focus trattenuto e restituito, Esc, `aria-*`, tastiera). È il pacchetto unico di Radix, così le importazioni si possono ottimizzare |
| `lucide-react` | ^1.47.0 | dipendenza | Vincolo del requisito: le icone. Sono SVG in linea, senza richieste di rete |
| `@fontsource-variable/inter`, `@fontsource-variable/plus-jakarta-sans` | ^5.3.0 | dipendenza | I caratteri della §6.1 come file locali (OFL). Next li serve dalla stessa origine, quindi la CSP `font-src 'self'` resta invariata |
| `axe-core` | ^4.13.0 | sviluppo | CA-5: il controllo automatico di accessibilità richiesto dal criterio |
| `jsdom`, `@types/jsdom` | ^29.1.1, ^28.0.3 | sviluppo | DOM senza browser: axe su tutte le regole tranne il contrasto calcolato, prove da tastiera dei componenti montati, testo visibile per CA-6 |
| `playwright-core` | ^1.63.0 | sviluppo | Pilota il Chrome, l'Edge o il Chromium già installati per misurare l'impaginazione vera (CA-4, focus visibile, contrasto con axe, CA-7). Non scarica browser e non usa la rete |

Sono state scelte versioni pubblicate da almeno due settimane. `npm audit`: 0 vulnerabilità, anche con `--omit=dev`. Il test di WEB-002 sulle dipendenze è stato aggiornato con il nuovo elenco.

### Scelte

- **Token con `light-dark()`.** Ogni colore è scritto una sola volta con la versione chiara e scura. Senza scelta il tema segue il sistema (`color-scheme: light dark`); `data-tema` su `<html>` impone la scelta del viaggiatore.
  - I browser risolvono `light-dark()` dove la variabile è dichiarata. Per questo i token si dichiarano anche su ogni contenitore con `data-tema`, ed è così che `/stile` mostra i due temi uno sotto l'altro.
  - Uno script in linea nel `<head>` applica il tema ricordato prima del disegno, così non c'è un lampo dell'altro tema. La CSP già ammette gli script in linea.
  - La scelta del tema si ricorda in `localStorage`: è una preferenza dell'interfaccia, non lo stato dell'app di DATA-001.
- **Contrasto.** Le coppie testo/sfondo sono elencate in `src/ui/contrasto.ts`: 68 coppie di testo (soglia 4.5:1) e 6 grafiche (soglia 3:1), verificate in entrambi i temi. Un test controlla che ogni colore usato come `color` nei fogli di stile sia tra le coppie verificate.
- **Unico modulo dei testi.** `src/testi.ts` è l'unico file con i codici del motore, usati come chiavi delle traduzioni. `Record<CodiceProblemaFattibilita | CodiceErrore | CodiceStorico | CodiceErroreModifica, string>` obbliga a tradurre ogni codice: se il motore ne aggiunge uno, la compilazione si ferma.
  - `inParole(testo, contesto)` lascia ai messaggi del motore il loro contenuto e cambia solo il modo di scriverlo:
    - `D2-E2 «Trekking…»` diventa `«Trekking…»`;
    - `D3-E1 (in auto da «A» a «B»)` diventa "lo spostamento in auto da «A» a «B»";
    - un id da solo diventa il nome dell'elemento;
    - `[PROPOSTA_SUPERATA] …` diventa "Questa proposta non è più aggiornata: …";
    - gli id del catalogo (`GARDA_NORD`) diventano i nomi;
    - `2026-06-13` diventa "13 giugno 2026";
    - gli indirizzi dei link restano intatti.
  - Il contesto (catalogo ed elementi citati) si costruisce dalle versioni o dalla proposta. Non c'è logica del motore duplicata.
  - Gli id restano negli attributi `data-*`, che usano i test e le viste.
- **I componenti del browser non caricano il motore.** Il motore importa `node:fs`, che non può entrare nei pacchetti per il browser: è il primo errore di build trovato. `stili.tsx` importa solo i tipi, e un test segue le importazioni di ogni file `"use client"` per impedire che succeda di nuovo.
- **Tabelle sul telefono.** Le tabelle esistenti (vista giorno, viaggio, versioni, modifiche, errori) diventano schede quando lo spazio è stretto:
  - ogni cella mostra la sua etichetta da `data-etichetta`;
  - vale sotto i 768 px e nelle colonne del layout di viaggio più strette di 760 px (`@container`), cioè accanto alla mappa su schermo grande;
  - così nessuna pagina scorre in orizzontale, senza nascondere contenuto con `overflow`.
- **Layout di viaggio (§6.3).** `LayoutViaggio` è il layout delle pagine di un viaggio:
  - su schermo grande la chat è a sinistra (circa 1/3) e si può chiudere; itinerario e mappa sono a destra;
  - sul telefono si vede un riquadro alla volta, con le schede in basso ("Itinerario", "Mappa", "Chat", "Oggi");
  - è già usato dalle pagine del giorno, con i soli itinerario e mappa: chat e "Oggi" arrivano con CHAT-001 e TODAY-001 e compaiono passando i loro riquadri.
- **Movimento.** Le durate sono token (150, 200 e 250 ms). Con `prefers-reduced-motion` valgono 0 e una regola globale ferma animazioni e transizioni, anche quelle di Leaflet e Radix. Con la stessa preferenza la mappa disattiva le animazioni di zoom e dissolvenza.
- **Accessibilità.**
  - Focus: anello di 3 px su tutti gli elementi interattivi (contrasto almeno 3:1 con gli sfondi); sulle schede dei viaggi l'anello è sull'intera scheda.
  - Aree cliccabili di almeno 44×44 px; link "Vai al contenuto"; `aria-current` nella navigazione.
  - Etichette per i lettori di schermo; nomi unici per le regioni.
  - La regione delle notifiche di Radix ha il nome in italiano ("Notifiche (F8)") al posto di quello inglese predefinito.
- **Pagina degli errori nei dati.** Il viaggiatore legge il problema in parole. Codici, id e percorsi del JSON restano in "Dettagli tecnici", chiusi: servono a chi corregge i dati, e il test di REQ-WEB-001 CA-5 li ritrova nell'HTML.

### Interpretazioni del requisito

- **"Pianifica un viaggio"** apre una finestra che spiega in modo gentile che la pianificazione guidata sta arrivando (REQ-PREF-001) e invita a esplorare i viaggi pronti. Non ci sono pagine nuove che PREF-001 dovrebbe poi sostituire.
- **I viaggi della home** sono i quattro viaggi di riferimento, ognuno con:
  - un'illustrazione generata (gradiente e icona, nessuna fotografia, §6.1);
  - il periodo ("12–14 giugno 2026");
  - giorni e viaggiatori;
  - lo stato "Confermato", perché sono itinerari confermati che hanno la versione 1 dello storico.

  La home non legge lo stato salvato, così non entra in conflitto con DATA-001. Gli stati "In corso" e "Concluso" dipendono dall'orologio e arriveranno con i dati di DATA-001 e TODAY-001; il badge li gestisce già tutti e quattro.
- **Le etichette dei viaggi di riferimento** passano da "Variante V-IRR" a "Castello irrinunciabile", "Pranzo a orario fisso" e "Volo di ritorno", e da "Versione 1" a "Itinerario di riferimento". Le descrizioni erano "Il castello (D3-E2) è irrinunciabile" e simili: ora dicono la stessa cosa senza id. Le chiavi negli indirizzi non cambiano.
- **Restano a vista** i nomi degli scenari "S1"…"S8" della pagina Demo e il fuso orario (`Europe/Rome`): non sono nei modelli di CA-6. La Demo diventa "Modalità presentazione" con REQ-WEB-004.
- **`StileViaggio`** viene dal motore (aggiunto da CAT-001): il modulo dei testi lo importa come tipo e traduce i sette stili.
- **I messaggi scritti da `src/stato`** ("Proposta accettata da Alice il 2026-06-13…") si mettono in parole al momento di mostrarli, senza toccare lo stato.

### Alternative scartate

| Alternativa | Perché è stata scartata |
| --- | --- |
| Tailwind CSS (decisione di Alice, 2026-10-09) | Rifare stile e verifiche costava tempo e portava rischi: una catena di build in più (PostCSS con binari nativi per piattaforma) e un reset globale che cambia tutte le pagine esistenti. Con CSS e token il controllo di CA-1 è semplice e rigoroso: nessun colore fuori da `token.css`. I token sono già variabili CSS, quindi Tailwind v4 (`@theme`) si potrà aggiungere in seguito |
| Google Fonts da CDN o `next/font/google` | Chiamate di rete vietate dalla CSP e dalle regole del progetto |
| Duplicare i token in un blocco `@media (prefers-color-scheme: dark)` e uno `[data-tema="scuro"]` | Due copie da tenere allineate; `light-dark()` ne tiene una sola |
| Test di impaginazione con un browser scaricato (`playwright install`) o con un server Next avviato nel test | Scarica dalla rete nella CI e rende i test lenti. Con l'HTML dei componenti e il CSS della web app in un browser di sistema bastano 40 s |
| Misurare CA-4 solo con jsdom | jsdom non impagina: i controlli sul CSS restano come rete di sicurezza, la misura vera la fa il browser |
| Tabelle in un contenitore che scorre in orizzontale | La pagina non scorrerebbe, ma la tabella sì: sul telefono le schede si leggono meglio |
| Cambiare i messaggi nel motore | Vietato dal perimetro: il motore resta com'è, la web app traduce |

## Verifica

Eseguito su Windows 11, Node 22.22.2, npm 10.9.7, sulla copia di lavoro allineata a `main` c141c60 (che comprende CAT-001 e DATA-001, con lo stato in SQLite), dalla radice e dopo aver cancellato `packages/engine/dist` e `apps/web/.next`.

**Allineamento a `main`.** Il lavoro è stato applicato su `main` con un'unione a tre vie; c'erano 4 conflitti, tutti risolti tenendo entrambe le modifiche:
- `apps/web/package.json`: insieme le dipendenze di DATA-001 (`better-sqlite3` ^13.0.3, `@types/better-sqlite3`, `engines` node >=22.0.0) e quelle di UX-001.
- `package-lock.json`: rigenerato con npm, non unito a mano. Partendo dal lockfile di `main` (`npm ci`) si sono installate solo le dipendenze nuove di UX-001: nessuna voce di `main` è stata tolta o ha cambiato versione.
- `web002-ca8-stato.test.tsx`: tiene il messaggio della base dati di DATA-001 ("il testo non è JSON valido"), letto senza distinguere maiuscole perché il messaggio passa da `inParole`.
- `web002-ca9-motore.test.ts`: le dipendenze ammesse sono quelle di DATA-001 più quelle di UX-001; i codici del motore restano ammessi solo in `src/testi.ts`.

Dopo l'unione:
- il modulo dei testi traduce anche il codice nuovo di CAT-001, `ORARI_DA_VERIFICARE` ("Ti consiglio di controllare gli orari prima di andare", §7.3). La compilazione lo richiedeva, perché le traduzioni sono un `Record` su tutti i codici del motore;
- `StileViaggio` ora viene dal motore.

Esiti:

- `npm ci`: verde. `npm audit`: **0 vulnerabilità**, anche con `--omit=dev`.
- `npm run build`: verde, nessun avviso.
  - Motore compilato con `tsc` (non toccato).
  - Web app compilata con Next.js 16.4.0 (Turbopack): 82 pagine statiche (le 81 di prima più `/stile`) e le pagine dinamiche di WEB-002.
- `npm test`: verde.
  - Motore: 26 file, 508 test (non toccato).
  - Web app: 31 file, **240 test**: i 149 di `main` (alcuni adattati, vedi sotto) e i 91 nuovi di UX-001 in 10 file. I test nel browser sono girati tutti, nessuno saltato.
- `npm run typecheck --workspace @travelops/web`, test compresi: nessun errore.
- File con a capo LF, nessun CRLF; `apps/web/.data/` assente.
- I test nel browser sono girati con Google Chrome 155 di sistema, headless, con ogni richiesta di rete bloccata.
  - Senza browser vengono saltati in locale, con un avviso; nella CI (`CI` impostata) falliscono invece di saltare.
  - `TRAVELOPS_BROWSER` indica un browser preciso.
- Prova manuale con `PORT=3110 npm run dev`:
  - sulla copia allineata a `main`, con lo stato in SQLite di DATA-001:
    - avvio di S1 dalla Demo e accettazione della proposta;
    - "Itinerario corrente" porta alla versione 2; versioni e giorno della versione 2 mostrati;
    - Demo, proposta, versioni, giorno della versione 2, home e `/stile` a 1280 px in chiaro e a 375 px in scuro: nessuno scorrimento orizzontale e nessun codice tecnico nel testo della pagina;
  - nel giro precedente: home, `/stile`, giorno (anche `v-volo`), viaggio, elemento, Demo, versioni e pagina non trovata, a 375 e 1280 px, in tema chiaro e scuro;
  - nessuno scorrimento orizzontale; a 1280 px la home ha 4 schede in una riga;
  - in `/stile` il pannello scuro ha lo sfondo `rgb(21, 18, 15)`, quello chiaro `rgb(251, 247, 242)`;
  - il selettore del tema imposta e ricorda il tema, e "Come il sistema" lo toglie;
  - sul telefono la scheda "Mappa" mostra la mappa Leaflet con 3 indicatori; il suggerimento dell'indicatore è "1. Visita al Castello del Buonconsiglio";
  - i caratteri Inter e Plus Jakarta Sans sono caricati dalla stessa origine;
  - nessun errore di React o di idratazione in console. L'unico 404 è `/favicon.ico`, che la web app non ha già su `main`;
  - alla fine la dev server è stata fermata, la porta 3110 è libera, non restano processi node della copia di lavoro, e `apps/web/.data/` (la base dati creata dalla prova) è stata cancellata.
  - Le schermate sono state guardate durante la prova ma non salvate in `evidence/`, perché la storia può scrivere solo questo file.

| Criterio | Test o verifica (file › nome del test) | Esito |
| --- | --- | --- |
| CA-1 tutti i colori dell'app vengono dai token; nessun colore scritto direttamente nei componenti | `ux001-ca1-colori.test.ts` › "CA-1 i colori sono definiti una volta sola, nel file dei token, con versione chiara e scura"; "… nei fogli di stile dei componenti e delle pagine nessun colore è scritto direttamente" (esadecimali, funzioni di colore e i 148 colori con nome); "… ogni variabile usata nei fogli di stile esiste"; "… nei componenti (TSX/TS) nessun colore: niente esadecimali, funzioni di colore, stili in linea o fill colorati"; "… i colori di Leaflet … sono riportati ai token"; "… il layout importa i token prima dei componenti e delle pagine" | superato |
| CA-2 contrasto del testo almeno 4.5:1 in tema chiaro e scuro, verificato da un test automatico sui token | `ux001-ca2-contrasto.test.ts` › "CA-2 il calcolo segue WCAG 2.2 …"; "… i valori dei due temi sono diversi"; "CA-2 ogni coppia testo/sfondo dell'interfaccia ha almeno 4.5:1, in entrambi i temi" (68 coppie × 2 temi); "CA-2 bordi dei campi e anello del focus hanno almeno 3:1"; "CA-2 ogni colore usato per il testo nei fogli di stile è tra le coppie verificate". In più: `ux001-browser.test.tsx` › axe con la regola `color-contrast` su home e `/stile`, chiaro e scuro | superato |
| CA-3 la pagina `/stile` mostra tutti i componenti della §6.2 in tema chiaro e scuro | `ux001-ca3-stile.test.tsx` › "CA-3 il catalogo dei componenti è quello della §6.2"; "CA-3 la pagina ha un pannello in tema chiaro e uno in tema scuro, ognuno con tutti i componenti" (16 sezioni per pannello, ognuna con il componente vero nel DOM); "CA-3 un contenitore con data-tema riceve i token del suo tema"; "CA-3 /stile è una pagina interna: non è nel menu e non si indicizza". `ux001-browser.test.tsx` › "CA-3 in /stile il pannello chiaro e quello scuro hanno davvero i colori del loro tema". Prova manuale nel browser | superato |
| CA-4 a 375 px nessuna pagina scorre in orizzontale; a 1280 px la home mostra le schede in griglia | `ux001-browser.test.tsx` › "CA-4 il controllo riconosce una pagina che scorre in orizzontale"; "CA-4 a 375 px nessuna pagina principale scorre in orizzontale (tema chiaro e scuro)" (oltre 60 pagine: home, `/stile`, viaggi, giorni, elementi, Demo, proposte S1–S8 prima e dopo la decisione, versioni e viste di una versione); "CA-4 a 1280 px la home mostra le schede dei viaggi in griglia; a 375 px una sotto l'altra" (4 colonne e 1 riga; 1 colonna e 4 righe). `ux001-ca4-larghezze.test.tsx` (senza browser, sempre eseguiti): griglia della home, nessuna larghezza fissa oltre i 343 px, ogni tabella delle pagine principali con schede ed etichette, stesse regole sul telefono e nelle colonne strette. Prova manuale a 375 e 1280 px | superato |
| CA-5 ogni componente interattivo si usa da tastiera con focus visibile; axe non trova violazioni gravi nella home e in `/stile` | `ux001-ca5-axe.test.tsx` › "CA-5 il controllo funziona: una pagina con errori noti dà violazioni gravi"; "CA-5 %s: nessuna violazione grave" (home, home senza viaggi, `/stile`, giorno con mappa; zero violazioni di qualunque impatto, regole WCAG 2.x A/AA e buone pratiche); struttura della sequenza di Tab; regola del focus; nessun `outline: none` senza alternativa; aree da 44 px. `ux001-ca5-tastiera.test.tsx` (componenti montati in jsdom): pulsanti, chip, slider (frecce, Inizio, Fine), contatore, selettore di date, finestra modale e pannello laterale (focus dentro, Esc chiude, focus restituito), notifica, selettore del tema, schede del layout, chat. `ux001-browser.test.tsx` › axe con tutte le regole, contrasto compreso, su home e `/stile` in chiaro e scuro; "CA-5 %s: Tab raggiunge ogni elemento interattivo e il focus si vede sempre" (home e `/stile`, ordine della pagina) | superato (nota sotto) |
| CA-6 nessun codice tecnico del motore (id come D2-E4 o N1, codici dei problemi) nel testo visibile delle pagine principali | `ux001-ca6-codici.test.tsx` › "CA-6 home, /stile, viaggi, giorni, elementi, Demo, proposte S1–S8, versioni ed esiti: nessun codice a vista" (oltre 150 pagine). Il testo visibile comprende titolo, nodi di testo, `title`, `alt`, `placeholder`, `aria-label`, `aria-valuetext`; esclude script, elementi nascosti e dettagli chiusi. I modelli cercati: `D\d+-E\d+`, `N\d+`, i codici di problemi, storico, errori e modifiche, i tipi di imprevisto e di alternativa, gli id del catalogo, del viaggio e delle varianti. Inoltre: il controllo riconosce i codici; i codici restano negli attributi `data-*`; titoli delle schede del browser; popup della mappa; ogni codice del motore ha la sua traduzione; i testi del motore di S1–S8 riscritti senza codici, con i link intatti | superato |
| CA-7 con `prefers-reduced-motion` le animazioni sono disattivate | `ux001-ca7-movimento.test.ts` › durate tra 150 e 250 ms; ogni `transition` e `animation` usa i token; con la preferenza attiva tutte le durate valgono 0, con la regola globale `!important` (anche per i contenitori `data-tema`); keyframe usati solo con i token; la mappa disattiva le animazioni di zoom. `ux001-browser.test.tsx` › "CA-7 con prefers-reduced-motion animazioni e transizioni durano zero; senza, durano 150–250 ms" (durate calcolate dal browser e nessuna animazione in corso) | superato |

**Nota su CA-5.** Nei campi data di Chrome, l'ultima fermata di Tab è il pulsante del calendario interno al campo nativo. Lì il focus è nel componente interno del browser, che disegna il proprio anello e non si può leggere dall'esterno. Il test lo considera visibile; è l'unica eccezione, ed è descritta nel test.

**Funzionalità senza criterio dedicato.** `ux001-guscio-home.test.tsx` (16 test) copre:
- intestazione con logo, "I miei viaggi", sezioni e selettore del tema;
- il layout, con caratteri locali e lo script del tema provato in jsdom con le scelte salvate;
- le pagine del giorno con il layout di viaggio;
- l'assenza del motore nei componenti del browser;
- la home: titolo, "Pianifica un viaggio" che apre una finestra, quattro schede con illustrazione, titolo, variante, date, giorni, viaggiatori, stato e link;
- lo stato vuoto illustrato, i quattro stati del viaggio e il formato dei periodi.

**Test esistenti adattati** (solo dove il testo visibile cambia per CA-6 o per il nuovo design; dati e logica verificati restano gli stessi):
- `ca3-mappa.test.tsx`: i luoghi senza coordinate hanno anche `usatoDa`, gli elementi in parole.
- `dettaglio.test.tsx`: i campi del dettaglio non hanno più "Id" né gli id tra parentesi.
- `ca5-validazione.test.tsx`: la cella "Catalogo" ha l'attributo `data-etichetta`.
- `web002-ca1`, `ca2`, `ca3`, `ca4-ca5`, `ca6-ca7`, `ca8`, `demo`:
  - i testi del motore attesi passano da `inParole`, per esempio "il 13 giugno 2026" e "Questa proposta non è più aggiornata: …";
  - i problemi a vista sono in parole, con il codice in `data-problema`;
  - le etichette dei viaggi sono nuove;
  - le celle hanno `data-etichetta`.
- `web002-ca9-motore.test.ts`:
  - i codici del motore possono comparire solo in `src/testi.ts`, l'unico modulo dei testi richiesto da REQ-UX-001;
  - l'elenco delle dipendenze ammesse comprende quelle di DATA-001 (`better-sqlite3` con i tipi) e quelle di UX-001.

## Collegamenti

- Requisito `REQ-UX-001`, fonte `docs/requirements/REQ-UX-001-design-system.md` (origine: `docs/CR-001-travelops-prodotto-demo.md` §6 e §9.1)
- Story `ST-UX-001`
- Contratto `contract-ST-UX-001-implementation`
- Profilo di consegna `AUT-PR-UX-001` (pull request su `alicegibellato/TravelOps`, branch `feature/ST-UX-001`)
- Dipende da: `REQ-WEB-002` (ST-WEB-002). Lo usano poi `REQ-WEB-003` e `REQ-WEB-004`.
- Fonti condivise: `docs/requirements/visione.md`, `docs/requirements/modello-dominio.md`, `docs/requirements/dati-di-riferimento.md`, `docs/requirements/modello-dominio-estensioni.md` (§7.1 stati del viaggio, §7.2 stili, §7.6 livelli)
