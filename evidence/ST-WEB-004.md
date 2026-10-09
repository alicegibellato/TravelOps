# Prove di consegna: ST-WEB-004

## Cosa è stato chiesto

Il requisito REQ-WEB-004 "Proposte, versioni e modalità presentazione con il nuovo design" (modifica di REQ-WEB-002) chiede di rifare proposte, versioni e pagina Demo con il design system di REQ-UX-001:

- la proposta ha un titolo in parole semplici, il livello di ripianificazione, le modifiche evidenziate nella linea del tempo (tolti, aggiunti, spostati), gli elementi a rischio, le alternative come pulsanti, Accetta e Rifiuta;
- sul telefono Accetta e Rifiuta stanno in una barra fissa in basso;
- le versioni sono una cronologia con data, causa e "Confronta";
- la Demo diventa "Modalità presentazione", raggiungibile da un'icona nell'intestazione;
- nessun codice tecnico a vista; i criteri di REQ-WEB-002 restano soddisfatti, con lo stato nel database di REQ-DATA-001.

Criteri di accettazione CA-1…CA-6. Story `ST-WEB-004`.

## Perimetro ed esclusioni

- **Comprende:** vista proposta, barra della decisione, cronologia delle versioni, modalità presentazione, icona nell'intestazione, view model, stili, test.
- **Esclude:**
  - il motore (`packages/`): nessuna modifica; proposte, controlli e versioni restano quelli del motore;
  - prenotazioni, pagamenti, modifiche o cancellazioni presso fornitori e l'apertura automatica dei link delle alternative;
  - il percorso `/demo`, che resta lo stesso (cambia il nome, non l'indirizzo);
  - i viaggi demo della CR-001 (REQ-DEMO-001): gli scenari restano S1–S8.

## Cosa è cambiato

- **Proposta** (`PaginaProposta.tsx`, `LineaTempoProposta.tsx`): titolo in parole semplici, livello di ripianificazione, imprevisto e impatto, "Cosa cambia" con tolto, aggiunto e spostato, il giorno risultante come `LineaTempo` del design system, spiegazione, problemi, elementi a rischio in un avviso, alternative come pulsanti-link, decisione. La tabella degli elementi non è più usata dalla proposta.
- **Linea del tempo della proposta**: gli elementi tolti restano al loro posto per orario, barrati e in rosso; gli aggiunti sono in verde, gli spostati in giallo. Ogni voce ha anche la parola (Tolto, Aggiunto, Spostato), così il colore non è l'unico segnale.
- **Barra della decisione** (`ui/BarraDecisione.tsx`): sotto i 768 px Accetta e Rifiuta stanno in una barra fissa in basso; sopra seguono la pagina. Il nome di chi accetta resta nella pagina e appartiene al modulo di Accetta.
- **Versioni** (`PaginaVersioni.tsx`, `ui/Cronologia.tsx`): cronologia con data, causa, autore, "Corrente" e il pulsante "Confronta" con la versione precedente. Il confronto tra due versioni mostra aggiunti e rimossi con gli stessi colori della proposta.
- **Modalità presentazione** (`PaginaDemo.tsx`, `ui/LinkPresentazione.tsx`, `ui/Guscio.tsx`, `ui/Navigazione.tsx`): titolo nuovo, icona nell'intestazione al posto della voce "Demo", orologio simulato, "Ripristina i viaggi demo" e scenari con titolo e imprevisto in parole, senza il codice S1…S8 a vista.
- **Azione** (`app/demo/azioni.ts`): `ripristinaViaggiDemoAzione` chiama `ripristinaViaggiDemo` (REQ-DATA-001). `ripristina` resta per lo stato non valido.
- **View model**: `viste/proposta.ts` (titolo, livello, voci del giorno con i tolti), `viste/demo.ts` (titolo dello scenario nella proposta).
- **Stili**: `ui.css` (colori delle modifiche, barra, cronologia, icona), `globals.css` (pagina proposta).
- **Test**: aggiornati i test di REQ-WEB-002 e REQ-UX-001 che leggevano il vecchio markup (stesse verifiche); nuovi `web004-ca1…ca6`.

## Perché

### Dipendenze

- ST-UX-001: token, `LineaTempo`, `SchedaAttivita`, `Badge`, `Avviso`, `Pulsante`.
- ST-WEB-003: linea del tempo del giorno e riquadri di prenotazione.
- ST-DATA-001: stato nel database e `ripristinaViaggiDemo`.
- ST-WEB-002: operazioni su scenari, proposte e versioni.
- Nessuna nuova dipendenza npm, nessun Tailwind.

### Scelte

- **Motore invariato**: titolo, tolti, aggiunti e spostati si ricavano dalla proposta del motore (`modifiche`); la web app non calcola orari. I tolti si inseriscono nella linea del tempo confrontando gli orari come testo, senza aritmetica (il test CA-9 di REQ-WEB-002 la vieta).
- **Nome di chi accetta fuori dalla barra**: la barra resta corta e raggiungibile con il pollice; il campo usa l'attributo `form` del modulo di Accetta.
- **Indirizzo `/demo` invariato**: i collegamenti e le azioni esistenti continuano a funzionare.
- **Icona al posto della voce di menu**: la modalità presentazione è uno strumento, non una sezione per il viaggiatore.

### Interpretazioni del requisito

- **Livello di ripianificazione**: il motore non lo scrive nella proposta. Le proposte costruite per un imprevisto sono sempre di livello "minimo" (cambiano solo gli elementi colpiti); la vista lo mostra con il testo di `TESTI_LIVELLI`. I livelli "giornata" e "resto" arrivano con le storie che li generano.
- **Titolo**: "<scenario>: ti propongo X al posto di Y" con le attività aggiunte e tolte; senza attività cambiate, "l'itinerario resta com'è".
- **"Spostati"**: gli elementi modificati dal motore (orario o destinazione) sono mostrati come "Spostato" in giallo.
- **"Ripristina i viaggi demo"**: ricarica i viaggi demo allo stato iniziale e scarta le proposte, quindi lo stato torna all'itinerario di partenza come chiede REQ-WEB-002 CA-8. Scenario in corso e orologio restano.
- **"Confronta"**: confronta la versione con la precedente; la prima versione non ha il pulsante. Il confronto libero tra due versioni resta in fondo alla pagina.
- **Scenari in parole semplici**: titolo dello scenario e imprevisto descritto dal motore; il codice dello scenario resta solo nei campi nascosti dei moduli.

### Alternative scartate

- Barra fissa anche su schermi grandi: occupa spazio senza bisogno, il pollice non c'entra.
- Calcolare il livello nella web app: duplicherebbe logica del motore.
- Rinominare il percorso in `/presentazione`: rompe indirizzi e azioni esistenti senza vantaggi per il viaggiatore.
- Usare `SchedaProposta` della chat per tutta la pagina: i test di REQ-WEB-002 richiedono attributi `data-*` per ogni modifica e alternativa, e la scheda della chat è compatta.

## Verifica

Eseguito in `/` e `apps/web`:

- `npm ci`: i collegamenti dei workspace erano rimasti indietro (`@travelops/sources` mancante).
- `npm run build`: riuscito.
- `npm run typecheck -w apps/web`: riuscito.
- `npm test`: web 49 file, 340 test, 336 superati e 4 falliti; engine 30 file, 573 test superati; sources 6 file, 56 test superati. I 4 falliti sono i controlli di contrasto axe nel browser su home e /stile (`ux001-browser`): falliscono solo con il Chrome locale e passano in CI; pagine non toccate da questa storia.

Corrispondenza criteri e test:

| Criterio | Test |
| --- | --- |
| CA-1 | `web004-ca1-stato`; `web002-ca1…ca9` e `web002-demo` (adattati al nuovo markup, stesse verifiche); `data001-*` |
| CA-2 | `web004-ca2-proposta` |
| CA-3 | `web004-ca3-barra` |
| CA-4 | `web004-ca4-versioni`, `web002-ca3-confronto` |
| CA-5 | `web004-ca5-presentazione`, `ux001-guscio-home` |
| CA-6 | `web004-ca6-codici`, `ux001-ca6-codici`, `ux001-ca1-colori`, `ux001-ca4-larghezze` |

## Collegamenti

- Requisito: REQ-WEB-004 (modifica di REQ-WEB-002)
- Story: ST-WEB-004
- Contratto: contract-ST-WEB-004-implementation
- Esecuzione autonoma: AUT-PR-WEB-004
- Dipendenze: ST-UX-001, ST-WEB-003, ST-DATA-001, ST-WEB-002
