/**
 * Supporto ai test di ST-PREF-001B: il percorso guidato montato nel DOM di jsdom con il servizio vero (motore e base
 * dati in una cartella temporanea), gli aiuti per compilarlo come farebbe chi lo usa e i profili di riferimento PR-1…PR-5.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BozzaProfilo, ProfiloPreferenze } from "@travelops/engine";
import { validaProfilo } from "@travelops/engine";
import { act } from "react";
import { beforeAll, beforeEach } from "vitest";
import { conBaseDati } from "../src/basedati";
import { PercorsoPreferenze } from "../src/componenti/PercorsoPreferenze";
import type { ServizioDestinazioni } from "../src/destinazioni/tipi";
import { opzioniPercorso } from "../src/preferenze/opzioni";
import { leggiProfilo } from "../src/preferenze/profilo";
import { creaServizioPreferenze } from "../src/preferenze/servizio";
import type { DestinazionePrecaricata } from "../src/preferenze/tipi";
import { attendi, clic, monta, pulsante } from "./supporto-chat";
import { sullaBaseDati } from "./supporto-stato";

export const MESI_PREFERENZE = [
  { valore: "2026-05", etichetta: "maggio 2026" },
  { valore: "2026-06", etichetta: "giugno 2026" },
  { valore: "2026-08", etichetta: "agosto 2026" },
  { valore: "2026-10", etichetta: "ottobre 2026" },
];

export interface ProfiloDiRiferimento {
  id: string;
  nome: string;
  profilo: BozzaProfilo;
}

export function profiliDiRiferimento(): ProfiloDiRiferimento[] {
  const file = join(process.cwd(), "..", "..", "packages", "engine", "test", "preferences", "dati", "profili-riferimento.json");
  return JSON.parse(readFileSync(file, "utf8")) as ProfiloDiRiferimento[];
}

/**
 * Il polyfill che serve allo slider (Radix UI) in jsdom e un percorso che riparte sempre dal primo passo: il passo
 * ricordato in sessionStorage (REQ-UX-003 CA-4) non deve passare da un test all'altro dello stesso file.
 */
export function preparaPercorso(): void {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  beforeEach(() => {
    globalThis.window?.sessionStorage.clear();
  });
}

/** Le destinazioni finte: la ricerca trova solo Lisbona, Sorprendimi propone tre idee. */
export function destinazioniFinte(): Pick<ServizioDestinazioni, "cerca" | "sorprendimi"> {
  return {
    cerca: (testo) =>
      Promise.resolve(
        testo.toLowerCase().startsWith("lis")
          ? [{ id: "osm:lisbona", nome: "Lisbona", descrizione: "Lisbona, Portogallo", centro: { lat: 38.7, lon: -9.1 } }]
          : [],
      ),
    sorprendimi: () =>
      Promise.resolve({
        esito: "proposte" as const,
        proposte: ["Alfa", "Beta", "Gamma"].map((nome) => ({
          id: `prova:${nome.toLowerCase()}`,
          nome,
          descrizione: `${nome} (DATO DI TEST)`,
          stili: ["relax" as const],
          stiliInComune: [],
          meseConsigliato: false,
        })),
      }),
  };
}

export interface PercorsoMontato {
  vista: HTMLElement;
  cartella: string;
  salvato: () => BozzaProfilo | null;
}

/** L'orologio dei test del percorso: il giorno di partenza dell'app (orologio simulato predefinito). */
export const OGGI_PREFERENZE = "2026-06-12";

export function montaPercorso(cartella: string, precaricate: readonly DestinazionePrecaricata[] = [], oggi: string = OGGI_PREFERENZE): PercorsoMontato {
  // Ogni percorso montato è un viaggiatore nuovo: il passo salvato da un test precedente (ST-UX-003A lo conserva in
  // sessionStorage, condiviso da tutti i test dello stesso file) non deve far ripartire questo da un altro passo.
  if (typeof window !== "undefined") window.sessionStorage.clear();
  const preferenze = creaServizioPreferenze((lavoro) => conBaseDati(cartella, lavoro), () => oggi);
  const vista = monta(
    <PercorsoPreferenze preferenze={preferenze} destinazioni={destinazioniFinte()} opzioni={opzioniPercorso()} mesi={MESI_PREFERENZE} oggi={oggi} precaricate={precaricate} />,
  );
  return { vista, cartella, salvato: () => sullaBaseDati(cartella, leggiProfilo) };
}

