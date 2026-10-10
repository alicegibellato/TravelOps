/**
 * Proxy di Next.js (TB-XPAGE-004): un viaggio, una bozza, una versione, un giorno o un elemento inesistenti rispondono
 * 404 con «Pagina non trovata». Il controllo avviene prima della pagina perché `app/loading.tsx` avvia lo streaming
 * con 200 e un `notFound()` nella pagina non può più cambiare lo stato della risposta.
 */
import { NextResponse, type NextRequest } from "next/server";
import { PERCORSO_NON_TROVATA, paginaEsiste } from "./src/esistenza";
import { cartellaDati } from "./src/stato/archivio";

export function proxy(richiesta: NextRequest): NextResponse {
  if (paginaEsiste(cartellaDati(), richiesta.nextUrl.pathname)) return NextResponse.next();
  return NextResponse.rewrite(new URL(PERCORSO_NON_TROVATA, richiesta.url));
}

/** Solo le pagine dinamiche con un viaggio, una bozza o una versione nel percorso (le stesse radici di `paginaEsiste`). */
export const config = {
  matcher: ["/viaggi/:percorso+", "/bozza/:percorso+", "/versioni/:percorso+"],
};
