# Pianifica e bozza (`TB-PLAN`) · gruppo B

Pagine `/pianifica`, `/bozza/<viaggio>`, `/destinazione`, `/itinerario`. Nella bozza: barra «Azioni sulla bozza» («Annulla», «Mostrami un'alternativa», «Conferma l'itinerario»), menu «Modifica giorno» («Giornata più leggera», «Giornata più piena», «Rigenera questo giorno», «Scambia con…»), menu attività («Sostituisci», «Sposta», «Rimuovi», «Bloccata»), «Cronologia della bozza».

### TB-PLAN-001 · Da Pianifica alla conferma

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì (e2e `ux003a-flussi`)
- **Fonte**: Valerio (PC2), caso 15.
- **Precondizioni**: stato pulito, `TRAVELOPS_ASSISTENTE=finto`.
- **Azioni**:
  1. Dalla home premi «Pianifica un viaggio».
  2. Compila le preferenze finché «La tua bozza» mostra i giorni.
  3. Premi «Apri la bozza».
  4. Premi «Conferma l'itinerario».
- **Atteso**: «Apri la bozza» porta a `/bozza/<viaggio>` dello stesso viaggio; la conferma mostra «Buon viaggio!»; dopo «Chiudi» il viaggio risulta «Confermato».

### TB-PLAN-002 · Pianifica propone solo mesi futuri

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7`.
- **Precondizioni**: orologio della Demo al valore predefinito `2026-06-12 08:00`, data reale successiva.
- **Azioni**:
  1. Apri `/pianifica`, passo «Quando e quanto», apri «In che mese parti?».
- **Atteso**: i mesi proposti partono dal mese reale corrente; l'orologio simulato della Demo non influenza la pianificazione di un nuovo viaggio (niente mesi già passati).

### TB-PLAN-003 · Sostituire un'attività

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì (e2e `ca2-bozza`)
- **Precondizioni**: bozza aperta (TB-PREF-001).
- **Azioni**:
  1. Apri il menu «Azioni per «<nome>»» della prima attività del giorno 1 e scegli «Sostituisci».
  2. In «Alternative a «<nome>»» scegli la prima alternativa.
- **Atteso**: compare «Aggiorno la bozza…», poi l'attività è sostituita nella stessa fascia oraria; il numero di attività del giorno non cambia; la cronologia ha una voce in più. Se non ci sono alternative si legge «Non trovo alternative adatte a te che entrino in questa giornata.».

### TB-PLAN-004 · Spostare un'attività con il suo spostamento

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7` («2 h di buco»).
- **Precondizioni**: bozza aperta con almeno 3 attività al giorno.
- **Azioni**:
  1. Sulla seconda attività del giorno 1 scegli «Sposta», imposta «Ora di inizio» 2 ore più tardi e premi «Sposta qui».
- **Atteso**: lo spostamento verso l'attività si sposta con lei (resta subito prima); non resta un buco di ore tra spostamento e attività; gli orari successivi sono ricalcolati senza sovrapposizioni.

### TB-PLAN-005 · «Scambia con…» conserva le attività

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7`.
- **Precondizioni**: bozza di almeno 3 giorni; conta attività e ristoranti dei giorni 1 e 2.
- **Azioni**:
  1. Sul giorno 1 apri «Modifica giorno» → «Scambia con…» → giorno 2 (da tastiera: Tab, Invio, frecce).
- **Atteso**: i due giorni si scambiano il programma; il totale delle attività è identico (nessuna persa) e i ristoranti restano quelli di prima, solo spostati di giorno.

### TB-PLAN-006 · «Scambia con…» funziona col mouse

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7`.
- **Precondizioni**: come TB-PLAN-005.
- **Azioni**:
  1. Col mouse: «Modifica giorno» → passa sopra «Scambia con…» → clic sul giorno 2.
- **Atteso**: stesso risultato di TB-PLAN-005; il sottomenu non si chiude prima del clic.

### TB-PLAN-007 · Ristoranti e ritmo lento

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7`.
- **Precondizioni**: bozza di 4 giorni con ritmo «Lento (2 attività al giorno)».
- **Azioni**:
  1. Scorri tutti i giorni della bozza.
- **Atteso**: nessun giorno ha lo stesso ristorante a pranzo e a cena; ogni giorno ha 2 attività (non 1), salvo un avviso «Da sistemare» che spiega perché.

### TB-PLAN-008 · Doppio clic non applica due volte

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7`.
- **Precondizioni**: bozza aperta.
- **Azioni**:
  1. Fai doppio clic veloce su «Giornata più leggera» del giorno 1.
  2. Fai doppio clic su «Rimuovi» di un'attività.
- **Atteso**: ogni azione viene applicata una sola volta (una sola voce in cronologia, una sola attività rimossa).

