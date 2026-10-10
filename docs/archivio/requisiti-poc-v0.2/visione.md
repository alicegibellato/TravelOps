# TravelOps — Visione del proof of concept

| Campo | Valore |
|---|---|
| Tipo | Documento di visione (**non** agganciato come fonte di requisiti) |
| Natura | **Proof of concept**, non prodotto per il mercato |
| Versione | 0.2 |
| Data | 2026-10-09 |

> Questo documento si può modificare liberamente: non è usato come `--source` da nessun requisito.
> Le regole vincolanti stanno nei file `REQ-xxx-*.md`, che dopo l'approvazione si modificano solo
> tramite `requirement revise`.

---

## 1. Obiettivo del PoC

Dimostrare che un assistente può:

1. costruire con l'utente, dialogando, un itinerario di viaggio realistico;
2. mantenerlo aggiornato **durante** il viaggio, ripianificando su richiesta dell'utente e reagendo da solo a eventi esterni (meteo, voli, chiusure, ritardi) con proposte motivate.

Il PoC è una **web app** a utente singolo, senza account né accesso, pensata per essere dimostrata, non per essere messa sul mercato.

## 2. Principi

1. **Propone, non decide.** Ogni modifica all'itinerario, anche quando nasce da un evento esterno, è una proposta che l'utente accetta o rifiuta.
2. **Mai sulle prenotazioni.** TravelOps non prenota, non modifica e non cancella nulla presso fornitori. Quando un evento tocca una prenotazione, **avvisa** l'utente e **propone alternative** con link utili (gestione prenotazione, ricerca alternative, contatti).
3. **Le priorità dell'utente vincono.** Un'attività *irrinunciabile* o *fissata* non viene mai rimossa senza consenso.
4. **Dati citati.** Ogni dato esterno usato per una proposta è mostrato con fonte e orario.
5. **Dimostrabile.** Gli eventi esterni si possono simulare a comando, per mostrare la ripianificazione in una demo.

## 3. Glossario

