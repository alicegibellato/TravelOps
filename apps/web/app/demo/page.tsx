import type { Metadata } from "next";
import { messaggioErrore } from "../../src/componenti/azioni";
import { ContenutoDemo } from "../../src/componenti/ContenutiStato";
import { cartellaDati, leggiStato } from "../../src/stato/archivio";
import { avviaScenarioAzione, impostaOrologioAzione, ripristinaAzione, ripristinaViaggiDemoAzione } from "./azioni";

/** Legge lo stato locale a ogni richiesta. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Modalità presentazione" };

interface Parametri {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Modalità presentazione: scenari, orologio simulato, stato locale e "Ripristina i viaggi demo". */
export default async function Demo({ searchParams }: Parametri) {
  const { errore } = await searchParams;
  return (
    <ContenutoDemo
      esito={leggiStato(cartellaDati())}
      azioni={{
        avviaScenario: avviaScenarioAzione,
        impostaOrologio: impostaOrologioAzione,
        ripristina: ripristinaAzione,
        ripristinaViaggiDemo: ripristinaViaggiDemoAzione,
      }}
      errore={messaggioErrore(errore)}
    />
  );
}
