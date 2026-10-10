# Prove di consegna: ST-MONITOR-001

## Cosa è stato chiesto

REQ-MONITOR-001 "Monitoraggio dei viaggi confermati". Story `ST-MONITOR-001`, con questi criteri:

1. un controllo periodico (intervallo configurabile) e un controllo all'apertura di Oggi verificano meteo ed eventi dei viaggi confermati (CA-1);
2. se cambia una condizione che impatta un'attività, nasce un imprevisto con una proposta di ripianificazione minima, riusando `calcolaImpatto` e la proposta esistente (CA-2);
3. l'utente vede una notifica in UI con l'imprevisto e la proposta (CA-3);
4. lo stesso evento non produce imprevisti duplicati (CA-4);
5. test con orologio e adattatori finti per controllo periodico, apertura di Oggi, impatto, nessun impatto e idempotenza (CA-5).

## Perimetro ed esclusioni

- **Comprende:** modulo `monitoring` del motore (controllo, configurazione, pianificatore, sorgente finta, registro, testi); in `apps/web` il servizio che lo collega allo stato locale, il punto di collegamento alle sorgenti, l'avvio del controllo periodico, il banner nella pagina Oggi; test unitari, di integrazione e e2e.
- **Esclude:** notifiche push o email e adattatori dei servizi (REQ-INTEG-001); nessuna regola di ripianificazione nuova; nessuna migrazione e nessuna dipendenza nuova.
- **Lasciato fuori di proposito:** il badge in "I miei viaggi" (il requisito dice "Oggi e/o"); nessuna modifica a `.sdlc`.
- **Deviazioni:** nessuna.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Tipi: `SorgenteCondizioni` (interfaccia minima di meteo ed eventi), orologio, registro, esito | `packages/engine/src/monitoring/tipi.ts` |
| Controllo: condizioni → imprevisto → `calcolaImpatto` → `proponiRipianificazione`, idempotenza | `packages/engine/src/monitoring/controllo.ts`, `registro.ts` |
| Configurazione tipizzata e validata | `packages/engine/src/monitoring/config.ts` |
| Pianificatore a timer singolo con spegnimento | `packages/engine/src/monitoring/pianificatore.ts` |
| Sorgente finta deterministica e lettura dello scenario da JSON | `packages/engine/src/monitoring/finto.ts` |
| Frase della notifica | `packages/engine/src/monitoring/testi.ts` |
| Servizio sullo stato locale (viaggi confermati, proposte, notifiche, un controllo alla volta) | `apps/web/src/monitoraggio/servizio.ts`, `stato.ts` |
| **Punto di collegamento unico** alle sorgenti | `apps/web/src/monitoraggio/collegamento.ts` |
| Adattatore verso le porte di ST-INTEG-001 | `apps/web/src/monitoraggio/da-servizi.ts` |
| Avvio e spegnimento del controllo periodico | `apps/web/src/monitoraggio/avvio.ts`, `apps/web/instrumentation.ts` |
| Banner con link alla proposta | `apps/web/src/componenti/NotificheMonitoraggio.tsx`, `ContenutiOggi.tsx`, `apps/web/app/viaggi/[viaggio]/oggi/page.tsx` |
| Test | `packages/engine/test/monitoring/*`, `apps/web/test/monitor001-integrazione.test.ts`, `apps/web/e2e/ca7-monitoraggio.e2e.ts` |
| e2e: variabili d'ambiente per flusso | `apps/web/e2e/supporto.ts`, `flussi.ts` |
| Prove di consegna | `evidence/ST-MONITOR-001.md` |

## Perché

### Dipendenze

- REQ-INTEG-001 / ST-INTEG-001: porte Meteo ed Eventi. Il monitoraggio dipende solo da `SorgenteCondizioni`; le porte entrano in un solo punto, `collegamento.ts`, tramite `da-servizi.ts`.

### Scelte

- **Interfaccia minima nel motore, adattatori fuori.** Il motore non conosce HTTP né `@travelops/sources`; l'unico file che sceglie la sorgente è `collegamento.ts`. Nessun client HTTP duplicato.
- **Chiave di idempotenza** `viaggio|attività|condizione|data`, con condizione `meteo:<condizione>` o `chiusura:<id evento>`. Una condizione cambiata (pioggia → temporale) ha chiavi diverse ed è un imprevisto nuovo. Le chiavi si ricontrollano dentro la transazione di salvataggio e i controlli si accodano: scheduler e apertura di Oggi non si sovrappongono. Dopo un rifiuto la stessa condizione non rinasce.
- **Impatto nullo = niente.** Fasce serene o nuvolose, pioggia di sera, attività al chiuso, attività già finita oggi: nessun imprevisto e nessuna chiave registrata. Sorgente non disponibile (o che solleva): condizione ignorata e messaggio nell'esito.
- **Eventi.** Solo un evento che `chiudeLuogo` diventa `CHIUSURA_LUOGO`; gli altri sono informativi.
- **Orologio:** quello simulato dello stato (lo stesso di Oggi). Orizzonte: `MONITOR_ORIZZONTE_GIORNI` giorni da oggi.
- **Nessun processo non controllato.** Pianificatore con `setTimeout` a catena (mai `setInterval`), un solo timer, `unref` (non tiene vivo il processo), nessuna sovrapposizione dei giri, `ferma()` annulla e attende il giro in corso. Singleton su `globalThis` (avviarlo due volte restituisce lo stesso), spento su SIGINT/SIGTERM senza chiamare `process.exit`. `MONITOR_ATTIVO=false` non lo avvia: resta il controllo su richiesta all'apertura di Oggi. Sorgente lenta: Oggi attende al massimo `MONITOR_ATTESA_APERTURA_MS` (4000) e mostra ciò che già c'è.
- **Dove vanno le proposte.** Si salvano nello stato come quelle di Demo e "Ho un imprevisto", quindi `Vedi la proposta` apre `/demo/proposte/<n>` e si accetta/rifiuta con gli stessi pulsanti. La proposta si salva solo se è ancora sulla versione corrente. Il controllo periodico scrive le proposte di ogni viaggio confermato senza cambiare il viaggio di partenza; aprendo Oggi di un viaggio con notifiche aperte, quel viaggio diventa il viaggio di partenza (con storico e proposte suoi), perché la pagina della proposta lavora su quello.
- **Viaggi controllati:** i confermati/in corso che la web app sa caricare (i quattro di riferimento). I viaggi demo da istantanea sono saltati con un motivo (limite noto, come per "Sono in ritardo").