### TB-PLAN-009 · Indicatore durante le operazioni lente

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7` (operazioni da 3-6 s senza indicatore, clic persi).
- **Precondizioni**: bozza aperta.
- **Azioni**:
  1. Premi «Rigenera questo giorno» sul giorno 2.
  2. Mentre lavora, prova a premere «Giornata più piena» sul giorno 3.
- **Atteso**: entro 300 ms compare «Aggiorno la bozza…»; le altre azioni sono disattivate o messe in coda in modo visibile; nessun clic viene perso senza avviso.

### TB-PLAN-010 · I menu si chiudono

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì (e2e `ux003b-bozza-menu`)
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7`.
- **Precondizioni**: bozza aperta.
- **Azioni**:
  1. Apri «Modifica giorno» sul giorno 1, poi clicca fuori.
  2. Riaprilo e premi Esc.
  3. Apri il menu di un'attività e poi quello di un'altra.
- **Atteso**: il menu si chiude con clic esterno ed Esc; aprendo un altro menu il precedente si chiude; mai due menu aperti insieme.

### TB-PLAN-011 · Aggiunta oltre il ritmo

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7`.
- **Precondizioni**: bozza con ritmo «Lento (2 attività al giorno)».
- **Azioni**:
  1. Apri il selettore attività («Cerca un'attività») e aggiungi una terza attività al giorno 1.
- **Atteso**: compare un avviso che il giorno supera il ritmo scelto (l'aggiunta resta possibile, ma è dichiarata).

### TB-PLAN-012 · Il confronto conta solo ciò che cambia

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7`.
- **Precondizioni**: bozza aperta.
- **Azioni**:
  1. Sostituisci un'attività del giorno 1.
  2. In «Cronologia della bozza» premi «Confronta» sull'ultima voce.
- **Atteso**: il confronto elenca l'attività sostituita e gli spostamenti davvero cambiati; gli spostamenti identici non sono contati come modifiche.

### TB-PLAN-013 · «Annulla» e ritorno a una voce della cronologia

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì (e2e `ca2-bozza`)
- **Precondizioni**: bozza aperta, due modifiche fatte.
- **Azioni**:
  1. Premi «Annulla».
  2. In «Cronologia della bozza» premi «Torna a «…»» sulla prima voce.
- **Atteso**: «Annulla» toglie solo l'ultima modifica; «Torna a» ripristina la bozza di quella voce; ricaricando la pagina lo stato resta quello ripristinato.

### TB-PLAN-014 · Bozza confermata: dove si arriva dopo

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì (e2e `ux003b-bozza-conferma`)
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7` (il viaggio confermato restava in `/bozza` senza «Ho un imprevisto»).
- **Precondizioni**: bozza aperta.
- **Azioni**:
  1. Premi «Conferma l'itinerario», poi «Chiudi» su «Buon viaggio!».
  2. Apri il viaggio dalla home.
- **Atteso**: la barra «Azioni sulla bozza» sparisce; il menu del giorno diventa «Proponi una modifica»; il viaggio si apre in `/viaggi/<viaggio>` (non come bozza) e da lì si raggiunge «Ho un imprevisto».

### TB-PLAN-015 · Bozza inesistente

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: nessuna.
- **Azioni**:
  1. Apri `/bozza/non-esiste`.
- **Atteso**: «Pagina non trovata» con «Il viaggio, il giorno o l'elemento che cerchi non esiste.» e il pulsante «Torna ai miei viaggi», che porta alla home.

### TB-PLAN-016 · Testi della bozza

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** no (giudizio sui testi)
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7`.
- **Precondizioni**: bozza aperta con almeno un avviso «Da sapere».
- **Azioni**:
  1. Leggi titoli, pulsanti, avvisi, stati vuoti e messaggi d'errore della bozza.
- **Atteso**: italiano corretto e coerente con le altre pagine, seconda persona, nessun termine tecnico (id, JSON, codici) né inglese; ogni avviso dice cosa fare.

### TB-PLAN-017 · Destinazione cercata e preparata

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì (e2e `ux004b-interfaccia`)
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. Apri `/destinazione` e scrivi «Trento» in «Scrivi il nome di una città o di una zona».
  2. Scegli il suggerimento.
- **Atteso**: «Cerco…» durante la ricerca; poi «Sto preparando Trento… ci vuole un attimo.» e «Trento: tutto pronto» con «Ho trovato N luoghi e M attività…». Per una località troppo piccola: «Qui c'è poco da fare» e la lista «Destinazioni vicine».

### TB-PLAN-018 · Itinerario corrente

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. Dal menu «Sezioni» apri «Itinerario corrente».
- **Atteso**: si apre `/versioni/<numero della versione corrente>` del viaggio scelto; con stato salvato non valido si arriva a `/demo` con «Lo stato salvato non è valido».
