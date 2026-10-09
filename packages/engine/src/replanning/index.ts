/** Modulo replanning: impatto degli imprevisti e ripianificazione (REQ-REPLAN-001, REQ-REPLAN-002). */
export const MODULO_REPLANNING = "replanning" as const;

export { calcolaImpatto } from "./impatto.js";
export type { ElementoColpitoDettagliato, ImpattoDettagliato } from "./impatto.js";
