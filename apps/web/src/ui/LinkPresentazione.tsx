"use client";

import { Presentation } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PERCORSO_DEMO } from "../percorsi";

/** L'icona nell'intestazione che porta alla modalità presentazione; la pagina corrente è segnata con `aria-current`. */
export function LinkPresentazione() {
  const percorso = usePathname() ?? "";
  return (
    <Link
      href={PERCORSO_DEMO}
      className="ui-intestazione__presentazione"
      aria-label="Modalità presentazione"
      title="Modalità presentazione"
      aria-current={percorso.startsWith(PERCORSO_DEMO) ? "page" : undefined}
    >
      <Presentation size={20} aria-hidden="true" />
    </Link>
  );
}
