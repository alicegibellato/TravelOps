// @vitest-environment jsdom
/**
 * ST-QA-FIX-003 (collaudo TO-010, TO-013, TO-027; testbook TB-PLAN-008, TB-PLAN-009): le operazioni della bozza vanno
 * una alla volta. Un secondo clic mentre la prima è in corso, anche prima che la pagina si ridisegni con i pulsanti
 * disattivati, non applica l'operazione una seconda volta; durante l'attesa compare «Aggiorno la bozza…».
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PaginaBozza } from "../src/componenti/PaginaBozza";
import type { EsitoBozza } from "../src/bozza/tipi";
import { azioniDi, nuovaBozza, pulsanteIn } from "./supporto-bozza";
import { attendi, monta, preparaChat } from "./supporto-chat";

preparaChat();

describe("ST-QA-FIX-003 un'operazione della bozza alla volta", () => {
  it("doppio clic su «Mostrami un'alternativa»: una sola operazione, con «Aggiorno la bozza…» durante l'attesa", async () => {
    const bozza = nuovaBozza();
    const vere = azioniDi(bozza);
    let sblocca: () => void = () => undefined;
    const opera = vi.fn((operazione: Parameters<typeof vere.opera>[0]) =>
      new Promise<EsitoBozza>((fatto) => {
        sblocca = () => void vere.opera(operazione).then(fatto);
      }),
    );
    const vista = monta(<PaginaBozza vista={bozza.vista} azioni={{ ...vere, opera }} />);
    const pulsante = pulsanteIn(vista, "Mostrami un'alternativa");
    // Due clic di fila, prima che React ridisegni il pulsante disattivato.
    pulsante.click();
    pulsante.click();
    await attendi();
    expect(opera).toHaveBeenCalledTimes(1);
    expect(vista.textContent).toContain("Aggiorno la bozza…");
    sblocca();
    await attendi(50);
    expect(vista.textContent).not.toContain("Aggiorno la bozza…");
    // Finita la prima, la seconda operazione si può fare.
    pulsanteIn(vista, "Mostrami un'alternativa").click();
    await attendi();
    expect(opera).toHaveBeenCalledTimes(2);
  });

  it("l'indicatore di attesa resta visibile mentre si scorre la pagina", () => {
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
    const regola = css.slice(css.indexOf(".bozza__attesa {"), css.indexOf("}", css.indexOf(".bozza__attesa {")));
    expect(regola).toContain("position: sticky");
  });
});
