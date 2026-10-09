# TravelOps — Visione del proof of concept

| Campo | Valore |
|---|---|
| Tipo | Documento d'insieme (**non** agganciato come fonte di requisiti) |
| Natura | **Proof of concept**, non prodotto per il mercato |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Origine | Requisiti funzionali della collega uniti alla nostra analisi (versione precedente in `docs/archivio/requisiti-poc-v0.2/`) |

> Si può modificare liberamente: nessun requisito lo usa come `--source`.

---

## 1. Obiettivo

Dimostrare un assistente di viaggio, come **web app** per un solo utente senza accesso, che:

1. costruisce con il viaggiatore un itinerario realistico e verificato;
2. lo mantiene aggiornato durante il viaggio, su richiesta del viaggiatore e reagendo agli imprevisti (meteo, ritardi, chiusure, cancellazioni) con proposte motivate.

Il principio architetturale: **il motore decide e verifica, l'AI interpreta e racconta.** Fattibilità, impatto, ripianificazione e versioni stanno in un motore deterministico; gli agenti AI traducono le parole del viaggiatore in operazioni del motore e ne raccontano i risultati, senza mai produrre un itinerario non verificato.

## 2. Principi

| Principio | Requisiti |
|---|---|
| **Decide il viaggiatore**: ogni modifica è una proposta da accettare o rifiutare | ITIN-002 R-5…R-8; REPLAN-002 R-5; EDIT-001 R-ED-7 |
| **Fattibilità verificata** | FEAS-001; REPLAN-002 R-3; EDIT-001 R-ED-6 |
| **Ripianificazione minima** | REPLAN-001; REPLAN-002 R-1, R-SOS, R-RIT |
| **Ogni modifica è spiegata** | REPLAN-002 R-4, CA-12; EDIT-001 CA-9 |
| **Lo storico si conserva** | ITIN-002 |
| **Le priorità del viaggiatore vincono**: le attività irrinunciabili non si tolgono, gli orari fissi non si spostano | REPLAN-002 R-2, R-7, R-RIT-3 |
| **Mai sulle prenotazioni**: TravelOps avvisa e propone alternative con link, non agisce | REPLAN-002 R-ALT; WEB-002 CA-4 |
| **Dimostrabile**: scenari di riferimento, demo a terminale, pagina Demo con orologio simulato | `dati-di-riferimento.md`; REPLAN-002 CA-14; WEB-002 |

## 3. Mappa dei requisiti

Fonti condivise di tutti i requisiti qui sotto: `modello-dominio.md` e `dati-di-riferimento.md`.

| ID | File | Requisito | Ondata | Dipende da |
|---|---|---|---|---|
| REQ-FOUND-001 | `REQ-FOUND-001-fondamenta.md` | Fondamenta del progetto | 1 | — |
| REQ-ITIN-001 | `REQ-ITIN-001-modello-catalogo.md` | Modello dell'itinerario e catalogo | 1 | FOUND-001 |
| REQ-ITIN-002 | `REQ-ITIN-002-versioni-storico.md` | Versioni e storico | 1 | ITIN-001 |
| REQ-FEAS-001 | `REQ-FEAS-001-fattibilita.md` | Controllo di fattibilità | 1 | FOUND-001 |
| REQ-REPLAN-001 | `REQ-REPLAN-001-impatto.md` | Impatto degli imprevisti | 1 | FOUND-001 |
| REQ-REPLAN-002 | `REQ-REPLAN-002-ripianificazione.md` | Ripianificazione minima con spiegazione | 1 | ITIN-002, FEAS-001, REPLAN-001 |
| REQ-EDIT-001 | `REQ-EDIT-001-modifiche-richieste.md` | Modifiche richieste dal viaggiatore | 1 | ITIN-002, FEAS-001, REPLAN-002 |
| REQ-WEB-001 | `REQ-WEB-001-consultazione.md` | Web app: consultazione | web | ITIN-001 |
| REQ-WEB-002 | `REQ-WEB-002-proposte-demo.md` | Web app: proposte, versioni, Demo | web | WEB-001, ITIN-002, FEAS-001, REPLAN-002 |

Ogni requisito diventa una storia (`ST-<AREA>-NNN`) e una pull request. Con il plugin le dipendenze bloccano davvero: una storia parte solo quando quelle da cui dipende sono chiuse. La storia è di chi lancia la consegna dal proprio computer.

## 4. Sequenza e parallelismo

| Passo | Requisiti che possono procedere in parallelo |
|---|---|
| 1 | FOUND-001 |
| 2 | ITIN-001, FEAS-001, REPLAN-001 |
| 3 | ITIN-002, WEB-001 |
| 4 | REPLAN-002 |
| 5 | EDIT-001, WEB-002 |

## 5. Ondate 2 e 3 (da dettagliare)

Diventano file di requisito quando si dettagliano, dopo la chiusura dell'ondata 1.

**Ondata 2 — Assistente**

