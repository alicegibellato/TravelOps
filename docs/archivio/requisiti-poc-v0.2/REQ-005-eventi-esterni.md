# REQ-005 — Eventi esterni e simulatore di scenari

| Campo | Valore |
|---|---|
| Stato | Bozza per `requirement propose` |
| Versione | 0.2 (PoC) |
| Dipende da | REQ-002 |
| Tetto di autonomia proposto | `checkpointed` |
| Fase | 2 — Adatta |

## 1. Sintesi (→ `--summary`)

Il sistema raccoglie dati esterni rilevanti per l'itinerario (meteo, stato dei voli, chiusure dei luoghi) tramite adattatori sostituibili e li trasforma in **eventi esterni** con fonte, orario e gravità. Per la demo, un **simulatore di scenari** permette di generare a comando eventi realistici e di far avanzare un orologio di viaggio simulato.

## 2. Funzionalità

### 2.1 Fonti
| Fonte | Dato | Nel PoC |
|---|---|---|
| Meteo | Probabilità di pioggia oraria, temperatura | Mock; Open-Meteo reale attivabile da configurazione |
| Voli | Ritardo, cancellazione | Solo mock |
| Luoghi | Chiusura straordinaria | Solo mock |

### 2.2 Eventi esterni
- Un evento ha: tipo, attività/prenotazioni coinvolte, valore, soglia, gravità (*informativo* / *rilevante* / *critico*), fonte, orario.
- Soglie in file di configurazione (proposta: pioggia ≥ 70% su attività all'aperto entro 48 h; ritardo volo ≥ 60 min).
- Lo stesso dato senza variazioni non genera eventi duplicati.
- Controllo periodico durante il viaggio (frequenza configurabile) e su comando.

### 2.3 Simulatore di scenari (demo)
- Pagina **"Demo"** separata, raggiungibile da un link discreto, che permette di: impostare data e ora del viaggio (orologio simulato); generare eventi predefiniti (*pioggia domani pomeriggio*, *volo in ritardo di 2 h*, *volo cancellato*, *museo chiuso oggi*); azzerare gli eventi.
- Gli eventi simulati seguono lo stesso percorso di quelli reali.

## 3. Criteri di accettazione (→ `--acceptance`)

1. Ogni scenario del simulatore genera esattamente un evento con attività o prenotazioni coinvolte, fonte e orario.
2. Lo stesso dato rilevato più volte senza variazioni non genera eventi duplicati.
3. Cambiare l'orologio simulato cambia quali previsioni rientrano nella finestra di 48 h.
4. Le soglie si modificano dal file di configurazione senza cambiare codice.
5. Nessun test automatico chiama fonti reali.

## 4. Fuori perimetro (→ `--non-goal`)

- Fonti reali per voli e luoghi.
- Traffico, scioperi, allerte ufficiali.
- Decisione su cosa fare dell'evento (REQ-006).

## 5. Vincoli (→ `--constraint`)

- Eventuali chiavi di API solo lato server, mai nel codice versionato (Open-Meteo non richiede chiave).
- La fonte meteo reale è disattivata di default; i test usano sempre i mock.

## 6. Requisiti non funzionali (→ `--nfr`)

- Nessuno oltre al funzionamento nella demo.

## 7. Integrazioni (→ `--integration`)

- Meteo: mock + Open-Meteo (gratuito, senza chiave) attivabile da configurazione.
- Voli e chiusure dei luoghi: mock.

## 8. Percorsi modificabili (→ `--write-path`)

`src/app`, `src/components`, `src/lib/events`, `src/lib/weather`, `src/lib/simulator`, `src/lib/clock`, `config`, `db`, `test/events`, `test/simulator`, `test/fixtures/events`, `package.json`, `package-lock.json`, `docs`, `evidence`

## 9. Decisioni prese

1. Meteo: mock per test e demo, Open-Meteo reale attivabile da configurazione.
2. Simulatore: pagina "Demo" separata, raggiungibile da un link discreto.

## 10. Storie suggerite

| Storia | Contenuto | Dipende da |
|---|---|---|
| ST-012 | Modello evento esterno, soglie configurabili, deduplicazione, adattatori e mock | ST-004 |
| ST-013 | Orologio simulato e pannello simulatore di scenari | ST-012 |
