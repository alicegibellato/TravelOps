# Prove di consegna: ST-CHAT-001C

## Cosa è stato chiesto

REQ-CHAT-001 (Chat), parte "collegamento" della scomposizione in ST-CHAT-001A (server), ST-CHAT-001B (interfaccia) e
ST-CHAT-001C. La chat della web app parla con gli agenti di TravelOps (ST-ORCH-001C), cambia il viaggio solo con gli
strumenti del motore e sta sullo stesso schermo del percorso guidato delle preferenze (ST-PREF-001B).

Criteri di ST-CHAT-001C:

- dal prompt 1 del copione, in linguaggio naturale, si arriva a una bozza senza usare il percorso guidato (CA-1);
- ogni azione dalla chat si riflette subito nell'itinerario a lato, con evidenziazione delle parti cambiate;
- filtri e chat stanno sullo stesso schermo e compilano lo stesso profilo (CA-6, REQ-PREF-001 CA-6).

Record: requisito `REQ-CHAT-001`, story `ST-CHAT-001C`, contratto `contract-ST-CHAT-001C-implementation`, profilo di
consegna `AUT-PR-CHAT-001C`.

## Perimetro ed esclusioni

Dentro: la pagina **Pianifica** (`/pianifica`) con chat, percorso guidato e bozza dal vivo; l'assistente della chat con
gli agenti; il viaggio della conversazione nella base dati; le decisioni sulle proposte dei viaggi nati in chat; il
pulsante "Pianifica un viaggio" della home che porta alla pagina.

Fuori: le notifiche fuori dall'app (non-goal di REQ-CHAT-001); le chat delle pagine dei giorni dei viaggi demo restano
con le risposte del copione (ST-CHAT-001B). Il modello linguistico vero si usa solo con `OPENAI_API_KEY` sul server
(`apps/web/.env.local`, escluso da Git); senza chiave la chat mostra il messaggio "non disponibile" e il resto funziona.

Deviazione dichiarata: il controllo "nessuna API di rete" della web app (`test/ca6-rete.test.ts`) ammette ora
un'unica eccezione, `src/chat/sorgente-server.ts`, che chiama solo gli endpoint della stessa web app con indirizzi
relativi (`/api/chat/...`, già ammessi dalla politica di sicurezza con `connect-src 'self'`); un test lo verifica.

## Cosa è cambiato

- **Assistente con gli agenti** (`src/chat/server/agenti.ts`): gli eventi di `rispondiAlMessaggio` diventano quelli
  della chat (agente, passi, azioni, testo corretto, risposta); la risposta porta la scheda ricca (preferenze, bozza,
  proposta con Accetta e Rifiuta) e le risposte rapide di "Sorprendimi". `assistenteDaAmbiente` usa gli agenti quando
  c'è la chiave.
- **Viaggio della conversazione** (`src/chat/server/archivio-viaggio.ts`): `ArchivioViaggio` sulle tabelle di
  REQ-DATA-001; il viaggio nasce alla prima scrittura (`chat-<conversazione>`) e la conversazione gli viene collegata.
  I viaggi nati dalla pagina Pianifica usano il profilo condiviso con il percorso guidato (`profilo-preferenze`).
- **Proposte dei viaggi nati in chat** (`src/chat/server/proposte-viaggio.ts`): Accetta e Rifiuta decidono con il
  motore (`applicaProposta`, `rifiutaProposta`) sullo storico del viaggio, con l'orologio simulato; la pagina Demo
  continua a usare le sue operazioni.
- **Protocollo e servizio** (`src/chat/protocollo.ts`, `src/chat/server/servizio.ts`, `assistente.ts`, `tipi.ts`): nuovi
  eventi `agente`, `passo`, `azione`, `testo_corretto`; l'agente che ha risposto si salva con il messaggio e il
  messaggio dopo riparte da lui.
- **Browser** (`src/chat/sorgente-server.ts`, `src/chat/ChatViaggio.tsx`, `src/ui/PannelloChat.tsx`, `SchedeChat.tsx`):
  la sorgente del server legge lo streaming, riprende la conversazione salvata dopo un ricaricamento, decide le proposte
  sul server; il pannello mostra il testo mentre arriva e il passo in corso, e il grassetto `**così**` dei modelli.
