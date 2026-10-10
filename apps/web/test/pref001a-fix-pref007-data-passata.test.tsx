// @vitest-environment jsdom
/**
 * ST-PREF-001A-FIX-TB-PREF-007 (REQ-PREF-001): un giorno di partenza precedente a oggi (orologio dell'app) non si
 * accetta: lo dice il servizio sul server, il percorso resta al passo «Quando e quanto» con l'avviso, e il campo
 * «Dal» non offre i giorni passati.
 */
import { conBaseDati } from "../src/basedati";
import { describe, expect, it } from "vitest";
import { creaServizioPreferenze } from "../src/preferenze/servizio";
import { attendi, clic, preparaChat, pulsante } from "./supporto-chat";
import { avanti, campo, montaPercorso, preparaPercorso, scrivi, titoloPasso } from "./supporto-preferenze";
import { nuovaCartella } from "./supporto-stato";

preparaChat();
preparaPercorso();

const OGGI = "2026-06-12";
const MESSAGGIO = "Il giorno di partenza è già passato: scegli una data da oggi in poi.";

const sorprendimiEDate = async (vista: HTMLElement, dal: string, al: string): Promise<void> => {
  clic(pulsante(vista, "Scelgo più tardi: sorprendimi"));
  await avanti(vista);
  scrivi(vista, "dal", dal);
  scrivi(vista, "al", al);
};

describe("TB-PREF-007 data di partenza nel passato", () => {
  it("il servizio rifiuta una partenza prima di oggi e accetta oggi e i giorni dopo", async () => {
    const servizio = creaServizioPreferenze((lavoro) => conBaseDati(nuovaCartella(), lavoro), () => OGGI);
    const bozza = (inizio: string, fine: string) => ({
      destinazione: { tipo: "sorprendimi" as const },
      date: { tipo: "precise" as const, inizio, fine },
    });
    expect((await servizio.valida(bozza("2026-06-01", "2026-06-04"))).map((p) => p.testo)).toEqual([MESSAGGIO]);
    expect(await servizio.salva(bozza("2026-06-01", "2026-06-04"))).toMatchObject({ esito: "incompleto" });
    expect(await servizio.valida(bozza("2026-06-12", "2026-06-14"))).toEqual([]);
    expect(await servizio.salva(bozza("2026-06-13", "2026-06-15"))).toEqual({ esito: "salvato" });
  });

  it("«Avanti» con «Dal» nel passato mostra l'avviso e resta al passo 2", async () => {
    const { vista } = montaPercorso(nuovaCartella(), [], OGGI);
    await sorprendimiEDate(vista, "2026-06-01", "2026-06-04");
    await avanti(vista);
    await attendi();
    expect(titoloPasso(vista)).toBe("Quando e quanto");
    expect(vista.textContent).toContain("Prima di andare avanti");
    expect(vista.textContent).toContain(MESSAGGIO);
  });

  it("con «Dal» uguale a oggi si va avanti", async () => {
    const { vista } = montaPercorso(nuovaCartella(), [], OGGI);
    await sorprendimiEDate(vista, OGGI, "2026-06-14");
    await avanti(vista);
    expect(titoloPasso(vista)).toBe("Chi");
  });

  it("il campo «Dal» ha come minimo il giorno di oggi", async () => {
    const { vista } = montaPercorso(nuovaCartella(), [], OGGI);
    clic(pulsante(vista, "Scelgo più tardi: sorprendimi"));
    await avanti(vista);
    expect((campo(vista, "dal") as HTMLInputElement).min).toBe(OGGI);
  });
});
