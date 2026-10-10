// @vitest-environment jsdom
/**
 * ST-MAP-FIX-001 (REQ-WEB-001, CA-3 e CA-6): le tessere di OpenStreetMap della mappa del giorno partono con
 * `referrerpolicy="strict-origin-when-cross-origin"`, così OSM riceve l'origine della web app e non risponde 403.
 * La politica globale `Referrer-Policy: no-referrer` delle pagine resta invariata.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import configurazione from "../next.config.mjs";
import { ContenutoGiorno } from "../src/componenti/Contenuti";
import { POLITICA_REFERRER_TESSERE_OSM, URL_TESSERE_OSM } from "../src/rete";
import { datiValidi } from "./supporto";

/** Le chiamate a `L.tileLayer` fatte dalla mappa: indirizzo e opzioni, come le riceve Leaflet. */
const tessere = vi.hoisted(() => ({ chiamate: [] as { url: string; opzioni: Record<string, unknown> }[] }));

vi.mock("leaflet", async (originale) => {
  const reale = await originale<typeof import("leaflet")>();
  // A runtime il modulo CommonJS di Leaflet arriva anche come `default`, che MappaGiorno usa.
  const L = (reale as unknown as { default?: typeof reale }).default ?? reale;
  const tileLayer = (url: string, opzioni?: import("leaflet").TileLayerOptions) => {
    tessere.chiamate.push({ url, opzioni: { ...(opzioni ?? {}) } });
    return L.tileLayer(url, opzioni);
  };
  return { ...reale, default: { ...L, tileLayer }, tileLayer };
});

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.ResizeObserver ??= class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
});

let radice: Root | null = null;
let contenitore: HTMLElement | null = null;

afterEach(() => {
  act(() => radice?.unmount());
  contenitore?.remove();
  document.body.innerHTML = "";
  tessere.chiamate.length = 0;
});

async function attendi(ms = 25): Promise<void> {
  await act(async () => {
    await new Promise((fatto) => setTimeout(fatto, ms));
  });
}

/** Monta la pagina del giorno 2026-06-14 e aspetta che Leaflet abbia creato il livello delle tessere. */
async function montaGiorno(): Promise<void> {
  contenitore = document.createElement("div");
  document.body.append(contenitore);
  radice = createRoot(contenitore);
  act(() => radice?.render(<ContenutoGiorno chiave="versione-1" esito={datiValidi("versione-1")} data="2026-06-14" />));
  for (let tentativi = 0; tentativi < 40 && tessere.chiamate.length === 0; tentativi += 1) await attendi();
}

describe("ST-MAP-FIX-001 le tessere OSM della mappa del giorno partono con un referrer accettato da OSM", () => {
  it("la politica delle tessere è strict-origin-when-cross-origin", () => {
    expect(POLITICA_REFERRER_TESSERE_OSM).toBe("strict-origin-when-cross-origin");
  });

  it("la mappa del giorno passa la politica al livello delle tessere di OpenStreetMap", async () => {
    await montaGiorno();
    expect(tessere.chiamate).toHaveLength(1);
    const [chiamata] = tessere.chiamate;
    expect(chiamata?.url).toBe(URL_TESSERE_OSM);
    expect(chiamata?.opzioni.referrerPolicy).toBe(POLITICA_REFERRER_TESSERE_OSM);
  });

  it("ogni tessera creata da Leaflet con quelle opzioni ha la politica del referrer (nel browser è l'attributo referrerpolicy)", async () => {
    await montaGiorno();
    const { default: L } = await import("leaflet");
    const livello = L.tileLayer(URL_TESSERE_OSM, tessere.chiamate[0]?.opzioni);
    const tessera = (livello as unknown as { createTile(c: { x: number; y: number; z: number }, fatto: () => void): HTMLImageElement }).createTile(
      { x: 0, y: 0, z: 0 },
      () => undefined,
    );
    expect(tessera.referrerPolicy).toBe("strict-origin-when-cross-origin");
  });

  it("la politica globale delle pagine resta no-referrer", async () => {
    const intestazioni = await configurazione.headers?.();
    const valori = (intestazioni ?? []).flatMap((regola) => regola.headers).filter((h) => h.key === "Referrer-Policy");
    expect(valori.length).toBeGreaterThan(0);
    for (const { value } of valori) expect(value).toBe("no-referrer");
  });
});
