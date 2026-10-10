"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/**
 * Il menu compatto dell'intestazione (ST-UX-004B, CB-2): sotto la soglia di larghezza (`configurazione-intestazione.ts`)
 * la riga ha solo il marchio e il pulsante «Menu»; sezioni, presentazione e tema stanno nel pannello che si apre sotto.
 * Sopra la soglia il pannello è trasparente al layout (`display: contents`) e il pulsante non c'è. Esc chiude e riporta
 * il focus sul pulsante; il pannello si chiude da solo quando si cambia pagina.
 */
export function MenuIntestazione({ children }: { children: ReactNode }) {
  const id = useId();
  const [aperto, setAperto] = useState(false);
  const percorso = usePathname();
  const pulsante = useRef<HTMLButtonElement>(null);
  useEffect(() => setAperto(false), [percorso]);
  const alTasto = (evento: KeyboardEvent<HTMLElement>) => {
    if (evento.key !== "Escape" || !aperto) return;
    setAperto(false);
    pulsante.current?.focus();
  };
  return (
    <>
      <button
        ref={pulsante}
        type="button"
        className="ui-intestazione__menu-pulsante"
        aria-expanded={aperto}
        aria-controls={id}
        onClick={() => setAperto((a) => !a)}
        onKeyDown={alTasto}
      >
        {aperto ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        <span>Menu</span>
      </button>
      <div
        id={id}
        className="ui-intestazione__pannello"
        data-aperto={aperto ? "si" : "no"}
        onKeyDown={alTasto}
      >
        {children}
      </div>
    </>
  );
}