/** Le schede precaricate che hanno i nomi dei profili di riferimento con una destinazione già pronta. */
export function precaricateDeiProfili(): DestinazionePrecaricata[] {
  return profiliDiRiferimento()
    .filter((p) => p.profilo.destinazione?.tipo === "luogo" && p.id !== "PR-5")
    .map((p) => ({ id: `istantanea-${p.id}`, nome: p.profilo.destinazione?.tipo === "luogo" ? p.profilo.destinazione.nome : "" }));
}

export function titoloPasso(vista: ParentNode): string {
  return vista.querySelector("#percorso-titolo")?.textContent ?? "";
}

export async function avanti(vista: HTMLElement): Promise<void> {
  clic(pulsante(vista, "Avanti"));
  await attendi();
}

function impostaValore(campo: HTMLInputElement | HTMLSelectElement, valore: string): void {
  const prototipo = campo instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(prototipo, "value")?.set?.call(campo, valore);
    campo.dispatchEvent(new Event(campo instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
}

export function campo(vista: ParentNode, nome: string): HTMLInputElement | HTMLSelectElement {
  const trovato = vista.querySelector<HTMLInputElement | HTMLSelectElement>(`[name='${nome}']`);
  if (trovato === null) throw new Error(`manca il campo ${nome}`);
  return trovato;
}

export function scrivi(vista: ParentNode, nome: string, valore: string): void {
  impostaValore(campo(vista, nome), valore);
}

export function scegli(vista: ParentNode, nome: string, valore: string): void {
  const radio = vista.querySelector<HTMLInputElement>(`input[type='radio'][name='${nome}'][value='${valore}']`);
  if (radio === null) throw new Error(`manca la scelta ${nome}=${valore}`);
  clic(radio);
}

export function chip(vista: ParentNode, gruppo: string, etichetta: string): HTMLButtonElement {
  const g = vista.querySelector(`[role='group'][aria-label='${gruppo}']`);
  const trovato = [...(g?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((b) => b.textContent?.trim() === etichetta);
  if (trovato === undefined) throw new Error(`manca il chip ${gruppo} / ${etichetta}`);
  return trovato;
}

/** Porta un gruppo di chip esattamente a quelle voci. */
export function impostaChip(vista: ParentNode, gruppo: string, voci: readonly { etichetta: string }[], scelti: readonly string[]): void {
  for (const { etichetta } of voci) {
    const bottone = chip(vista, gruppo, etichetta);
    if ((bottone.getAttribute("aria-pressed") === "true") !== scelti.includes(etichetta)) clic(bottone);
  }
}

function tasto(elemento: Element, key: string): void {
  act(() => {
    elemento.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

/** Porta lo slider della durata a quel valore con Inizio e le frecce. */
export function impostaDurata(vista: ParentNode, giorni: number): void {
  const pomello = vista.querySelector("[role='slider']");
  if (pomello === null) throw new Error("manca lo slider");
  act(() => (pomello as HTMLElement).focus());
  tasto(pomello, "Home");
  for (let i = 2; i < giorni; i++) tasto(pomello, "ArrowRight");
}

export function premi(vista: ParentNode, etichetta: string, volte: number): void {
  const bottone = [...vista.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.getAttribute("aria-label") === etichetta);
  if (bottone === undefined) throw new Error(`manca il pulsante ${etichetta}`);
  for (let i = 0; i < volte; i++) clic(bottone);
}

const NOMI_STILI: Record<string, string> = { relax: "Relax", cultura: "Cultura", natura: "Natura", avventura: "Avventura", gastronomia: "Gastronomia", romantico: "Romantico", famiglia: "Famiglia" };
const voci = (valori: readonly string[]) => valori.map((etichetta) => ({ etichetta }));
const etichette = (valori: readonly string[]): string[] => valori.map((v) => NOMI_STILI[v] ?? v);

/** Compila il percorso passo per passo con quel profilo e preme «Crea la mia bozza». */
export async function compilaProfilo(vista: HTMLElement, profilo: BozzaProfilo): Promise<void> {
  // 1. Dove
  const destinazione = profilo.destinazione;
  if (destinazione?.tipo === "sorprendimi") clic(pulsante(vista, "Scelgo più tardi: sorprendimi"));
  else if (destinazione?.tipo === "luogo") {
    const scheda = [...vista.querySelectorAll<HTMLButtonElement>(".percorso__scheda")].find((b) => b.textContent === destinazione.nome);
    if (scheda !== undefined) clic(scheda);
    else {
      scrivi(vista, "destinazione", destinazione.nome);
      await attendi(400);
      clic(pulsante(vista, destinazione.nome));
    }
  }
  await avanti(vista);

  // 2. Quando e quanto
  const date = profilo.date;
  if (date?.tipo === "precise") {
    scrivi(vista, "dal", date.inizio);
    scrivi(vista, "al", date.fine);
  } else if (date?.tipo === "mese") {
    scegli(vista, "modo-date", "mese");
    scrivi(vista, "mese", date.mese);
    if (profilo.durata !== undefined) impostaDurata(vista, profilo.durata);
  }
  await avanti(vista);

  // 3. Chi
  if (profilo.viaggiatori?.adulti !== undefined) {
    const adulti = profilo.viaggiatori.adulti;
    if (adulti < 2) premi(vista, "Togli uno: Adulti", 2 - adulti);
    else premi(vista, "Aggiungi uno: Adulti", adulti - 2);
  }
  const bambini = profilo.viaggiatori?.bambini ?? [];
  if (bambini.length > 0) premi(vista, "Aggiungi uno: Bambini", bambini.length);
  bambini.forEach((eta, i) => scrivi(vista, `eta-${i + 1}`, String(eta)));
  if (profilo.tipoGruppo !== undefined) scegli(vista, "tipo-gruppo", profilo.tipoGruppo);
  await avanti(vista);

  // 4. Che viaggio
  if (profilo.stili !== undefined) impostaChip(vista, "Che stile di viaggio ti piace?", voci(Object.values(NOMI_STILI)), etichette(profilo.stili));
  if (profilo.ritmo !== undefined) scegli(vista, "ritmo", profilo.ritmo);
  if (profilo.formaFisica !== undefined) scegli(vista, "forma-fisica", profilo.formaFisica);
  if (profilo.budget !== undefined) scegli(vista, "budget", profilo.budget);
  await avanti(vista);

  // 5. Dettagli facoltativi
  if (profilo.orari !== undefined) scegli(vista, "orari", profilo.orari);
  if (profilo.pasti !== undefined) {
    const scelti = [profilo.pasti.pranzo === false ? "" : "Pranzo", profilo.pasti.cena === false ? "" : "Cena"].filter((x) => x !== "");
    impostaChip(vista, "Pasti nel programma", voci(["Pranzo", "Cena"]), scelti);
  }
  if (profilo.daEvitare?.stili !== undefined) impostaChip(vista, "Cosa vuoi evitare", voci(Object.values(NOMI_STILI)), etichette(profilo.daEvitare.stili));
  if (profilo.irrinunciabili?.stili !== undefined) impostaChip(vista, "Cosa non vuoi perdere", voci(Object.values(NOMI_STILI)), etichette(profilo.irrinunciabili.stili));
  clic(pulsante(vista, "Crea la mia bozza"));
  await attendi();
}

/** Il profilo validato senza i riferimenti della ricerca (nei profili di riferimento la destinazione ha solo il nome). */
export function profiloValidato(bozza: BozzaProfilo): ProfiloPreferenze {
  const esito = validaProfilo(bozza);
  if (!esito.ok) throw new Error(`profilo non valido: ${esito.problemi.map((p) => p.testo).join(" ")}`);
  const { profilo } = esito;
  return profilo.destinazione.tipo === "luogo" ? { ...profilo, destinazione: { tipo: "luogo", nome: profilo.destinazione.nome } } : profilo;
}
