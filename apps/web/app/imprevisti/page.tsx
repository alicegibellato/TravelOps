import type { Metadata } from "next";
import { versioneCorrente } from "@travelops/engine";
import { PaginaImprevisti } from "../../src/componenti/PaginaImprevisti";
import { precompila } from "../../src/imprevisti/modulo";
import { catalogoPerImprevisti } from "../../src/imprevisti/operazione";
import { trovaScheda } from "../../src/imprevisti/schede";
import { viaggioUtente } from "../../src/imprevisti/viaggio-utente";
import { cartellaDati, leggiStato } from "../../src/stato/archivio";
import { segnalaImprevistoAzione } from "./azioni";

/** Legge lo stato locale (versione corrente e orologio simulato) a ogni richiesta. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Ho un imprevisto" };

interface Parametri {
  searchParams: Promise<{ scheda?: string | string[]; errori?: string | string[]; viaggio?: string | string[]; valori?: string | string[] }>;
}

/** I dati scritti nel modulo inviato con errori (TB-IMPR-009): solo testi, al massimo 30 campi. */
function valoriScritti(valore: string | string[] | undefined): Record<string, string> {
  if (typeof valore !== "string") return {};
  try {
    const letti = JSON.parse(valore) as unknown;
    if (letti === null || typeof letti !== "object" || Array.isArray(letti)) return {};
    return Object.fromEntries(Object.entries(letti).filter((v): v is [string, string] => typeof v[1] === "string").slice(0, 30));
  } catch {
    return {};
  }
}

function conScritti<T extends { valori: Record<string, string> }>(precompilazione: T, scritti: Record<string, string>): T {
  return { ...precompilazione, valori: { ...precompilazione.valori, ...scritti } };
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
  const scheda = typeof parametri.scheda === "string" ? trovaScheda(parametri.scheda) : null;
  // ST-QA-FIX-018B: dal viaggio dell'utente la pagina lavora sul suo storico; senza, sul viaggio della presentazione.
  const proprio = viaggioUtente(cartellaDati(), typeof parametri.viaggio === "string" ? parametri.viaggio : undefined);
  if (proprio !== null) {
    const corrente = versioneCorrente(proprio.storico);
    return (
      <PaginaImprevisti
        aperta={scheda === null ? null : { scheda, precompilazione: conScritti(precompila(scheda, corrente.viaggio, proprio.catalogo, proprio.momento), valoriScritti(parametri.valori)) }}
        errori={errori(parametri.errori)}
        azione={segnalaImprevistoAzione}
        viaggio={`${proprio.titolo}, versione ${corrente.numero}`}
        chiaveViaggio={proprio.chiave}
      />
    );
  }
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
  const aperta = scheda === null ? null : { scheda, precompilazione: conScritti(precompila(scheda, corrente.viaggio, catalogoPerImprevisti(), letto.stato.orologio), valoriScritti(parametri.valori)) };
  return (
    <PaginaImprevisti
      aperta={aperta}
      errori={errori(parametri.errori)}
      azione={segnalaImprevistoAzione}
      viaggio={`${corrente.viaggio.titolo}, versione ${corrente.numero}`}
    />
  );
}
