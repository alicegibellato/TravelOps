# Prove di consegna: ST-UX-003B-FIX-TB-A11Y-003

## Cosa è stato chiesto

REQ-UX-003, fix di `ST-UX-003B`, dal caso TB-A11Y-003 del testbook di ST-QA-001D (`evidence/ST-QA-001D/testbook-2026-10-10.md`).

Nel menu del giorno della bozza, con il sottomenu «Scambia con…» aperto, il **primo Esc chiudeva sottomenu e menu insieme** e il focus tornava subito su «Modifica giorno». Atteso: il primo Esc chiude solo il sottomenu (focus su «Scambia con…»), il secondo chiude il menu (focus sull'attivatore).

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Causa | Radix `DropdownMenu.SubContent` | Su Esc chiama `onClose()` della radice: chiude l'intero albero di menu. |
| Sottomenu | `apps/web/src/componenti/BozzaMenu.tsx` (`SottoMenu`) | `DropdownMenu.Sub` controllato (`open`/`onOpenChange`); `onEscapeKeyDown` del `SubContent` impedisce la chiusura della radice (`preventDefault`), chiude solo il sottomenu e riporta il focus sulla voce che l'ha aperta. Il secondo Esc segue il comportamento Radix: chiude il menu, focus all'attivatore. |
| Prova nel browser | `apps/web/e2e/a11y003-menu-esc.e2e.ts` | Da tastiera (Invio, freccia destra) e col mouse (hover): dopo il primo Esc resta un solo `role="menu"` e il focus è su «Scambia con…»; dopo il secondo nessun menu e focus su «Modifica giorno». Prima della fix il passo «Il primo Esc chiude solo il sottomenu» falliva (`expected 0 to be 1`): `.sdlc/stories/ST-UX-003B-FIX-TB-A11Y-003/evidence/e2e-menu-esc-prima-della-fix.txt`. |
| Mappatura e2e mirati | `apps/web/e2e/e2e.config.json` | `apps/web/src/componenti/BozzaMenu.tsx` → `ux003b-bozza-menu`, `a11y003-menu-esc`. |

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Browser (e2e), caso TB-A11Y-003 | `cd apps/web && npx vitest run -c vitest.e2e.config.ts e2e/a11y003-menu-esc.e2e.ts e2e/ux003b-bozza-menu.e2e.ts` | 4 test verdi (2 flussi a 1280 px) |
| Suite web completa | `cd apps/web && npx vitest run` | 710 test verdi (102 file) |
| Tipi | `cd apps/web && npm run typecheck` | nessun errore |
| Accessibilità | `cd apps/web && npx vitest run test/ux001-ca5-axe.test.tsx` | 12 test verdi; la fix non cambia DOM visibile né etichette |

## Limiti

Il menu dell'attività non ha sottomenu: la fix riguarda solo `SottoMenu` (oggi usato da «Scambia con…» nel menu del giorno). Nessun test unitario in jsdom: Radix non gestisce lì gli eventi di tastiera dei sottomenu, la prova è nel browser.
