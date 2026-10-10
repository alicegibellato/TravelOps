/**
 * Configurazione dell'intestazione (ST-UX-004B, CB-2). Sostituibile senza toccare i componenti.
 */

/** Sotto questa larghezza (px) le sezioni, il link alla presentazione e il selettore del tema stanno in un menu compatto. */
export const SOGLIA_MENU_COMPATTO_PX = 1100;

/**
 * Le regole che attivano il menu compatto sotto la soglia (e il pannello trasparente sopra); il resto dello stile sta in
 * `ui.css`. Generate dalla soglia, così cambiarla non richiede di toccare il foglio di stile.
 */
export function regoleMenuCompatto(soglia: number = SOGLIA_MENU_COMPATTO_PX): string {
  const compatto = [
    ".ui-intestazione__menu-pulsante{display:inline-flex}",
    '.ui-intestazione__pannello{display:none;position:absolute;top:100%;left:0;right:0;flex-direction:column;align-items:stretch;gap:var(--spazio-3);padding:var(--spazio-3) var(--spazio-4);background:var(--colore-superficie);border-bottom:var(--bordo-sottile) solid var(--colore-bordo);box-shadow:var(--elevazione-3)}',
    '.ui-intestazione__pannello[data-aperto="si"]{display:flex}',
    ".ui-navigazione ul{flex-direction:column;flex-wrap:nowrap}",
    ".ui-intestazione__presentazione{width:auto;margin-left:0;padding:0 var(--spazio-3);justify-content:flex-start;gap:var(--spazio-2)}",
    ".ui-intestazione__presentazione::after{content:attr(title);font-size:var(--testo-s);font-weight:var(--peso-medio)}",
    ".ui-selettore-tema{align-self:flex-start;margin:0}",
  ].join("");
  return `@media (max-width: ${soglia - 1}px){${compatto}}@media (min-width: ${soglia}px){.ui-intestazione__pannello{display:contents}}`;
}
