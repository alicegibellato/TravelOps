import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { servizioBozza } from "../../../src/bozza/server";
import { PaginaBozza } from "../../../src/componenti/PaginaBozza";
import {
  accettaPropostaBozzaAzione,
  alternativeBozzaAzione,
  cambiaPreferenzeBozzaAzione,
  confermaBozzaAzione,
  confrontaBozzaAzione,
  operaBozzaAzione,
  rifiutaPropostaBozzaAzione,
} from "../azioni";

interface Parametri {
  params: Promise<{ viaggio: string }>;
}

/** La bozza cambia a ogni operazione: la pagina si rigenera a ogni richiesta. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "La tua bozza" };

/** La bozza del viaggio: operazioni, revisioni, annulla, confronto e conferma (REQ-PLAN-002). */
export default async function Bozza({ params }: Parametri) {
  const { viaggio } = await params;
  const vista = servizioBozza().vista(viaggio);
  if (vista === null) notFound();
  const azioni = {
    opera: operaBozzaAzione.bind(null, viaggio),
    cambiaPreferenze: cambiaPreferenzeBozzaAzione.bind(null, viaggio),
    alternative: alternativeBozzaAzione.bind(null, viaggio),
    confronta: confrontaBozzaAzione.bind(null, viaggio),
    conferma: confermaBozzaAzione.bind(null, viaggio),
    accetta: accettaPropostaBozzaAzione.bind(null, viaggio),
    rifiuta: rifiutaPropostaBozzaAzione.bind(null, viaggio),
  };
  return <PaginaBozza vista={vista} azioni={azioni} />;
}
