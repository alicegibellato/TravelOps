Story: ST-UX-003A-FIX1 (fix di ST-UX-003A), priorità P1.

Problema: `apps/web/test/pref001b-ca1-ca2-percorso.test.tsx` falliva sempre su main, anche da solo. ST-UX-003A ricorda il passo del percorso preferenze in sessionStorage (`CHIAVE_PASSO_PREFERENZE`); i test dello stesso file condividono jsdom e il secondo ripartiva dal passo del primo.

Correzione: `preparaPercorso()` in `apps/web/test/supporto-preferenze.tsx` svuota sessionStorage prima di ogni test. Copre tutti i file che montano il percorso (pref001b-ca1-ca2, pref001b-ca3, pref001b-ca5-ca7, plan002-ca1, chat001c-ca6). Nessuna modifica al comportamento dell'app.

Verifica: il file da solo 3 volte (7/7), la suite web completa 2 volte (96 file, 657 test). `test/web002-ca9-motore.test.ts` fallisce già su main senza questa modifica (`src/oggi/orologio.ts`, `src/dati/viaggi-salvati.ts`) ed è escluso.

| Check | Status | Details | Evidence |
| --- | --- | --- | --- |
| Tests | [NOT RUN] | `npx vitest run --reporter=verbose --exclude test/web002-ca9-motore.test.ts`: the latest run, recorded 2026-10-10T13:22:04.942Z, describes an earlier state, not the current one; run it again | [`.sdlc/tests/ST-UX-003A-FIX1-base-web002.log`](.sdlc/tests/ST-UX-003A-FIX1-base-web002.log)<br>[`.sdlc/tests/ST-UX-003A-FIX1-suite-ex-2.log`](.sdlc/tests/ST-UX-003A-FIX1-suite-ex-2.log)<br>[`.sdlc/tests/ST-UX-003A-FIX1-test-run-20261010132204942-979666.json`](.sdlc/tests/ST-UX-003A-FIX1-test-run-20261010132204942-979666.json) |
| Tests | [NOT RUN] | `npx vitest run test/pref001b-ca1-ca2-percorso.test.tsx`: the latest run, recorded 2026-10-10T13:22:15.490Z, describes an earlier state, not the current one; run it again | [`.sdlc/tests/ST-UX-003A-FIX1-file-3.log`](.sdlc/tests/ST-UX-003A-FIX1-file-3.log)<br>[`.sdlc/tests/ST-UX-003A-FIX1-test-run-20261010132215490-6c8f07.json`](.sdlc/tests/ST-UX-003A-FIX1-test-run-20261010132215490-6c8f07.json) |
| Smoke tests | [NOT RUN] | No smoke test run is recorded for this delivery. Record one with `test record --framework smoke`. | none |
| Secret scan | [NOT RUN] | The latest scan covers `fc74dcd7ef72`, not the current state (`2915526982e0`); scan again | [`.sdlc/security/ST-UX-003A-FIX1-secret-scan-20261010132427608-35c4b2.json`](.sdlc/security/ST-UX-003A-FIX1-secret-scan-20261010132427608-35c4b2.json) |
| Code review gate | [NOT RUN] | No code review is recorded for this delivery. Merge gate: not required for this delivery. | none |
| Strict gate | [PASS] | Strict story gate passed; receipt sealed 2026-10-10T13:25:01.989Z | [`.sdlc/gates/ST-UX-003A-FIX1-strict.json`](.sdlc/gates/ST-UX-003A-FIX1-strict.json) |
| Lifecycle-complete gate | [NOT RUN] | No passing lifecycle-complete gate receipt is recorded for story `ST-UX-003A-FIX1`. | none |
| Budget decision | [NOT RUN] | No execution budget is bound to this delivery, so the start decision was not limited by a budget. | [`.sdlc/autonomy/decisions/AUT-DEC-20261010131714295-8fc2c1.json`](.sdlc/autonomy/decisions/AUT-DEC-20261010131714295-8fc2c1.json)<br>[`.sdlc/autonomy/executions/AUT-PR-UX-003A-FIX1/start.json`](.sdlc/autonomy/executions/AUT-PR-UX-003A-FIX1/start.json) |
