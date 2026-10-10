# Testbook gruppo B: preferenze, pianifica e bozza, Sorprendimi, chat (ST-QA-001B)

| Campo | Valore |
|---|---|
| Data | 2026-10-10 |
| Testbook | `docs/testbook/` v1.0 (preferenze, pianifica-bozza, sorprendimi, chat), 54 casi |
| App | `origin/main` @ `d72ab70`, worktree temporaneo, `next build` + `next start` |
| Porte | 3231 (preferenze, Sorprendimi), 3232 (pianifica e bozza), 3233-3235 (chat; 3234 senza `TRAVELOPS_ASSISTENTE`, 3235 geocoding `reale`) |
| Modalità | tutti i servizi `finto`, assistente finto, nessuna `OPENAI_API_KEY` |
| Browser | Chrome di sistema headless via playwright-core, 1280x800 |
| Screenshot | `evidence/ST-QA-001B/shots/` (solo i difetti) |

Un record `test record` per ogni caso in ST-QA-001B. I casi che richiedono il modello vero (chiave OpenAI, solo su PC1) non sono stati eseguiti né simulati: esito «da eseguire su PC1» (registrato come `blocked`, vedi elenco per Alice in fondo).

## Totali

| Esito | Preferenze (8) | Sorprendimi (7) | Pianifica e bozza (19) | Chat (20) | Totale |
|---|---|---|---|---|---|
| superato | 4 | 5 | 11 | 5 | 25 |
| fallito | 2 (PREF-002, 007) | 0 | 4 (PLAN-002, 004, 007, 014) | 2 (CHAT-001, 003) | 8 |
| fallito-minore | 2 (PREF-001, 006) | 0 | 3 (PLAN-011, 012, 016) | 1 (CHAT-006) | 6 |
| bloccato | 0 | 0 | 0 | 2 (CHAT-005, 011) | 2 |
| da eseguire su PC1 | 0 | 2 (SURP-006, 007) | 1 (PLAN-019) | 10 | 13 |

Nota di metodo: nella chat con assistente finto (copione di 3 risposte) molti casi `finto` del testbook presuppongono un assistente che scrive i filtri o prepara la bozza; con il finto questo non avviene per scelta di ST-CHAT-003B. Vedi triage e «Aggiornamenti del testbook».


## Preferenze (TB-PREF)

### TB-PREF-001 · fallito-minore
- Percorso completo eseguito: «Passo N di 5» corretto a ogni passo; da «Crea la mia bozza» si apre `/bozza/viaggio-1` in circa 0,3 s (la scritta «Preparo la bozza…» non è osservabile: troppo veloce). 4 giorni, titolo «Viaggio a Lago di Garda (Riva del Garda e dintorni)».
- Difetto: con ritmo «Bilanciato (3 attività al giorno)» le attività (pasti esclusi) per giorno sono 2, 1, 3, 2; pasti inclusi 4, 3, 5, 3. Atteso: 3 al giorno. Shot: `PREF-001-bozza-attivita.png`.
- Gravità proposta P3. Responsabile probabile: ST-PLAN-001 «Prima bozza dell'itinerario» (generatore). Può dipendere dai dati demo/finti (catalogo ridotto): da verificare con servizi reali.

### TB-PREF-002 · fallito
- Passi 1 e 2 compilati, arrivo al passo 3, F5: riparto da «Passo 3 di 5» ma il riepilogo torna a «Destinazione: Da scegliere / Date: Da scegliere» e «Cosa manca» elenca destinazione e date; nessun «Preferenze salvate».
- Causa: `/preferenze` non salva a ogni modifica (nessun `onCambio`; il salvataggio, sulla tabella `profili`, avviene solo a «Crea la mia bozza»); il passo vive in `sessionStorage` (`travelops:percorso-preferenze:passo`), i dati no. Incoerenza: passo 3 con dati persi. Shot: `PREF-002-ricarica.png`.
- Gravità proposta P2. Responsabile probabile: ST-PREF-001B «Preferenze nella web app» (percorso) / ST-UX-003B (CA-4 passo che sopravvive al ricaricamento). Alternativa: correggere il testo del caso se il salvataggio al ricaricamento non è voluto.

