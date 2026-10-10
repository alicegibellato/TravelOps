# Prove di consegna: ST-CHAT-003B

## Cosa è stato chiesto

REQ-CHAT-003 (Chat e preferenze coerenti), parte web app. Dal collaudo di Alice con il modello vero (10/10/2026):

- **B1.** Nelle pagine del viaggio la chat era un copione scritto in anticipo, diverso dalla chat di Pianifica.
- **B4.** Sorprendimi chiedeva stili, cose da evitare e mese, ma salvava solo la destinazione: i passi 2, 4 e 5 li richiedevano.
- **B5.** Il percorso guidato restava al passo 1 anche quando la chat aveva già raccolto destinazione, date e viaggiatori.
- **B6.** Con l'assistente finto «Crea la mia bozza» restava su «Preparo la bozza…».

Record: requisito `REQ-CHAT-003` (`docs/requirements/REQ-CHAT-003-chat-e-preferenze-coerenti.md`), story `ST-CHAT-003B`, contratto `contract-ST-CHAT-003B-implementation`, profilo `AUT-PR-CHAT-003B`.

## Perimetro ed esclusioni

**Dentro:** `apps/web` (chat delle pagine del viaggio, percorso guidato, Sorprendimi, assistente finto, pagina Preferenze), testbook non modificato.

**Fuori:** agenti e regole del profilo condiviso (ST-CHAT-003A). `iniziaNuovoViaggio` in `src/preferenze/profilo.ts` resta com'è; le aggiunte di Sorprendimi si azzerano a un nuovo viaggio come gli altri campi non personali.

## Cosa cambia

- **Una sola chat (CA-3).** `src/chat/ChatDelViaggio.tsx`: la chat del giorno usa la sorgente del server (`/api/chat/conversazioni`) collegata al viaggio della pagina e riprende la sua ultima conversazione (`ultimaConversazioneDelViaggio` in `src/chat/server/servizio.ts`). Dopo un'azione degli agenti la pagina si rigenera. `Contenuti.tsx` non usa più il copione, che resta per i test e per la presentazione.
- **Il percorso segue la chat (CA-4).** `PercorsoPreferenze.tsx`: un indicatore dei 5 passi segna quelli compilati; quando la chat porta un profilo con scelte nuove il percorso si apre sul primo passo che manca e il passo «Dove» mostra la destinazione. Lo stesso profilo che torna dal salvataggio non sposta il passo. Funzioni pure in `src/preferenze/percorso.ts` (`passoCompilato`, `primoPassoMancante`, `stesseScelte`).
- **Sorprendimi senza doppioni (CA-5).** `Sorprendimi.tsx` passa a chi lo usa anche le scelte fatte (parametro aggiunto); `conSceltaSorprendimi` in `PassiPreferenze.tsx` le mette nel profilo solo come aggiunte: stili se scelti, cose da evitare sommate, mese solo se non ci sono già date.
- **«Crea la mia bozza» con l'assistente finto (CA-6).** `ChatConSorgente` avvisa a fine risposta (`onFine`), così lo scheletro della bozza sparisce anche senza azioni. L'assistente finto risponde al messaggio dei filtri con il modo per proseguire e non dice più di aver capito destinazione, mese o viaggiatori che non mette nei filtri (TB-CHAT-019).
- **Pagina Preferenze.** Riparte dal profilo salvato, come Pianifica: il flusso e2e `ca1-preferenze` era rosso anche su main.

## Verifica

| Criterio | Test | Esito |
|---|---|---|
| CA-3 la chat del viaggio va al server degli agenti, non al copione (TB-CHAT-013) | `apps/web/test/chat003b-chat-percorso.test.tsx`, e2e `chat003b-chat-percorso` | superato |
| CA-4 passi compilati segnati, apertura sul primo mancante | `apps/web/test/chat003b-chat-percorso.test.tsx` | superato |
| CA-5 stili, cose da evitare e mese nel profilo, passi 2, 4 e 5 già scelti (TB-SURP-005) | `apps/web/test/chat003b-chat-percorso.test.tsx`, `apps/web/test/pref001b-ca5-ca7.test.tsx` | superato |
| CA-6 «Crea la mia bozza» con `TRAVELOPS_ASSISTENTE=finto` arriva a una risposta (TB-PREF-005) | e2e `chat003b-chat-percorso`, test unit `onFine` | superato |
| TB-CHAT-019 l'assistente finto non dichiara ciò che non mette nei filtri | `apps/web/test/chat003b-chat-percorso.test.tsx` | superato |

- Suite unit della web app: 100 file, 697 test superati (`evidence/ST-CHAT-003B/unit-web.txt`).
- Suite e2e completa: 17 file, 48 test superati (`evidence/ST-CHAT-003B/e2e-completa.txt`).
- Modello vero, verifica breve (CA-3, lato server): conversazione collegata al viaggio `TRIP-DEMO-GARDA`, risposta del Consulente con i dati del primo giorno in 7,5 s (`evidence/ST-CHAT-003B/modello-reale.txt`). Nessuna chiave nelle prove.

## Limiti noti

- Con il modello vero, sui viaggi di riferimento della presentazione (per esempio `versione-1`) gli agenti non leggono l'itinerario e lo dicono; sui viaggi dell'utente e sui viaggi demo del prodotto rispondono con i dati del viaggio. Riguarda l'archivio degli agenti, non la web app.

## Collegamenti

- Requisito `REQ-CHAT-003`, story `ST-CHAT-003B`; la storia gemella ST-CHAT-003A copre agenti e profilo.
- Testbook: TB-CHAT-013, TB-CHAT-019, TB-SURP-005, TB-PREF-005.
