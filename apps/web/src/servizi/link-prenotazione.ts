/**
 * Link di gestione delle prenotazioni (TB-REAL-005): con i voli reali non si mostra un indirizzo segnaposto dei dati di
 * esempio (domini riservati come example.com), che non porta a nessuna prenotazione vera. Con i voli finti i link di
 * esempio restano, marcati come tali dal resto dell'app. Solo lato server.
 */
import { leggiConfigurazioneServizi, type Ambiente } from "@travelops/sources";

/** Domini riservati alla documentazione (RFC 2606): sostituibili con `TRAVELOPS_DOMINI_SEGNAPOSTO` (elenco separato da virgole). */
export const DOMINI_SEGNAPOSTO_PREDEFINITI = ["example.com", "example.org", "example.net"] as const;

function dominiSegnaposto(ambiente: Ambiente): string[] {
  const voce = ambiente["TRAVELOPS_DOMINI_SEGNAPOSTO"];
  if (voce === undefined || voce.trim() === "") return [...DOMINI_SEGNAPOSTO_PREDEFINITI];
  return voce.split(",").map((d) => d.trim().toLowerCase()).filter((d) => d !== "");
}

function èSegnaposto(link: string, ambiente: Ambiente): boolean {
  try {
    const host = new URL(link).hostname.toLowerCase();
    return dominiSegnaposto(ambiente).some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/** Il link da mostrare, o `null` se manca oppure, con i voli reali, è un segnaposto. */
export function linkGestioneDaMostrare(link: string | null | undefined, ambiente: Ambiente = process.env): string | null {
  if (link === null || link === undefined) return null;
  if (leggiConfigurazioneServizi(ambiente).modalita.voli !== "reale") return link;
  return èSegnaposto(link, ambiente) ? null : link;
}
