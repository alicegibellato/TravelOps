/**
 * REQ-WEB-004 CA-3: su telefono Accetta e Rifiuta stanno in una barra fissa in basso, raggiungibili senza scorrere.
 */
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { ContenutoProposta } from "../src/componenti/ContenutiStato";
import { leggiStato } from "../src/stato/archivio";
import { accettaProposta, avviaScenario } from "../src/stato/operazioni";
import { blocchi, dichiarazioni } from "./supporto-css";
import { html } from "./supporto";
import { AZIONI_PROPOSTA, nuovaCartella, RIPRISTINA } from "./supporto-stato";
import { leggiApp } from "./supporto-ux";

describe("CA-3 su telefono Accetta e Rifiuta stanno in una barra fissa in basso", () => {
  it("CA-3 Accetta e Rifiuta sono dentro la barra della decisione, accanto l'uno all'altro", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S1");
    const d = new JSDOM(html(<ContenutoProposta esito={leggiStato(cartella)} id={1} azioni={AZIONI_PROPOSTA} ripristina={RIPRISTINA} />)).window.document;
    const barra = d.querySelector(".ui-barra-decisione");
    expect(barra?.getAttribute("role")).toBe("group");
    expect([...(barra?.querySelectorAll("button") ?? [])].map((b) => b.textContent)).toEqual(["Accetta", "Rifiuta"]);
    // Il nome di chi accetta sta fuori dalla barra (la tiene corta) ma appartiene al modulo di Accetta.
    expect(barra?.querySelector("input[name='nome']")).toBeNull();
    expect(d.querySelector("input[name='nome']")?.getAttribute("form")).toBe("modulo-accetta");
    expect(barra?.querySelector("form#modulo-accetta")).not.toBeNull();
  });

  it("CA-3 sotto i 768 px la barra è fissa in basso, a tutta larghezza; sopra segue la pagina", () => {
    const css = leggiApp("src/ui/ui.css");
    const telefono = blocchi(css, "@media (max-width: 767px)").find((b) => b.includes(".ui-barra-decisione {")) ?? "";
    const regola = telefono.slice(telefono.indexOf(".ui-barra-decisione {"));
    const d = dichiarazioni(regola.slice(0, regola.indexOf("}") + 1));
    expect(d).toContainEqual({ proprieta: "position", valore: "fixed" });
    expect(d).toContainEqual({ proprieta: "inset", valore: "auto 0 0" });
    const base = dichiarazioni(blocchi(css, ".ui-barra-decisione {")[0] ?? "");
    expect(base.some((x) => x.proprieta === "position")).toBe(false);
    // I pulsanti riempiono la barra e la pagina lascia lo spazio perché non copra la fine.
    expect(telefono).toContain(".ui-barra-decisione .ui-pulsante");
    expect(leggiApp("app/globals.css")).toMatch(/@media \(max-width: 767px\) \{\s*[^}]*\.proposta \{\s*padding-bottom:/);
  });

  it("CA-3 dopo la decisione la barra non c'è più", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S1");
    accettaProposta(cartella, 1, "Alice");
    const markup = html(<ContenutoProposta esito={leggiStato(cartella)} id={1} azioni={AZIONI_PROPOSTA} ripristina={RIPRISTINA} />);
    expect(markup).not.toContain("ui-barra-decisione");
  });
});
