"use client";

import Link from "next/link";
import { useState, type MouseEvent, type ReactNode } from "react";
import { PannelloLaterale } from "../ui/Finestra";
import { classiPulsante } from "../ui/Pulsante";

interface Proprieta {
  /** La pagina del dettaglio: senza JavaScript, o con Ctrl/Cmd+clic, il link porta lì. */
  href: string;
  titolo: string;
  descrizione?: string | undefined;
  children: ReactNode;
}

/**
 * "Dettagli" di un elemento del giorno: un link alla pagina del dettaglio che, con un clic o un tocco, apre lo stesso
 * dettaglio in un pannello (a destra sullo schermo grande, dal basso sul telefono). REQ-WEB-003, CA-4.
 */
export function ApriDettaglio({ href, titolo, descrizione, children }: Proprieta) {
  const [aperto, setAperto] = useState(false);
  const apri = (evento: MouseEvent<HTMLAnchorElement>): void => {
    if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    evento.preventDefault();
    setAperto(true);
  };
  return (
    <PannelloLaterale
      titolo={titolo}
      descrizione={descrizione}
      aperta={aperto}
      onCambia={(nuovo) => {
        // Il pannello si apre solo dal nostro clic: un clic con Ctrl o Cmd resta al browser (nuova scheda).
        if (!nuovo) setAperto(false);
      }}
      attivatore={
        <Link href={href} className={classiPulsante({ variante: "testo" }, "dettagli-apri")} aria-label={`Dettagli: ${titolo}`} onClick={apri}>
          Dettagli
        </Link>
      }
    >
      {children}
    </PannelloLaterale>
  );
}
