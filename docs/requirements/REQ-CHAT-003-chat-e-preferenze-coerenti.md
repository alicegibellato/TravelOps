# REQ-CHAT-003 — Chat e preferenze coerenti

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-10 |
| Ondata | 2 — Prodotto (CR-001), collaudo |
| Tipo | Correzione |
| Dipende da | REQ-CHAT-002 (ST-CHAT-002), REQ-ORCH-002 (ST-ORCH-002), REQ-PREF-001 |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storie e PR | `ST-CHAT-003A` (agenti e profilo), `ST-CHAT-003B` (web app), una pull request ciascuna |
| Origine | Collaudo di Alice con il modello vero (PC1, 10/10/2026): difetti B1–B6 |

## Obiettivo

Un'unica chat, quella con gli agenti veri, che dice e fa la stessa cosa. I filtri del percorso guidato e la chat devono lavorare sullo stesso viaggio senza ripetere domande né portarsi dietro dati di viaggi precedenti.

## Difetti di partenza

Trovati nel collaudo, con le tracce degli agenti (`tracce_agenti`):

- **B1. Due chat diverse.**
  - **Pianifica:** la chat usa gli agenti veri.
  - **Pagine del viaggio (giorno, attività):** la chat è un copione scritto in anticipo, che risponde sempre le stesse frasi.
- **B2. Il testo dice no, i dati dicono sì.** La chat dice che «Filippine» e «Manila» non sono disponibili, ma le salva nel profilo e crea un viaggio «Nuovo viaggio – Filippine». I filtri mostrano «Hai scelto: Manila».
- **B3. Preferenze di viaggi precedenti.** Una conversazione nuova parte dal profilo condiviso di prima: date, viaggiatori e irrinunciabili. La bozza viene creata subito, senza domande, con dati che il viaggiatore non ha detto.
- **B4. Domande ripetute.** Sorprendimi (passo 1) chiede stili, cose da evitare e mese, ma salva solo la destinazione. Le stesse domande tornano ai passi 2, 4 e 5.
- **B5. Il percorso non segue la chat.** Il riepilogo si aggiorna, ma il percorso resta al passo 1 anche quando la chat ha già raccolto destinazione, date e viaggiatori.
- **B6. «Crea la mia bozza» resta su «Preparo la bozza…».** Succede con l'assistente finto. Con il modello vero funziona.

## Funzionalità

### ST-CHAT-003A — Agenti e profilo

- **Solo destinazioni preparabili nel profilo.** `aggiorna_profilo` accetta una destinazione di tipo luogo solo se corrisponde a una destinazione trovata da `cerca_destinazione` o già pronta (con il suo riferimento), oppure se è «sorprendimi». Altrimenti lo strumento risponde con un errore che il modello può spiegare, e il profilo non cambia. Nessun viaggio nasce da una destinazione che non si può preparare.
- **Nuovo viaggio, profilo nuovo.** Quando nasce un nuovo viaggio (una conversazione nuova della pagina Pianifica, o «Nuovo viaggio» dai filtri), il profilo condiviso tiene solo le preferenze personali:
  - ritmo;
  - forma fisica;
  - pasti.

  Tutto il resto si azzera: destinazione, date, durata, viaggiatori, tipo di gruppo, stili, irrinunciabili, cose da evitare, budget e orari.
- **Bozza solo con dati detti.** Il Consulente genera la bozza solo quando destinazione, date e viaggiatori vengono dalla conversazione in corso o dai filtri compilati per questo viaggio. Se mancano, li chiede (al massimo 2 domande).

### ST-CHAT-003B — Web app

- **Una sola chat.** La chat delle pagine del viaggio usa gli agenti veri sulla conversazione di quel viaggio, come Pianifica. Il copione finto non è più usato nelle pagine. Resta solo per i test e per `TRAVELOPS_ASSISTENTE=finto`, e quella modalità copre anche «Crea la mia bozza».
- **Il percorso segue la chat.** Quando la chat aggiorna il profilo:
  - il percorso guidato segna i passi già compilati;
  - apre il primo passo che manca;
  - mostra nel passo «Dove» la destinazione scelta.
- **Sorprendimi senza doppioni.** Stili, cose da evitare e mese scelti in Sorprendimi entrano nel profilo con la destinazione. I passi 2, 4 e 5 li mostrano già compilati e non li richiedono.

## Criteri di accettazione

- **CA-1** `aggiorna_profilo` con una destinazione non trovata (per esempio «Manila» con la sorgente registrata) risponde con un errore. Profilo e viaggi restano invariati, e nessun viaggio `chat-…` viene creato. Prova con client finto.
- **CA-2** Una conversazione nuova su Pianifica, dopo un viaggio precedente, parte da un profilo con solo ritmo, forma fisica e pasti. «Vorrei andare sul Lago di Garda» non genera la bozza: l'agente chiede date e viaggiatori. Prova con client finto.
- **CA-3** Nelle pagine del viaggio la chat manda i messaggi al server degli agenti (`/api/chat/conversazioni`) e non usa il copione finto. Prova con un test del componente e un e2e.
- **CA-4** Dopo un'azione della chat che compila destinazione, date e viaggiatori, il percorso guidato mostra quei passi come completati e si apre sul primo passo mancante. Prova con un test del componente.
- **CA-5** Stili, cose da evitare e mese scelti in Sorprendimi sono nel profilo salvato. I passi 2, 4 e 5 li mostrano già scelti. Prova con un test del componente.
- **CA-6** Con `TRAVELOPS_ASSISTENTE=finto`, «Crea la mia bozza» dai filtri arriva a una risposta e non resta su «Preparo la bozza…». Prova con un e2e.

## Campi per il plugin

- **Sintesi** (`--summary`): Chat e preferenze coerenti dopo il collaudo di Alice. Una sola chat con gli agenti veri anche nelle pagine del viaggio. Solo destinazioni preparabili nel profilo. Nuovo viaggio con profilo nuovo (restano ritmo, forma fisica e pasti). Il percorso guidato segue la chat. Sorprendimi senza domande ripetute.
- **Criteri** (`--acceptance`): CA-1…CA-6.
- **Fuori perimetro** (`--non-goal`):
  - ridisegno grafico delle pagine (REQ-UX-003, REQ-UX-004);
  - nuove destinazioni nel catalogo registrato.
- **Vincoli** (`--constraint`):
  - nessuna logica del motore duplicata nella web app;
  - testi in italiano semplice;
  - nessuna chiamata di rete né chiave nei test;
  - file LF.
- **Percorsi** (`--write-path`): `packages/agents`, `apps/web`, `docs`, `evidence`.
