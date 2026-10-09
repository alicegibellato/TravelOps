# REQ-PLAN-002 — Revisione e conferma della bozza

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Ondata | 2 — Prodotto (CR-001) |
| Tipo | Nuovo |
| Dipende da | REQ-PLAN-001 (ST-PLAN-001), REQ-CHAT-001 (ST-CHAT-001), REQ-EDIT-002 (ST-EDIT-002), REQ-DATA-001 (ST-DATA-001) |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md`, `modello-dominio-estensioni.md`, `dati-di-riferimento-estensioni.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-PLAN-002`, una pull request |
| Origine | `docs/CR-001-travelops-prodotto-demo.md` §9.10 |

> I rimandi §7.x sono a `modello-dominio-estensioni.md`, i rimandi §8.x a `dati-di-riferimento-estensioni.md`, gli altri alla CR-001.

## Operazioni sulla bozza

(dalla scheda dell'attività, dal giorno o dalla chat):
- **Sostituisci**: mostra le 3 migliori alternative per punteggio collocabili nello stesso spazio; il viaggiatore ne sceglie una.
- **Rimuovi**, **Sposta** (anche trascinando la scheda su un altro orario o giorno), **Aggiungi** (dalle attività suggerite della destinazione).
- **Blocca** (lucchetto): l'attività diventa irrinunciabile e non viene toccata dalle rigenerazioni.
- **Giornata più leggera / più piena**: toglie l'attività col punteggio più basso non bloccata, o aggiunge la migliore collocabile.
- **Rigenera questo giorno**: rigenera solo quel giorno con REQ-PLAN-001, mantenendo le attività bloccate.
- **Scambia due giorni**.
- **Cambia preferenze**: aggiorna il profilo e rigenera tutto mantenendo le attività bloccate.
- **Mostrami un'alternativa** (R-9 di REQ-PLAN-001).
- **Annulla / torna alla revisione Bn / confronta**.
- **Conferma l'itinerario**: stato `confermato`, nasce la versione 1 dello storico, festa visiva leggera (coriandoli disattivabili), messaggio "Buon viaggio!".

## Regole

Ogni operazione crea una revisione della bozza (§7.5) con causa in parole semplici; passa dal controllo di fattibilità; se il risultato ha problemi bloccanti l'operazione è applicata ma i problemi sono segnalati sulla scheda con un'azione suggerita ("Sposta la cena alle 20:00"). Nessun limite al numero di revisioni.

## Criteri di accettazione

- **CA-1** Ogni operazione sulla bozza è disponibile sia da pulsante sia da chat.
- **CA-2** Annulla riporta esattamente alla revisione precedente.
- **CA-3** Le attività bloccate sopravvivono a Rigenera questo giorno e a Cambia preferenze.
- **CA-4** Dopo la conferma, la versione 1 coincide con l'ultima revisione della bozza.
- **CA-5** Dopo la conferma le modifiche diventano proposte (REQ-EDIT-002), non più modifiche dirette.
- **CA-6** Almeno 10 revisioni consecutive non degradano il risultato, verificato da un test.

## Campi per il plugin

- **Sintesi** (`--summary`): Cicli illimitati di revisione della bozza da pulsanti e da chat (sostituisci, rimuovi, sposta, aggiungi, blocca, giornata più leggera o più piena, rigenera giorno, scambia giorni, cambia preferenze, alternativa) con annulla e confronto, fino a Conferma l'itinerario, che crea la versione 1.
- **Criteri** (`--acceptance`): CA-1…CA-6.
- **Fuori perimetro** (`--non-goal`): Prenotazioni, pagamenti, modifiche o cancellazioni presso fornitori.
- **Vincoli** (`--constraint`): Regole comuni del motore (modello-dominio.md §3): TypeScript strict, determinismo, nessuna chiamata di rete nel motore, messaggi in italiano, ogni criterio coperto da test automatici. Nessuna logica del motore duplicata nella web app: proposte, controlli e versioni vengono dal motore. Testi in italiano e in linguaggio semplice; nessun codice tecnico a vista per il viaggiatore.
- **Percorsi** (`--write-path`): `packages/engine/src/planning`, `packages/engine/src/editing`, `packages/engine/src/index.ts`, `packages/engine/test`, `apps/web`, `docs`, `evidence`.
