# Qualità (`TB-QUAL`) · gruppo D

`/qualita` («Qualità dei test», tabella «Esito per suite») legge il report di `TRAVELOPS_RAPPORTO_TEST` (predefinito `reports/test-report.json`); il log di una suite è su `/qualita/log/<suite>`.

### TB-QUAL-001 · Pagina dal menu con report presente

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì (e2e `obs001a-qualita`)
- **Precondizioni**: report generato da un giro di test.
- **Azioni**:
  1. Dal menu «Sezioni» apri «Qualità».
- **Atteso**: titolo «Qualità dei test», esito complessivo («Tutti i test sono superati» o «N test falliti»), tabella con «Suite», «Esito», «Totali», «Superati», «Falliti», «Saltati», «Durata», «Eseguita il», «Log».

### TB-QUAL-002 · Nessun report

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: la cartella `reports/` non esiste finché non gira il primo test.
- **Precondizioni**: `TRAVELOPS_RAPPORTO_TEST` puntata a un file inesistente in una cartella inesistente.
- **Azioni**:
  1. Apri `/qualita`.
- **Atteso**: «Nessun report dei test» con l'indicazione di come generarlo; nessun errore generico.

### TB-QUAL-003 · Report non leggibile

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: `TRAVELOPS_RAPPORTO_TEST` puntata a un file con JSON troncato.
- **Azioni**:
  1. Apri `/qualita`.
- **Atteso**: «Il report dei test non è leggibile»; la pagina resta navigabile.

### TB-QUAL-004 · Log di una suite

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: report con una suite che ha il log e una senza.
- **Azioni**:
  1. Premi il link del log della prima suite.
  2. Guarda la colonna «Log» della seconda.
- **Atteso**: il log si apre come testo leggibile, senza segreti; per la suite senza log si legge «Non disponibile».

### TB-QUAL-005 · `npm test` stabile sotto carico

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì (è la suite stessa)
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7` (timeout sotto carico su plan003 e demo001b).
- **Precondizioni**: macchina con un altro processo pesante attivo (es. `npm run build` in parallelo).
- **Azioni**:
  1. Esegui `npm test` tre volte di seguito.
- **Atteso**: tre esiti identici, nessun fallimento per timeout; i tempi delle suite lente sono riportati in `/qualita`.