| Termine | Definizione |
|---|---|
| **Viaggio** | Date, tappe, partecipanti, preferenze del viaggio e itinerario |
| **Tappa** | Città o area in cui si pernotta almeno una notte |
| **Segmento di trasporto** | Volo, treno o altro spostamento tra tappe |
| **Prenotazione** | Volo, alloggio, biglietto o visita già prenotati dall'utente, inseriti nel viaggio con eventuale codice e link; TravelOps non li modifica mai |
| **Attività** | Visita, esperienza, pasto o pausa con luogo, orario, durata, tipo (*all'aperto* / *al chiuso* / *misto*) e priorità |
| **Priorità** | *Irrinunciabile* / *desiderata* / *opzionale* |
| **Attività fissata** | Attività bloccata dall'utente: l'assistente non la sposta né la rimuove |
| **Itinerario** | Pianificazione giorno per giorno di attività e spostamenti, con versioni |
| **Evento esterno** | Dato esterno che può rendere un'attività impraticabile (meteo, volo, chiusura) o ritardo dichiarato dall'utente |
| **Proposta** | Insieme di modifiche all'itinerario con motivazione, fonte ed effetti a catena, da accettare o rifiutare |
| **Avviso** | Messaggio in app che informa di un evento; se tocca una prenotazione include alternative e link |
| **Piano B** | Alternativa precalcolata per un'attività a rischio |

## 4. Mappa dei requisiti

| ID | File | Titolo | Dipende da |
|---|---|---|---|
| REQ-001 | `REQ-001-raccolta-viaggio.md` | Raccolta conversazionale del viaggio | – |
| REQ-002 | `REQ-002-generazione-itinerario.md` | Generazione dell'itinerario | REQ-001 |
| REQ-003 | `REQ-003-consultazione-modifica.md` | Consultazione, modifica e versioni dell'itinerario | REQ-002 |
| REQ-004 | `REQ-004-ripianificazione-richiesta.md` | Ripianificazione su richiesta dell'utente | REQ-003 |
| REQ-005 | `REQ-005-eventi-esterni.md` | Eventi esterni e simulatore di scenari | REQ-002 |
| REQ-006 | `REQ-006-ripianificazione-autonoma.md` | Ripianificazione autonoma e avvisi in app | REQ-004, REQ-005 |
| REQ-007 | `REQ-007-oggi.md` | Vista "Oggi" durante il viaggio | REQ-003, REQ-006 |

```
REQ-001 ─► REQ-002 ─┬─► REQ-003 ─► REQ-004 ─┐
                    │                       ├─► REQ-006 ─► REQ-007
                    └─► REQ-005 ────────────┘
```

## 5. Fasi suggerite

| Fase | Requisiti | Cosa si può dimostrare |
|---|---|---|
| **1 — Pianifica** | REQ-001, REQ-002, REQ-003 | Creare un viaggio dialogando e ottenere un itinerario modificabile |
| **2 — Adatta** | REQ-004, REQ-005, REQ-006, REQ-007 | Cambiare piano chiedendolo all'assistente e vedere l'itinerario reagire a pioggia, voli in ritardo, chiusure e ritardi |

## 6. Fuori dal PoC (valgono per tutti i requisiti)

- Account, accesso, profilo utente persistente, gestione privacy e consensi.
- Prenotazione, modifica o cancellazione di qualsiasi prenotazione presso fornitori; pagamenti.
- Condivisione dell'itinerario ed esportazione (calendario, PDF).
- Notifiche fuori dall'app (email, push, SMS).
- Funzionamento offline, app installabile o nativa.
- Budget e registro spese.
- Import automatico di conferme da email o PDF.
- Area di amministrazione e controllo dei costi.
- Requisiti su lingue multiple e accessibilità.
- Scalabilità, alta disponibilità, sicurezza di produzione.

## 7. Scelte tecniche (decise)

| Ambito | Scelta |
|---|---|
| Stack | TypeScript, **Next.js** (interfaccia e API nello stesso progetto), un solo utente |
| Dati | **SQLite** su file |
| Modello linguistico | **Claude**, per dialogo, comprensione delle richieste, generazione e spiegazioni |
| Generazione itinerario | Claude propone, un **validatore a regole** verifica e chiede correzioni |
| Luoghi e orari di apertura | **Mock**: set di luoghi di 1–2 città demo |
| Tempi di percorrenza | Stimati dalla distanza |
| Meteo | Mock + fonte reale facoltativa **Open-Meteo** (gratuita, senza chiave) |
| Voli e chiusure | Solo mock |
| Mappa | **Leaflet + OpenStreetMap** |
| Ora del viaggio | **Orologio simulato** per la demo, con possibilità di usare l'ora reale |
| Simulatore di scenari | Pagina **"Demo"** separata |
| Link alternative | **Google Flights** (voli), **Trainline** (treni), link di gestione della prenotazione se inserito |
| Limiti del PoC | Viaggi fino a **14 giorni** e **5 tappe** |
| Soglie e regole | File di configurazione |

Struttura delle cartelle di riferimento: `src/app` (pagine e API), `src/components` (interfaccia), `src/lib/<modulo>` (logica), `db` (schema e migrazioni SQLite), `config` (soglie), `test/<modulo>` (test), `test/fixtures` (dati di esempio e mock).

## 8. Convenzioni per il plugin Agentic SDLC

- Un file per requisito, agganciato con `--source docs/requirements/REQ-xxx-*.md`.
- Sezioni mappate sui campi del requisito: Sintesi → `--summary`, Criteri → `--acceptance`, Fuori perimetro → `--non-goal`, Vincoli → `--constraint`, Non funzionali → `--nfr`, Integrazioni → `--integration`, Percorsi → `--write-path`.
- Le decisioni prese sono riportate nella sezione 9 di ogni file.
- ID storie unici a livello di progetto (`ST-001` … ); ogni storia diventa una PR.
- I percorsi modificabili includono `package.json` e `package-lock.json` in ogni requisito che può aggiungere dipendenze: il controllo finale del plugin fallisce se cambia un file fuori dai percorsi approvati.
