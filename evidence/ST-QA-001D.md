# Prove di consegna: ST-QA-001D

Esecuzione del testbook, gruppo D: qualità, Demo, accessibilità, coerenza tra pagine, servizi reali.

## Cosa è stato chiesto

Eseguire i casi del gruppo D del testbook concordato (`docs/testbook/`, ST-QA-001A), registrare l'esito di ogni caso con una prova breve (REQ-QA-001, CA-3), fare il triage dei casi falliti e aprire le story di fix con la story che ha consegnato la funzione.

## Perimetro ed esclusioni

- Dentro: `evidence/ST-QA-001D/` (report, screenshot scelti, log) e questo file; record di test, triage e story di fix in `.sdlc`.
- Fuori: correzioni del codice dell'app (story di fix), modifiche al testbook (solo annotate), automazione e2e (ST-QA-001E).

## Cosa è cambiato

| Campo | Valore |
|---|---|
| Requisito | REQ-QA-001 (CA-3) |
| Branch | `feature/ST-QA-001D` |
| Report | [`evidence/ST-QA-001D/testbook-2026-10-10.md`](ST-QA-001D/testbook-2026-10-10.md) |
| Screenshot | 8 file in `evidence/ST-QA-001D/shots/`, copiati esplicitamente |
| Log | `evidence/ST-QA-001D/qual-005-npm-test.log` |
| Casi | 35: 26 del testbook più 9 nuovi (`TB-NEW-D1`…`D9`) |

## Perché

Il gruppo D copre le aree che gli e2e non vedono: servizi reali, coerenza tra pagine dopo conferme e proposte accettate, accessibilità da tastiera e qualità dei test. Ogni difetto ha ora un caso TB che lo riproduce e una story di fix o un collegamento a una story esistente.

## Verifica

### Criteri di accettazione

| Criterio | Esito | Prova |
|---|---|---|
| Ogni caso del gruppo D ha un esito superato / fallito / fallito-minore / bloccato | superato | 35 `test record` con `--case`: 17 superati, 4 falliti, 13 falliti-minori, 1 bloccato |
| Ogni caso fallito ha triage e decisione registrata | superato | `test triage --story ST-QA-001D`: nessun caso fallito senza decisione |
| Report con versione del testbook, commit e modalità (CA-3) | superato | intestazione del report: testbook `9233f32`, app `fa2f5b2`, riesecuzione su `762e48e`, modalità finto e reale |
| Scansione segreti pulita | vedi gate | `secret scan` del gate strict |

### Story di fix

| Priorità | Story | Difetto | Caso |
|---|---|---|---|
| P1 | ST-UX-003A-FIX-TB-XPAGE-003 | La pagina del giorno di un viaggio di riferimento ignora la proposta accettata | TB-XPAGE-003 |
| P1 | ST-CAT-002-FIX-TB-NEW-D4 | Preparazione di una destinazione con servizi reali senza scadenza né messaggio | TB-REAL-002, TB-NEW-D4 |
| P2 | ST-UX-003B-FIX-TB-A11Y-003 | Il primo Esc chiude anche il menu oltre al sottomenu | TB-A11Y-003 |
| P2 | ST-UX-003A-FIX-TB-XPAGE-004 | Giorno o versione inesistenti senza «Pagina non trovata», HTTP 200 | TB-XPAGE-004 |
| P2 | ST-OBS-001B-FIX-TB-XPAGE-005 | Due voci del menu con `aria-current` su «Oggi» | TB-XPAGE-005 |
| P2 | ST-INTEG-001-FIX-TB-REAL-004 | Meteo non raggiungibile senza avviso nel log | TB-REAL-004 |
| P2 | ST-INTEG-001-FIX-TB-REAL-005 | Volo cancellato: niente alternative, link di prenotazione segnaposto | TB-REAL-005 |
| P2 | ST-DEMO-001B-FIX-TB-NEW-D6 | Home: 4 card identiche «Weekend sul Garda» | TB-NEW-D6 |
| P2 | ST-CAT-002-FIX-TB-NEW-D9 | Risultati della ricerca con nomi accessibili identici | TB-NEW-D9 |
| P3 | ST-WEB-001-FIX-TB-NEW-D1 | `/favicon.ico` risponde 404 | TB-NEW-D1 |
| P3 | ST-OBS-001A-FIX-TB-NEW-D5 | Percorsi assoluti con il nome utente in `/qualita` e nei log | TB-NEW-D5 |
| P3 | ST-OBS-001A-FIX-TB-NEW-D7 | Nome della suite E2E cita 375 px | TB-NEW-D7 |

Collegati a story esistenti, senza duplicati:

- TB-REAL-003 e TB-REAL-006: già risolti da ST-QA-FIX-002 (PR #68). Le story create per errore (ST-INTEG-001-FIX-TB-REAL-003, ST-UX-003A-FIX-TB-REAL-006) sono duplicati da chiudere con `story abandon --replaced-by ST-QA-FIX-002`. In `.env.example` restano da documentare le variabili `MONITOR_*`.
- TB-XPAGE-001 e TB-NEW-D8: stessa famiglia di ST-QA-FIX-004.
- TB-NEW-D2: stesso difetto di ST-QA-FIX-017.

### Controlli eseguiti

- `npm test` in `apps/web` su `main` @ `762e48e`, a riposo, tramite `agentic-sdlc run --timeout 15m`: 99 file, 685 test superati (TB-QUAL-005).
- Casi manuali in Chrome headless 1280×800, modalità finta e reale (vedi report).

### Aggiornamenti del testbook da fare

TB-PREF-001 passo 3 (scelta Da solo/Coppia/Amici/Famiglia), TB-XPAGE-005 (voce «Agenti»), TB-QUAL-005 (`scripts/esegui-test.ts` invece di `npm test` per il report di `/qualita`). Dettagli nel report.

## Collegamenti

- Testbook: `docs/testbook/` (ST-QA-001A)
- Report: [`evidence/ST-QA-001D/testbook-2026-10-10.md`](ST-QA-001D/testbook-2026-10-10.md)
