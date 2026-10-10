/**
 * Testi leggibili della bozza (ST-UX-004A): note "Da sapere" raggruppate (CA-2) ed etichette e cronologia delle
 * revisioni (CA-3).
 */
import { describe, expect, it } from "vitest";
import {
  applicaOperazioneBozza,
  avviaBozza,
  cronologiaBozza,
  etichettaRevisione,
  raggruppaNoteBozza,
  revisioneCorrente,
  type OperazioneBozza,
  type StatoBozza,
} from "../../src/index.js";
import { istantaneaDiProva, istantaneaPrecaricata, leggiIstantanea, profiloDiRiferimento } from "./supporto.js";

describe("CA-2 — note raggruppate", () => {
  it("gli orari non verificati sono una sola nota con l'elenco dei luoghi, senza ripetizioni", () => {
    const istantanea = leggiIstantanea(istantaneaPrecaricata("garda-2026-10-09"));
    const contesto = { istantanea };
    const stato = avviaBozza(profiloDiRiferimento("PR-1"), contesto);
    const corrente = revisioneCorrente(stato);
    const daVerificare = corrente.problemi.filter((p) => p.codice === "ORARI_DA_VERIFICARE");
    expect(daVerificare.length).toBeGreaterThan(1);

    const note = raggruppaNoteBozza({
      avvisi: ["Il 2026-06-13 non ho inserito il pranzo.", "Il 2026-06-13 non ho inserito il pranzo."],
      problemi: corrente.problemi,
      viaggio: corrente.viaggio,
      istantanea,
    });
    const nonVerificati = note.filter((n) => n.includes("non sono verificati"));
    expect(nonVerificati).toHaveLength(1);
    const nomi = new Set(
      daVerificare.flatMap((p) =>
        p.elementi.map((id) => {
          const el = corrente.viaggio.giorni.flatMap((g) => g.elementi).find((e) => e.id === id);
          const attivita = el?.tipo === "attivita" ? istantanea.attivita.find((a) => a.id === el.attivitaId) : undefined;
          return istantanea.luoghi.find((l) => l.id === attivita?.luogoId)?.nome ?? "";
        }),
      ),
    );
    for (const nome of nomi) expect(nonVerificati[0]).toContain(nome);
    expect(note.filter((n) => n.startsWith("Il 2026-06-13"))).toHaveLength(1);
    expect(nonVerificati[0]).not.toMatch(/\bD\d+-E\d+\b/);
  });

  it("senza avvisi non ci sono note", () => {
    const istantanea = istantaneaDiProva();
    const stato = avviaBozza(profiloDiRiferimento("PR-1"), { istantanea });
    const corrente = revisioneCorrente(stato);
    expect(raggruppaNoteBozza({ avvisi: [], problemi: [], viaggio: corrente.viaggio, istantanea })).toEqual([]);
  });
});

describe("CA-3 — etichette e cronologia", () => {
  it("riscrive la causa di ogni operazione in un'etichetta breve", () => {
    const casi: [string, string][] = [
      ["Bozza iniziale", "Bozza iniziale"],
      ['Sostituito "Degustazione" con "Panorama" il 2026-06-13', "Sostituita Degustazione"],
      ['Tolto "Museo" dal 2026-06-15', "Tolta Museo"],
      ['Spostato "Museo" al 2026-06-15 alle 10:00', "Spostata Museo"],
      ['Aggiunto "Museo" il 2026-06-15', "Aggiunta Museo"],
      ['Aggiunto "Museo" il 2026-06-15 alle 10:00', "Aggiunta Museo"],
      ['Bloccato "Museo"', "Bloccata Museo"],
      ['Sbloccato "Museo"', "Sbloccata Museo"],
      ['Giornata del 2026-06-15 più leggera: tolto "Museo"', "Più leggera lunedì"],
      ['Giornata del 2026-06-16 più piena: aggiunto "Museo"', "Più piena martedì"],
      ["Rigenerata la giornata del 2026-06-17", "Rigenerata mercoledì"],
      ["Scambiati i giorni 2026-06-15 e 2026-06-18", "Scambiati lunedì e giovedì"],
      ["Cambiate le preferenze: rigenerato il viaggio tenendo le attività bloccate", "Preferenze cambiate"],
      ["Un'alternativa con attività diverse, tenendo quelle bloccate", "Alternativa con altre attività"],
      ['Annullata la modifica "Tolto"', "Modifica annullata"],
      ["Tornato alla revisione B1", "Ripristino di una versione precedente"],
      ["Una causa mai vista", "Una causa mai vista"],
    ];
    for (const [causa, etichetta] of casi) expect(etichettaRevisione(causa)).toBe(etichetta);
  });

  it("la cronologia di una bozza vera non mostra codici B1…Bn né id tecnici", () => {
    const istantanea = istantaneaDiProva();
    const contesto = { istantanea };
    let stato: StatoBozza = avviaBozza(profiloDiRiferimento("PR-1"), contesto);
    const data = revisioneCorrente(stato).viaggio.giorni[1]!.data;
    for (const operazione of [
      { tipo: "giornata_piu_leggera", data },
      { tipo: "rigenera_giorno", data },
      { tipo: "annulla" },
    ] satisfies OperazioneBozza[]) {
      const esito = applicaOperazioneBozza(stato, contesto, operazione);
      expect(esito.ok).toBe(true);
      if (esito.ok) stato = esito.stato;
    }
    const voci = cronologiaBozza(stato.revisioni);
    expect(voci.map((v) => v.numero)).toEqual([1, 2, 3, 4]);
    expect(voci[0]?.etichetta).toBe("Bozza iniziale");
    expect(voci[1]?.etichetta).toMatch(/^Più leggera /);
    expect(voci[2]?.etichetta).toMatch(/^Rigenerata /);
    expect(voci[3]?.etichetta).toBe("Modifica annullata");
    for (const v of voci) {
      expect(`${v.etichetta} ${v.dettaglio}`).not.toMatch(/\bB\d+\b/);
      expect(`${v.etichetta} ${v.dettaglio}`).not.toMatch(/\b(D\d+-E\d+|N\d+)\b/);
    }
    expect(voci[3]?.dettaglio).toContain("tornato a «");
  });
});
