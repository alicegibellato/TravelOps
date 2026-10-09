import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { LinkPresentazione } from "./LinkPresentazione";
import { Navigazione } from "./Navigazione";
import { SelettoreTema } from "./SelettoreTema";

/** Intestazione dell'app: logo TravelOps (porta ai miei viaggi), sezioni, icona della modalità presentazione e selettore del tema. */
export function Intestazione() {
  return (
    <header className="ui-intestazione">
      <div className="ui-intestazione__riga">
        <Link href="/" className="ui-intestazione__marchio" aria-label="TravelOps, i miei viaggi">
          <Logo />
        </Link>
        <Navigazione />
        <LinkPresentazione />
        <SelettoreTema />
      </div>
    </header>
  );
}

/**
 * Il guscio di ogni pagina: link per saltare al contenuto, intestazione e contenuto principale (REQ-UX-001 §6.3).
 * Il layout di Next.js lo mette nel `<body>`; i test lo usano per disegnare le pagine complete.
 */
export function Guscio({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="ui-salta" href="#contenuto">
        Vai al contenuto
      </a>
      <Intestazione />
      <main id="contenuto" className="contenuto" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}
