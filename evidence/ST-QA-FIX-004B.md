# Prove di consegna: ST-QA-FIX-004

## Cosa è stato chiesto

**[P1] Versioni e Itinerario corrente del viaggio scelto.** Nasce dal collaudo di Alice del 10/10/2026 (TO-003) e dai casi del testbook TB-VER-001, TB-VER-002 e TB-VER-005, falliti nell'esecuzione in anticipo del gruppo C.

Il problema: un viaggio dell'utente confermato in chat, con 2 versioni, non aveva nessuna pagina in cui vedere le sue versioni. «Versioni» e «Itinerario corrente» mostravano sempre il viaggio della modalità presentazione.

Record: story `ST-QA-FIX-004`, correzione di `ST-UX-003A` (viaggi dell'utente collegati alle pagine).

## Perimetro ed esclusioni

**Dentro:**

- la pagina nuova `apps/web/app/viaggi/[viaggio]/versioni/page.tsx`;
- `app/versioni/page.tsx` e `app/itinerario/page.tsx`;
- `src/componenti/PaginaVersioni.tsx`, `src/viste/versioni.ts`, `src/dati/viaggi-salvati.ts`, `src/percorsi.ts`.

**Fuori:**

- la pagina della singola versione di un viaggio salvato (il viaggio corrente si apre in `/viaggi/<id>`);
- la data tecnica nel messaggio di accettazione (TO-031).

## Cosa è cambiato

- **Versioni di un viaggio salvato.** `/viaggi/<id>/versioni` mostra la cronologia del viaggio confermato dell'utente: versioni, data, causa, versione corrente. Il confronto tra due versioni usa lo stesso modulo della pagina Versioni, e c'è il link «Torna al viaggio». Una bozza o un viaggio sconosciuto danno «Pagina non trovata».
- **Il menu segue il viaggio dell'utente.** Con un viaggio confermato dell'utente:
  - «Versioni» porta alle sue versioni;
  - «Itinerario corrente» porta al suo viaggio.

  Senza viaggi dell'utente restano le pagine della modalità presentazione, raggiungibili sempre con `/versioni?presentazione`.
- **`vistaVersioni`** riceve solo lo storico: la stessa vista serve sia alla presentazione sia ai viaggi salvati.

## Verifica

| Criterio | Test | Esito |
|---|---|---|
| Pagina delle versioni del viaggio dell'utente (versione corrente, ritorno al viaggio, confronto) | `apps/web/test/qafix004-versioni-viaggio.test.tsx` | superato |
| «Versioni» e «Itinerario corrente» dal menu portano al viaggio dell'utente | idem | superato |
| Senza viaggi dell'utente valgono le pagine della presentazione | idem | superato |
| Bozza o viaggio sconosciuto: pagina non trovata | idem | superato |

## Collegamenti

- Collaudo TO-003; testbook TB-VER-001, TB-VER-002, TB-VER-005 (esecuzione in anticipo del gruppo C, 10/10/2026).
