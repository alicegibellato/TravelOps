# Prove di consegna: ST-CHAT-001B

## Cosa è stato chiesto

La storia ST-CHAT-001B porta nella web app l'interfaccia della chat di REQ-CHAT-001, con dati e risposte finti:

- **Pannello chat** con bolle, indicatore "sta scrivendo", messaggio di benvenuto con 3 suggerimenti e risposte rapide a chip che inviano il testo del chip (CA-3).
- **Schede ricche** nella conversazione: riepilogo delle preferenze, bozza, proposta con prima → dopo e pulsanti Accetta/Rifiuta, conferma con "Annulla".
- **Telefono**: la chat è a tutto schermo e la tastiera non copre il campo di testo (CA-4).
- **Stati**: vuoto, caricamento, errore e "AI non disponibile" sono tutti gestiti (CA-5).

Vincoli: nessuna logica del motore duplicata, solo componenti e token di REQ-UX-001 (niente Tailwind), nessuna dipendenza nuova, nessuna chiamata di rete.

## Perimetro ed esclusioni

- **Comprende:**
  - la sorgente delle risposte come interfaccia piccola e sostituibile, con l'implementazione finta a copione (`apps/web/src/chat`);
  - il pannello chat esteso e le schede ricche (`apps/web/src/ui`);
  - la chat collegata al layout delle pagine del giorno;
  - le due voci nuove nel catalogo del design system e le relative sezioni di `/stile`, in tema chiaro e scuro;
  - i test di CA-3, CA-4, CA-5 e delle schede ricche.
- **Esclude (ST-CHAT-001C):**
  - **l'AI vera**: nessun SDK, nessuna chiamata a servizi esterni; le risposte sono scritte in anticipo;
  - **il salvataggio della conversazione** (REQ-DATA-001): la conversazione vive nel browser e si perde chiudendo la pagina;
  - CA-1 (dal prompt 1 alla bozza), CA-2 (la proposta accettata dalla chat crea la stessa versione del pulsante) e CA-6 (filtri e chat sullo stesso profilo): non fanno parte di questa storia;
  - la risposta "in streaming": la risposta arriva intera dopo "sta scrivendo".
