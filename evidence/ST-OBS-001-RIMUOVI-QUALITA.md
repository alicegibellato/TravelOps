# Prove di consegna: ST-OBS-001-RIMUOVI-QUALITA (pagina «Qualità» rimossa)

## Cosa è stato chiesto

Richiesta di Valerio (2026-10-11): rimuovere da TravelOps la scheda «Qualità», passando dal plugin e senza eseguire test.

## Perimetro ed esclusioni

- **Comprende:** rimosse la pagina `apps/web/app/qualita/page.tsx` e la route dei log `apps/web/app/qualita/log/[suite]/route.ts`; tolta la voce «Qualità» da `apps/web/src/ui/Navigazione.tsx`; tolti l'e2e `apps/web/e2e/obs001a-qualita.e2e.ts`, la sua mappatura in `apps/web/e2e/e2e.config.json` e la voce dai test del menu (`ux001-guscio-home`, `obs001b-fix-xpage005-menu-corrente`).
- **Esclude:** il modulo di lettura del report (`apps/web/src/qualita/rapporto.ts`, usato anche dalla pagina Agenti) e il componente `PaginaQualita` con il suo test.
- **Deviazioni:** cambio rispetto a REQ-OBS-001 CA-1 e CA-2 (report dei test visibile nell'app), deciso da Valerio. Nessun test eseguito, per sua richiesta.

## Prove

- Revisione del diff: nessun link o voce di menu porta più a `/qualita`.
- Screenshot del menu senza «Qualità» a 1280 px.
