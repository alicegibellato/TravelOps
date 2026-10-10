# Prove di consegna: ST-CAT-002-FIX-TB-NEW-D4

## Cosa è stato chiesto

**[P1] Preparazione infinita di una destinazione con servizi reali, nessuna scadenza né messaggio** (testbook `evidence/ST-QA-001D/testbook-2026-10-10.md`, casi TB-NEW-D4 e TB-REAL-002): «Trento» cercato con i servizi reali restava su «Sto preparando Trento…» per oltre 120 secondi, senza esito né messaggio.

Record: story `ST-CAT-002-FIX-TB-NEW-D4`, correzione di `ST-CAT-002` (requisito `REQ-CAT-002`). ST-QA-FIX-002 aveva già aggiunto il ripiego sulle destinazioni pronte e l'errore dello strumento della chat quando la costruzione fallisce: qui si aggiunge solo ciò che mancava, la scadenza complessiva.

## Riproduzione su `main`

Script `riproduci-trento.mts` (sorgenti di origin/main `5aa2ba2`, servizi reali, 10/10/2026): Nominatim trova Trento in 0,6 s; Overpass ha rifiutato subito su tutti e tre i server, esito `non_disponibile` dopo 13,6 s. Il blocco di oltre 120 secondi dipende dal carico di Overpass e non si è ripetuto in quel momento, ma nel codice restava la causa: il cliente HTTP ha 60 s per richiesta, la costruzione prova i tre server Overpass in sequenza e poi Wikipedia, Commons e OSRM a blocchi, e nessuno limita il tempo d'insieme. Il test `packages/sources/test/tempo-massimo.test.ts` riproduce il difetto con una fonte che non risponde: senza limite la preparazione resta in corso, con il limite finisce con esito e messaggio.

## Perimetro ed esclusioni

**Dentro:**

- `packages/sources/src/tempo-massimo.ts` (nuovo), `servizi/configurazione.ts`, `servizi/registro.ts`, `index.ts`;
- `apps/web/src/destinazioni/sorgente.ts`, `apps/web/.env.example`;
- test in `packages/sources/test` e `apps/web/test`.

**Fuori:**

- il ripiego sulle destinazioni pronte e l'errore dello strumento `prepara_destinazione` (ST-QA-FIX-002, invariati);
- i tempi delle singole chiamate (`TRAVELOPS_SERVIZI_TIMEOUT_MS`) e i `timeout` delle query Overpass;
- il componente `SceltaDestinazione`, che già mostra il messaggio dell'esito sotto «Non riesco a prepararla».

## Cosa è cambiato

- **Scadenza complessiva.** `conTempoMassimo(sorgente, { tempoMassimoMs })` avvolge `costruisciIstantanea`: un `AbortSignal.timeout` combinato con l'eventuale segnale del chiamante interrompe le richieste in corso; allo scadere l'esito è `non_disponibile` con il messaggio «Preparare Trento sta richiedendo più di N secondi: i servizi delle mappe sono lenti in questo momento. Riprova tra poco oppure scegli una delle destinazioni già pronte.» L'esito arriva anche se la sorgente sotto ignora il segnale; un annullamento chiesto dal chiamante resta un'eccezione, come prima.
- **Configurazione.** `TRAVELOPS_DESTINAZIONE_TIMEOUT_MS` (predefinito 90000, intero ≥ 1; un valore non valido dà il predefinito e un avviso, come le altre variabili) → `timeoutDestinazioneMs`. Documentata in `.env.example` e nella tabella di `configurazione.ts`.
- **Composizione.** `creaSorgenteDestinazioniReale({ tempoMassimoMs })` applica la scadenza; la web app la passa dalla configurazione. Con il ripiego di ST-QA-FIX-002, allo scadere una destinazione con lo stesso nome tra le pronte (Lago di Garda) usa la pronta; una nuova (Trento) dà il messaggio. Nella chat `prepara_destinazione` riceve lo stesso esito `non_disponibile` e lo trasforma, come già faceva, in un errore dello strumento con quel messaggio.

## Verifica

| Criterio | Test | Esito |
|---|---|---|
| Riproduzione del difetto: senza limite la preparazione resta in corso; con il limite termina con `non_disponibile` e messaggio chiaro, richieste annullate | `packages/sources/test/tempo-massimo.test.ts` | superato |
| Esito allo scadere anche se la fonte ignora il segnale; preparazione in tempo invariata; annullamento del chiamante resta eccezione | idem | superato |
| Limite da `TRAVELOPS_DESTINAZIONE_TIMEOUT_MS`, predefinito sotto i due minuti, valore non valido → predefinito e avviso | idem, `packages/sources/test/servizi/servizi.test.ts` | superato |
| Web app: Trento con servizi reali lenti → messaggio chiaro entro il limite (TB-NEW-D4); Lago di Garda → destinazione pronta | `apps/web/test/newd4-tempo-massimo.test.ts` | superato |
| Ripiego di ST-QA-FIX-002 e scelta della sorgente invariati | `apps/web/test/qafix002-destinazioni-reali.test.ts`, `integ001-meteo.test.tsx`, `cat002c-sorgente-locale.test.ts`, `cat002c-avanzamento.test.tsx` | superato |
| Build dei pacchetti e `tsc --noEmit` di sources e web | `log/build.log`, `log/tsc-sources.log`, `log/tsc-web.log` | superato |

Comandi, dalla radice del repository: `npm run build --workspace @travelops/engine --workspace @travelops/sources --workspace @travelops/agents`; `npm test --workspace @travelops/sources`; `npm test --workspace @travelops/web -- test/newd4-tempo-massimo.test.ts test/qafix002-destinazioni-reali.test.ts test/integ001-meteo.test.tsx test/cat002c-sorgente-locale.test.ts test/cat002c-avanzamento.test.tsx`. Nessuna chiamata di rete nei test automatici (CA-7).

## Collegamenti

- Testbook ST-QA-001D: TB-NEW-D4, TB-REAL-002.
- ST-QA-FIX-002 (ripiego sulle pronte, errore dello strumento).
