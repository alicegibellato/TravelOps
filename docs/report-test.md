# Report dei test

`npx tsx scripts/esegui-test.ts --tipo unit` e `npx tsx scripts/esegui-test.ts --tipo e2e` scrivono l'esito di ogni suite in un file JSON; la pagina **Qualità** dell'app (`/qualita`, voce «Qualità» del menu) lo legge e mostra totali, superati, falliti e saltati per suite, data, durata e il link al log. Nessun servizio esterno.

## Generare e vedere il report

1. `npm ci` e `npm run build` (una volta).
2. `npx tsx scripts/esegui-test.ts --tipo unit` esegue le suite unit (engine, agents, sources, web); `npx tsx scripts/esegui-test.ts --tipo e2e` esegue l'end-to-end alla larghezza desktop di 1280 px (vedi [prove-e2e.md](prove-e2e.md)). Si può lanciare una suite sola: `npx tsx scripts/esegui-test.ts web`.
3. `npm run dev`, poi apri <http://localhost:3000/qualita>. Dopo un nuovo giro di test basta ricaricare la pagina.

Senza il file (o se non è valido) la pagina lo dice e indica questi comandi.

## Dove sta e come si configura

| Cosa | Dove | Predefinito |
| --- | --- | --- |
| Percorso del report | variabile `TRAVELOPS_RAPPORTO_TEST` (assoluto, o relativo alla cartella da cui parte il processo) | `reports/test-report.json` nella radice; la cartella `reports/` è ignorata da Git |
| Fuso orario delle date mostrate | variabile `TRAVELOPS_FUSO_ORARIO` | `Europe/Rome` |
| Elenco delle suite (id, nome, tipo, workspace, script) | `scripts/suite-test.json` | engine, agents, sources, web, e2e |
| Log di ogni suite | `<cartella del report>/logs/<id>.log`, servito da `/qualita/log/<id>` | |

Gli script impostano il percorso assoluto per le suite che lanciano. La web app, avviata da `apps/web`, cerca il predefinito in `../../reports`: se la avvii in altro modo, imposta `TRAVELOPS_RAPPORTO_TEST`.

## Formato (versione 1)

```json
{
  "versione": 1,
  "generato": "2026-10-10T08:58:19.055Z",
  "durataMs": 822,
  "totali": { "totali": 139, "superati": 138, "falliti": 0, "saltati": 1 },
  "suite": [
    {
      "id": "sources", "nome": "Unit sources", "tipo": "unit", "log": "logs/sources.log",
      "totali": 139, "superati": 138, "falliti": 0, "saltati": 1,
      "durataMs": 822, "avviata": "2026-10-10T08:58:18.233Z", "esito": "superata"
    }
  ]
}
```

`tipo` è `unit` o `e2e`; `esito` è `superata`, `fallita` o `errore` (suite fermata prima di un esito, con `errore` che spiega perché). Ogni esecuzione sostituisce solo la propria suite; totali e durata si ricalcolano. Il reporter (`scripts/reporter-test.ts`) è un normale reporter di Vitest: attivo solo se lo script di esecuzione gli passa la suite.
