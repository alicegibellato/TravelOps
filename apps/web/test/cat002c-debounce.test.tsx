// @vitest-environment jsdom
/**
 * ST-CAT-002C, criterio 1: la ricerca della destinazione dà suggerimenti mentre si scrive, aspettando almeno 300 ms
 * tra una battuta e la ricerca (debounce). Orologio finto: nessuna attesa vera, nessuna rete.
 */
import { LUNGHEZZA_MINIMA_RICERCA as MINIMA_DELLA_SORGENTE } from "@travelops/sources";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SceltaDestinazione } from "../src/componenti/SceltaDestinazione";
import { ATTESA_RICERCA_MS, LUNGHEZZA_MINIMA_RICERCA, type ServizioDestinazioni, type Suggerimento } from "../src/destinazioni/tipi";
import { monta, preparaChat } from "./supporto-chat";
import { avanza, lasciaFinire, MESI_DI_PROVA, scriviNelCampo } from "./supporto-destinazioni";

preparaChat();

const ROMA: Suggerimento = { id: "osm:relation/1", nome: "Roma", descrizione: "Roma, Lazio, Italia", centro: { lat: 41.9, lon: 12.5 } };

function servizioFinto(risposte: (testo: string) => Promise<Suggerimento[]> = () => Promise.resolve([ROMA])) {
  const cerca = vi.fn(risposte);
  const servizio: ServizioDestinazioni = {
    cerca,
    costruisci: () => Promise.reject(new Error("non serve")),
    sorprendimi: () => Promise.reject(new Error("non serve")),
  };
  return { cerca, servizio };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CA-1 ricerca con suggerimenti e attesa tra una battuta e la ricerca", () => {
  it("l'attesa è di almeno 300 ms", () => {
    expect(ATTESA_RICERCA_MS).toBeGreaterThanOrEqual(300);
    expect(LUNGHEZZA_MINIMA_RICERCA).toBe(MINIMA_DELLA_SORGENTE);
  });

  it("la ricerca parte solo dopo l'attesa dall'ultima battuta", async () => {
    const { cerca, servizio } = servizioFinto();
    const vista = monta(<SceltaDestinazione servizio={servizio} mesi={MESI_DI_PROVA} />);
    scriviNelCampo(vista, "Rom");
    avanza(ATTESA_RICERCA_MS - 1);
    expect(cerca).not.toHaveBeenCalled();
    avanza(1);
    expect(cerca).toHaveBeenCalledTimes(1);
    expect(cerca).toHaveBeenCalledWith("Rom");
    await lasciaFinire();
  });

  it("ogni battuta riparte da capo: scrivendo di continuo si fa una sola ricerca, con il testo finale", async () => {
    const { cerca, servizio } = servizioFinto();
    const vista = monta(<SceltaDestinazione servizio={servizio} mesi={MESI_DI_PROVA} />);
    scriviNelCampo(vista, "Ro");
    avanza(200);
    scriviNelCampo(vista, "Rom");
    avanza(200);
    scriviNelCampo(vista, "Roma");
    avanza(ATTESA_RICERCA_MS - 1);
    expect(cerca).not.toHaveBeenCalled();
    avanza(1);
    expect(cerca).toHaveBeenCalledTimes(1);
    expect(cerca).toHaveBeenCalledWith("Roma");
    await lasciaFinire();
  });

  it("i suggerimenti compaiono quando la ricerca risponde", async () => {
    const { servizio } = servizioFinto();
    const vista = monta(<SceltaDestinazione servizio={servizio} mesi={MESI_DI_PROVA} />);
    scriviNelCampo(vista, "Roma");
    avanza(ATTESA_RICERCA_MS);
    await lasciaFinire();
    const voci = [...vista.querySelectorAll("ul[aria-label='Destinazioni trovate'] button")].map((b) => b.textContent);
    expect(voci).toEqual(["Roma"]);
    expect(vista.querySelector(".scelta-destinazione__stato")?.textContent).toBe("Ho trovato 1 destinazione.");
  });

  it("con meno di 2 caratteri non si cerca e i suggerimenti spariscono", async () => {
    const { cerca, servizio } = servizioFinto();
    const vista = monta(<SceltaDestinazione servizio={servizio} mesi={MESI_DI_PROVA} />);
    scriviNelCampo(vista, "R");
    avanza(ATTESA_RICERCA_MS * 3);
    expect(cerca).not.toHaveBeenCalled();
    scriviNelCampo(vista, "Roma");
    avanza(ATTESA_RICERCA_MS);
    await lasciaFinire();
    expect(vista.querySelectorAll("ul[aria-label='Destinazioni trovate'] button")).toHaveLength(1);
    scriviNelCampo(vista, "R");
    avanza(ATTESA_RICERCA_MS);
    expect(vista.querySelector("ul[aria-label='Destinazioni trovate']")).toBeNull();
  });

  it("una risposta arrivata in ritardo, per un testo già superato, non sostituisce i suggerimenti", async () => {
    const sospese: ((trovati: Suggerimento[]) => void)[] = [];
    const { servizio } = servizioFinto(() => new Promise((risolvi) => sospese.push(risolvi)));
    const vista = monta(<SceltaDestinazione servizio={servizio} mesi={MESI_DI_PROVA} />);
    scriviNelCampo(vista, "Rom");
    avanza(ATTESA_RICERCA_MS);
    scriviNelCampo(vista, "Roma");
    avanza(ATTESA_RICERCA_MS);
    sospese[1]?.([ROMA]);
    await lasciaFinire();
    sospese[0]?.([{ ...ROMA, id: "x", nome: "Romano" }]);
    await lasciaFinire();
    expect([...vista.querySelectorAll("ul[aria-label='Destinazioni trovate'] button")].map((b) => b.textContent)).toEqual(["Roma"]);
  });

  it("senza risultati dice in modo gentile come andare avanti", async () => {
    const { servizio } = servizioFinto(() => Promise.resolve([]));
    const vista = monta(<SceltaDestinazione servizio={servizio} mesi={MESI_DI_PROVA} />);
    scriviNelCampo(vista, "Xyz");
    avanza(ATTESA_RICERCA_MS);
    await lasciaFinire();
    expect(vista.textContent).toContain("Non trovo destinazioni con questo nome. Controlla come l'hai scritto o prova con una città vicina.");
  });
});
