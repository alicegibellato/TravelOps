# Testbook di collaudo TravelOps

| Campo | Valore |
|---|---|
| Versione | 1.0 |
| Requisito | REQ-QA-001 (CA-1, CA-2) |
| Larghezza | solo desktop, 1280 px |
| Modalità predefinita | `finto` (adattatori finti, assistente finto con `TRAVELOPS_ASSISTENTE=finto`) |

## Formato di un caso

Ogni caso ha:

- **ID** `TB-<AREA>-NNN`;
- **Priorità**: P1 bloccante, P2 importante, P3 rifinitura;
- **Modalità**: `finto` oppure `reale` (servizi `TRAVELOPS_*` reali e/o modello vero con `OPENAI_API_KEY`, solo sui computer che hanno la chiave);
- **Automatizzabile**: sì (con l'e2e esistente o da scrivere in `apps/web/e2e`) / no (con il motivo);
- **Precondizioni e dati**: stato locale, viaggio, orologio simulato, variabili d'ambiente;
- **Azioni** numerate;
- **Atteso**: quello che l'utente vede (testi, pulsanti, stato salvato);
- **Fonte**, quando il caso nasce da un collaudo o da una segnalazione.

Le chiavi e i segreti non vanno mai scritti nei casi né nei report.

## Stato di partenza comune

- `npm run dev` (oppure il server avviato dagli e2e) a 1280 × 800.
- **Stato pulito**: `/demo` → «Ripristina i viaggi demo»; orologio simulato predefinito `2026-06-12 08:00`.
- **Stato vuoto**: cartella dati vuota (`TRAVELOPS_DATI` puntata su una cartella nuova).
- Viaggi demo: «Quattro giorni sul Lago di Garda» (confermato), «Cinque giorni sulle Dolomiti» (confermato), «Tre giorni a Roma con i bambini» (bozza).

## Aree, gruppi ed esecuzione

| Gruppo | Chi esegue | Area | File | Casi |
|---|---|---|---|---|
| B | Alice (PC1) | Preferenze `TB-PREF` | [preferenze.md](preferenze.md) | 8 |
| B | Alice (PC1) | Pianifica e bozza `TB-PLAN` | [pianifica-bozza.md](pianifica-bozza.md) | 19 |
| B | Alice (PC1) | Sorprendimi `TB-SURP` | [sorprendimi.md](sorprendimi.md) | 7 |
| B | Alice (PC1) | Chat `TB-CHAT` | [chat.md](chat.md) | 20 |
| C | Valerio (PC2) | I miei viaggi `TB-TRIP` | [viaggi.md](viaggi.md) | 6 |
| C | Valerio (PC2) | Oggi `TB-TODAY` | [oggi.md](oggi.md) | 8 |
| C | Valerio (PC2) | Versioni `TB-VER` | [versioni.md](versioni.md) | 5 |
| C | Valerio (PC2) | Imprevisti `TB-IMPR` | [imprevisti.md](imprevisti.md) | 13 |
| C | Valerio (PC2) | Monitoraggio `TB-MON` | [monitoraggio.md](monitoraggio.md) | 3 |
| D | Antonio (PC3) | Qualità `TB-QUAL` | [qualita.md](qualita.md) | 5 |
| D | Antonio (PC3) | Demo `TB-DEMO` | [demo.md](demo.md) | 5 |
| D | Antonio (PC3) | Accessibilità `TB-A11Y` | [accessibilita.md](accessibilita.md) | 5 |
| D | Antonio (PC3) | Coerenza e persistenza `TB-XPAGE` | [coerenza.md](coerenza.md) | 5 |
| D | Antonio (PC3) | Servizi reali `TB-REAL` | [servizi-reali.md](servizi-reali.md) | 6 |
| | | **Totale** | | **115** |

Gruppo B = 54 casi, gruppo C = 35 casi, gruppo D = 26 casi.

## Esecuzione e report

- Ogni esecuzione scrive `evidence/<ST>/testbook-<AAAA-MM-GG>.md` con versione del testbook, commit dell'app, modalità e, per ogni caso, esito `superato` / `fallito` / `fallito-minore` / `bloccato` con una prova breve (passo, messaggio, poche righe di log).
- Gli screenshot restano fuori da `evidence` salvo copia esplicita.
- Ogni caso `fallito` o `fallito-minore` riceve una causa e una decisione `correggibile` / `non correggibile` / `per scelta`; i correggibili aprono una story `ST-QA-FIX-NNN` libera, con il caso TB come criterio di accettazione.
- I casi automatizzabili diventano e2e in `apps/web/e2e` (1280 px, `npm run e2e`, `npm run e2e:mirati`, `e2e.config.json`).
- Prima di ogni rilascio dell'app il testbook si riesegue per intero.

## Fonti dei casi

- Collaudo di Alice (PC1) del 2026-10-10, commit `acb8da7`, difetti dei gruppi B, C e D.
- Casi proposti da Valerio (PC2) per il gruppo C.
- Revisione di Alice (PC1) del gruppo B: TB-CHAT-008…014, TB-SURP-005…006.
- Rapporto finale del collaudo di Alice (PC1), parte 2: TB-CHAT-015…020, TB-PLAN-019, TB-SURP-007.
- Lettura di `apps/web`, `docs/requirements` e degli e2e esistenti.