- **REQ-ORCH-001 Orchestratore e agenti specializzati.** Un orchestratore interpreta richieste ed eventi e li affida ad agenti specializzati (Planner, Logistica, Gestione imprevisti), che usano il motore come strumento. Modello: Claude. *Decisione presa: si mantiene l'architettura multi-agente.*
- **REQ-PLAN-001 Itinerario da linguaggio naturale.** Dal racconto del viaggiatore (destinazione, date, interessi, vincoli) il Planner propone un itinerario; il controllo di fattibilità lo verifica e, se ci sono problemi, il Planner ha al massimo 2 tentativi di correzione. Solo destinazioni presenti nel catalogo demo; viaggi fino a 14 giorni e 5 tappe.
- **REQ-CHAT-001 Chat nella web app.** Il viaggiatore crea il viaggio, chiede modifiche (tradotte in operazioni di REQ-EDIT-001), riceve le proposte e le accetta o le rifiuta.
- **REQ-IMPR-001 Imprevisto raccontato.** "Si è bucata una gomma, ci vorranno due ore" diventa un imprevisto `RITARDO` strutturato.
- **REQ-DATA-001 Base dati.** Viaggi, versioni e proposte salvati in SQLite. *Anticipato dall'ondata 3: serve alla web app.*
- **REQ-TODAY-001 Vista "Oggi".** Attività in corso e successiva secondo l'orologio (reale o simulato); il pulsante "sono in ritardo di 15/30/60 minuti" genera un imprevisto `RITARDO`.

**Ondata 3 — Dati reali e autonomia**

- **REQ-EXT-001 Meteo reale** da Open-Meteo (gratuito, senza chiave), dietro la sorgente dei dati di contesto; la pioggia è "avversa" se la probabilità è almeno 70% (soglia configurabile).
- **REQ-EXT-002 Percorsi reali** e **REQ-EXT-003 Stato dei voli**: facoltativi per il PoC.
- **REQ-MON-001 Monitoraggio continuo.** Durante il viaggio TravelOps controlla meteo, voli e chiusure e genera da solo gli imprevisti, senza duplicati; una proposta non decisa scade all'inizio dell'attività coinvolta e viene ritirata se l'imprevisto rientra.
- **REQ-NOTIF-001 Avvisi in app.** Il viaggiatore vede le nuove proposte in un'area avvisi della web app, con contatore dei non letti. Nessuna notifica fuori dall'app.

## 6. Fuori dal PoC

- Prenotazione, modifica o cancellazione di prenotazioni presso fornitori; pagamenti.
- Account, accesso, profilo utente, gestione privacy e consensi.
- Condivisione ed esportazione dell'itinerario.
- Notifiche fuori dall'app; app installabile o nativa; funzionamento offline.
- Budget e spese; import di conferme da email o PDF; area di amministrazione.
- Requisiti su lingue multiple e accessibilità; scalabilità e sicurezza di produzione.
- Catalogo reale: il PoC pianifica solo sulle destinazioni del catalogo demo.
- Accettazione parziale di una proposta; più imprevisti nella stessa proposta.

## 7. Scelte tecniche

| Ambito | Scelta |
|---|---|
| Repository | npm workspaces: `packages/engine` (motore), `apps/web` (web app), `packages/agents` (agenti, ondata 2) |
| Motore | Pacchetto `@travelops/engine`: TypeScript `strict`, Node.js 20.12 o successivo, test con Vitest, compilazione con `tsc`, demo con `tsx` |
| Web app | Next.js con TypeScript; mappa Leaflet con tessere OpenStreetMap |
| Integrazione continua | GitHub Actions: build e test a ogni push e pull request verso `main` |
| Agenti (ondata 2) | Modello OpenAI (SDK `openai`, predefinito `gpt-6-luna`), con il motore come strumento |
| Dati | Ondata 1 e filone web: file JSON; dall'ondata 2: SQLite con `better-sqlite3`, file `apps/web/.data/travelops.db` escluso da Git (REQ-DATA-001) |
| Meteo reale (ondata 3) | Open-Meteo |
| Link alternative | Gestione della prenotazione, Google Flights per i voli, Trainline per i treni |

## 8. Convenzioni per il plugin Agentic SDLC

- Un file per requisito, agganciato con `--source` insieme alle due fonti condivise (`modello-dominio.md`, `dati-di-riferimento.md`).
- Cambiare una fonte condivisa rende "non aggiornati" tutti i requisiti che la usano: va fatto solo con una revisione deliberata.
- Ogni file ha in fondo la sezione **Campi per il plugin** (sintesi, criteri, fuori perimetro, vincoli, integrazioni, percorsi modificabili).
- Requisiti `REQ-<AREA>-NNN`, storie `ST-<AREA>-NNN`, criteri `CA-n`, regole `R-n`.
- Prima di iniziare serve un repository GitHub per TravelOps: lo richiedono la CI e le pull request del plugin.
