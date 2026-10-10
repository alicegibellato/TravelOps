/**
 * ST-UX-003B, CB-4: l'illustrazione dei luoghi è deterministica, configurabile, locale (nessun servizio esterno) e usa solo
 * i token; il riepilogo delle preferenze è fatto di chip.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IllustrazioneLuogo } from "../src/ui/IllustrazioneLuogo";
import { TIPI_LUOGO, tipoDelLuogo } from "../src/ui/luoghi-config";
import { formeLuogo } from "../src/ui/luogo-forme";
import { LUOGHI_COLORE } from "../src/ui/contrasto";
import { riepilogo } from "../src/preferenze/percorso";
import { opzioniPercorso } from "../src/preferenze/opzioni";
import { dichiarazioni } from "./supporto-css";
import { leggiApp } from "./supporto-ux";

describe("tipo di luogo dal nome", () => {
  it.each([
    ["Weekend sul Garda", "lago"],
    ["Lago di Garda (Riva del Garda e dintorni)", "lago"],
    ["Dolomiti – Val di Fassa", "montagna"],
    ["Roma", "citta"],
    ["Pioggia sul trekking", "montagna"],
    ["Cinque Terre", "mare"],
    ["Parco Pavese", "parco"],
    ["Qualcosa di sconosciuto", "generico"],
  ])("%s è %s", (nome, tipo) => {
    expect(tipoDelLuogo(nome)).toBe(tipo);
  });

  it("senza parole utili il tipo viene dallo stile di viaggio", () => {
    expect(tipoDelLuogo("Pranzo: Ristorante La Scarpetta", "cultura")).toBe("citta");
    expect(tipoDelLuogo("Pranzo: Ristorante La Scarpetta")).toBe("generico");
  });
});

describe("illustrazione generata", () => {
  it("stesso luogo, stesso disegno; semi diversi, disegni diversi; ogni tipo ha forme", () => {
    for (const tipo of TIPI_LUOGO) {
      const a = formeLuogo(tipo, "uno");
      expect(a.length).toBeGreaterThan(3);
      expect(formeLuogo(tipo, "uno")).toEqual(a);
      expect(formeLuogo(tipo, "due")).not.toEqual(a);
      for (const forma of a) expect(forma.d).not.toMatch(/NaN|undefined/);
    }
  });

  it("è decorativa, senza risorse esterne e senza colori: solo classi dei token", () => {
    const html = renderToStaticMarkup(<IllustrazioneLuogo nome="Weekend sul Garda" forma="larga" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-luogo="lago"');
    expect(html).toContain("ui-luogo--larga");
    expect(html).not.toMatch(/https?:|<img|style=|fill=|stroke=/);
  });

  it("con un'immagine locale usa l'immagine ritagliata, senza deformarla", () => {
    const html = renderToStaticMarkup(<IllustrazioneLuogo nome="Roma" immagine="/luoghi/roma.jpg" />);
    expect(html).toContain('src="/luoghi/roma.jpg"');
    expect(html).toContain('alt=""');
    const css = leggiApp("src/ui/ui.css");
    expect(css).toMatch(/\.ui-luogo__immagine \{[^}]*object-fit: cover/);
    expect(css).toMatch(/\.ui-luogo--ampia \{\s*aspect-ratio: 16 \/ 9/);
  });

  it("ogni tipo di luogo ha il suo colore e la sua tinta nei token, e i tipi dei test dei contrasti sono gli stessi", () => {
    const token = new Map(dichiarazioni(leggiApp("src/ui/token.css")).map((d) => [d.proprieta, d.valore] as const));
    expect([...LUOGHI_COLORE]).toEqual([...TIPI_LUOGO]);
    for (const tipo of TIPI_LUOGO) {
      expect(token.has(`--colore-luogo-${tipo}`)).toBe(true);
      expect(token.get(`--colore-luogo-${tipo}-tenue`)).toBeDefined();
    }
  });
});

describe("riepilogo delle preferenze", () => {
  it("distingue le scelte dai valori predefiniti, per tenere i chip pochi", () => {
    const voci = riepilogo({ destinazione: { tipo: "luogo", nome: "Lago di Garda", riferimento: "x" } }, opzioniPercorso(), []);
    const scelte = voci.filter((v) => !v.predefinita).map((v) => v.campo);
    expect(scelte).toEqual(["destinazione", "date", "durata"]);
    expect(voci.filter((v) => v.predefinita).length).toBeGreaterThan(8);
  });
});
