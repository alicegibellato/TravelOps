import { leggiLog, leggiRapportoTest, percorsoLog, percorsoRapportoTest } from "../../../../src/qualita/rapporto";

/** Legge il report a ogni richiesta. */
export const dynamic = "force-dynamic";

const INTESTAZIONI = { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" };

/** Il log di una suite del report, in testo semplice. Il file si trova solo tramite il report e solo dentro la sua cartella. */
export async function GET(_richiesta: Request, contesto: { params: Promise<{ suite: string }> }): Promise<Response> {
  const { suite: id } = await contesto.params;
  const percorso = percorsoRapportoTest();
  const esito = leggiRapportoTest(percorso);
  const suite = esito.stato === "ok" ? esito.rapporto.suite.find((s) => s.id === id) : undefined;
  const file = suite === undefined ? null : percorsoLog(percorso, suite);
  const testo = file === null ? null : leggiLog(file);
  if (testo === null) return new Response("Log non disponibile.\n", { status: 404, headers: INTESTAZIONI });
  return new Response(testo, { status: 200, headers: INTESTAZIONI });
}
