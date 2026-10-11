"use client";

import { CalendarRange, Clock, Compass, Luggage, type LucideIcon } from "lucide-react";
import { Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PERCORSO_DESTINAZIONE, PERCORSO_ITINERARIO, PERCORSO_VERSIONI } from "../percorsi";
import { PERCORSO_OGGI } from "../percorsi";

interface Voce {
  href: string;
  etichetta: string;
  icona: LucideIcon;
  /** Gli indirizzi che appartengono alla voce (per segnare la pagina corrente). */
  attiva: (percorso: string) => boolean;
}

/** «Oggi» di un viaggio (`/viaggi/<chiave>/oggi`): appartiene alla voce «Oggi», non a «I miei viaggi» (TB-XPAGE-005). */
const OGGI_DI_UN_VIAGGIO = /^\/viaggi\/[^/]+\/oggi$/;

const VOCI: readonly Voce[] = [
  { href: "/", etichetta: "I miei viaggi", icona: Luggage, attiva: (p) => p === "/" || (p.startsWith("/viaggi") && !OGGI_DI_UN_VIAGGIO.test(p)) },
  { href: PERCORSO_DESTINAZIONE, etichetta: "Destinazione", icona: Compass, attiva: (p) => p === PERCORSO_DESTINAZIONE },
  { href: PERCORSO_ITINERARIO, etichetta: "Itinerario corrente", icona: CalendarRange, attiva: (p) => /^\/versioni\/\d/.test(p) },
  { href: PERCORSO_VERSIONI, etichetta: "Versioni", icona: Clock, attiva: (p) => p === PERCORSO_VERSIONI },
  { href: PERCORSO_OGGI, etichetta: "Oggi", icona: Sun, attiva: (p) => p === PERCORSO_OGGI || OGGI_DI_UN_VIAGGIO.test(p) },
];

/** Le sezioni dell'app; la pagina corrente è segnata con `aria-current`, su una sola voce (la prima che corrisponde). */
export function Navigazione() {
  const percorso = usePathname() ?? "";
  const corrente = VOCI.find((voce) => voce.attiva(percorso))?.href;
  return (
    <nav className="ui-navigazione" aria-label="Sezioni">
      <ul>
        {VOCI.map(({ href, etichetta, icona: Icona }) => (
          <li key={href}>
            <Link href={href} className="ui-navigazione__voce" aria-current={href === corrente ? "page" : undefined}>
              <Icona size={18} aria-hidden="true" />
              <span>{etichetta}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
