# ST-QA-FIX-BOZZA-PARIGI — Bozza per una città grande e menu più semplice

## Problema (segnalato da Alice, 11/10/2026)

«Crea la mia bozza» per Parigi apriva una pagina «I dati del viaggio non sono validi». Causa: preparare Parigi chiede a OpenStreetMap (Overpass) 80-100 secondi (misurati: 80, 94 e 96 s), ma il cliente HTTP si arrendeva dopo 60 secondi; la bozza non nasceva e la pagina mostrava un errore sui dati che non c'entrava. Alice ha anche chiesto di togliere dal menu «Destinazione» e «Preferenze», che non usa (si scelgono in Pianifica).

## Correzione

- `packages/sources/src/cliente-http.ts`: la richiesta a Overpass ha fino a 150 secondi (`TEMPO_OVERPASS_MS`); le altre fonti restano a 60.
- `packages/sources/src/servizi/configurazione.ts`: il tempo massimo per preparare una destinazione nuova passa da 90 a 180 secondi (`TRAVELOPS_DESTINAZIONE_TIMEOUT_MS`).
- `apps/web/app/bozza/[viaggio]/page.tsx` e `src/dati/viaggi-salvati.ts`: una bozza la cui destinazione non si è potuta preparare mostra «La bozza non è stata creata» con «Riprova da Pianifica»; «dati non validi» resta solo per una revisione salvata che non supera i controlli.
- `apps/web/src/ui/Navigazione.tsx`: tolte dal menu le voci «Destinazione» e «Preferenze» (le pagine restano raggiungibili dai loro indirizzi e dai flussi di Pianifica).

## Verifica

| Criterio | Test | Esito |
|---|---|---|
| Overpass fino a 150 s, preparazione fino a 180 s | `apps/web/test/qafix-bozza-parigi.test.tsx`, `packages/sources/test/tempo-massimo.test.ts` | superato |
| Bozza non preparata: «La bozza non è stata creata» e «Riprova da Pianifica» | `apps/web/test/qafix-bozza-parigi.test.tsx` | superato |
| Menu senza «Destinazione» e «Preferenze» | `apps/web/test/ux001-guscio-home.test.tsx`, `apps/web/test/obs001b-fix-xpage005-menu-corrente.test.tsx` | superato |
