"use server";
/**
 * Azioni lato server della bozza (REQ-PLAN-002). Il browser chiama solo queste, che usano il motore e la base dati
 * locale. `operaBozzaAzione` accetta qualsiasi operazione del motore (`OperazioneBozza`): la stessa che userà lo
 * strumento della chat. Ogni azione restituisce un esito, mai un'eccezione.
 */
import { revalidatePath } from "next/cache";
import { servizioBozza } from "../../src/bozza/server";
import type { AlternativaVista, CambioPreferenze, ConfrontoBozzaVista, EsitoBozza, OperazioneBozza } from "../../src/bozza/tipi";
import { percorsoBozza } from "../../src/percorsi";

function aggiorna(viaggioId: string, esito: EsitoBozza): EsitoBozza {
  if (esito.ok) revalidatePath(percorsoBozza(viaggioId));
  return esito;
}

export async function operaBozzaAzione(viaggioId: string, operazione: OperazioneBozza): Promise<EsitoBozza> {
  return aggiorna(viaggioId, servizioBozza().opera(viaggioId, operazione));
}

export async function cambiaPreferenzeBozzaAzione(viaggioId: string, cambio: CambioPreferenze): Promise<EsitoBozza> {
  return aggiorna(viaggioId, servizioBozza().cambiaPreferenze(viaggioId, cambio));
}

export async function alternativeBozzaAzione(viaggioId: string, elementoId: string): Promise<AlternativaVista[]> {
  return servizioBozza().alternative(viaggioId, elementoId);
}

export async function confrontaBozzaAzione(viaggioId: string, da: number, a: number): Promise<ConfrontoBozzaVista | null> {
  return servizioBozza().confronta(viaggioId, da, a);
}

export async function confermaBozzaAzione(viaggioId: string): Promise<EsitoBozza> {
  return aggiorna(viaggioId, servizioBozza().conferma(viaggioId));
}

export async function accettaPropostaBozzaAzione(viaggioId: string, proposta: number): Promise<EsitoBozza> {
  return aggiorna(viaggioId, servizioBozza().accetta(viaggioId, proposta));
}

export async function rifiutaPropostaBozzaAzione(viaggioId: string, proposta: number): Promise<EsitoBozza> {
  return aggiorna(viaggioId, servizioBozza().rifiuta(viaggioId, proposta));
}
