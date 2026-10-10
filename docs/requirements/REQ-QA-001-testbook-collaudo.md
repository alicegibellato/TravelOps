# REQ-QA-001 — Testbook di collaudo e giro di bugfix

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-10 |
| Tipo | Nuovo (processo di collaudo) |
| Dipende da | REQ-E2E-001-R2 (infrastruttura e2e desktop), REQ-OBS-001 (pagina Qualità) |
| Fonti (`--source`) | questo file, `docs/prove-e2e.md`, `docs/report-test.md`, `docs/servizi-esterni.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storie | ST-QA-001A (scrittura), ST-QA-001B/C/D (esecuzione per gruppi di aree), ST-QA-001E (automazione) |

## Funzionalità

Un **testbook** versionato in `docs/testbook/` descrive i casi d'uso da provare sull'app web, alla larghezza desktop di 1280 px (decisione di team, REQ-E2E-001-R2). Ogni caso ha:

- ID `TB-<AREA>-NNN` (per esempio `TB-PREF-001`);
- precondizioni e dati (viaggio demo, orologio simulato, stato locale vuoto o seminato);
- azioni numerate;
- risultato atteso osservabile dall'utente (testi, pulsanti, stato salvato);
- priorità (P1 bloccante, P2 importante, P3 rifinitura);
- modalità: `finto` (adattatori finti e assistente finto, predefinito) o `reale` (servizi `TRAVELOPS_*` reali e/o modello vero con `OPENAI_API_KEY`, solo sui computer che la hanno);
- automatizzabile: sì / no, con il motivo se no.

### Aree e copertura minima

Circa 60 casi o più. Ogni area ha almeno un percorso felice e almeno un caso di errore o limite; il testbook nel suo insieme copre anche accessibilità (tastiera, focus, etichette, contrasti), persistenza dopo il ricaricamento della pagina e coerenza tra pagine.

| Area | Prefisso | Pagine e flussi |
|---|---|---|
| Preferenze | `TB-PREF` | `/preferenze` |
| Pianifica e bozza | `TB-PLAN` | `/pianifica`, `/bozza`, `/destinazione`, `/itinerario` |
| Sorprendimi | `TB-SURP` | proposta a sorpresa |
| Chat | `TB-CHAT` | chat dell'assistente (finto e modello vero) |
| I miei viaggi | `TB-TRIP` | `/viaggi` |
| Oggi | `TB-TODAY` | `/oggi`, orologio simulato |
| Versioni | `TB-VER` | `/versioni` |
| Imprevisti | `TB-IMPR` | `/imprevisti`, ripianificazione |
| Monitoraggio | `TB-MON` | monitoraggio dei viaggi confermati |
| Qualità | `TB-QUAL` | `/qualita`, log delle suite |
| Demo | `TB-DEMO` | `/demo`, modalità presentazione |
| Accessibilità | `TB-A11Y` | trasversale |
| Coerenza tra pagine e persistenza | `TB-XPAGE` | trasversale |
| Servizi reali | `TB-REAL` | `TRAVELOPS_*` reali, degrado «non disponibile» |

### Esecuzione

- Ogni esecuzione produce `evidence/<ST>/testbook-<AAAA-MM-GG>.md`: versione del testbook e commit dell'app provati, modalità, e per ogni caso l'esito `superato` / `fallito` / `fallito-minore` / `bloccato`, con una prova breve (passo e messaggio, poche righe di log). Gli screenshot restano fuori da `evidence` salvo copia esplicita.
- I casi automatizzabili diventano e2e in `apps/web/e2e` riusando l'infrastruttura esistente (1280 px, `npm run e2e`, `npm run e2e:mirati`, `e2e.config.json`); gli altri li esegue un agente con browser headless.

### Triage e giro di bugfix

- Ogni caso `fallito` o `fallito-minore` ha nel report una nota sulla causa e una decisione: `correggibile` / `non correggibile` / `per scelta`.
- Ogni caso correggibile apre una story di correzione: `story create --id ST-QA-FIX-<NNN> --title "[P<n>] <sintomo> (TB-<AREA>-NNN)" --fixes <story che ha consegnato la funzione> --status ready --acceptance "TB-<AREA>-NNN passa: <risultato atteso>"`. `--fixes` punta alla story della funzione (non a quella del testbook) così la correzione eredita il requisito e i percorsi dell'app. La priorità sta nel titolo e nel report (il comando non ha un campo priorità). La story resta libera (nessun `story reserve` né `story claim` alla creazione), quindi qualunque computer la può prendere. `incident record` si usa solo se il difetto è su una versione rilasciata con un manifest di rilascio.
- Una story di correzione si chiude solo se il suo caso TB passa di nuovo (ri-test registrato nella sua evidenza).
- Prima di ogni rilascio dell'app il testbook si riesegue per intero (regressione completa).

## Criteri di accettazione

Vedi `--acceptance` CA-1…CA-8 del record `REQ-QA-001`.

## Campi per il plugin

- **Fuori perimetro**: correzioni del codice dell'app dentro le story del testbook (vanno nelle story di correzione); larghezze mobile/tablet; test di carico; servizi a pagamento.
- **Vincoli**: modalità `reale` solo sui computer con la chiave; mai chiavi o segreti nel testbook o nei report; nessuna story di correzione assegnata a un computer alla creazione.
- **Percorsi** (`--write-path`): `docs/testbook`, `apps/web/e2e`, `evidence`, `docs`.