### TB-PREF-003 · superato
- Passo 1, «Avanti» senza destinazione: «Prima di andare avanti: Manca la destinazione…», resta «Passo 1 di 5». Passo 2 senza date: «Mancano le date…», resta passo 2.
- Dal passo 5 con dati mancanti: «Mancano ancora delle informazioni» con «Vai a «Dove»» e «Vai a «Quando e quanto»»; il secondo porta a «Passo 2 di 5». Nessun errore tecnico.

### TB-PREF-004 · superato
- «Salta» assente ai passi 1-2, presente ai passi 3-5. «Altre 12 preferenze (predefinite)» elenca i valori con «(predefinito)»; «Nascondi le altre» le chiude. «Crea la mia bozza» apre `/bozza/viaggio-1`.

### TB-PREF-005 · superato
- Server senza `TRAVELOPS_ASSISTENTE` e senza chiave: «Crea la mia bozza» apre `/bozza/viaggio-1` in 0,2 s, nessun blocco su «Preparo la bozza…».

### TB-PREF-006 · fallito-minore
- «Mese e durata», novembre 2026, 4 giorni (slider): il riepilogo mostra «Date: novembre 2026 / Durata: 4 giorni» (non date esplicite); la bozza parte sempre da domenica 1 novembre 2026 e finisce mercoledì 4 novembre, senza dichiararlo né permettere di scegliere il giorno prima di creare.
- Atteso: date esplicite o criterio dichiarato o modificabile. Shot: `PREF-006-riepilogo-mese.png`.
- Gravità proposta P3. Responsabile probabile: ST-PREF-001A «Preferenze nel motore» (profilo con `date: mese`), poi ST-PLAN-001.

