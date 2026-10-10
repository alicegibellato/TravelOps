/**
 * Varietà della bozza (ST-UX-004A CA-1): al massimo due attività dello stesso tipo di fila e nessun tragitto lungo
 * tra attività vicine di valore simile; le soglie sono configurabili.
 */
import { describe, expect, it } from "vitest";
import {
  generaBozza,
  valutaAttivita,
  VARIETA_PREDEFINITA,
  varietaEffettiva,
  type BozzaItinerario,
  type IstantaneaCatalogo,
} from "../../src/index.js";
import { attivitaDelGiorno, istantaneaGrande, profiloDiRiferimento } from "./supporto.js";

/** Catalogo sintetico con quasi tutte le attività dello stesso tipo ("natura") e una "cultura" ogni cinque. */
function catalogoMonotono(): IstantaneaCatalogo {
  const istantanea = istantaneaGrande(40);
  let n = 0;
  for (const a of istantanea.attivita) {
    if (a.categoria === "pasto") continue;
    n += 1;
    a.categoria = n % 5 === 0 ? "cultura" : "natura";
  }
  return istantanea;
}

const profilo = profiloDiRiferimento("PR-2", (b) => {
  b.durata = 3;
  b.date = { tipo: "precise", inizio: "2026-08-03", fine: "2026-08-05" };
});

/** Le attività (pasti esclusi) di ogni giorno, nell'ordine dell'itinerario. */
const perGiorno = (istantanea: IstantaneaCatalogo, bozza: BozzaItinerario) =>
  bozza.viaggio.giorni.map((g) => attivitaDelGiorno(istantanea, g.elementi).map((x) => x.attivita));

function serieMassima(giorni: ReturnType<typeof perGiorno>): number {
  let massimo = 0;
  for (const giorno of giorni) {
    let corrente = 0;
    giorno.forEach((a, i) => {
      corrente = i > 0 && giorno[i - 1]?.categoria === a.categoria ? corrente + 1 : 1;
      massimo = Math.max(massimo, corrente);
    });
  }
  return massimo;
}

describe("CA-1 — varietà", () => {
  it("le soglie predefinite sono 2 attività dello stesso tipo e 45 minuti", () => {
    expect(VARIETA_PREDEFINITA.maxAttivitaStessoTipo).toBe(2);
    expect(VARIETA_PREDEFINITA.tragittoMassimoMinuti).toBe(45);
    expect(varietaEffettiva({ tragittoMassimoMinuti: -1, maxAttivitaStessoTipo: 0 })).toEqual(VARIETA_PREDEFINITA);
  });

  it("non mette in fila più di 2 attività dello stesso tipo", () => {
    const istantanea = catalogoMonotono();
    const libera = generaBozza(profilo, istantanea, { arrivoEPartenza: false, varieta: { maxAttivitaStessoTipo: 99 } });
    expect(serieMassima(perGiorno(istantanea, libera))).toBeGreaterThan(2);

    const bozza = generaBozza(profilo, istantanea, { arrivoEPartenza: false });
    expect(serieMassima(perGiorno(istantanea, bozza))).toBeLessThanOrEqual(2);
    expect(bozza.fattibile).toBe(true);
    expect(bozza.giorni.every((g) => g.attivita.length >= 2)).toBe(true);
  });

  it("la soglia è configurabile: con 1 non ci sono due attività dello stesso tipo vicine", () => {
    const istantanea = catalogoMonotono();
    const bozza = generaBozza(profilo, istantanea, { arrivoEPartenza: false, varieta: { maxAttivitaStessoTipo: 1 } });
    expect(serieMassima(perGiorno(istantanea, bozza))).toBeLessThanOrEqual(1);
  });

  it("se il giorno resterebbe vuoto la soglia si rilassa", () => {
    const istantanea = istantaneaGrande(10);
    for (const a of istantanea.attivita) if (a.categoria !== "pasto") a.categoria = "natura";
    const bozza = generaBozza(profilo, istantanea, { arrivoEPartenza: false, varieta: { maxAttivitaStessoTipo: 1 } });
    // Una sola categoria: ogni giorno ha comunque almeno una attività.
    expect(bozza.giorni.every((g) => g.attivita.length >= 1)).toBe(true);
  });

  it("non inserisce tragitti oltre la soglia tra attività vicine di valore simile", () => {
    const istantanea = istantaneaGrande(12);
    const lunghi = 60;
    istantanea.tempiPercorrenza = istantanea.tempiPercorrenza.map((t) => ({ ...t, minuti: lunghi }));
    const punteggio = (id: string): number => {
      const a = istantanea.attivita.find((x) => x.id === id);
      return a ? (valutaAttivita(a, profilo).punteggio ?? 0) : 0;
    };
    const vicineSimili = (bozza: BozzaItinerario): number => {
      let n = 0;
      for (const giorno of perGiorno(istantanea, bozza)) {
        giorno.forEach((a, i) => {
          const prima = giorno[i - 1];
          if (prima && Math.abs(punteggio(prima.id) - punteggio(a.id)) <= VARIETA_PREDEFINITA.differenzaValoreSimile) n += 1;
        });
      }
      return n;
    };
    const bozza = generaBozza(profilo, istantanea, { arrivoEPartenza: false });
    expect(vicineSimili(bozza)).toBe(0);

    const permissiva = generaBozza(profilo, istantanea, { arrivoEPartenza: false, varieta: { tragittoMassimoMinuti: 120 } });
    expect(vicineSimili(permissiva)).toBeGreaterThan(0);
  });

  it("stesso input, stessa bozza", () => {
    const istantanea = catalogoMonotono();
    const a = generaBozza(profilo, istantanea, { arrivoEPartenza: false });
    const b = generaBozza(profilo, istantanea, { arrivoEPartenza: false });
    expect(a).toEqual(b);
  });
});
