# Prove di consegna: ST-PREF-001B

## Cosa è stato chiesto

La parte web di REQ-PREF-001 "Preferenze di viaggio". Story `ST-PREF-001B` "Percorso guidato delle preferenze", con questi criteri:

1. percorso guidato in 5 passi con barra di avanzamento e «Salta» sui passi facoltativi; «Crea la mia bozza» raggiungibile in al massimo 5 schermate compilando i soli campi obbligatori (CA-1);
2. un profilo incompleto mostra cosa manca, in parole semplici (CA-2);
3. ognuno dei profili PR-1…PR-5 si inserisce dal percorso e il profilo salvato coincide (CA-3);
4. riepilogo vivo e modificabile con un tocco; percorso utilizzabile da tastiera e su telefono (CA-5);
5. «Sorprendimi» propone 3 destinazioni tra cui scegliere (CA-7).

## Perimetro ed esclusioni

- **Comprende:**
  - la pagina `/preferenze` ("Racconta il tuo viaggio") con una voce "Preferenze" nella navigazione;
  - i 5 passi: Dove (ricerca, schede delle destinazioni precaricate, Sorprendimi), Quando e quanto (date precise oppure mese e durata da 2 a 14 giorni con slider), Chi (adulti, bambini con età, tipo di gruppo), Che viaggio (stili, ritmo, forma fisica, budget), Dettagli facoltativi (orari, pasti, mezzi, irrinunciabili, da evitare, esigenze);
  - il riepilogo vivo, la validazione con il motore e il salvataggio del profilo nelle impostazioni;
  - i test dei criteri CA-1, CA-2, CA-3, CA-5 e CA-7.
- **Esclude** (di altre storie):
  - CA-4, il punteggio delle preferenze (§7.7): già fatto in ST-PREF-001A, nel motore;
  - CA-6, filtri e chat sullo stesso profilo, e il pulsante "Preferisci scrivere?": ST-CHAT-001C. Il profilo si salva con la chiave `profilo-preferenze` e due funzioni riusabili (`leggiProfilo`, `salvaProfilo`) per chi lo aggancerà;
  - la creazione del programma a partire dal profilo (REQ-PLAN-001).
- **Lasciato fuori di proposito:** nessuna modifica a `packages/engine`, a `src/chat`, a `.sdlc`; nessuna dipendenza nuova, nessun Tailwind, nessun colore in linea (solo i token). Le attività del catalogo e le categorie in "irrinunciabili" e "da evitare" non sono nel percorso: servono il catalogo della destinazione; si scelgono solo gli stili.
- **Deviazioni:** nessuna dai criteri. I limiti sono in "Interpretazioni del requisito".

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Chiave `profilo-preferenze`, `leggiProfilo(db)` e `salvaProfilo(db, bozza)` | `apps/web/src/preferenze/profilo.ts` |
| Tipi condivisi tra server e browser | `apps/web/src/preferenze/tipi.ts` |
| Valori ammessi, etichette e predefiniti, letti dal motore sul server | `apps/web/src/preferenze/opzioni.ts` |
| Servizio lato server: validazione (`validaProfilo`) e salvataggio | `apps/web/src/preferenze/servizio.ts` |
| Destinazioni precaricate per le schede | `apps/web/src/preferenze/precaricate.ts` |
| Logica pura: passi, modifiche alla bozza, riepilogo | `apps/web/src/preferenze/percorso.ts` |
| Azioni lato server e pagina | `apps/web/app/preferenze/azioni.ts`, `apps/web/app/preferenze/page.tsx` |
| Componenti | `apps/web/src/componenti/PercorsoPreferenze.tsx`, `PassiPreferenze.tsx`, `RiepilogoPreferenze.tsx`, `PaginaPreferenze.tsx` |
| Indirizzo e voce di navigazione | `apps/web/src/percorsi.ts`, `apps/web/src/ui/Navigazione.tsx` |
| Stili (solo token, in fondo al file) | `apps/web/app/globals.css` |
| Test | `apps/web/test/pref001b-*.test.ts(x)`, `apps/web/test/supporto-preferenze.tsx` |
| Test esistenti aggiornati: la nuova voce di navigazione e la pagina tra quelle controllate da REQ-UX-001 | `apps/web/test/ux001-guscio-home.test.tsx`, `apps/web/test/supporto-ux.tsx` |
| Prove di consegna | `evidence/ST-PREF-001B.md` |

## Perché

### Dipendenze

- ST-PREF-001A: `validaProfilo`, `cosaManca` (via `validaProfilo`), `BozzaProfilo`, valori ammessi, etichette, `PASSO_DEL_CAMPO`.
- ST-CAT-002C: `Sorprendimi`, il servizio delle destinazioni (ricerca e proposte), le istantanee precaricate.
- ST-UX-001: `Pulsante`, `ChipSelezionabile`, `GruppoChip`, `Avviso`, `Cursore`, `Contatore`, `Illustrazione`, token. Nessuna dipendenza npm nuova.

### Scelte