### TB-PREF-007 · fallito
- «Al» (10 luglio) prima di «Dal» (13 luglio): «Prima di andare avanti: Il giorno di ritorno viene prima di quello di partenza.», il passo non avanza, i valori restano. OK.
- «Dal» 2026-06-01 (passato rispetto all'orologio 2026-06-12; passato anche rispetto alla data reale) con «Al» 2026-06-04: nessun avviso, il riepilogo mostra «1–4 giugno 2026» e «Avanti» porta a «Passo 3 di 5». Il campo non ha attributo `min`. Shot: `PREF-007-passato.png`.
- Gravità proposta P2. Responsabile probabile: ST-PREF-001A (validazione del profilo, nessun controllo sul passato in `src/preferenze`).

### TB-PREF-008 · superato
- `/pianifica`, «Le tue preferenze»: compilati passi 1 e 2, i segni dei passi risultano `Passo 1, Dove: compilato`, `Passo 2, Quando e quanto: compilato`, `Passo 3-5: da compilare` (aria-label). Con «Indietro» due volte (passo 1) i dati e i segni restano.


## Sorprendimi (TB-SURP)

### TB-SURP-001 · superato
- «Scelgo più tardi: sorprendimi» → «Natura», agosto 2026, «Sorprendimi»: il pulsante mostra «Cerco idee…»; lista «Le idee per te» con 3 idee (Val Gardena, Edimburgo, Isole Lofoten), ciascuna con nome, motivo e stili. Scelta la prima: riepilogo «Destinazione: Val Gardena», «Avanti» disponibile.

### TB-SURP-002 · superato
- Nessuno stile scelto: nota «Cosa ti piace? Se non scegli nulla, uso cultura e natura.» visibile; tre idee: Edimburgo (Cultura, Natura), Sicilia orientale (Cultura, Gastronomia, Natura), Amsterdam (Cultura, Famiglia).

### TB-SURP-003 · superato (con testo del testbook non allineato)
- Tutte e 7 le voci di «Cosa preferisci evitare» selezionate: nessuna lista e nessun errore tecnico; compare «Gli stili proposti (Cultura e Natura) sono tutti tra quelli da evitare: scegli almeno uno stile di viaggio.» invece di «Con queste scelte non ho idee da proporti: prova a evitare meno cose.» (quest'ultima compare con 5 voci evitate, senza idee). Togliendo 3 vincoli (Relax, Cultura, Natura) e riprovando arrivano le idee.
- Osservazione sul testbook: il messaggio atteso va allineato a due varianti, o il caso va riscritto. Shot: `SURP-003-messaggio.png`. Eventuale rifinitura P3 (due messaggi diversi per lo stesso caso).

### TB-SURP-004 · superato
- «Scegli un'altra idea» riporta la lista con le stesse tre idee, senza nuova ricerca (nessun «Cerco idee…»); scelta la seconda (Edimburgo) il riepilogo diventa «Edimburgo». La prima non risulta salvata: la tabella `profili` non contiene «Gardena» (e `/preferenze` non salva prima di «Crea la mia bozza»).

### TB-SURP-005 · superato
- Natura (piace), Avventura (evitare), settembre 2026, idea Edimburgo: ai passi 2, 4 e 5 il mese è già «settembre 2026» (modalità «Mese e durata»), «Natura» già selezionato al passo 4 e «Avventura» già in «Cosa vuoi evitare» al passo 5. Il riepilogo mostra «Stili: Natura» e «Da evitare: Avventura».

### TB-SURP-006 · da eseguire su PC1
- Richiede modello vero (`OPENAI_API_KEY`) in `/pianifica`: non eseguito né simulato.

### TB-SURP-007 · da eseguire su PC1
- Richiede servizi `TRAVELOPS_*` reali e modello vero: non eseguito né simulato.


## Pianifica e bozza (TB-PLAN)

### TB-PLAN-001 · superato (con nota sul testo)
In finto «Crea la mia bozza» da `/pianifica` risponde «Sono l'assistente di prova e qui non preparo la bozza: aprila dalla pagina Preferenze», quindi i passi 1-2 come scritti non producono giorni. Bozza creata da `/preferenze`, poi `/pianifica?viaggio=viaggio-2`: «Apri la bozza» porta a `/bozza/viaggio-2`; «Conferma l'itinerario» mostra «Buon viaggio!»; dopo «Chiudi» la home dà «Confermato».
Testbook da allineare: nel caso finto i passi 1-2 vanno riscritti (bozza da Preferenze, poi Pianifica col viaggio).

### TB-PLAN-002 · fallito (P2)
`/pianifica` e `/preferenze`, passo 2, «Mese e durata», «In che mese parti?»: mesi da «giugno 2026» a «maggio 2027». Data reale 10 ottobre 2026, quindi proposti giugno-settembre già passati; ottobre 2026 è l'unico corrente e l'elenco parte dall'orologio simulato.
Atteso: elenco dal mese reale (ottobre 2026). Causa: `app/preferenze/page.tsx`, `app/pianifica/page.tsx`, `app/destinazione/page.tsx` chiamano `opzioniMesi(stato.orologio.data)` (orologio simulato). Stesso difetto in «Sorprendimi» (`/destinazione`). Story probabile: ST-PREF-001B / ST-UX-003B. Screenshot `plan002-mesi-da-giugno.png`.

### TB-PLAN-003 · superato
Sostituisci «Panorama da Cavra de Lizon» → prima alternativa «Panorama da Belvedere della costa»: indicatore «Aggiorno la bozza…» presente, giorno 1 con 4 attività prima e dopo, orario 13:55 al posto di 14:00 (stessa fascia), cronologia +1 («Sostituita Panorama da Cavra de Lizon»). Il caso «Non trovo alternative…» non raggiunto (alternative sempre presenti).
Osservazione: nello stesso giorno un'altra attività («Passeggiata: Parco Pavese») passa da 20:20 a 14:40, lasciando un buco 15:40-18:55: effetto collaterale non annunciato.

### TB-PLAN-004 · fallito (P2)
Giorno 1 (ritmo Bilanciato), seconda attività «Panorama da Cavra de Lizon» 14:00, «Sposta» con ora 16:00. Dopo: «13:40–13:46 Auto da Dolce Pizza a Ristorante La Scarpetta», poi nulla fino a «15:47–16:00 Auto da Ristorante La Scarpetta a Cavra de Lizon», poi Panorama 16:00–16:30 e «Auto … a Ristorante La Scarpetta» 16:30. Il pranzo non è in quella tappa: restano 2 h di buco (13:46-15:47) e due spostamenti da/verso un ristorante dove non si sosta.
Atteso: spostamento subito prima dell'attività, nessun buco di ore. Il difetto «2 h di buco» non è risolto del tutto. Story probabile: ST-PLAN-002 (operazioni sulla bozza) / ST-UX-004A. Screenshot `plan004-sposta-buco.png`.

### TB-PLAN-005 · superato
Tastiera (Tab, Invio, freccia destra, frecce, Invio): giorni 1 e 2 scambiati («Scambiati venerdì e sabato»), attività totali 15 prima e dopo, ristoranti dei due giorni invariati e solo spostati di giorno. Cronologia con voce «Scambiati venerdì e sabato».

### TB-PLAN-006 · superato
Mouse: «Modifica giorno» → hover «Scambia con…» → il sottomenu con i tre giorni resta aperto fino al clic su sabato 11 luglio. Stesso risultato di PLAN-005 (15 attività prima e dopo, ristoranti invariati).

### TB-PLAN-007 · fallito (P2)
Bozza Garda 10-13 luglio, ritmo «Lento» (nell'app: «Lento: 2 attività al giorno, pasti esclusi»). Giorni 1, 2, 3 hanno lo stesso ristorante a pranzo e a cena (Dolce Pizza / Ristorante La Scarpetta ×2 / La Scarpetta ×2). Giorni 1, 2, 4 hanno 1 visita invece di 2. Nessun avviso «Da sistemare»; c'è solo «Da sapere» sugli orari di apertura. Anche col ritmo Bilanciato il giorno 2 ha La Scarpetta a pranzo e cena e una sola visita.
Atteso: nessun ristorante ripetuto nello stesso giorno, 2 attività al giorno, altrimenti «Da sistemare». Story probabile: ST-UX-004A (bozze più varie) / ST-PLAN-001. Screenshot `plan007-ritmo-lento.png`.

### TB-PLAN-008 · superato
Doppio clic su «Giornata più leggera» (giorno 1): una sola voce («Più leggera venerdì», tolta «Passeggiata: Parco Pavese»). Doppio clic su «Rimuovi» (giorno 3): una sola attività tolta (2 → 1 visite), una sola voce in cronologia. Con doppio clic veloce il menu si chiude al primo clic e il secondo non ha effetto.

### TB-PLAN-009 · superato
Risposta delle azioni del server rallentata a 3 s (prova): l'indicatore «Aggiorno la bozza…» compare dopo 6 ms dal clic su «Rigenera questo giorno»; tutti i «Modifica giorno», «Annulla» e «Conferma» risultano disattivati; il clic su «Modifica giorno» del giorno 3 non passa. Al termine «Bozza aggiornata: Rigenerata sabato.». Senza rallentamento l'operazione dura circa 75 ms (indicatore a lampo).
Nota: nessuna coda visibile; le azioni sono disattivate, ammesso dal testo del caso.

### TB-PLAN-010 · superato
Clic esterno ed Esc chiudono il menu del giorno (dopo l'apertura completa). Con un menu aperto non si aprono mai due menu: il primo clic su un altro attivatore chiude il menu aperto, serve un secondo clic per aprire l'altro.
Nota sul testo: «aprendo un altro menu il precedente si chiude» richiede due clic, non uno.

### TB-PLAN-011 · fallito-minore (P3)
Ritmo «Lento», giorno 1: da 1 a 3 visite con «Aggiungi un'attività…» (3 aggiunte), nessun avviso che il giorno supera il ritmo (il messaggio dice solo «Bozza aggiornata: Aggiunta …», nessuna riga «Da sistemare» o «Da sapere» sul ritmo).
Atteso: avviso che il giorno supera il ritmo scelto. Story probabile: ST-PLAN-002 / ST-UX-003B. Screenshot `plan011-niente-avviso-ritmo.png`.

### TB-PLAN-012 · fallito-minore (P3)
Sostituita «Passeggiata: Parco Pavese» con «Panorama da Cavra dele Gere Longhe», Confronta voce 1 ↔ 2: «Aggiunto … / Tolto … / Aggiornati 8 spostamenti». Confrontando i connettori prima e dopo, su 15 spostamenti 13 sono identici nel testo (orari e tratte) e solo 2 cambiano: il conteggio 8 include spostamenti identici.
Atteso: contare solo ciò che cambia. Nota: nell'interfaccia «Confronta» è un unico pulsante con due selezioni («con»), non un pulsante per voce. Story probabile: ST-UX-004A / ST-PLAN-002. Screenshot `plan012-confronto-8-spostamenti.png`.

### TB-PLAN-013 · superato
Due modifiche («Più piena sabato», «Tolta Visita a MAG…»). «Annulla» toglie solo l'ultima (stato uguale a dopo la prima; «Ultima modifica: Modifica annullata»). «Torna a «Bozza iniziale»» ripristina lo stato iniziale; dopo il ricaricamento lo stato resta quello ripristinato.

### TB-PLAN-014 · fallito (P2)
Dopo «Conferma l'itinerario» → «Chiudi»: barra «Azioni sulla bozza» sparita, menu giorno «Proponi una modifica», apertura dalla home in `/viaggi/viaggio-2`. Ma da `/viaggi/viaggio-2` a 1280 px non c'è nessun «Ho un imprevisto» (il pannello Oggi è nascosto); in `/viaggi/viaggio-2/oggi` «Ho un imprevisto» e «Oggi sono stanco» puntano a `/demo`, non a `/imprevisti`. `/imprevisti` si raggiunge solo da `/versioni/<n>` della versione corrente (viaggio di riferimento, non della bozza confermata).
Atteso: «Ho un imprevisto» raggiungibile dal viaggio confermato. Stesso difetto di TB-IMPR-001. Causa: `PannelloOggi.tsx` usa `PERCORSO_DEMO`. Story probabile: ST-UX-003A. Screenshot `plan014-viaggio-senza-imprevisto.png`.

### TB-PLAN-015 · superato
`/bozza/non-esiste`: HTTP 404, «Pagina non trovata», «Il viaggio, il giorno o l'elemento che cerchi non esiste.», pulsante «Torna ai miei viaggi» → `/`.

### TB-PLAN-016 · fallito-minore (P3)
Letta la bozza (titoli, pulsanti, avvisi, errori). Incoerenze: durate degli spostamenti con «(20 min)» e «(5 minuti)» nella stessa pagina (7 contro 8); virgolette miste «…» e "…" nella cronologia («Sostituito "A" con "B"», «Tolto "…" dal 12 luglio 2026»); errore di «Sposta» alle 23:50: «Fuori dalla giornata: l'attività (60 minuti) finirebbe alle 24:50, oltre le 24:00: un elemento non può attraversare la mezzanotte» (parola «elemento», «24:50», non dice cosa fare). Per il resto italiano corretto, seconda persona, nessun id né JSON visibile; «Da sapere» dice cosa fare («controllali prima di andare»). Story probabile: ST-UX-004A (testi umani).

### TB-PLAN-017 · superato (con nota sul testo)
`/destinazione`: «Trento» → «Cerco…» (circa 300 ms), «Ho trovato 2 destinazioni.» (Riva del Garda, Val di Fassa: il geocodificatore finto non conosce Trento). Scelta di «Riva del Garda»: «Sto preparando…», passi «Cerco i luoghi… … Controllo che ci sia tutto…», «Lago di Garda (Riva del Garda e dintorni): tutto pronto», «Ho trovato 79 luoghi e 72 attività da cui costruire il programma.». «Qui c'è poco da fare» e «Destinazioni vicine» non raggiungibili col geocodificatore finto.
Testbook da allineare: «Trento: tutto pronto» non si ottiene in finto.

### TB-PLAN-018 · superato
Menu → «Itinerario corrente» apre `/versioni/1` (viaggio di riferimento «Weekend sul Garda», versione 1 corrente). Con storico corrotto nel database (istanza separata, porta 3252) si arriva a `/demo` con «Lo stato salvato non è valido» e il pulsante «Ripristina».
Nota: «Itinerario corrente» porta sempre al viaggio di riferimento, non alla bozza o al viaggio creato.

### TB-PLAN-019 · da eseguire su PC1
Richiede il modello vero (chat con `OPENAI_API_KEY`); non eseguito né simulato.


## Chat (TB-CHAT)

### TB-CHAT-001 · fallito
- `/pianifica` non mostra «Nessun messaggio per ora: scrivimi qui sotto e ti rispondo.» ma il benvenuto «Ciao! Raccontami il viaggio che hai in mente…» con tre suggerimenti diversi («4 giorni sul Lago di Garda a giugno in coppia, natura e buon vino», …); il suggerimento «Voglio un weekend sul lago» non esiste.
- Premuto il primo suggerimento: messaggio visibile, «sta scrivendo» al primo campione, risposta «Bella idea! Sono l'assistente di prova e non segno nulla nei filtri…».
- «La tua bozza» resta «Qui comparirà l'itinerario…»: nessun passaggio da «Preparo la bozza…» ai giorni, nessun «Apri la bozza» (0 elementi `data-azione="apri-bozza"`).
- Causa: con l'assistente finto la chat non prepara mai la bozza (scelta di ST-CHAT-003B, commento in `copione-finto.ts`). Testo del caso non allineato al finto; la bozza da chat si prova solo col modello vero. Gravità proposta P3 se resta come scelta (correggere il caso), P1 se il caso vale anche col finto. Screenshot `shots/TB-CHAT-001.png`.

### TB-CHAT-002 · superato
- «Sabato piove: cosa cambio?» inviato; risposta completa («Dimmi qualcosa in più sul viaggio: dove, quando e con chi.») visibile senza ricaricare; dopo il ricaricamento testo della conversazione identico.
- Osservazione P3: le risposte rapide («Natura», «Buon vino», «Tutte e due») spariscono dopo il ricaricamento (visto nel run di 001); conversazione quindi non identica in quel caso.

### TB-CHAT-003 · fallito
- Server senza chiave e senza `TRAVELOPS_ASSISTENTE`. Compilati con i pulsanti Garda, 10-13 luglio, passi 3-4 e premuto «Crea la mia bozza» al passo 5.
- «Crea la mia bozza» manda un messaggio alla chat («Ho compilato le preferenze con i filtri… crea la mia bozza») e la chat risponde «La chat non è disponibile in questo momento: puoi fare tutto anche con i pulsanti.».
- La bozza non nasce: «La tua bozza» resta vuota, nessun «Apri la bozza», il campo messaggio è disabilitato, si resta al «Passo 5 di 5». Il messaggio dice «puoi fare tutto con i pulsanti» ma l'ultimo passo dipende dalla chat; `/preferenze` non ha un altro «Crea la mia bozza».
- Gravità proposta P2 (atteso del caso non rispettato). Probabile responsabile: ST-CHAT-003B (CA-6, «Crea la mia bozza» passa dalla chat). Screenshot `shots/TB-CHAT-003.png`.

### TB-CHAT-004 · superato
- Richiesta `POST .../messaggi` bloccata dal browser: compare «Non sono riuscito a rispondere – Qualcosa non ha funzionato. Riprova tra un attimo.» con «Riprova»; il messaggio «Sabato piove: cosa cambio?» resta nella conversazione.
- Sbloccata e premuto «Riprova»: una sola risposta; stesso stato dopo il ricaricamento.

### TB-CHAT-005 · bloccato
- Con l'assistente finto nessun percorso produce una proposta con «Accetta»/«Rifiuta» in chat (`copioneViaggio` con la scheda proposta in `src/chat/copione.ts` non è usato da nessuna pagina; il finto risponde sempre con testo semplice). Provato in `/pianifica` e nella chat della pagina del giorno.
- Il caso dice «e2e `ca5-chat`» ma quell'e2e prova solo risposte rapide, non Accetta/Rifiuta. Da provare col modello vero o con un test dedicato.

### TB-CHAT-006 · fallito-minore
- In `/pianifica` «Voglio 4 giorni sul Lago di Garda a luglio»: risposta «…non segno nulla nei filtri…»; «Le tue preferenze» restano Destinazione/Date/Durata «Da scegliere», nessuna bozza.
- Atteso (4 giorni nei filtri, nella bozza e nella risposta) non verificabile col finto che per scelta non scrive i filtri; caso da riallineare o da fare col modello vero. Screenshot `shots/TB-CHAT-006.png`.

### TB-CHAT-007 · da eseguire su PC1
- Richiede `OPENAI_API_KEY` e il modello vero; non eseguito né simulato.

### TB-CHAT-008 · superato (con riserva)
- «Voglio 4 giorni a Manila a luglio»: la chat risponde «Dimmi qualcosa in più sul viaggio: dove, quando e con chi.» (chiede di precisare, non propone destinazioni preparabili); «I miei viaggi» resta con i 3 viaggi demo; filtri invariati.
- Riserva: la risposta è il «altrimenti» del copione, non la logica di ST-CHAT-003A (agenti), che si vede solo col modello. Alla ricerca destinazione dei pulsanti, «Manila» in finto dà «Non trovo destinazioni con questo nome…».

### TB-CHAT-009 · da eseguire su PC1
- La preparazione della destinazione parte dall'agente nella chat, che senza chiave è «non disponibile» (vedi CHAT-003). Non c'è modo di provocare «servizio fuori uso» dal browser: `TRAVELOPS_SERVIZI_TIMEOUT_MS=1` e `TRAVELOPS_DESTINAZIONE_TIMEOUT_MS=1` non cambiano la ricerca destinazione con `TRAVELOPS_GEOCODING=reale` (risultati arrivati lo stesso) e l'URL del geocoding non è configurabile.

### TB-CHAT-010 · da eseguire su PC1
- Serve il modello vero per la chat. Variante parziale col campo «Cerca una destinazione» e `TRAVELOPS_GEOCODING=reale`: «Formentera» dà «Ho trovato 2 destinazioni» con due righe identiche «Formentera, Isole Baleari, Spagna» (doppione, P3); la bozza non è stata provata. In finto «Formentera» non è trovata.

### TB-CHAT-011 · bloccato
- Con il finto la chat non crea nessun viaggio (nemmeno «Crea la mia bozza», vedi CHAT-001/003), quindi manca la precondizione «primo viaggio creato dalla chat con date, viaggiatori, ritmo, forma fisica e pasti». Da provare col modello vero.

### TB-CHAT-012 · da eseguire su PC1
- Modalità reale, logistica con il modello vero.

### TB-CHAT-013 · superato
- Dalla pagina del giorno `/viaggi/versione-1/giorni/2026-06-13` la chat («Chat con TravelOps») ha inviato `POST /api/chat/conversazioni` e `POST .../4/messaggi` al server degli agenti; ricaricando la conversazione riprende. Non è il copione della presentazione.
- Osservazione P3: la risposta del finto è generica («Dimmi qualcosa in più sul viaggio: dove, quando e con chi.») e non riferita ai dati del viaggio (chiede «dove» per un viaggio già esistente): "riferita ai dati" si vede solo col modello. Su `/viaggi/TRIP-DEMO-GARDA` e su `/bozza/TRIP-DEMO-ROMA` non c'è la chat.

### TB-CHAT-014 · da eseguire su PC1
- Modalità reale, confronto con tracce del modello vero.

### TB-CHAT-015 · da eseguire su PC1
- Modalità reale, modello vero.

### TB-CHAT-016 · da eseguire su PC1
- Modalità reale, testo del modello vero.

### TB-CHAT-017 · da eseguire su PC1
- Modalità reale, «Confermo l'itinerario» richiede il modello.

### TB-CHAT-018 · da eseguire su PC1
- Modalità reale, proposta e data nella risposta del modello.

### TB-CHAT-019 · superato
- Richiesta con ritmo e pasti («Ritmo tranquillo, pranzo al ristorante e cena libera, sul Garda in 3 giorni»): la chat dichiara di non segnare nulla nei filtri; i filtri restano «Da scegliere» e le 12 preferenze predefinite. Nessun elemento dichiarato capito che manchi nei filtri.
- Seconda richiesta («Sorprendimi con il mare, ritmo veloce e niente cena»): risposta generica per parola chiave, coerente con i filtri invariati. Non verifica il caso con il modello.

### TB-CHAT-020 · da eseguire su PC1
- Modalità reale, tracce dei tempi del modello.


## Triage

Decisioni registrate con `test triage` in ST-QA-001B.

| Caso | Esito | Decisione | Fix proposta (story libera, non implementata) |
|---|---|---|---|
| TB-PREF-002 | fallito | fixable P2 | ST-PREF-001B: il percorso salva i dati ad ogni passo (oggi solo a «Crea la mia bozza»), il passo non sopravvive da solo |
| TB-PREF-007 | fallito | fixable P2 | ST-PREF-001A: avviso se la data di partenza è nel passato |
| TB-PLAN-004 | fallito | fixable P2 | ST-PLAN-002: «Sposta» lascia ore di buco e spostamenti da/verso un ristorante senza sosta |
| TB-PLAN-007 | fallito | fixable P2 | ST-PLAN-001: stesso ristorante a pranzo e cena, 1 sola visita nei giorni lenti, nessun «Da sistemare» |
| TB-CHAT-003 | fallito | fixable P2 | ST-CHAT-003B: senza chat «Crea la mia bozza» non porta alla bozza, ma il testo dice che i pulsanti bastano |
| TB-PREF-001 | fallito-minore | fixable P3 | ST-PLAN-001: ritmo «3 attività al giorno» dà 2, 1, 3, 2 |
| TB-PREF-006 | fallito-minore | fixable P3 | ST-PREF-001A: «Mese e durata» parte sempre dal giorno 1, non dichiarato |
| TB-PLAN-011 | fallito-minore | fixable P3 | ST-PLAN-002: nessun avviso quando un giorno supera il ritmo |
| TB-PLAN-012 | fallito-minore | fixable P3 | ST-PLAN-002: «Confronta» conta 8 spostamenti aggiornati, ne cambiano 2 |
| TB-PLAN-016 | fallito-minore | fixable P3 | ST-UX-004A: testi incoerenti (durate «20 min»/«5 minuti», virgolette miste, errore alle 23:50) |
| TB-PLAN-002 | fallito | by-design | l'elenco dei mesi parte dall'orologio simulato dell'app (demo); il testbook va allineato |
| TB-PLAN-014 | fallito | not-fixable (duplicato) | già coperto da ST-QA-FIX-010 («Ho un imprevisto» raggiungibile) |
| TB-CHAT-001 | fallito | by-design | l'assistente finto non prepara la bozza (scelta di ST-CHAT-003B); testbook da riscrivere, la bozza da chat si prova con il modello vero |
| TB-CHAT-006 | fallito-minore | by-design | idem: il finto non scrive i filtri |

Osservazioni P3 senza caso (non aperte come story): le risposte rapide della chat spariscono dopo il ricaricamento; la ricerca «Formentera» con geocoding reale mostra due righe identiche; `copioneViaggio` in `apps/web/src/chat/copione.ts` non è usato.

## Da eseguire su PC1 (elenco per Alice, serve `OPENAI_API_KEY`)

| Caso | Perché |
|---|---|
| TB-SURP-006 | Sorprendimi in `/pianifica` col modello vero |
| TB-SURP-007 | servizi `TRAVELOPS_*` reali e modello vero |
| TB-PLAN-019 | chat in pianifica col modello vero |
| TB-CHAT-007 | bozza dalla chat col modello vero |
| TB-CHAT-009 | preparazione destinazione dall'agente, servizio fuori uso |
| TB-CHAT-010 | destinazione sconosciuta dalla chat (parziale: «Formentera» con geocoding reale mostra un doppione) |
| TB-CHAT-012 | logistica con il modello vero |
| TB-CHAT-014 | confronto con le tracce del modello |
| TB-CHAT-015 | modello vero |
| TB-CHAT-016 | testo del modello |
| TB-CHAT-017 | «Confermo l'itinerario» |
| TB-CHAT-018 | proposta e data nella risposta |
| TB-CHAT-020 | tracce dei tempi del modello |

Bloccati con il finto, da provare anche su PC1 col modello vero: TB-CHAT-005 (proposta con Accetta/Rifiuta in chat), TB-CHAT-011 (viaggio creato dalla chat).

## Aggiornamenti del testbook (per ST-QA-001A o una sua revisione)

- TB-PLAN-001: nel caso finto «Crea la mia bozza» da `/pianifica` non crea giorni; riscrivere i passi (bozza da Preferenze, poi `/pianifica?viaggio=...`).
- TB-PLAN-002: chiarire che i mesi partono dall'orologio simulato.
- TB-PLAN-010: l'altro menu si apre al secondo clic.
- TB-PLAN-012: «Confronta» è un pulsante con due selezioni.
- TB-PLAN-017: in finto «Trento» non esiste; usare un nome noto al geocodificatore finto.
- TB-PREF-001: «Preparo la bozza…» non è osservabile (apertura in 0,3 s). TB-PREF-002: chiarire cosa si salva e quando. TB-SURP-003: il messaggio atteso ha due varianti.
- TB-CHAT-001, 003, 005, 006, 009, 011, 019: i casi `finto` presuppongono un assistente che prepara la bozza o scrive i filtri; il finto è un copione di 3 risposte. 005 dichiara l'e2e `ca5-chat` che non prova Accetta/Rifiuta. 009: «servizio fuori uso» non simulabile con `TRAVELOPS_*`.
