# REQ-007 — Vista "Oggi" durante il viaggio

| Campo | Valore |
|---|---|
| Stato | Bozza per `requirement propose` |
| Versione | 0.2 (PoC) |
| Dipende da | REQ-003, REQ-006 |
| Tetto di autonomia proposto | `checkpointed` |
| Fase | 2 — Adatta |

## 1. Sintesi (→ `--summary`)

Durante il viaggio la web app mostra una vista "Oggi" centrata sul momento attuale (reale o dell'orologio simulato): attività in corso e successiva, quando partire per arrivare in tempo, meteo delle prossime ore, proposte e avvisi in attesa. L'utente può dichiarare un ritardo, che genera un evento gestito dalla ripianificazione autonoma.

## 2. Funzionalità

- Attività in corso e successiva con orario di partenza consigliato (tempo di percorrenza + 10 minuti di margine).
- Meteo delle prossime ore per i luoghi del giorno, se disponibile.
- Proposte e avvisi in attesa in evidenza.
- Pulsanti "sono in ritardo di 15 / 30 / 60 minuti": se il ritardo rende impossibili attività successive, viene generato un evento *ritardo utente* (REQ-006).
- Segnare un'attività come *fatta* o *saltata*.
- Link "apri nelle mappe" per l'attività successiva.

## 3. Criteri di accettazione (→ `--acceptance`)

1. Con l'orologio simulato, la vista mostra attività in corso e successiva corrette per data e ora impostate.
2. L'orario di partenza consigliato tiene conto del tempo di percorrenza e del margine.
3. Dichiarare un ritardo che rende impossibile un'attività genera un evento *ritardo utente* e una proposta (REQ-006).
4. Lo stato *fatta* / *saltata* è salvato e visibile nella vista giorno.

## 4. Fuori perimetro (→ `--non-goal`)

- Uso della posizione del dispositivo.
- Navigazione passo-passo.
- Informazioni sul paese (emergenze, valuta, prese).

## 5. Vincoli (→ `--constraint`)

- Nessuno specifico.

## 6. Requisiti non funzionali (→ `--nfr`)

- Nessuno oltre al funzionamento nella demo.

## 7. Integrazioni (→ `--integration`)

- Orologio simulato ed eventi (REQ-005).
- Link alle mappe esterne.

## 8. Percorsi modificabili (→ `--write-path`)

`src/app`, `src/components`, `src/lib/today`, `src/lib/clock`, `db`, `test/today`, `docs`, `evidence`

## 9. Decisioni prese

- Nessuna decisione specifica: usa orologio simulato (REQ-004/REQ-005) e avvisi (REQ-006).

## 10. Storie suggerite

| Storia | Contenuto | Dipende da |
|---|---|---|
| ST-017 | Vista "Oggi", ritardo dichiarato, attività fatte/saltate | ST-009, ST-014 |
