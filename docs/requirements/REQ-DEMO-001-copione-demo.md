# REQ-DEMO-001 — Copione e dati della demo

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Ondata | 2 — Prodotto (CR-001) |
| Tipo | Nuovo |
| Dipende da | REQ-WEB-004 (ST-WEB-004), REQ-PLAN-002 (ST-PLAN-002), REQ-IMPR-001 (ST-IMPR-001), REQ-TODAY-001 (ST-TODAY-001) |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md`, `modello-dominio-estensioni.md`, `dati-di-riferimento-estensioni.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-DEMO-001`, una pull request |
| Origine | `docs/CR-001-travelops-prodotto-demo.md` §9.16 |

> I rimandi §7.x sono a `modello-dominio-estensioni.md`, i rimandi §8.x a `dati-di-riferimento-estensioni.md`, gli altri alla CR-001.

## Funzionalità

Istantanee precaricate e viaggi demo della §8.3 caricati al primo avvio e con "Ripristina"; la demo funziona anche senza rete, tranne la costruzione di destinazioni nuove; `docs/demo/copione-demo.md` con il copione della §10 aggiornato ai dati reali del catalogo; modalità presentazione che elenca anche i prompt del copione con "Copia" accanto; README con l'avvio in 3 comandi.

## Riferimento: 10. Copione della demo: prompt da incollare

Riportato dalla CR-001 perché fa parte di questo requisito.

Prima della demo: apri l'app, vai in **Modalità presentazione** → **Ripristina i viaggi demo**. I prompt si incollano nella chat. Il risultato atteso è quello che il pubblico deve vedere.

### Atto 1 — Raccontami il viaggio (nuovo viaggio, dalla home)

| # | Prompt | Cosa deve succedere |
|---|---|---|
| 1 | Ciao! Vorrei organizzare 4 giorni sul Lago di Garda dal 12 al 15 giugno con la mia compagna. Ci piacciono la natura e il buon vino, vogliamo un ritmo rilassato e niente levatacce. Budget medio. | Il riepilogo delle preferenze si compila (Garda, date, 2 adulti, coppia, natura, gastronomia, lento, €€). L'assistente chiede al massimo 1–2 dettagli (per esempio la forma fisica o le cene) con risposte rapide. |
| 2 | Forma fisica normale, e sì, mettici anche le cene. Crea pure la bozza. | Appare la bozza di 4 giorni con mappa, immagini, una frase "perché te lo propongo" per ogni giorno, e una degustazione in cantina. |
| 3 | Siamo 3 amici, vogliamo una cosa wild in montagna, 5 giorni ad agosto. Camminiamo tanto e la fatica non ci spaventa, budget basso. Sorprendici tu! | (Nuovo viaggio.) L'assistente propone 3 destinazioni di montagna con una riga ciascuna e le schede da scegliere. |
| 3b | Andiamo in Val di Fassa. | Bozza nelle Dolomiti con attività di avventura impegnative, ritmo intenso, partenze mattiniere, luoghi reali sulla mappa. |
| 4 | Weekend lungo a Roma a ottobre con due bambini di 6 e 9 anni. Niente musei lunghissimi, ci serve la pausa pranzo e la sera vogliamo stare in hotel. | (Nuovo viaggio.) Bozza a Roma con attività adatte ai bambini, pranzi sì e cene no, nessuna attività impegnativa. |
| 4b | 4 giorni a Lisbona a maggio in coppia, ci piacciono i musei e mangiare bene, ritmo normale. | (Nuovo viaggio, **serve la rete**.) "Sto esplorando Lisbona…" con i passi, poi una bozza con luoghi reali di Lisbona, immagini con attribuzione e "© OpenStreetMap contributors" sulla mappa. È il momento "wow" della demo: qualsiasi destinazione. |

### Atto 2 — Sistemiamola insieme (sulla bozza del Garda)

| # | Prompt | Cosa deve succedere |
|---|---|---|
| 5 | Il secondo giorno è troppo pieno, alleggeriscilo. | Il giorno 2 perde un'attività; la modifica è evidenziata; compare "Annulla". |
| 6 | Sostituisci il museo con qualcosa all'aperto. | Il museo è sostituito da un'attività all'aperto compatibile; la scheda spiega perché. |
| 7 | Questa degustazione non la togliere per nessun motivo. | La degustazione riceve il lucchetto (irrinunciabile). |
| 8 | Scambia il terzo giorno con il secondo. | I giorni 2 e 3 si scambiano; mappa e orari si aggiornano. |
| 9 | Mostrami un'alternativa per tutto il viaggio. | Una bozza diversa, con la degustazione bloccata ancora presente; si può confrontare con la precedente. |
| 10 | Torna alla versione di prima. | Si torna alla bozza precedente. |
| 11 | Perfetto, confermo l'itinerario! | Stato "Confermato", messaggio "Buon viaggio!", nasce la versione 1. |

### Atto 3 — In viaggio (su TRIP-DEMO-GARDA, orologio simulato a sabato 2026-06-13 ore 08:00)

| # | Prompt | Cosa deve succedere |
|---|---|---|
| 12 | Sta piovendo fortissimo, che facciamo stamattina? | Proposta: il trekking al Ponale lascia il posto a un'attività al coperto coerente con le preferenze; cambia solo la mattina; Accetta/Rifiuta. Accetta → versione 2. |
| 13 | Mi sono slogato una caviglia, per due giorni niente camminate impegnative. | Proposta: solo le attività impegnative dei due giorni sono sostituite; link a farmacie e pronto soccorso. |
| 14 | Si è bucata una gomma, ci vorranno due ore. | L'assistente chiede conferma ("ritardo di 2 ore da adesso, procedo?"); poi proposta che sposta o toglie solo ciò che serve. |
| 15 | Stiamo benissimo qui, vorremmo restare un giorno in più. | Proposta non fattibile: il volo di ritorno è a orario fisso ed è a rischio; pulsanti "Gestisci la prenotazione" e "Cerca voli" per il giorno dopo. |
| 16 | Il volo di ritorno è stato cancellato! | Il volo è a rischio, l'itinerario non cambia, ci sono le alternative con link. TravelOps dice chiaramente che non prenota. |
| 17 | Mi hanno rubato il portafoglio con la carta d'identità. | Proposta con mezza giornata libera per la denuncia, link alla Polizia di Stato, volo segnalato a rischio "serve un documento valido". |
| 18 | Oggi siamo distrutti, facciamo meno cose. | Il giorno resta con poche attività, pasti e cose irrinunciabili. |
| 19 | (Pulsante) Sono in ritardo di 30 minuti. | Proposta di posticipo della giornata. |

### Atto 4 — Senza chat (sul viaggio delle Dolomiti)

| # | Azione | Cosa deve succedere |
|---|---|---|
| 20 | Ho un imprevisto → Sciopero → treni, data di oggi | Proposta che sostituisce il treno con il mezzo alternativo più veloce, oppure segnala il treno a rischio con il link a Trainline. |
| 21 | Versioni → Confronta 1 e l'ultima | Elenco chiaro di cosa è cambiato e perché. |

---

## Criteri di accettazione

- **CA-1** Ogni prompt del copione dà il risultato atteso: in modo automatico con il client finto, e con il modello OpenAI vero nel collaudo.
- **CA-2** Da un clone pulito l'app si avvia con npm ci, npm run build e npm run dev.
- **CA-3** Ripristina i viaggi demo porta ogni viaggio demo allo stato iniziale senza toccare gli altri viaggi.

## Campi per il plugin

- **Sintesi** (`--summary`): Viaggi demo e destinazioni precaricate pronti al primo avvio e ripristinabili, copione della demo con i prompt da incollare e risultati attesi, prompt copiabili dalla modalità presentazione, avvio in 3 comandi.
- **Criteri** (`--acceptance`): CA-1…CA-3.
- **Fuori perimetro** (`--non-goal`): Prenotazioni, pagamenti, modifiche o cancellazioni presso fornitori.
- **Vincoli** (`--constraint`): Nessuna logica del motore duplicata nella web app: proposte, controlli e versioni vengono dal motore. Testi in italiano e in linguaggio semplice; nessun codice tecnico a vista per il viaggiatore. La demo funziona senza rete, tranne la costruzione di destinazioni nuove.
- **Percorsi** (`--write-path`): `apps/web`, `packages/engine/data`, `packages/sources`, `docs`, `evidence`, `README.md`.
