"use server";
/**
 * Azione lato server di "Ho un imprevisto" (REQ-IMPR-001): legge il modulo della scheda, chiede al motore la proposta
 * e apre la sua pagina (REQ-WEB-004). Con un modulo incompleto torna alla scheda con gli errori in parole semplici.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { segnalaImprevistoDaModulo } from "../../src/imprevisti/operazione";
import { PERCORSO_IMPREVISTI, percorsoScheda, trovaScheda } from "../../src/imprevisti/schede";
import { percorsoProposta } from "../../src/percorsi";
import { segnalaImprevistoSulViaggio, viaggioUtente } from "../../src/imprevisti/viaggio-utente";
import { cartellaDati } from "../../src/stato/archivio";

export async function segnalaImprevistoAzione(dati: FormData): Promise<void> {
  const campi: Record<string, string> = {};
  for (const [nome, valore] of dati.entries()) if (typeof valore === "string") campi[nome] = valore;
  const scheda = trovaScheda(campi.scheda ?? "");
  // Con un modulo incompleto la scheda si riapre con gli errori e con i dati già scritti (TB-IMPR-009).
  const { scheda: _scheda, viaggio: _viaggio, ...scritti } = campi;
  const valori = `&valori=${encodeURIComponent(JSON.stringify(scritti))}`;
  if (scheda === null) redirect(PERCORSO_IMPREVISTI);
  // ST-QA-FIX-018B: sul viaggio dell'utente la proposta si registra tra le sue e si decide dalla sua pagina.
  const proprio = viaggioUtente(cartellaDati(), campi.viaggio);
  if (proprio !== null) {
    const esito = segnalaImprevistoSulViaggio(cartellaDati(), proprio, scheda, campi);
    revalidatePath("/", "layout");
    if (!esito.ok) redirect(`${percorsoScheda(scheda.id, proprio.chiave)}&errori=${encodeURIComponent(JSON.stringify(esito.errori))}${valori}`);
    redirect(`/bozza/${encodeURIComponent(proprio.chiave)}`);
  }
  const esito = segnalaImprevistoDaModulo(cartellaDati(), scheda, campi);
  revalidatePath("/", "layout");
  if (!esito.ok) redirect(`${percorsoScheda(scheda.id)}&errori=${encodeURIComponent(JSON.stringify(esito.errori))}${valori}`);
  redirect(percorsoProposta(esito.proposta.id));
}
