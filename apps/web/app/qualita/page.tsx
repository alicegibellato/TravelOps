import type { Metadata } from "next";
import { PaginaQualita } from "../../src/componenti/PaginaQualita";
import { fusoOrario, leggiRapportoTest, percorsoRapportoTest } from "../../src/qualita/rapporto";

/** Legge il report a ogni richiesta: dopo `npm test` basta ricaricare. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Qualità dei test" };

/** L'ultimo report dei test (REQ-OBS-001): totali, esiti per suite, data, durata e log. */
export default function Qualita() {
  return <PaginaQualita esito={leggiRapportoTest(percorsoRapportoTest())} fuso={fusoOrario()} />;
}
