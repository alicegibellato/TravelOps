/**
 * Avviso sul ritmo (TB-PLAN-011): aggiungere attività a un giorno oltre il ritmo scelto lo segnala in "Da sapere".
 */
import { describe, expect, it } from "vitest";
import {
  applicaOperazioneBozza,
  avviaBozza,
  revisioneCorrente,
  type ContestoBozza,
  type Elemento,
  type StatoBozza,
} from "../../src/index.js";
import { istantaneaDiProva, profiloDiRiferimento } from "./supporto.js";

type ElementoAttivita = Extract<Elemento, { tipo: "attivita" }>;

describe("avviso di giornata oltre il ritmo (TB-PLAN-011)", () => {
  it("con ritmo Lento, la terza attività di un giorno produce un avviso che dice cosa fare", () => {
    const istantanea = istantaneaDiProva();
    const contesto: ContestoBozza = { istantanea };
    const profilo = profiloDiRiferimento("PR-1", (b) => {
      b.ritmo = "lento";
    });
    let stato: StatoBozza = avviaBozza(profilo, contesto);
    const data = revisioneCorrente(stato).viaggio.giorni[1]!.data;
    const daScegliere = (id: string): boolean => {
      const c = istantanea.attivita.find((a) => a.id === id)?.categoria;
      return c !== "pasto" && c !== "servizio";
    };
    const nelGiorno = (): number =>
      (revisioneCorrente(stato).viaggio.giorni.find((g) => g.data === data)?.elementi ?? []).filter(
        (e): e is ElementoAttivita => e.tipo === "attivita" && daScegliere(e.attivitaId),
      ).length;

    expect(revisioneCorrente(stato).avvisi.some((a) => /ritmo/.test(a))).toBe(false);
    let ultimo = revisioneCorrente(stato).avvisi;
    for (const a of istantanea.attivita) {
      if (nelGiorno() > 2) break;
      if (!daScegliere(a.id)) continue;
      const usate = revisioneCorrente(stato).viaggio.giorni.flatMap((g) => g.elementi.flatMap((e) => (e.tipo === "attivita" ? [e.attivitaId] : [])));
      if (usate.includes(a.id)) continue;
      const esito = applicaOperazioneBozza(stato, contesto, { tipo: "aggiungi", data, attivitaId: a.id });
      if (!esito.ok) continue;
      stato = esito.stato;
      ultimo = revisioneCorrente(stato).avvisi;
    }
    expect(nelGiorno()).toBeGreaterThan(2);
    const avviso = ultimo.find((a) => /ritmo/.test(a));
    expect(avviso).toMatch(/ha \d+ attività: il ritmo scelto ne prevede 2\. Togline una o cambia ritmo\.$/);
  });
});
