# Prove di consegna: ST-WEB-003

## Cosa è stato chiesto

Il requisito REQ-WEB-003 "Consultazione con il nuovo design" (modifica di REQ-WEB-001) chiede di rifare viaggio, giorno, mappa e dettaglio con il design system di REQ-UX-001:

- la vista giorno è una linea del tempo di schede attività e connettori di spostamento;
- scheda e punto sulla mappa si evidenziano a vicenda;
- il dettaglio si apre in un pannello laterale (desktop) o dal basso (telefono);
- nessun codice tecnico a vista, layout come REQ-UX-001.

Criteri di accettazione CA-1…CA-6. Story `ST-WEB-003`.

## Perimetro ed esclusioni

- **Comprende:** vista viaggio, vista giorno (anche nelle versioni), mappa e legenda, dettaglio (pagina e pannello), view model, stili, test.
- **Esclude:**
  - modifiche all'itinerario dall'interfaccia (REQ-PLAN-002, REQ-EDIT-002);
  - cambiare il comportamento di REQ-WEB-001 oltre all'aspetto;
  - la tabella degli elementi della pagina proposta (REQ-WEB-002), che resta com'è;
  - il motore (`packages/`): nessuna modifica.

## Cosa è cambiato

- **Vista giorno** (`VistaGiorno.tsx`): non è più una tabella ma la `LineaTempo` del design system. Le attività sono `SchedaAttivita`, gli spostamenti connettori con icona del mezzo, tratta, orario e durata. Orario fisso, "A rischio", "Aggiunto", problemi di fattibilità e prenotazione stanno nella voce.
- **Evidenziazione** (`Evidenziazione.tsx`, `LineaTempoGiorno.tsx`, `LegendaMappa.tsx`, `MappaGiorno.tsx`): stato condiviso tra schede, legenda e indicatori Leaflet. Passaggio del mouse, focus e tocco accendono la stessa attività ovunque.
- **Dettaglio in pannello** (`ApriDettaglio.tsx`, `ContenutoPannello.tsx`, `GestisciPrenotazione.tsx`): "Dettagli" è un link alla pagina del dettaglio che con un clic apre il `PannelloLaterale` (a destra sopra i 768 px, dal basso sotto). Contiene descrizione, orari in parole e il pulsante "Gestisci prenotazione" se c'è il link.
- **Vista viaggio**: schede dei giorni al posto della tabella.
- **Pagina del dettaglio**: stessi dati, con descrizione, stile, costo se presente, orari in parole e pulsante di prenotazione.
- **View model**: `giorno.ts` (durata, stile, costo, all'aperto, descrizione), `elemento.ts` (descrizione, stile, costo, orari in parole, tratta, `dettagliDelGiorno`), `etichette.ts` (`orariSettimanaInParole`, durate, stile e descrizione da categoria).
- **Stili**: `ui.css` (connettori, evidenziazione), `globals.css` (schede dei giorni, voce, pannello, indicatore evidenziato).
- **`TESTI_STILI`** spostato in `ui/stili.tsx` (ri-esportato da `testi.ts`): la scheda attività entra nel browser e non deve caricare il motore.
- **Test**: aggiornati i test di REQ-WEB-001 e REQ-WEB-002 che leggevano righe di tabella; nuovo helper `voceElemento`; nuovi test `web003-ca2…ca6`.

## Perché

### Dipendenze

- ST-UX-001: token, `LineaTempo`, `SchedaAttivita`, `PannelloLaterale`, `Badge`, `Pulsante`, `LayoutViaggio`, `Illustrazione`.
- Nessuna nuova dipendenza npm. Solo token e componenti di REQ-UX-001, senza Tailwind.

### Scelte

- **Link che apre il pannello**: senza JavaScript, o con Ctrl/Cmd+clic, "Dettagli" porta alla pagina del dettaglio, che resta raggiungibile e condivisibile (REQ-WEB-001).
- **Stato di evidenziazione in un contesto React**: la pagina resta generata in modo statico e il contenuto resta nel server; solo schede, legenda e mappa sono componenti client.
- **Durata letta dai dati, non calcolata**: per un'attività è la durata tipica del catalogo, per uno spostamento il tempo di percorrenza dei dati di contesto del motore. Il test di REQ-WEB-002 CA-9 vieta calcoli sugli orari nella web app.
- **Tabella della proposta invariata**: appartiene a REQ-WEB-002 e i suoi test la verificano.

### Interpretazioni del requisito

- **Immagine della scheda**: il catalogo di riferimento non ha immagini e la CSP blocca quelle esterne; si usa l'`Illustrazione` generata dallo stile.
- **Stile**: il primo stile dell'attività nel catalogo; se manca, deriva dalla categoria (natura, cultura, gastronomia; il pasto è gastronomia).
- **Costo**: mostrato solo se il catalogo lo indica, altrimenti omesso.
- **Descrizione**: quella del catalogo se c'è, altrimenti una frase semplice sulla categoria.
- **Orari in linguaggio naturale**: i giorni con gli stessi orari si raggruppano ("Aperto da martedì a sabato dalle 9:30 alle 17 e la domenica dalle 9:30 alle 13, chiuso il lunedì."). La struttura per giorno resta nei dati.
- **"Tocco"**: un clic su scheda o indicatore accende l'attività; un tocco sulla mappa vuota la spegne. Sul telefono l'evidenziazione si vede passando alla scheda "Mappa".

### Alternative scartate

- Dettaglio solo in pannello, senza pagina: toglie l'indirizzo diretto e la consultazione senza JavaScript.
- Calcolare le durate dagli orari: duplica logica sugli orari e viola il test CA-9 di REQ-WEB-002.
- Una libreria per evidenziare e sincronizzare: un contesto React basta.

## Verifica

Eseguito in `/` e `apps/web`:

- `npm run build`: riuscito.
- `npm run typecheck -w apps/web`: riuscito.
- `vitest` (apps/web): 36 file, 274 test, 270 superati e 4 falliti. I 4 sono i controlli di contrasto axe nel browser su home e /stile (`ux001-browser`), che falliscono già prima di questa storia sul ramo di partenza e riguardano pagine non toccate.

Corrispondenza criteri e test:

| Criterio | Test |
| --- | --- |
| CA-1 | `ca2-vista-giorno`, `ca3-mappa`, `ca4-volo`, `ca5-validazione`, `ca6-rete`, `dettaglio` (adattati al nuovo markup, stesse verifiche) |
| CA-2 | `web003-ca2-linea-tempo` |
| CA-3 | `web003-ca3-evidenziazione` (jsdom con Leaflet) |
| CA-4 | `web003-ca4-dettaglio` (pannello, prenotazione, orari in parole, posizione del pannello) |
| CA-5 | `web003-ca5-codici`, `ux001-ca6-codici` |
| CA-6 | `web003-ca6-layout` (anche nel browser a 1280 e 375 px), `ux001-ca4-larghezze`, `ux001-browser` |

## Collegamenti

- Requisito: REQ-WEB-003 (modifica di REQ-WEB-001)
- Story: ST-WEB-003
- Contratto: contract-ST-WEB-003-implementation
- Esecuzione autonoma: AUT-PR-WEB-003
- Dipendenza: ST-UX-001
