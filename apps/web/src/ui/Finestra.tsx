"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { ReactNode } from "react";

interface Proprieta {
  titolo: string;
  descrizione?: string | undefined;
  /** Il pulsante che apre la finestra (deve essere un elemento interattivo, per esempio un `<button>`). */
  attivatore: ReactNode;
  children?: ReactNode;
  /** Pulsanti in fondo; quelli avvolti in `ChiudiFinestra` chiudono la finestra. */
  azioni?: ReactNode;
  aperta?: boolean | undefined;
  onCambia?: ((aperta: boolean) => void) | undefined;
}

function Contenuto({
  tipo,
  titolo,
  descrizione,
  children,
  azioni,
}: Pick<Proprieta, "titolo" | "descrizione" | "children" | "azioni"> & { tipo: "modale" | "pannello" }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="ui-velo" />
      <Dialog.Content className={tipo === "modale" ? "ui-finestra" : "ui-pannello"} {...(descrizione === undefined ? { "aria-describedby": undefined } : {})}>
        <div className="ui-finestra__testa">
          <Dialog.Title className="ui-finestra__titolo">{titolo}</Dialog.Title>
          <Dialog.Close className="ui-pulsante ui-pulsante--testo ui-pulsante--icona" aria-label="Chiudi">
            <X size={20} aria-hidden="true" />
          </Dialog.Close>
        </div>
        {descrizione !== undefined && <Dialog.Description className="ui-finestra__descrizione">{descrizione}</Dialog.Description>}
        {children !== undefined && <div className="ui-finestra__corpo">{children}</div>}
        {azioni !== undefined && <div className="ui-finestra__azioni">{azioni}</div>}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

function radice({ aperta, onCambia }: Pick<Proprieta, "aperta" | "onCambia">): { open?: boolean; onOpenChange?: (aperta: boolean) => void } {
  return { ...(aperta === undefined ? {} : { open: aperta }), ...(onCambia === undefined ? {} : { onOpenChange: onCambia }) };
}

/**
 * Finestra modale (Radix UI Dialog): il focus entra nella finestra e resta lì, Esc o "Chiudi" la chiudono e il
 * focus torna al pulsante che l'ha aperta.
 */
export function FinestraModale({ titolo, descrizione, attivatore, children, azioni, aperta, onCambia }: Proprieta) {
  return (
    <Dialog.Root {...radice({ aperta, onCambia })}>
      <Dialog.Trigger asChild>{attivatore}</Dialog.Trigger>
      <Contenuto tipo="modale" titolo={titolo} descrizione={descrizione} azioni={azioni}>
        {children}
      </Contenuto>
    </Dialog.Root>
  );
}

/** Pannello laterale: a destra sullo schermo grande, dal basso (bottom sheet) sul telefono. */
export function PannelloLaterale({ titolo, descrizione, attivatore, children, azioni, aperta, onCambia }: Proprieta) {
  return (
    <Dialog.Root {...radice({ aperta, onCambia })}>
      <Dialog.Trigger asChild>{attivatore}</Dialog.Trigger>
      <Contenuto tipo="pannello" titolo={titolo} descrizione={descrizione} azioni={azioni}>
        {children}
      </Contenuto>
    </Dialog.Root>
  );
}

/** Avvolge un pulsante che, oltre alla sua azione, chiude la finestra. */
export function ChiudiFinestra({ children }: { children: ReactNode }) {
  return <Dialog.Close asChild>{children}</Dialog.Close>;
}
