# Prove di consegna: ST-UX-003A-FIX1 (correzione dei test di ST-UX-003A)

## Cosa è stato chiesto

Su main `apps/web/test/pref001b-ca1-ca2-percorso.test.tsx` falliva sempre, anche da solo (3 test: «manca il pulsante
«Avanti»», «manca «Scelgo più tardi: sorprendimi»», «expected true to be false»). ST-UX-003A ricorda il passo del
percorso preferenze in sessionStorage (`CHIAVE_PASSO_PREFERENZE` in `PercorsoPreferenze.tsx`); i test dello stesso
file condividono jsdom, quindi il secondo ripartiva dal passo lasciato dal primo.

Criterio: il file passa da solo e nella suite completa, più volte di fila.

## Perimetro ed esclusioni

- Solo il supporto dei test; nessuna modifica a `apps/web/src`, il comportamento dell'app resta quello di ST-UX-003A.
- `test/web002-ca9-motore.test.ts` fallisce già su origin/main (ca02c4c) per `src/oggi/orologio.ts` e
  `src/dati/viaggi-salvati.ts` di ST-UX-003A: non riguarda questa correzione ed è escluso dalle esecuzioni registrate.

## Cosa è cambiato

- `apps/web/test/supporto-preferenze.tsx`: `preparaPercorso()` svuota sessionStorage prima di ogni test
  (`beforeEach`). Vale per tutti i file che montano il percorso: `pref001b-ca1-ca2-percorso`, `pref001b-ca3-profili`,
  `pref001b-ca5-ca7`, `plan002-ca1-operazioni`, `chat001c-ca6-stesso-profilo`. Nessun altro test monta il percorso.

## Prove

- `npx vitest run test/pref001b-ca1-ca2-percorso.test.tsx`: prima della correzione 3 falliti; dopo, 3 esecuzioni di
  fila con 7 test verdi.
- Suite unitaria web completa, 2 esecuzioni di fila: 96 file, 657 test verdi, `pref001b-ca1-ca2-percorso` 7/7.
