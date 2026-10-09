"use server";
/**
 * Azioni lato server della Demo (REQ-WEB-002). Ognuna legge i campi del modulo, chiama l'operazione sullo stato
 * locale (`src/stato/operazioni.ts`, che usa il motore) e torna alla pagina da mostrare.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { numeroDaParametro, PERCORSO_DEMO, percorsoProposta } from "../../src/percorsi";
import { cartellaDati } from "../../src/stato/archivio";
import {
  accettaProposta,
  avviaScenario,
  impostaOrologio,
  rifiutaPropostaSalvata,
  ripristina,
} from "../../src/stato/operazioni";

function testo(dati: FormData, nome: string): string {
  const valore = dati.get(nome);
  return typeof valore === "string" ? valore : "";
}

function numeroProposta(dati: FormData): number | null {
  return numeroDaParametro(testo(dati, "proposta"));
}

/** Tutte le pagine leggono lo stato: dopo ogni modifica si rigenerano. */
function aggiorna(): void {
  revalidatePath("/", "layout");
}

export async function avviaScenarioAzione(dati: FormData): Promise<void> {
  const esito = avviaScenario(cartellaDati(), testo(dati, "scenario"));
  aggiorna();
  redirect(esito.ok ? percorsoProposta(esito.proposta.id) : `${PERCORSO_DEMO}?errore=scenario`);
}

export async function impostaOrologioAzione(dati: FormData): Promise<void> {
  const esito = impostaOrologio(cartellaDati(), testo(dati, "data"), testo(dati, "ora"));
  aggiorna();
  redirect(esito.ok ? PERCORSO_DEMO : `${PERCORSO_DEMO}?errore=orologio`);
}

export async function ripristinaAzione(): Promise<void> {
  ripristina(cartellaDati());
  aggiorna();
  redirect(PERCORSO_DEMO);
}

export async function accettaAzione(dati: FormData): Promise<void> {
  const id = numeroProposta(dati);
  const esito = id === null ? null : accettaProposta(cartellaDati(), id, testo(dati, "nome"));
  aggiorna();
  redirect(id !== null && esito?.ok === true ? percorsoProposta(id) : `${PERCORSO_DEMO}?errore=proposta`);
}

export async function rifiutaAzione(dati: FormData): Promise<void> {
  const id = numeroProposta(dati);
  const esito = id === null ? null : rifiutaPropostaSalvata(cartellaDati(), id);
  aggiorna();
  redirect(id !== null && esito?.ok === true ? percorsoProposta(id) : `${PERCORSO_DEMO}?errore=proposta`);
}
