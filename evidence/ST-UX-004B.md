# Prove di consegna: ST-UX-004B (criteri CB-1, CB-2, CB-3, CB-4, CB-5, CB-6 e CB-7)

## Cosa è stato chiesto

REQ-UX-004, story `ST-UX-004B`: rifinitura dell'interfaccia dopo il collaudo da utente del 10/10.

1. CB-1 previsione del tempo per giorno anche nella bozza e in Oggi, con `PrevisioneGiorno` e le porte dei servizi di ST-INTEG-001 (modalità finto/reale invariata);
2. CB-2 intestazione su una riga a 375 px (menu compatto, selettore del tema dentro il menu) e senza a capo a 1280 px;
3. CB-3 card dei viaggi distinguibili: titolo con luogo e date, illustrazione per tipo di luogo e stagione;
4. CB-4 «Sorprendimi» si riassume dopo la scelta;
5. CB-5 in Demo il copione è consultabile nella pagina e le etichette non hanno punteggiatura ridondante;
6. CB-6 in bozza un solo pannello azione alla volta; dopo la conferma «Modifica giorno» diventa «Proponi una modifica»;
7. CB-7 prove e2e a 375 e 1280 px e screenshot in `evidence/ST-UX-004B/screenshots/`.

Criteri derivati: DV-ui-accessibility (axe sulle pagine toccate e menu da tastiera) e DV-docs-executable (il copione della demo si esegue come scritto).

## Perimetro ed esclusioni

- **Comprende:** intestazione (`src/ui/Guscio.tsx`, `MenuIntestazione.tsx`, `configurazione-intestazione.ts`), pagine Oggi e bozza (solo la previsione e lo stato dei pannelli azione), home e card, illustrazioni dei luoghi (stagione), Sorprendimi, Demo.
- **Esclude:** motore di pianificazione, testi delle proposte, ritardi, revisioni della bozza (ST-UX-004A), chat e agenti, ciclo del viaggio dell'utente e «I miei viaggi» collegati ai viaggi utente (ST-UX-003A). Nessuna dipendenza nuova, nessun servizio esterno.
- **Deviazioni:** nessuna.

## Cosa è cambiato

- **CB-1.** `ServizioBozza.datiPerMeteo` dà itinerario e catalogo della bozza; la pagina `/bozza/<id>` chiede il meteo con `meteoDelViaggio` (non solleva errori: se il servizio non risponde lo dice giorno per giorno) e lo passa a `PaginaBozza`, che lo mostra sotto il titolo di ogni giorno. In Oggi (`/oggi` e vista del viaggio in corso) `PannelloOggi` mostra la previsione del giorno dell'orologio simulato sopra le schede. Con il meteo finto è marcata «(esempio)».
- **CB-2.** L'intestazione ha una sola riga: marchio e pulsante «Menu» sotto la soglia `SOGLIA_MENU_COMPATTO_PX` (1100 px, configurabile; le regole `@media` sono generate dal valore). Il pannello contiene sezioni, link alla presentazione e selettore del tema; si apre con il pulsante, si chiude con Esc (il focus torna al pulsante) e quando si cambia pagina. Sopra la soglia il pannello è trasparente al layout e le voci non vanno a capo.
- **CB-3.** Titolo della card «Weekend sul Garda · 12–14 giugno 2026» con la variante sotto; l'illustrazione prende tipo di luogo (dalla zona dell'alloggio) e stagione (dal mese di partenza, tabella `STAGIONE_PER_MESE` in `luoghi-config.ts`); la stagione cambia la luce del disegno con i token.
- **CB-4.** Scelta un'idea, «Sorprendimi» mostra «Hai scelto …» e «Scegli un'altra idea» per riaprire.
- **CB-5.** Link «Vai al copione della demo» in cima alla pagina Demo (il copione, da `copione.json`, è nella pagina); pulsanti «Avvia lo scenario <titolo>» senza i due punti; il link alla proposta mostra solo il titolo.
- **CB-6.** Lo stato del pannello aperto (Sposta o Sostituisci) è unico per tutta la pagina della bozza; dopo la conferma il menu del giorno si chiama «Proponi una modifica».

## Perché

- Il pannello dei comandi è un'apertura a comparsa (pulsante con `aria-expanded`), non un `role=menu`: contiene link e un gruppo di scelta, e così resta accessibile senza forzare ruoli di menu.
- La soglia è un valore in un file di configurazione, non una costante dentro il CSS.
- Le illustrazioni usano solo token e disegni generati: nessuna immagine esterna.

## Verifica

- Build di produzione: `evidence/ST-UX-004B/log/build.log` (verde).
- Unitari: `evidence/ST-UX-004B/log/unit.log`; web 88 file, 592 prove (di cui 13 nuove in `test/ux004b-interfaccia.test.tsx`).
- E2E a 375 e 1280 px: `evidence/ST-UX-004B/log/e2e.log`, 13 file e 45 prove (nuovo `e2e/ux004b-interfaccia.e2e.ts`: 6 prove, due flussi per due larghezze).
- Accessibilità: axe (WCAG 2.x AA, 2.2 AA e buone pratiche, contrasto compreso) senza violazioni su home, menu aperto, destinazione con Sorprendimi riassunto, Demo, Oggi, bozza con meteo, un solo pannello aperto e bozza confermata; menu da tastiera (Invio apre, Esc chiude e riporta il focus): `evidence/ST-UX-004B/log/a11y-axe.log`.
- Documentazione eseguibile: i passi del copione della demo (`docs/demo/copione-demo.md`, generato da `copione.json`) sono eseguiti dalle prove della demo; link e pulsanti nuovi verificati: `evidence/ST-UX-004B/log/docs-demo.log`.
- Screenshot: `evidence/ST-UX-004B/screenshots/` (menu chiuso e aperto, home, Sorprendimi, Demo, Oggi, bozza con meteo, un solo pannello, bozza confermata; a 375 e 1280 px).

## Limiti

- Il meteo mostra la zona principale del giorno; con il meteo finto è di esempio.
- Le quattro card dei viaggi di riferimento sono varianti dello stesso viaggio: restano distinguibili per variante e disegno (seme), non per luogo o stagione.
- Il menu compatto richiede JavaScript; senza, il pannello resta chiuso.

## Collegamenti

- Requisito: REQ-UX-004; story: ST-UX-004B; consegna: AUT-PR-UX-004B.