- **Il motore resta sul server.** I componenti del browser non caricano il motore (convenzione già in uso). Validazione e salvataggio sono due azioni lato server (`app/preferenze/azioni.ts`); valori ammessi, etichette, predefiniti e limiti arrivano alla pagina come proprietà da `opzioniPercorso()`. Nessuna regola di validazione è duplicata nel browser: i testi di "cosa manca" sono quelli del motore e il passo da correggere è il `passo` del problema.
- **Il servizio è una proprietà** del percorso, come per la chat e la scelta della destinazione: nei test è il servizio vero sulla base dati di una cartella temporanea.
- **Logica in un modulo puro** (`src/preferenze/percorso.ts`), testabile senza il DOM.
- **Chiave e funzioni riusabili** (`profilo-preferenze`, `leggiProfilo`, `salvaProfilo`) in `src/preferenze/profilo.ts`, come chiesto per l'aggancio della chat.
- **Salva la bozza così com'è**, solo se il motore la valida; i campi non toccati restano assenti e prendono i predefiniti del motore.
- **Focus.** A ogni cambio di passo il focus va al titolo del passo; non al primo disegno della pagina.
- **Riepilogo.** Primo nel DOM; a lato su schermi da 768 px, in alto e comprimibile (`<details>`) sotto.

### Interpretazioni del requisito

- **5 schermate.** I 5 passi sono le 5 schermate; «Crea la mia bozza» è nel passo 5, dopo destinazione e date. I passi 3, 4 e 5 non hanno campi obbligatori.
- **«Salta».** C'è nei passi 3, 4 e 5, che hanno valori predefiniti. Riporta i campi del passo ai predefiniti. Nel passo 5, non essendoci un passo dopo, sposta il focus su «Crea la mia bozza».
- **Destinazione.** Una ricerca o una scheda salva `{tipo: "luogo", nome, riferimento}`: il `riferimento` (identificativo della ricerca o dell'istantanea) è l'unica differenza dai profili di riferimento, che hanno solo il nome; il test lo considera. Una proposta di Sorprendimi imposta la destinazione allo stesso modo. Il pulsante «Scelgo più tardi: sorprendimi» salva `{tipo: "sorprendimi"}`, come PR-4.
- **Date.** Con date precise la durata non si salva: la ricava il motore. Con mese e durata, scegliendo la modalità la durata parte da 3 giorni, per non lasciare un campo obbligatorio vuoto con lo slider già visibile.
- **Tipo di gruppo.** Se non si sceglie, lo ricava il motore dai viaggiatori.
- **Schede con immagine.** Illustrazione generata (come nel resto dell'app): nessuna immagine esterna, la CSP non cambia.
- **Profilo salvato non riletto.** La pagina parte sempre da zero; il profilo salvato lo leggono altre parti dell'app con `leggiProfilo`.

### Alternative scartate

- Usare il motore nel browser (`validaProfilo` nei componenti): porta nel browser un pacchetto con accesso ai file e va contro la convenzione dell'app.
- Duplicare nel browser i valori ammessi e i testi dei problemi: due fonti da tenere allineate.
- Riusare `SelettoreDate` e `SceltaDestinazione` così come sono: non notificano le scelte a chi li usa (`SelettoreDate` non ha callback; `SceltaDestinazione` costruisce la destinazione invece di sceglierla). Si riusano `Sorprendimi`, il servizio delle destinazioni, `Cursore`, `Contatore` e i chip.

## Verifica

Comandi eseguiti dalla radice della copia di lavoro: `npm ci`, `npm run build`, `npm test`, `npm run typecheck -w apps/web`.

- `npm run build`: riuscito (la pagina `/preferenze` è dinamica).
- `npm run typecheck -w apps/web`: riuscito.
- `npm test`: engine 112 test e sources 96 test superati; web 426 test, di cui 28 nuovi di questa storia. I fallimenti rimasti sono solo i controlli di contrasto axe nel browser su home e /stile (`ux001-browser`), che falliscono solo con il Chrome locale e passano in CI; non riguardano questa storia. La pagina nuova è tra quelle controllate da `ux001-browser`, `ux001-ca4-larghezze`, `ux001-ca5-axe` e `ux001-ca6-codici` e li supera.

Corrispondenza criteri e test:

| Criterio | Test |
| --- | --- |
| CA-1 5 passi, barra, «Salta», 5 schermate con i soli obbligatori | `pref001b-ca1-ca2-percorso` (CA-1: titoli e barra; 5 schermate e profilo salvato; «Salta» solo dove serve) |
| CA-2 cosa manca in parole semplici | `pref001b-ca1-ca2-percorso` (CA-2: testi del motore nel riepilogo; «Avanti» bloccato; «Crea» senza salvare e rimando al passo; nulla manca a profilo completo) |
| CA-3 PR-1…PR-5 e profilo salvato uguale | `pref001b-ca3-profili` (ognuno dei 5 profili guidato dal componente e confrontato, validato dal motore, con quello di riferimento; PR-1 dalla scheda, PR-5 dalla ricerca) |
| CA-5 riepilogo vivo e modificabile | `pref001b-ca5-ca7` (aggiornamento a ogni scelta, un tocco porta al passo, valori mantenuti), `pref001b-percorso` (riepilogo in parole) |
| CA-5 tastiera | `pref001b-ca5-ca7` (focus sul titolo del passo, controlli nativi con nome, legende, chip con `aria-pressed`, barra con nome) |
| CA-5 telefono | `pref001b-ca5-ca7` (riepilogo primo nel DOM e comprimibile, regole per 768 px, nessuna larghezza fissa), `ux001-ca4-larghezze` e `ux001-browser` sulla pagina nuova |
| CA-7 Sorprendimi | `pref001b-ca5-ca7` (3 proposte, la scelta diventa la destinazione e si salva) |
| Salvataggio e chiave `profilo-preferenze` | `pref001b-percorso` |
| CA-4 e CA-6 | fuori da questa storia (CA-4 in ST-PREF-001A, CA-6 in ST-CHAT-001C) |

## Collegamenti

- Requisito: REQ-PREF-001
- Story: ST-PREF-001B
- Dipendenze: ST-PREF-001A, ST-CAT-002C, ST-UX-001
