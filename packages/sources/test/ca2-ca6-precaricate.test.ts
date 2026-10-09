/**
 * CA-2 e CA-6 sulle 3 istantanee precaricate del repository (`snapshots/`):
 * - CA-2: ognuna rispetta i minimi della §8.1 (stili scarsi solo se dichiarati, con il motivo);
 * - CA-6: ogni luogo ha origine osm e un identificativo OpenStreetMap; ogni immagine ha licenza e autore;
 *   tra le fonti c'è "© OpenStreetMap contributors"; i tempi con i mezzi pubblici sono stime dichiarate.
 */
import { describe, expect, it } from "vitest";
import {
  ATTRIBUZIONE_OSM,
  controllaMinimi,
  coppieUsabili,
  DATA_ISTANTANEE_PRECARICATE,
  DESTINAZIONI_PRECARICATE,
  leggiCartellaIstantanee,
  leggiIstantanea,
  MASSIMO_ATTIVITA,
  MINIMI,
  stimaMezziPubblici,
  type IstantaneaDestinazione,
} from "../src/index.js";
import { cartellaIstantaneeDelPacchetto } from "../src/pacchetto.js";

const lette = leggiCartellaIstantanee(cartellaIstantaneeDelPacchetto());
const perId = new Map(lette.map((l) => [l.istantanea.id, l.istantanea]));
const istantanee: [string, IstantaneaDestinazione][] = DESTINAZIONI_PRECARICATE.map((d) => {
  const istantanea = perId.get(`${d.idBase}-${DATA_ISTANTANEE_PRECARICATE}`);
  if (istantanea === undefined) throw new Error(`manca l'istantanea di ${d.destinazione}`);
  return [d.destinazione, istantanea];
});

describe("CA-2 minimi della §8.1 sulle istantanee precaricate", () => {
  it.each(istantanee)("CA-2 %s rispetta tutti i minimi", (_, istantanea) => {
    expect(leggiIstantanea(istantanea).ok).toBe(true);
    const { rispettati, mancanze, conteggi } = controllaMinimi(istantanea);
    expect(mancanze).toEqual([]);
    expect(rispettati).toBe(true);
    expect(conteggi.attivita).toBeGreaterThanOrEqual(MINIMI.attivita);
    expect(conteggi.attivita).toBeLessThanOrEqual(MASSIMO_ATTIVITA);
    expect(conteggi.ristorantiPranzo).toBeGreaterThanOrEqual(3);
    expect(conteggi.ristorantiCena).toBeGreaterThanOrEqual(3);
    expect(conteggi.ristorantiVegetariani).toBeGreaterThanOrEqual(1);
    expect(conteggi.fasceAlloggio).toBeGreaterThanOrEqual(2);
    expect(conteggi.farmacie).toBeGreaterThanOrEqual(1);
    expect(conteggi.ospedali).toBeGreaterThanOrEqual(1);
    expect(conteggi.arrivi).toBeGreaterThanOrEqual(1);
    expect(conteggi.coppieSenzaTempo).toBe(0);
    // Uno stile sotto le 2 attività c'è solo se dichiarato, con il motivo.
    for (const [stile, quante] of Object.entries(conteggi.attivitaPerStile)) {
      if (quante < MINIMI.attivitaPerStile) expect(istantanea.stiliScarsi?.map((s) => s.stile)).toContain(stile);
    }
    for (const scarso of istantanea.stiliScarsi ?? []) {
      expect(conteggi.attivitaPerStile[scarso.stile]).toBeLessThan(MINIMI.attivitaPerStile);
      expect(scarso.motivo).toMatch(/OpenStreetMap/);
    }
  });

  it.each(istantanee)("CA-2 %s ha i tempi di tutte le coppie usabili: auto (OSRM o stima) e mezzi pubblici stimati", (_, istantanea) => {
    const chiave = (a: string, b: string, m: string): string => [a, b].sort().join("|") + `|${m}`;
    const tempi = new Map(istantanea.tempiPercorrenza.map((t) => [chiave(t.da, t.a, t.mezzo), t]));
    for (const [a, b] of coppieUsabili(istantanea)) {
      const auto = tempi.get(chiave(a, b, "auto"));
      const pubblici = tempi.get(chiave(a, b, "mezzi_pubblici"));
      expect(auto, `${a}–${b} in auto`).toBeDefined();
      expect(pubblici, `${a}–${b} mezzi pubblici`).toMatchObject({ stima: true, minuti: stimaMezziPubblici(auto?.minuti ?? 0) });
      const piedi = tempi.get(chiave(a, b, "piedi"));
      if (piedi !== undefined) expect(piedi.stima).toBeUndefined();
    }
  });
});

describe("CA-6 origine dei luoghi e attribuzione delle immagini nelle istantanee precaricate", () => {
  it.each(istantanee)("CA-6 %s: ogni luogo ha origine osm e un identificativo OpenStreetMap", (_, istantanea) => {
    expect(istantanea.luoghi.length).toBeGreaterThan(0);
    for (const luogo of istantanea.luoghi) {
      expect(luogo.origine, luogo.id).toBe("osm");
      expect(luogo.osmId, luogo.id).toMatch(/^(node|way|relation)\/[1-9]\d*$/);
      expect(luogo.id).toBe(`OSM-${luogo.osmId?.split("/")[0]?.toUpperCase()}-${luogo.osmId?.split("/")[1]}`);
    }
    expect(istantanea.fonti.some((f) => f.attribuzione.includes(ATTRIBUZIONE_OSM))).toBe(true);
  });

  it.each(istantanee)("CA-6 %s: ogni immagine ha autore e licenza (Wikimedia Commons), e la fonte di ogni descrizione è citata", (_, istantanea) => {
    const conImmagine = istantanea.attivita.filter((a) => a.immagine !== undefined);
    for (const { id, immagine } of conImmagine) {
      expect(immagine?.autore.trim(), id).not.toBe("");
      expect(immagine?.licenza.trim(), id).not.toBe("");
      expect(immagine?.attribuzione, id).toContain(immagine?.autore ?? "?");
      expect(immagine?.percorso, id).toMatch(/^https:\/\/(upload|thumb)\.wikimedia\.org\/[^?]+$/);
    }
    if (conImmagine.length > 0) expect(istantanea.fonti.map((f) => f.nome)).toContain("Wikimedia Commons");
    for (const attivita of istantanea.attivita.filter((a) => a.descrizioneBreve !== undefined)) {
      const luogo = istantanea.luoghi.find((l) => l.id === attivita.luogoId);
      expect(luogo?.fonteDescrizione, attivita.id).toMatch(/^(Wikipedia|Wikivoyage) \((it|en)\)/);
    }
  });
});
