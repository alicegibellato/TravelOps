"use client";

import { CalendarRange, Clock, Luggage, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PERCORSO_ITINERARIO, PERCORSO_VERSIONI } from "../percorsi";

interface Voce {
  href: string;
  etichetta: string;
  icona: LucideIcon;
  /** Gli indirizzi che appartengono alla voce (per segnare la pagina corrente). */
  attiva: (percorso: string) => boolean;
}

const VOCI: readonly Voce[] = [
  { href: "/", etichetta: "I miei viaggi", icona: Luggage, attiva: (p) => p === "/" || p.startsWith("/viaggi") },
  { href: PERCORSO_ITINERARIO, etichetta: "Itinerario corrente", icona: CalendarRange, attiva: (p) => /^\/versioni\/\d/.test(p) },
  { href: PERCORSO_VERSIONI, etichetta: "Versioni", icona: Clock, attiva: (p) => p === PERCORSO_VERSIONI },
];

/** Le sezioni dell'app; la pagina corrente è segnata con `aria-current`. */
export function Navigazione() {
  const percorso = usePathname() ?? "";
  return (
    <nav className="ui-navigazione" aria-label="Sezioni">
      <ul>
        {VOCI.map(({ href, etichetta, icona: Icona, attiva }) => (
          <li key={href}>
            <Link href={href} className="ui-navigazione__voce" aria-current={attiva(percorso) ? "page" : undefined}>
              <Icona size={18} aria-hidden="true" />
              <span>{etichetta}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
