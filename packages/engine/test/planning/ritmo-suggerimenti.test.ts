/**
 * Giornate sotto il ritmo (TB-PLAN-007): il «Da sistemare» sul giorno non si perde quando lo stato della bozza
 * viene ricostruito dalle revisioni salvate (gli avvisi dell'operazione non vengono salvati).
 */
import { describe, expect, it } from "vitest";
import { attivitaPrevistePerGiorno, avviaBozza, revisioneCorrente, ricostruisciStatoBozza, type IstantaneaCatalogo } from "../../src/index.js";
import { attivitaDelGiorno, istantaneaPrecaricata, leggiIstantanea, profiloDiRiferimento } from "./supporto.js";

const completa: IstantaneaCatalogo = leggiIstantanea(istantaneaPrecaricata("garda-2026-10-09"));

/** Catalogo con poche visite: i giorni pieni non arrivano alle 2 del ritmo lento. */
const scarna: IstantaneaCatalogo = (() => {
  const visite = completa.attivita.filter((a) => a.categoria !== "pasto" && a.categoria !== "servizio").slice(0, 3);
  const ammesse = new Set(visite.map((a) => a.id));
  return { ...completa, attivita: completa.attivita.filter((a) => a.categoria === "pasto" || a.categoria === "servizio" || ammesse.has(a.id)) };
})();

const profilo = profiloDiRiferimento("PR-1", (b) => {
  b.ritmo = "lento";
  b.durata = 4;
  b.date = { tipo: "precise", inizio: "2026-07-10", fine: "2026-07-13" };
});

describe("giornate sotto il ritmo (TB-PLAN-007)", () => {
  const contesto = { istantanea: scarna };
  const iniziale = avviaBozza(profilo, contesto);
  const ricostruita = ricostruisciStatoBozza(
    contesto,
    iniziale.revisioni.map(({ numero, causa, viaggio, profilo: p }) => ({ numero, causa, viaggio, profilo: p })),
  );

  it.each([
    ["appena generata", iniziale],
    ["ricostruita dalle revisioni salvate", ricostruita],
  ])("ogni giorno sotto il ritmo ha un suggerimento sul giorno (%s)", (_nome, stato) => {
    const { viaggio, suggerimenti } = revisioneCorrente(stato);
    const previste = attivitaPrevistePerGiorno(profilo, true);
    const sotto = viaggio.giorni.filter((g, i) => attivitaDelGiorno(scarna, g.elementi).length < (previste[i] ?? 0));
    expect(sotto.length).toBeGreaterThan(0);
    for (const giorno of sotto) {
      expect(suggerimenti.some((s) => s.data === giorno.data), giorno.data).toBe(true);
    }
  });

  it("un giorno che arriva al ritmo non ha il suggerimento", () => {
    const piena = avviaBozza(profilo, { istantanea: completa });
    const { viaggio, suggerimenti } = revisioneCorrente(piena);
    const previste = attivitaPrevistePerGiorno(profilo, true);
    viaggio.giorni.forEach((g, i) => {
      if (attivitaDelGiorno(completa, g.elementi).length >= (previste[i] ?? 0)) {
        expect(suggerimenti.some((s) => s.data === g.data), g.data).toBe(false);
      }
    });
  });
});
