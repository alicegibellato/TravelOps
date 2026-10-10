/**
 * «Scambia con…» (REQ-PLAN-002, collaudo TB-PLAN-005): i due giorni si scambiano il programma senza perdere attività
 * e con gli stessi ristoranti, solo spostati di giorno; vale anche per il primo giorno, quello dell'arrivo. Un'attività
 * che non può stare nel nuovo giorno resta nel suo con un avviso; se non entra in nessuno dei due lo scambio è rifiutato.
 */
import { describe, expect, it } from "vitest";
import {
  applicaOperazioneBozza,
  avviaBozza,
  FINESTRE_PASTI,
  revisioneCorrente,
  validaItinerario,
  type IstantaneaCatalogo,
  type Viaggio,
} from "../../src/index.js";
import { CASI_ISTANTANEE, esisteFile, istantaneaPrecaricata, leggiIstantanea, profiloDiRiferimento } from "./supporto.js";

type Pasto = keyof typeof FINESTRE_PASTI;

/** Attività (pasti e servizi esclusi) e ristorante di ogni pasto di un giorno. */
function programma(istantanea: IstantaneaCatalogo, viaggio: Viaggio, data: string): { attivita: string[]; ristoranti: Partial<Record<Pasto, string>> } {
  const attivita: string[] = [];
  const ristoranti: Partial<Record<Pasto, string>> = {};
  for (const e of viaggio.giorni.find((g) => g.data === data)?.elementi ?? []) {
    if (e.tipo !== "attivita") continue;
    const categoria = istantanea.attivita.find((a) => a.id === e.attivitaId)?.categoria;
    if (categoria === "servizio") continue;
    if (categoria !== "pasto") {
      attivita.push(e.attivitaId);
      continue;
    }
    for (const [pasto, fascia] of Object.entries(FINESTRE_PASTI) as [Pasto, { inizio: string; fine: string }][]) {
      if (e.inizio >= fascia.inizio && e.inizio <= fascia.fine) ristoranti[pasto] = e.attivitaId;
    }
  }
  return { attivita: attivita.sort(), ristoranti };
}

const nomeDi = (istantanea: IstantaneaCatalogo, id: string): string => istantanea.attivita.find((a) => a.id === id)?.nome ?? id;
const bloccanti = (viaggio: Viaggio, istantanea: IstantaneaCatalogo): number =>
  validaItinerario(viaggio, istantanea).filter((p) => p.gravita === "bloccante").length;

describe("Scambia con… non perde attività né cambia ristoranti (TB-PLAN-005)", () => {
  it("sul Garda (PR-1) il giorno dell'arrivo e il secondo si scambiano esattamente attività e ristoranti", () => {
    const istantanea = leggiIstantanea(istantaneaPrecaricata("garda-2026-10-09"));
    const contesto = { istantanea };
    const stato = avviaBozza(profiloDiRiferimento("PR-1"), contesto);
    const prima = revisioneCorrente(stato).viaggio;
    const [a, b] = [prima.giorni[0]!.data, prima.giorni[1]!.data];
    const esito = applicaOperazioneBozza(stato, contesto, { tipo: "scambia_giorni", data: a, conData: b });
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    const dopo = esito.revisione.viaggio;
    expect(programma(istantanea, dopo, a)).toEqual(programma(istantanea, prima, b));
    expect(programma(istantanea, dopo, b)).toEqual(programma(istantanea, prima, a));
    expect(esito.revisione.causa).toBe(`Scambiati i giorni ${a} e ${b}`);
  });

  for (const caso of CASI_ISTANTANEE.filter((c) => esisteFile(c.file))) {
    for (const [i, j] of [
      [0, 1],
      [1, 2],
      [0, 2],
    ] as const) {
      it(`${caso.profilo} su ${caso.file.split("/").pop()}: giorno ${i + 1} con giorno ${j + 1}`, () => {
        const istantanea = leggiIstantanea(caso.file);
        const contesto = { istantanea };
        const stato = avviaBozza(profiloDiRiferimento(caso.profilo), contesto);
        const prima = revisioneCorrente(stato).viaggio;
        const a = prima.giorni[i]?.data;
        const b = prima.giorni[j]?.data;
        if (a === undefined || b === undefined) return;
        const esito = applicaOperazioneBozza(stato, contesto, { tipo: "scambia_giorni", data: a, conData: b });
        if (!esito.ok) {
          // Rifiutato solo se un'attività andrebbe persa; nessuna revisione nuova.
          expect(esito.motivo).toMatch(/^Non posso scambiare .+ non entrerebbe più in nessuno dei due giorni\.$/);
          return;
        }
        const dopo = esito.revisione.viaggio;
        const avvisi = esito.revisione.avvisi.join("\n");
        const [pa, pb, da, db] = [programma(istantanea, prima, a), programma(istantanea, prima, b), programma(istantanea, dopo, a), programma(istantanea, dopo, b)];
        // Nessuna attività persa: il totale dei due giorni è identico.
        expect([...da.attivita, ...db.attivita].sort()).toEqual([...pa.attivita, ...pb.attivita].sort());
        // Ogni attività è passata all'altro giorno, oppure resta nel suo e un avviso lo dice.
        for (const [giorno, attuale, proprie, altro] of [
          [a, da, pa, b],
          [b, db, pb, a],
        ] as const) {
          for (const id of attuale.attivita.filter((x) => proprie.attivita.includes(x))) {
            expect(avvisi).toContain(`"${nomeDi(istantanea, id)}" resta il ${giorno}: il ${altro} non entra nella giornata.`);
          }
        }
        // I ristoranti passano di giorno con il programma, salvo un avviso che dice perché no.
        for (const [giorno, attuale, origine] of [
          [a, da, pb],
          [b, db, pa],
        ] as const) {
          for (const pasto of Object.keys(origine.ristoranti) as Pasto[]) {
            const voluto = origine.ristoranti[pasto];
            const scelto = attuale.ristoranti[pasto];
            if (voluto === undefined || scelto === undefined || voluto === scelto) continue;
            expect(avvisi).toContain(`Il ${giorno} "${nomeDi(istantanea, voluto)}" non è disponibile`);
          }
        }
        // Gli altri giorni non cambiano e non nascono problemi bloccanti nuovi.
        for (const g of prima.giorni.filter((x) => x.data !== a && x.data !== b)) {
          expect(dopo.giorni.find((x) => x.data === g.data)).toEqual(g);
        }
        expect(bloccanti(dopo, istantanea)).toBeLessThanOrEqual(bloccanti(prima, istantanea));
      });
    }
  }
});
