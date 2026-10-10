/**
 * Supporto ai test di ST-CAT-002C: il servizio delle destinazioni costruito sulla sorgente registrata (nessuna rete)
 * con le istantanee di prova di `@travelops/sources` (DATI DI TEST, un borgo inventato), e gli aiuti per scrivere nel
 * campo di ricerca e premere i pulsanti nel DOM di jsdom.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { creaSorgenteRegistrata, leggiIstantaneaOppureErrore, type IstantaneaDestinazione } from "@travelops/sources";
import { act } from "react";
import { vi } from "vitest";
import { candidateConfigurate } from "../src/destinazioni/candidati";
import { creaServizioDestinazioni } from "../src/destinazioni/servizio";
import type { ServizioDestinazioni } from "../src/destinazioni/tipi";

// I test girano dalla cartella della web app (in jsdom `import.meta.url` non è un file).
const FILE_PROVA = join(process.cwd(), "..", "..", "packages", "sources", "test", "dati", "prova-dato-di-test.json");

export const MESI_DI_PROVA = [
  { valore: "2026-05", etichetta: "maggio 2026" },
  { valore: "2026-06", etichetta: "giugno 2026" },
];

type Json = Record<string, unknown> & { luoghi: Record<string, unknown>[] };

function jsonProva(): Json {
  return JSON.parse(readFileSync(FILE_PROVA, "utf8")) as Json;
}

/** L'istantanea di prova completa ("Borgo di Prova"). */
export function istantaneaGrande(): IstantaneaDestinazione {
  return leggiIstantaneaOppureErrore(jsonProva());
}

/** Una frazione troppo piccola: senza ospedale non rispetta i minimi (§8.1). */
export function istantaneaPiccola(): IstantaneaDestinazione {
  const json = jsonProva();
  json["id"] = "prova-piccola";
  json["destinazione"] = "Frazione di Prova";
  json["area"] = { id: "prova:piccola", nome: "Frazione di Prova", descrizione: "Frazione di Prova (DATO DI TEST)", centro: { lat: 45.51, lon: 9.51 } };
  json.luoghi = json.luoghi.filter((l) => l["id"] !== "PROVA-OSPEDALE");
  return leggiIstantaneaOppureErrore(json, { minimi: false });
}

/** Il servizio vero (sorgente registrata e `candidates.json`), senza rete. */
export function servizioDiProva(): ServizioDestinazioni {
  return creaServizioDestinazioni({
    sorgente: creaSorgenteRegistrata({ istantanee: [istantaneaGrande(), istantaneaPiccola()] }),
    candidate: candidateConfigurate(),
  });
}

/** Scrive nel campo di ricerca come chi digita. */
export function scriviNelCampo(vista: HTMLElement, testo: string): void {
  const campo = vista.querySelector<HTMLInputElement>("input[name='destinazione']");
  if (campo === null) throw new Error("manca il campo della destinazione");
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(campo, testo);
    campo.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** Lascia finire le promesse (non i timer finti). */
export async function lasciaFinire(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

/** Avanza l'orologio finto. */
export function avanza(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}
