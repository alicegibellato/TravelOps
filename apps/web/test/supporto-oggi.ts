/**
 * Supporto ai test di ST-TODAY-001 (REQ-TODAY-001): il viaggio demo TRIP-DEMO-GARDA.
 *
 * Finché REQ-DEMO-001 non costruisce il viaggio demo completo della §8.3 (voli e trekking), TRIP-DEMO-GARDA è la bozza
 * del motore (`generaBozza`) con il profilo di riferimento PR-1 sull'istantanea del Garda precaricata, come nei test
 * di REQ-REPLAN-004 (CA-6, `evidence/ST-REPLAN-004.md`).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  creaSorgenteDaDati,
  generaBozza,
  validaProfilo,
  type Catalogo,
  type IstantaneaCatalogo,
  type ProfiloPreferenze,
  type SorgenteDatiContesto,
  type Viaggio,
} from "@travelops/engine";

const FILE_PROFILI = fileURLToPath(new URL("../../../packages/engine/test/preferences/dati/profili-riferimento.json", import.meta.url));
const FILE_ISTANTANEA_GARDA = fileURLToPath(new URL("../../../packages/sources/snapshots/garda-2026-10-09.json", import.meta.url));

export interface ViaggioDemoGarda {
  viaggio: Viaggio;
  istantanea: IstantaneaCatalogo;
  /** L'istantanea usata come catalogo dalle viste (stessi campi di zone, luoghi e attività). */
  catalogo: Catalogo;
  sorgente: SorgenteDatiContesto;
  profilo: ProfiloPreferenze;
}

export function viaggioDemoGarda(): ViaggioDemoGarda {
  const profili = JSON.parse(readFileSync(FILE_PROFILI, "utf8")) as { id: string; profilo: unknown }[];
  const pr1 = profili.find((p) => p.id === "PR-1");
  if (pr1 === undefined) throw new Error("manca il profilo PR-1");
  const validato = validaProfilo(pr1.profilo);
  if (!validato.ok) throw new Error("il profilo PR-1 non è valido");
  const istantanea = JSON.parse(readFileSync(FILE_ISTANTANEA_GARDA, "utf8")) as IstantaneaCatalogo;
  const viaggio = generaBozza(validato.profilo, istantanea, { idViaggio: "TRIP-DEMO-GARDA" }).viaggio;
  const sorgente = creaSorgenteDaDati({ tempiPercorrenza: istantanea.tempiPercorrenza, previsioni: [], chiusure: [] });
  return { viaggio, istantanea, catalogo: istantanea as unknown as Catalogo, sorgente, profilo: validato.profilo };
}

/** Il nome dell'attività dell'istantanea con quell'id. */
export function nomeAttivitaGarda(istantanea: IstantaneaCatalogo, id: string): string {
  const attivita = istantanea.attivita.find((a) => a.id === id);
  if (attivita === undefined) throw new Error(`attività ${id} assente`);
  return attivita.nome;
}
