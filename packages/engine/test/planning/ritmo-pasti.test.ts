/**
 * Bozza sul Garda (TB-PLAN-007): nessun ristorante ripetuto nello stesso giorno quando il catalogo ha un'alternativa,
 * attività del giorno pari al ritmo quando il catalogo lo permette; altrimenti un avviso esplicito («Da sistemare»).
 */
import { describe, expect, it } from "vitest";
import { generaBozza, type BozzaItinerario, type IstantaneaCatalogo } from "../../src/index.js";
import { attivitaDelViaggio, istantaneaPrecaricata, leggiIstantanea, profiloDiRiferimento } from "./supporto.js";

const istantanea: IstantaneaCatalogo = leggiIstantanea(istantaneaPrecaricata("garda-2026-10-09"));

function bozzaGarda(ritmo: "lento" | "bilanciato"): BozzaItinerario {
  const profilo = profiloDiRiferimento("PR-1", (b) => {
    b.ritmo = ritmo;
    b.durata = 4;
    b.date = { tipo: "precise", inizio: "2026-07-10", fine: "2026-07-13" };
  });
  return generaBozza(profilo, istantanea);
}

const categoriaDi = (id: string): string | undefined => istantanea.attivita.find((a) => a.id === id)?.categoria;

describe.each(["lento", "bilanciato"] as const)("Garda 10-13 luglio, ritmo %s (TB-PLAN-007)", (ritmo) => {
  const bozza = bozzaGarda(ritmo);

  it("non ripete lo stesso ristorante a pranzo e a cena nello stesso giorno", () => {
    for (const giorno of bozza.viaggio.giorni) {
      const ristoranti = giorno.elementi.flatMap((e) => (e.tipo === "attivita" && categoriaDi(e.attivitaId) === "pasto" ? [e.attivitaId] : []));
      expect(new Set(ristoranti).size, `${giorno.data}: ${ristoranti.join(", ")}`).toBe(ristoranti.length);
    }
  });

  it("ogni giorno ha le attività del ritmo, oppure un avviso sul giorno", () => {
    for (const giorno of bozza.giorni) {
      const scelte = giorno.attivita.length;
      if (scelte >= giorno.attivitaPreviste) continue;
      expect(bozza.avvisi.some((a) => a.includes(giorno.data)), `${giorno.data}: ${scelte}/${giorno.attivitaPreviste}`).toBe(true);
    }
  });

  it("è deterministica", () => {
    expect(bozzaGarda(ritmo)).toEqual(bozza);
    expect(attivitaDelViaggio(bozza.viaggio).length).toBeGreaterThan(0);
  });
});

describe("Garda con un solo ristorante ammesso (TB-PLAN-007)", () => {
  it("lo ripete nel giorno e lo segnala negli avvisi", () => {
    const unico = istantanea.attivita.find((a) => a.categoria === "pasto");
    const ridotta: IstantaneaCatalogo = { ...istantanea, attivita: istantanea.attivita.filter((a) => a.categoria !== "pasto" || a.id === unico?.id) };
    const profilo = profiloDiRiferimento("PR-1", (b) => {
      b.ritmo = "lento";
      b.durata = 4;
      b.date = { tipo: "precise", inizio: "2026-07-10", fine: "2026-07-13" };
    });
    const bozza = generaBozza(profilo, ridotta);
    const ripetuti = bozza.giorni.filter((g) => g.pasti.pranzo !== null && g.pasti.pranzo === g.pasti.cena);
    expect(ripetuti.length).toBeGreaterThan(0);
    for (const g of ripetuti) {
      expect(bozza.avvisi.some((a) => a.includes(g.data) && a.includes("stesso ristorante"))).toBe(true);
    }
  });
});
