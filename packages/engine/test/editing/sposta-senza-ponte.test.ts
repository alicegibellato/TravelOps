import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { creaSorgenteDaDati } from "../../src/context/index.js";
import { proponiModifica } from "../../src/editing/index.js";
import type { Catalogo, DatiContesto, Viaggio } from "../../src/model/index.js";

const leggi = <T>(file: string): T =>
  JSON.parse(readFileSync(new URL(`../../data/reference/${file}`, import.meta.url), "utf8")) as T;

const catalogo = leggi<Catalogo>("catalogo.json");
const sorgente = creaSorgenteDaDati(leggi<DatiContesto>("contesto.json"));

/** Gli elementi di un giorno come `id inizio-fine da>a` (spostamenti) o `id inizio-fine attività`. */
const giornata = (viaggio: Viaggio, data: string): string[] =>
  (viaggio.giorni.find((g) => g.data === data)?.elementi ?? []).map(
    (e) => `${e.id} ${e.inizio}-${e.fine} ${e.tipo === "spostamento" ? `${e.da}>${e.a}` : e.attivitaId}`,
  );

describe("TB-PLAN-004: «Sposta» nello stesso giorno ricalcola gli spostamenti dai vicini reali", () => {
  it("il pranzo del giorno 2 spostato dalle 13:20 alle 15:00: niente spostamento verso l'alloggio e ritorno, solo andata dall'ultima tappa e ritorno all'alloggio", () => {
    const viaggio = leggi<Viaggio>("versione-1.json");
    const esito = proponiModifica(viaggio, 1, catalogo, sorgente, {
      operazione: "sposta",
      elementoId: "D2-E4",
      data: "2026-06-13",
      inizio: "15:00",
    });
    if (!esito.ok) throw new Error(`Errore inatteso: ${esito.errore.messaggio}`);
    const dopo = giornata(esito.proposta.itinerario, "2026-06-13");
    // Nessun spostamento «ponte» PONALE>HOTEL a metà giornata: dopo la visita si va direttamente al ristorante.
    expect(dopo.filter((r) => r.includes("PONALE>HOTEL") || r.includes("HOTEL>RIST-RIVA"))).toEqual([]);
    expect(dopo).toEqual([
      "D2-E1 08:40-09:00 HOTEL>PONALE",
      "D2-E2 09:00-13:00 A-PONALE",
      "N1 14:40-15:00 PONALE>RIST-RIVA",
      "D2-E4 15:00-16:10 A-PRANZO-RIVA",
      "N2 16:10-16:15 RIST-RIVA>HOTEL",
    ]);
  });
});