- **Conseguenza di CA-2 fuori perimetro:** "Accetta" nella chat cambia solo la conversazione (mostra la conferma con "Annulla"); non crea una versione dell'itinerario né evidenzia le parti cambiate nella pagina a lato. "Annulla" ripristina solo la conversazione.
- **Lasciato fuori di proposito:** `packages/`, `.sdlc`, `.github`, `package.json` e `package-lock.json` della radice non sono toccati.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Tipi dei dati della chat (messaggi, schede, risposte, benvenuto), senza funzioni né motore | `apps/web/src/chat/tipi.ts` |
| Interfaccia `SorgenteRisposte` (`benvenuto`, `rispondi`), `ErroreSorgente` (`non-disponibile`, `errore`) e sorgente finta a copione con ritardo configurabile | `apps/web/src/chat/sorgente.ts` |
| Copione del viaggio, costruito sul server con i dati e il motore: preferenze, bozza dei giorni, proposta per lo scenario di imprevisto del viaggio | `apps/web/src/chat/copione.ts` |
| Chat nel browser: conversazione, "sta scrivendo", benvenuto, errore con "Riprova", AI non disponibile, Accetta/Rifiuta/Annulla | `apps/web/src/chat/ChatViaggio.tsx` |
| Pannello chat esteso (compatibile con l'uso precedente): "sta scrivendo", benvenuto, caricamento, errore, stato vuoto, invio di testo e chip, misura dell'area visibile | `apps/web/src/ui/PannelloChat.tsx` |
| Schede ricche: preferenze, bozza (con "Apri"), conferma (con "Annulla"); la proposta riusa `SchedaProposta` | `apps/web/src/ui/SchedeChat.tsx` |
| Stili: pannello flessibile con scorrimento interno, punti animati, schede, chat a tutto schermo sul telefono | `apps/web/src/ui/ui.css` |
| Catalogo e pagina `/stile`: "Schede della chat" e "Stati della chat" | `apps/web/src/ui/catalogo.ts`, `apps/web/src/componenti/PaginaStile.tsx` |
| Chat collegata allo slot del layout nelle pagine del giorno | `apps/web/src/componenti/Contenuti.tsx` |
| La tastiera accorcia la pagina invece di coprirla (`interactiveWidget`) | `apps/web/app/layout.tsx` |
| Testi senza motore (stati del viaggio, livelli di ripianificazione), riesportati da `testi.ts` | `apps/web/src/testi-ui.ts`, `apps/web/src/testi.ts`, `apps/web/src/ui/Badge.tsx`, `apps/web/src/ui/SchedaProposta.tsx` |
| Test nuovi (33) e supporto | `apps/web/test/chat001b-*.test.tsx`, `apps/web/test/supporto-chat.tsx` |
| Test esistenti adattati (2) | `apps/web/test/ux001-ca3-stile.test.tsx`, `apps/web/test/ux001-guscio-home.test.tsx` |
| Prove di consegna | `evidence/ST-CHAT-001B.md` |

## Perché

### Dipendenze

Nessuna dipendenza nuova: `apps/web/package.json` e `package-lock.json` non cambiano. Si usano `radix-ui` (già in uso, per le notifiche e le finestre), `lucide-react` per le icone e i componenti di `apps/web/src/ui`. La chat poggia su ST-UX-001 (design system) e su ST-WEB-003 (vista del giorno con linea del tempo, evidenziazione scheda/mappa e pannello di dettaglio): `ContenutoGiorno` mette la chat nello slot del layout accanto a `EvidenziazioneGiorno`. Non c'è nessun SDK di AI: la sorgente vera arriverà con ST-CHAT-001C, dietro la stessa interfaccia.

### Scelte

- **Sorgente sostituibile.** La chat parla solo con `SorgenteRisposte`: `benvenuto()` e `rispondi(testo, storia)`. ST-CHAT-001C scrive una sorgente nuova e la passa a `ChatConSorgente` al posto di quella finta, senza toccare pannello e schede. Gli errori hanno un codice: `non-disponibile` spegne la chat con un messaggio gentile, `errore` mostra un avviso con "Riprova".
- **Dati semplici tra server e browser.** Il copione è costruito sul server e passa al browser come dati senza funzioni. Così il motore (che usa `node:fs`) resta fuori dal codice del browser; il test di UX-001 che segue le importazioni dei file `"use client"` lo verifica.
  - Per questo gli stati del viaggio e i livelli di ripianificazione si sono spostati in `testi-ui.ts`, senza dipendenze dal motore. `testi.ts` li riesporta con gli stessi nomi: nessun altro file cambia. `Badge` e `SchedaProposta`, che prima importavano `testi.ts`, ora importano il nuovo modulo.
- **Nessuna logica del motore duplicata.** La proposta nella chat è `proponiRipianificazione` sullo scenario di imprevisto del viaggio (per `versione-1`, lo scenario S1 "Pioggia sul trekking"), messa in parole da `vistaProposta` come nella pagina della proposta. Un test confronta il numero di cambi tolti, aggiunti e spostati con quelli del motore. La bozza usa i giorni e le attività del viaggio, il riepilogo il titolo, il periodo e il numero di viaggiatori.
- **Il pannello resta presentazionale.** `PannelloChat` riceve messaggi, schede già disegnate e funzioni; non sa nulla delle risposte. Senza `onInvia` si comporta come prima (pagina `/stile`).
- **Telefono (CA-4).** Con la scheda "Chat" attiva il contenitore è fisso, a tutta larghezza e alto quanto l'area visibile; lascia libere le schede in basso.
  - L'altezza è `--altezza-visibile`, che vale `100dvh` e che il pannello aggiorna con `visualViewport` quando la tastiera si apre (anche lo scostamento, per i telefoni che spostano la pagina).
  - La pagina dichiara `interactiveWidget: "resizes-content"`, così dove supportato la tastiera accorcia la pagina.
  - I messaggi scorrono dentro il pannello; il campo e il pulsante "Invia" restano fuori dallo scorrimento, in fondo.
  - Il campo ha almeno 16 px di testo (il telefono non ingrandisce la pagina) e porta se stesso in vista quando riceve il focus.
- **Movimento.** I tre punti di "sta scrivendo" usano `--durata-scheletro` per durata e ritardi; con `prefers-reduced-motion` la durata vale 0 e restano fermi. Il testo "TravelOps sta scrivendo…" è annunciato ai lettori di schermo.
- **Accessibilità.** La conversazione è una regione `role="log"` con `aria-live="polite"`, raggiungibile da tastiera. L'errore è un `Avviso` con `role="alert"`. "Apri" dice di quale giorno si tratta ("Apri: sabato 13 giugno").
- **Nessun codice a vista.** I testi della proposta vengono da `vistaProposta` (già in parole); il test di CA-6 di UX-001 ora comprende anche le pagine dei giorni con la chat e `/stile` con le schede nuove.

### Interpretazioni del requisito

- **Stato vuoto.** È la chat senza messaggi: con il benvenuto mostra le tre proposte da toccare; senza benvenuto il pannello dice "Nessun messaggio per ora: scrivimi qui sotto e ti rispondo".
- **Caricamento.** Lo scheletro "Sto aprendo la chat…" compare finché la sorgente non ha dato il benvenuto. "Sta scrivendo" copre l'attesa della risposta.
- **AI non disponibile.** Quando la sorgente risponde `non-disponibile` (al benvenuto o a un messaggio) il campo, il pulsante e i chip si disattivano e il pannello dice che si può fare tutto con i pulsanti.
- **Dove sta la chat.** Nelle pagine del giorno (`/viaggi/<viaggio>/giorni/<data>`), le uniche che usano il layout di viaggio: colonna a sinistra su schermo grande, scheda "Chat" a tutto schermo sul telefono. La pagina del viaggio e quelle delle versioni non usano il layout e non hanno la chat.
- **Dati di esempio.** Gli "Stili" e il "Ritmo" del riepilogo delle preferenze sono scritti nel copione ("Cultura e gastronomia", "Tranquillo"): le preferenze vere arrivano con REQ-PREF-001. Il livello della proposta è "Cambia solo il necessario", perché la proposta del motore è una ripianificazione minima.
- **Il viaggio "Pranzo a orario fisso"** non ha uno scenario tra i dati di riferimento: alla domanda sull'imprevisto la chat risponde con sole parole e non con una scheda.
- **Parole riconosciute.** La sorgente finta sceglie la risposta dal testo (senza badare a maiuscole e accenti): "preferenze", "pioggia/meteo/trekking…", "bozza/weekend/lago…". Il resto riceve una risposta di ripiego con i tre suggerimenti.

### Alternative scartate

| Alternativa | Perché è stata scartata |
| --- | --- |
| Costruire le schede sul server e passarle già disegnate al browser | Le risposte vere (ST-CHAT-001C) arriveranno dal browser; servono dati semplici, non componenti |
| Importare `testi.ts` dal browser | Porterebbe il motore e `node:fs` nel pacchetto del browser: la build e il test di UX-001 lo impediscono |
| Duplicare nella chat la logica che sceglie i cambi di una proposta | Vietato dal requisito: i cambi vengono da `proponiRipianificazione` |
| Una libreria per la chat o per i messaggi (react-chat, assistant-ui) | Una dipendenza nuova per un pannello che i componenti di UX-001 già coprono |
| `position: sticky` o `100vh` per il campo sul telefono | `100vh` non cambia con la tastiera; `dvh` e `visualViewport` sì |
| Stili in linea per l'altezza dell'area visibile | Il test di UX-001 (CA-1) vieta gli stili in linea nei componenti: si impostano variabili CSS sul contenitore |
| Salvare la conversazione in SQLite ora | È il perimetro di ST-CHAT-001C |

## Verifica

Eseguito su macOS (Darwin 25.6), Node 24, nella copia di lavoro `TravelOps-chat001b` sul ramo `feature/ST-CHAT-001B`, dopo `npm ci`.

- `npm run build` dalla radice: verde. Motore compilato con `tsc`; web app compilata con Next.js.
- `npm run typecheck -w apps/web`: nessun errore, test compresi.
- `npm test` dalla radice, sul ramo allineato a `main` con ST-WEB-003:
  - motore: 30 file, 573 test, tutti verdi;
  - web app: 43 file, 314 test: **310 verdi e 4 rossi**.
- **Layout con la chat (REQ-WEB-003 CA-6).** Con la chat aperta il CSS metteva itinerario e mappa in una colonna sola. Ora su schermo grande (da 1100 px) la chat è la colonna a sinistra e itinerario e mappa restano affiancati (`.ui-layout-viaggio[data-chat="aperta"]`: chat `minmax(280px, 1fr)`, resto `minmax(0, 2.4fr)`); a 1280 px la pagina non scorre in orizzontale. Sul telefono le schede in basso sono "Itinerario", "Mappa", "Chat". Il test `web003-ca6-layout.test.tsx` è stato adattato solo nell'elenco delle schede (ora tre); il resto, compresa la misura a 1280 e 375 px, è invariato.
- I 4 test rossi sono i controlli axe con il contrasto calcolato di `ux001-browser.test.tsx` (home e `/stile`, tema chiaro e scuro). **Falliscono allo stesso modo anche senza queste modifiche**, verificato su una copia pulita del ramo prima di ST-CHAT-001B (Chrome di questa macchina; in CI passano): il browser di questa macchina (Chrome di sistema) calcola come insufficienti il contrasto del badge "Confermato", della descrizione delle schede e delle bolle del viaggiatore (testo chiaro su `--colore-primario`). Nei nodi segnalati nel pannello chat c'è solo la bolla del viaggiatore, che esisteva già in `/stile`; le schede e gli stati nuovi non compaiono tra le violazioni. Non è stato modificato nessun token per non uscire dal perimetro: va controllato con il browser della CI.
- Test nuovi: 33, di cui 2 nel browser (impaginazione vera a 375 px con la finestra accorciata a 812, 420 e 340 px). Verdi.
- Test esistenti adattati (solo dove cambia il contenuto; `web003-ca6-layout.test.tsx` come descritto sopra):
  - `ux001-ca3-stile.test.tsx`: il catalogo comprende le 16 voci della §6.2 più le 2 della chat; il conteggio degli avvisi si limita alla sezione "Avvisi";
  - `ux001-guscio-home.test.tsx`: le pagine del giorno hanno ora anche la chat (`data-chat="aperta"`, riquadri "chat", "itinerario", "mappa", scheda "Chat").
- Il test `ca6-rete` passa: nessun `fetch`, XHR, WebSocket, EventSource o `sendBeacon` in `app`, `src`, `scripts`. Un test dedicato lo controlla anche sui file della chat e verifica che non ci siano SDK di AI tra le dipendenze.
- File con a capo LF; nessun commit, nessun comando git di scrittura.

| Criterio | Test (file › nome) | Esito |
| --- | --- | --- |
| CA-3 le risposte rapide inviano il testo del chip; benvenuto con 3 suggerimenti; "sta scrivendo" | `chat001b-ca3-risposte-rapide.test.tsx` › "CA-3 la chat vuota dà il benvenuto con tre suggerimenti da toccare"; "… toccare un suggerimento invia esattamente il suo testo …"; "… le risposte rapide sotto una risposta inviano il loro testo e spariscono dopo l'invio"; "… il messaggio scritto a mano parte con Invio …"; "… mentre TravelOps risponde si vede «sta scrivendo» …" | superato |
| Schede ricche: preferenze, bozza, proposta con prima → dopo e Accetta/Rifiuta, conferma con Annulla | `chat001b-schede-ricche.test.tsx` › "Schede ricche: il riepilogo delle preferenze …"; "… la bozza ha una miniatura per giorno …"; "… la proposta mostra prima → dopo con i cambi calcolati dal motore …"; "… Accetta mostra la conferma con «Annulla» …"; "… Rifiuta lascia il programma com'è e lo dice". `chat001b-sorgente.test.tsx` › "il copione è costruito con i dati e il motore …" | superato |
| CA-4 sul telefono la chat è a tutto schermo e la tastiera non copre il campo | `chat001b-ca4-telefono.test.tsx` › "CA-4 sul telefono la chat attiva è fissa, a tutta larghezza e alta quanto l'area visibile"; "… i messaggi scorrono dentro il pannello …"; "… il campo di testo è grande almeno 16 px …"; "… la pagina si accorcia con la tastiera …"; nel browser "… la chat occupa tutto lo schermo a 375 px …" e "… il campo di testo sta sopra le schede in basso anche con la tastiera aperta". `chat001b-ca4-tastiera.test.tsx` › "CA-4 il contenitore della chat segue l'altezza dell'area visibile …"; "… chiudendo la chat le misure sono tolte …"; "… senza visualViewport …"; "… il campo di testo riceve il focus e si porta in vista" | superato |
| CA-5 stati vuoto, caricamento, errore e AI non disponibile | `chat001b-ca5-stati.test.tsx` › "CA-5 stato vuoto …"; "CA-5 caricamento …"; "CA-5 errore: … «Riprova» …"; "CA-5 AI non disponibile: la chat si spegne …"; "CA-5 AI non disponibile fin dall'inizio …"; "CA-5 gli stati hanno ruoli per i lettori di schermo …". Gli stati sono anche in `/stile` (sezione "Stati della chat") | superato |
| Sorgente sostituibile, senza rete né SDK di AI | `chat001b-sorgente.test.tsx` › sorgente finta, errori con codice, nessun SDK né connessioni; la chat in tutte le pagine dei giorni. `ca6-rete.test.ts` | superato |
| I test di UX-001 coprono i componenti nuovi | `ux001-ca3-stile.test.tsx` (sezioni in tema chiaro e scuro), `ux001-ca1-colori.test.ts` (solo token, variabili definite), `ux001-ca7-movimento.test.ts` (solo durate dei token), `ux001-ca6-codici.test.tsx` (pagine dei giorni e `/stile` senza codici), `ux001-ca5-axe.test.tsx` (axe senza violazioni), `ux001-ca5-tastiera.test.tsx`, `ux001-ca4-larghezze.test.tsx`, `ux001-guscio-home.test.tsx` (il browser non carica il motore) | superato |

## Collegamenti

- Requisito: REQ-CHAT-001 (`docs/requirements/REQ-CHAT-001-chat.md`)
- Storia: ST-CHAT-001B
- Contratto: contract-ST-CHAT-001B-implementation
- Autonomia: AUT-PR-CHAT-001B
- Dipendenze: ST-UX-001 (design system e guscio dell'app; `evidence/ST-UX-001.md`) e ST-WEB-003 (vista del giorno)
- Seguito: ST-CHAT-001C (AI vera, salvataggio della conversazione, CA-1, CA-2, CA-6)