### Configurazione

| Variabile | Predefinito | Significato |
| --- | --- | --- |
| `MONITOR_ATTIVO` | `true` | `false` spegne il controllo periodico |
| `MONITOR_INTERVALLO_S` | `900` | secondi tra due controlli (intero ≥ 1) |
| `MONITOR_ORIZZONTE_GIORNI` | `7` | giorni da oggi da guardare (1–60) |
| `MONITOR_ATTESA_APERTURA_MS` | `4000` | attesa massima del controllo all'apertura di Oggi |
| `MONITOR_FINTO` | vuoto | JSON di uno scenario finto (meteo/eventi) per test, e2e e sviluppo; se vuoto si usano le porte dei servizi (`TRAVELOPS_METEO`, `TRAVELOPS_EVENTI`) |

Valori non validi: predefinito e avviso nel log.

## Collegamento ai servizi (ST-INTEG-001)

`da-servizi.ts` traduce `ServizioMeteo.previsione` e `ServizioEventi.cerca` in `SorgenteCondizioni`; `collegamento.ts` lo usa (`sorgenteDaAmbiente(env)`) quando `MONITOR_FINTO` è vuoto. Eventi: l'`Evento` di INTEG ha il luogo come testo e nessun effetto sull'accessibilità, quindi l'adattatore non genera chiusure finché un fornitore reale non indica l'effetto. Gli e2e impostano `MONITOR_FINTO={}`, `MONITOR_ATTIVO=false` e i servizi finti (`TRAVELOPS_*=finto`).

## Verifica

Comandi nella copia di lavoro: `npm ci --prefer-offline`, `npm run build`, `npm test`, `npm run e2e`. Log in `.sdlc/tests/ST-MONITOR-001-*.log`.

- `npm run build`: riuscito.
- Motore: 39 file e 740 test superati (nuovi: 19 in `test/monitoring`). Fonti (`@travelops/sources`): 15 file e 138 test superati, 1 saltato.
- Web: 86 file e 565 test superati (nuovi: 11 in `monitor001-integrazione`).
- e2e: 7 file e 21 test superati; il flusso 7 gira a 375 e a 1280 px.

| Criterio | Prova |
| --- | --- |
| CA-1 periodico con intervallo configurabile | `periodico.test` (timer e orologio finti: due scatti, secondo con la pioggia → 1 imprevisto, terzo 0; `ferma()` senza timer residui; errore non ferma i giri), `monitor001-integrazione` (scheduler con `MONITOR_INTERVALLO_S=5` e timer finti: nessun controllo a 4,9 s, uno a 5 s, `getTimerCount()=0` dopo `ferma()`; singleton; `MONITOR_ATTIVO=false`), configurazione in `periodico.test` |
| CA-1 apertura di Oggi | `monitor001-integrazione` (`controlloAllApertura`, anche su un viaggio diverso da quello di partenza), e2e flusso 7 |
| CA-2 imprevisto e proposta minima | `controllo.test` (1 imprevisto `METEO_AVVERSO`, proposta di livello `minimo`, impatto di `calcolaImpatto`, modifiche non vuote; chiusura da evento), `monitor001-integrazione` (proposta salvata nello stato) |
| CA-3 notifica in UI | e2e flusso 7 (a 375 e 1280 px: banner "Nuovo imprevisto: pioggia prevista sabato alle 09:00 per «Trekking sul Sentiero del Ponale»", `Vedi la proposta` apre la proposta con Accetta/Rifiuta; dopo il rifiuto la notifica sparisce) |
| CA-4 idempotenza | `controllo.test` (ripetizione, condizione cambiata, due viaggi), `monitor001-integrazione` (ripetizione, controlli simultanei, dopo il rifiuto, e2e: ricaricando Oggi resta una sola notifica) |
| CA-5 nessun impatto e sorgenti | `controllo.test` (fascia serale, nuvoloso, orizzonte, attività finita, servizio non disponibile o che solleva), `monitor001-integrazione` (stato invariato) |

## Collegamenti

- Requisito: REQ-MONITOR-001
- Story: ST-MONITOR-001
- Dipendenze: ST-INTEG-001 (porte Meteo ed Eventi)
