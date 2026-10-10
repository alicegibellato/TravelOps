import type { Metadata } from "next";
import { versioneCorrente } from "@travelops/engine";
import { PaginaImprevisti } from "../../src/componenti/PaginaImprevisti";
import { precompila } from "../../src/imprevisti/modulo";
import { catalogoPerImprevisti } from "../../src/imprevisti/operazione";
import { trovaScheda } from "../../src/imprevisti/schede";
import { cartellaDati, leggiStato } from "../../src/stato/archivio";
import { segnalaImprevistoAzione } from "./azioni";

/** Legge lo stato locale (versione corrente e orologio simulato) a ogni richiesta. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Ho un imprevisto" };

interface Parametri {
  searchParams: Promise<{ scheda?: string | string[]; errori?: string | string[] }>;
}

function errori(valore: string | string[] | undefined): string[] {
  if (typeof valore !== "string") return [];
  try {
    const letti = JSON.parse(valore) as unknown;
    return Array.isArray(letti) ? letti.filter((e): e is string => typeof e === "string").slice(0, 10) : [];
  } catch {
    return [];
  }
}

/** Ho un imprevisto (REQ-IMPR-001): le schede e il modulo della scheda scelta, sulla versione corrente del viaggio. */
export default async function Imprevisti({ searchParams }: Parametri) {
  const parametri = await searchParams;
  const letto = leggiStato(cartellaDati());
  if (!letto.ok) {
    return (
      <section className="errori" role="alert">
        <h1>Ho un imprevisto</h1>
        <p>Lo stato del viaggio non è leggibile: apri la modalità presentazione e usa «Ripristina».</p>
      </section>
    );
  }
  const corrente = versioneCorrente(letto.stato.storico);
  const scheda = typeof parametri.scheda === "string" ? trovaScheda(parametri.scheda) : null;
  const aperta = scheda === null ? null : { scheda, precompilazione: precompila(scheda, corrente.viaggio, catalogoPerImprevisti(), letto.stato.orologio) };
  return (
    <PaginaImprevisti
      aperta={aperta}
      errori={errori(parametri.errori)}
      azione={segnalaImprevistoAzione}
      viaggio={`${corrente.viaggio.titolo}, versione ${corrente.numero}`}
    />
  );
}