- **Pagina Pianifica** (`app/pianifica/page.tsx`, `app/pianifica/azioni.ts`, `src/chat/PaginaPianifica.tsx`,
  `src/chat/bozza-dal-vivo.ts`, `src/chat/parole.ts`, stili in `src/ui/ui.css`): percorso guidato e bozza dal vivo
  accanto alla chat; ogni azione degli agenti aggiorna la bozza e accende le attività cambiate; ogni cambio dei filtri
  si salva nel profilo condiviso; «Crea la mia bozza» chiede la bozza in chat.
- **Percorso guidato** (`src/componenti/PercorsoPreferenze.tsx`): nuove proprietà facoltative `profiloIniziale`,
  `onCambio`, `onSalvato`; la pagina Preferenze resta com'era.
- **Home** (`src/componenti/PianificaViaggio.tsx`): "Pianifica un viaggio" porta a `/pianifica`.

## Perché

- Gli agenti lavorano su un `ArchivioViaggio` passato da fuori (ST-ORCH-001B): collegarlo alla base dati della web app
  tiene tutte le regole nel motore e negli strumenti, senza duplicarle nella chat.
- La scheda della bozza si costruisce dalla bozza salvata (la stessa della vista a lato), non dal risultato dello
  strumento: dopo una modifica il risultato non contiene i giorni, la bozza salvata sì.
- Il profilo condiviso è quello già salvato dal percorso guidato (ST-PREF-001B): un solo profilo per filtri e chat è il
  modo più semplice di soddisfare CA-6. Alternativa scartata: sincronizzare due profili diversi.
- Lo streaming usa gli endpoint di ST-CHAT-001A dal browser (stessa origine): le azioni server di Next.js non
  restituiscono un flusso di eventi.

## Verifica

| Criterio | Test o controllo | Esito |
|---|---|---|
| CA-1 dal prompt 1 alla bozza senza percorso guidato | `apps/web/test/chat001c-ca1-bozza-dalla-chat.test.ts` (agenti veri, client del modello con le conversazioni registrate dell'Atto 1, nessuna rete) | superato |
| Azioni della chat nella bozza a lato, parti cambiate evidenziate | `chat001c-ca1-bozza-dalla-chat.test.ts` (modifica del prompt 5, Bozza 2 con le attività cambiate), `chat001c-pannello-collegato.test.tsx` (vista e annuncio) | superato |
| CA-6 filtri e chat sullo stesso profilo, nei due sensi | `apps/web/test/chat001c-ca6-stesso-profilo.test.tsx` | superato |
| CA-2 per i viaggi nati in chat: Accetta crea la stessa versione del pulsante; Rifiuta nessuna versione | `apps/web/test/chat001c-proposte-viaggio.test.ts` | superato |
| Streaming, passi, azioni, ripresa e decisioni dal browser | `apps/web/test/chat001c-pannello-collegato.test.tsx` | superato |
| Nessuna rete esterna, solo gli endpoint propri | `apps/web/test/ca6-rete.test.ts` | superato |
| Prova manuale con il modello vero (`gpt-6-luna`) | `/pianifica`: prompt 1 → preferenze e destinazione, prompt 2 → Bozza 1 di 4 giorni accanto alla chat | superato |

Build e suite completa (`npm run build`, `npm test`) e scansione dei segreti sul commit della story: registrate dal
plugin (`.sdlc/tests/`, `.sdlc/security/`).

## Collegamenti

- Requisito `REQ-CHAT-001` (`docs/requirements/REQ-CHAT-001-chat.md`), story `ST-CHAT-001C`.
- Dipendenze: ST-CHAT-001A, ST-CHAT-001B, ST-ORCH-001C, ST-PREF-001B (tutte su main).
- Pull request da `feature/ST-CHAT-001C` verso `main` su `alicegibellato/TravelOps`, con il commit e i record del plugin.
