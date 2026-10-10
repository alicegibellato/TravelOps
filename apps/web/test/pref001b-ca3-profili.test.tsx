// @vitest-environment jsdom
/**
 * ST-PREF-001B, CA-3 di REQ-PREF-001: ognuno dei profili PR-1…PR-5 si inserisce dal percorso guidato e il profilo
 * salvato coincide. Il componente si guida come farebbe chi lo usa (pulsanti, chip, campi, slider); poi si legge
 * il profilo dalle impostazioni e lo si confronta, validato dal motore, con quello di riferimento. L'unica
 * differenza ammessa è il riferimento (`riferimento`) che la ricerca e le schede aggiungono alla destinazione.
 */
import { describe, expect, it } from "vitest";
import { preparaChat } from "./supporto-chat";
import { compilaProfilo, montaPercorso, precaricateDeiProfili, preparaPercorso, profiliDiRiferimento, profiloValidato } from "./supporto-preferenze";
import { nuovaCartella } from "./supporto-stato";

preparaChat();
preparaPercorso();

describe("CA-3 i profili di riferimento dal percorso guidato", () => {
  it.each(profiliDiRiferimento().map((p) => [p.id, p.nome, p] as const))("CA-3 %s (%s): il profilo salvato coincide", async (_id, _nome, riferimento) => {
    const { vista, salvato } = montaPercorso(nuovaCartella(), precaricateDeiProfili());
    await compilaProfilo(vista, riferimento.profilo);
    expect(vista.textContent).toContain("Preferenze salvate");
    const salvata = salvato();
    expect(salvata).not.toBeNull();
    expect(profiloValidato(salvata ?? {})).toEqual(profiloValidato(riferimento.profilo));
  });

  it("CA-3 PR-1 dalle schede: la destinazione salvata porta anche il riferimento della scheda", async () => {
    const [pr1] = profiliDiRiferimento();
    if (pr1 === undefined) throw new Error("manca PR-1");
    const { vista, salvato } = montaPercorso(nuovaCartella(), precaricateDeiProfili());
    await compilaProfilo(vista, pr1.profilo);
    expect(salvato()?.destinazione).toEqual({ tipo: "luogo", nome: "Lago di Garda (Riva del Garda e dintorni)", riferimento: "istantanea-PR-1" });
  });

  it("CA-3 PR-5 dalla ricerca: «Lisbona» viene dai suggerimenti della ricerca", async () => {
    const pr5 = profiliDiRiferimento().find((p) => p.id === "PR-5");
    if (pr5 === undefined) throw new Error("manca PR-5");
    const { vista, salvato } = montaPercorso(nuovaCartella(), []);
    await compilaProfilo(vista, pr5.profilo);
    expect(salvato()?.destinazione).toEqual({ tipo: "luogo", nome: "Lisbona", riferimento: "osm:lisbona" });
  });
});
