/**
 * Il copione della demo (REQ-DEMO-001, CR-001 §10): l'unica fonte è `copione.json`. La modalità presentazione lo
 * mostra con «Copia» accanto a ogni prompt, i test lo eseguono con il client finto e `docs/demo/copione-demo.md` si genera da
 * qui (`npm run copione -w @travelops/web`): nessun prompt è scritto due volte.
 */
import copione from "./copione.json";

export interface VoceCopione {
  /** Il numero nel copione: 1, 2, 3, 3b, … */
  id: string;
  /** `prompt` si incolla nella chat; `azione` si fa con i pulsanti. */
  tipo: "prompt" | "azione";
  testo: string;
  atteso: string;
}

export interface AttoCopione {
  id: string;
  titolo: string;
  contesto: string;
  voci: VoceCopione[];
}

export interface Copione {
  titolo: string;
  introduzione: string;
  atti: AttoCopione[];
}

export const COPIONE_DEMO = copione as Copione;

/** Tutte le voci, nell'ordine del copione. */
export function vociCopione(): VoceCopione[] {
  return COPIONE_DEMO.atti.flatMap((a) => a.voci);
}

/** Il testo del prompt con quel numero; solleva se non c'è o non è un prompt. */
export function promptCopione(id: string): string {
  const voce = vociCopione().find((v) => v.id === id);
  if (voce === undefined || voce.tipo !== "prompt") throw new Error(`il copione non ha il prompt ${id}`);
  return voce.testo;
}

const cella = (testo: string): string => testo.replaceAll("|", "\\|");

/** Il copione in Markdown: è il contenuto di `docs/demo/copione-demo.md`. */
export function copioneInMarkdown(c: Copione = COPIONE_DEMO): string {
  const righe = [`# ${c.titolo}`, "", c.introduzione, ""];
  for (const atto of c.atti) {
    righe.push(`## ${atto.titolo}`, "", atto.contesto, "");
    const etichetta = atto.voci.every((v) => v.tipo === "azione") ? "Azione" : "Prompt";
    righe.push(`| # | ${etichetta} | Cosa deve succedere |`, "|---|---|---|");
    for (const v of atto.voci) righe.push(`| ${v.id} | ${cella(v.testo)} | ${cella(v.atteso)} |`);
    righe.push("");
  }
  return righe.join("\n");
}
