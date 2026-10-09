/**
 * Dati di contesto arricchiti con l'imprevisto e valutazione della fattibilità di una proposta
 * (REQ-REPLAN-002 R-3). Il controllo vero è quello di REQ-FEAS-001 (`controllaFattibilita`):
 * qui lo si alimenta con una sorgente che "vede" anche l'imprevisto.
 */
import { controllaFattibilita, eFattibile } from "../feasibility/index.js";
import type {
  Catalogo,
  ChiusuraStraordinaria,
  Imprevisto,
  PrevisioneMeteo,
  Problema,
  SorgenteDatiContesto,
  Viaggio,
} from "../model/index.js";
import { FINE_GIORNATA, minuti } from "./supporto.js";

/**
 * La sorgente dei dati di contesto arricchita con l'imprevisto (R-3): un `METEO_AVVERSO` vale come
 * previsione avversa nella sua zona e nel suo intervallo, una `CHIUSURA_LUOGO` come chiusura
 * straordinaria. Gli altri imprevisti non cambiano i dati di contesto. La sorgente originale non cambia.
 */
export function arricchisciSorgente(sorgente: SorgenteDatiContesto, imprevisto: Imprevisto): SorgenteDatiContesto {
  const previsioneExtra: PrevisioneMeteo | null =
    imprevisto.tipo === "METEO_AVVERSO"
      ? {
          zonaId: imprevisto.zonaId,
          data: imprevisto.data,
          inizio: imprevisto.inizio,
          fine: imprevisto.fine,
          condizione: imprevisto.condizione,
        }
      : null;
  const chiusuraExtra: ChiusuraStraordinaria | null =
    imprevisto.tipo === "CHIUSURA_LUOGO"
      ? { luogoId: imprevisto.luogoId, data: imprevisto.data, inizio: imprevisto.inizio, fine: imprevisto.fine }
      : null;

  return {
    tempoPercorrenza: (da, a, mezzo) => sorgente.tempoPercorrenza(da, a, mezzo),
    percorsoPiuVeloce: (da, a) => sorgente.percorsoPiuVeloce(da, a),
    previsioni: (zonaId, data) => {
      const base = sorgente.previsioni(zonaId, data);
      return previsioneExtra && previsioneExtra.zonaId === zonaId && previsioneExtra.data === data
        ? [...base, { ...previsioneExtra }]
        : base;
    },
    chiusure: (luogoId, data) => {
      const base = sorgente.chiusure(luogoId, data);
      return chiusuraExtra && chiusuraExtra.luogoId === luogoId && chiusuraExtra.data === data
        ? [...base, { ...chiusuraExtra }]
        : base;
    },
  };
}

/**
 * Problemi di fattibilità di un itinerario proposto, con `controllaFattibilita` (REQ-FEAS-001).
 *
 * Un posticipo può spingere un elemento oltre la mezzanotte, che il modello non ammette (§2.5):
 * quegli elementi ricevono un problema bloccante `FUORI_GIORNATA` (codice di REQ-ITIN-001) e il
 * controllo di REQ-FEAS-001 si fa sul resto della giornata.
 */
export function problemiProposta(viaggio: Viaggio, catalogo: Catalogo, sorgente: SorgenteDatiContesto): Problema[] {
  const oltre: Problema[] = [];
  const controllabile: Viaggio = {
    ...viaggio,
    giorni: viaggio.giorni.map((giorno) => ({
      ...giorno,
      elementi: giorno.elementi.filter((e) => {
        if (minuti(e.fine) <= FINE_GIORNATA) return true;
        oltre.push({
          codice: "FUORI_GIORNATA",
          gravita: "bloccante",
          elementi: [e.id],
          messaggio: `${e.id} finirebbe alle ${e.fine} del ${giorno.data}, oltre la mezzanotte: non è ammesso.`,
        });
        return false;
      }),
    })),
  };
  return [...controllaFattibilita(controllabile, catalogo, sorgente), ...oltre];
}

/**
 * Esito di R-3: nessun problema bloccante e nessun avviso `METEO_AVVERSO` sugli elementi cambiati
 * (aggiunti o modificati dalla proposta).
 */
export function propostaFattibile(problemi: readonly Problema[], cambiati: ReadonlySet<string>): boolean {
  return (
    eFattibile(problemi) &&
    !problemi.some((p) => p.codice === "METEO_AVVERSO" && p.elementi.some((id) => cambiati.has(id)))
  );
}
