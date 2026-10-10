/** Flusso 1: Preferenze, percorso guidato in 5 passi, Sorprendimi e «Crea la mia bozza». */
import { expect } from "vitest";
import { flusso } from "./flussi";
import { creaBozzaDalPercorso, testo } from "./supporto";

flusso("Flusso 1: Preferenze (percorso guidato e Sorprendimi)", async (f) => {
  const { pagina } = f;

  await f.passo("Sorprendimi propone tre idee e se ne sceglie una", async () => {
    await pagina.goto(`${f.url}/preferenze`);
    await pagina.getByRole("button", { name: "Natura", exact: true }).first().click();
    await pagina.getByRole("button", { name: "Sorprendimi", exact: true }).first().click();
    const idee = pagina.getByRole("list", { name: "Le idee per te" });
    await idee.waitFor();
    expect(await idee.getByRole("listitem").count()).toBe(3);
    await idee.getByRole("button", { name: /^Scegli / }).first().click();
    await pagina.getByText(/^Hai scelto: /).waitFor();
  });

  await creaBozzaDalPercorso(f);

  await f.passo("La bozza ha titolo, giorni e Revisione B1", async () => {
    const visto = await testo(pagina);
    expect(visto).toContain("Viaggio a Lago di Garda");
    expect(visto).toContain("Revisione B1");
    expect(visto).toContain("venerdì 10 luglio 2026");
    expect(visto).toContain("lunedì 13 luglio 2026");
  });

  await f.passo("Dopo il ricaricamento la bozza c'è ancora", async () => {
    await pagina.reload();
    expect(await testo(pagina)).toContain("Revisione B1");
  });

  await f.passo("Le preferenze salvate si ritrovano in Preferenze", async () => {
    await pagina.goto(`${f.url}/preferenze`);
    await pagina.getByText("Lago di Garda (Riva del Garda e dintorni)").first().waitFor();
    expect(await testo(pagina)).toContain("Lago di Garda");
  });
});
