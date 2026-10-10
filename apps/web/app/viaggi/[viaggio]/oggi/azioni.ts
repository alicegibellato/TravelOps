"use server";
/**
 * Azioni lato server della vista Oggi (REQ-TODAY-001): il ritardo segnalato con i pulsanti rapidi diventa una proposta
 * del motore (`src/oggi/operazioni.ts`), che si decide nella stessa pagina delle proposte della modalità presentazione.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { segnalaRitardoDaOggi } from "../../../../src/oggi/operazioni";
import { PERCORSO_DEMO, percorsoOggi } from "../../../../src/percorsi";
import { cartellaDati } from "../../../../src/stato/archivio";

function testo(dati: FormData, nome: string): string {
  const valore = dati.get(nome);
  return typeof valore === "string" ? valore : "";
}

export async function segnalaRitardoAzione(dati: FormData): Promise<void> {
  const chiave = testo(dati, "viaggio");
  const minuti = Number(testo(dati, "minuti"));
  // Per un viaggio della base dati (REQ-UX-003) la proposta si decide nella pagina del viaggio confermato.
  const esito = segnalaRitardoDaOggi(cartellaDati(), chiave, minuti);
  revalidatePath("/", "layout");
  redirect(esito.ok ? esito.indirizzo : chiave === "" ? `${PERCORSO_DEMO}?errore=stato` : `${percorsoOggi(chiave)}?errore=ritardo`);
}
