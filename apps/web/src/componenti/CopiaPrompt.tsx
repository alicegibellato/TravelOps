"use client";

import { useState } from "react";
import { classiPulsante } from "../ui/Pulsante";

/** «Copia» accanto a un prompt del copione: mette il testo negli appunti e lo dice a voce con un messaggio breve. */
export function CopiaPrompt({ testo, numero }: { testo: string; numero: string }) {
  const [copiato, setCopiato] = useState(false);
  async function copia(): Promise<void> {
    try {
      await navigator.clipboard.writeText(testo);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      setCopiato(false);
    }
  }
  return (
    <>
      <button type="button" className={classiPulsante({ variante: "secondario" })} onClick={() => void copia()} data-copia={numero}>
        {copiato ? "Copiato" : "Copia"}
        <span className="ui-solo-lettori"> il prompt {numero}</span>
      </button>
      <span role="status" className="ui-solo-lettori">
        {copiato ? "Prompt copiato negli appunti" : ""}
      </span>
    </>
  );
}
