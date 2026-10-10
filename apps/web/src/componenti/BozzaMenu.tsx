"use client";

import { ChevronRight } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { ReactNode } from "react";

/**
 * Menu di azioni della bozza (Radix UI DropdownMenu: ruoli ARIA `menu`/`menuitem`, frecce, Home/Fine, ricerca per
 * lettera, Esc chiude e il focus torna all'attivatore). Qui solo l'aspetto; le azioni le decide la pagina.
 */
export function MenuAzioni({
  attivatore,
  children,
  allineamento = "end",
  alChiusura,
}: {
  /** Il pulsante che apre il menu (un `<button>`). */
  attivatore: ReactNode;
  children: ReactNode;
  allineamento?: "start" | "end";
  /** Se chiamato e impedisce l'evento, il focus non torna all'attivatore (lo sposta la pagina). */
  alChiusura?: (evento: Event) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{attivatore}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="bozza__menu" align={allineamento} sideOffset={6} collisionPadding={12} {...(alChiusura === undefined ? {} : { onCloseAutoFocus: alChiusura })}>
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function VoceMenu({
  icona,
  children,
  alScelta,
  disabled = false,
  pericolosa = false,
}: {
  icona?: ReactNode;
  children: ReactNode;
  alScelta: () => void;
  disabled?: boolean;
  /** Azione che toglie qualcosa (per esempio "Rimuovi"): colore d'errore. */
  pericolosa?: boolean;
}) {
  return (
    <DropdownMenu.Item className="bozza__menu-voce" data-pericolosa={pericolosa ? "si" : undefined} disabled={disabled} onSelect={alScelta}>
      {icona !== undefined && (
        <span className="bozza__menu-icona" aria-hidden="true">
          {icona}
        </span>
      )}
      <span>{children}</span>
    </DropdownMenu.Item>
  );
}

export function SeparatoreMenu() {
  return <DropdownMenu.Separator className="bozza__menu-separatore" />;
}

/** Una voce che apre un sottomenu (per esempio "Scambia con…"). */
export function SottoMenu({ icona, etichetta, disabled = false, children }: { icona?: ReactNode; etichetta: string; disabled?: boolean; children: ReactNode }) {
  return (
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger className="bozza__menu-voce" disabled={disabled}>
        {icona !== undefined && (
          <span className="bozza__menu-icona" aria-hidden="true">
            {icona}
          </span>
        )}
        <span>{etichetta}</span>
        <ChevronRight className="bozza__menu-freccia" size={16} aria-hidden="true" />
      </DropdownMenu.SubTrigger>
      <DropdownMenu.Portal>
        <DropdownMenu.SubContent className="bozza__menu" sideOffset={4} collisionPadding={12}>
          {children}
        </DropdownMenu.SubContent>
      </DropdownMenu.Portal>
    </DropdownMenu.Sub>
  );
}
