/**
 * Tema chiaro e scuro (REQ-UX-001 §6.3): senza scelta segue il sistema; la scelta del viaggiatore si ricorda nel
 * browser (`localStorage`, solo su questo dispositivo) e si applica con `data-tema` su `<html>`.
 */

export type SceltaTema = "sistema" | "chiaro" | "scuro";

export const CHIAVE_TEMA = "travelops-tema";

/**
 * Applica il tema scelto prima che la pagina si disegni, così non si vede un lampo dell'altro tema.
 * È uno script in linea (ammesso dalla CSP della web app) che non usa la rete.
 */
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem("${CHIAVE_TEMA}");if(t==="chiaro"||t==="scuro"){document.documentElement.setAttribute("data-tema",t);}}catch(e){}})();`;

/** Il tema scelto, letto da `<html>`. */
export function temaCorrente(): SceltaTema {
  const valore = document.documentElement.getAttribute("data-tema");
  return valore === "chiaro" || valore === "scuro" ? valore : "sistema";
}

/** Applica e ricorda la scelta; se il browser non permette di ricordarla, vale comunque per questa pagina. */
export function applicaTema(scelta: SceltaTema): void {
  if (scelta === "sistema") document.documentElement.removeAttribute("data-tema");
  else document.documentElement.setAttribute("data-tema", scelta);
  try {
    if (scelta === "sistema") localStorage.removeItem(CHIAVE_TEMA);
    else localStorage.setItem(CHIAVE_TEMA, scelta);
  } catch {
    // Archiviazione non disponibile (navigazione privata, permessi): la scelta vale fino al prossimo caricamento.
  }
}
