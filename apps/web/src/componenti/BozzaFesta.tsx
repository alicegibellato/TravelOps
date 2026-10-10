"use client";

import { PartyPopper, X } from "lucide-react";
import { useEffect } from "react";

/** Coriandoli decorativi della festa: solo forma e colore dei token, nessun testo. Con movimento ridotto non si vedono. */
const CORIANDOLI = ["primario", "accento", "successo", "secondario", "attenzione", "info", "primario", "accento", "successo", "secondario", "attenzione", "info"];

/**
 * La festa della conferma: un solo controllo per chiuderla (il pulsante «Chiudi» o il tasto Esc). I coriandoli
 * sono solo decorazione e si fermano da soli; con `prefers-reduced-motion` non compaiono.
 */
export function FestaConferma({ versione, alChiudi }: { versione: number; alChiudi: () => void }) {
  useEffect(() => {
    const alTasto = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") alChiudi();
    };
    document.addEventListener("keydown", alTasto);
    return () => document.removeEventListener("keydown", alTasto);
  }, [alChiudi]);
  return (
    <div className="bozza__festa" role="status">
      <div className="bozza__coriandoli" aria-hidden="true">
        {CORIANDOLI.map((tono, i) => (
          <span key={i} data-tono={tono} />
        ))}
      </div>
      <button type="button" className="ui-pulsante ui-pulsante--testo ui-pulsante--icona bozza__festa-chiudi" aria-label="Chiudi" onClick={alChiudi}>
        <X size={20} aria-hidden="true" />
      </button>
      <PartyPopper className="bozza__festa-icona" size={32} aria-hidden="true" />
      <p className="bozza__festa-titolo">Buon viaggio!</p>
      <p>L&apos;itinerario è confermato: è la versione {versione}. Da adesso ogni modifica diventa una proposta da accettare.</p>
    </div>
  );
}
