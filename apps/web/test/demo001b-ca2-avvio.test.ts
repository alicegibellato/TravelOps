/**
 * REQ-DEMO-001 CA-2 (ST-DEMO-001B): da un clone pulito l'app si avvia con `npm ci`, `npm run build` e `npm run dev`
 * (la build vera è già provata da `npm run build`: qui si controllano gli script e il README), e i viaggi demo della
 * §8.3 nascono al primo avvio senza rete, con luoghi reali, collegamenti a orario fisso e nessun problema bloccante.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { elencaViaggi, leggiIstantanea, leggiStoricoDelViaggio, elencaRevisioniBozza } from "../src/basedati";
import { costruisciViaggioDemo, leggiSpecificheDemo, problemiDelViaggioDemo } from "../src/stato/viaggi-demo-bozza";
import { nuovaCartella, statoSalvato, sullaBaseDati } from "./supporto-stato";
import type { IstantaneaCatalogo, Viaggio } from "@travelops/engine";

const radice = (percorso: string) => fileURLToPath(new URL(`../../../${percorso}`, import.meta.url));
const json = (percorso: string) => JSON.parse(readFileSync(radice(percorso), "utf8")) as { scripts: Record<string, string> };

beforeEach(() => {
  vi.stubGlobal("fetch", () => {
    throw new Error("la demo non usa la rete");
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("CA-2 avvio da un clone pulito", () => {
  it("gli script della radice ci sono e il README li elenca nell'ordine: npm ci, npm run build, npm run dev", () => {
    const { scripts } = json("package.json");
    expect(scripts.build).toBeDefined();
    expect(scripts.dev).toContain("@travelops/web");
    expect(json("apps/web/package.json").scripts).toMatchObject({ dev: expect.any(String), build: expect.any(String) });
    const readme = readFileSync(radice("README.md"), "utf8");
    const posizioni = ["npm ci", "npm run build", "npm run dev"].map((c) => readme.indexOf(c));
    expect(posizioni.every((p) => p >= 0)).toBe(true);
    expect([...posizioni].sort((a, b) => a - b)).toEqual(posizioni);
  });
});

describe("CA-2 i viaggi demo della §8.3 al primo avvio, senza rete", () => {
  const istantanea = (id: string): IstantaneaCatalogo => JSON.parse(readFileSync(radice(`packages/sources/snapshots/${id}.json`), "utf8"));
  const costruiti = () => leggiSpecificheDemo().map((s) => ({ s, ...costruisciViaggioDemo(s, istantanea(s.istantanea)) }));

  it("sono costruiti dalle istantanee precaricate con i profili PR-1, PR-2 e PR-3 e non hanno problemi bloccanti", () => {
    for (const { s, viaggio, istantanea: ist } of costruiti()) {
      expect(problemiDelViaggioDemo(viaggio, ist).filter((p) => p.gravita === "bloccante"), s.id).toEqual([]);
    }
    const [garda, dolomiti, roma] = costruiti() as [ReturnType<typeof costruiti>[number], ...ReturnType<typeof costruiti>];
    expect([garda.viaggio.dataInizio, garda.viaggio.dataFine, garda.viaggio.giorni.length]).toEqual(["2026-06-12", "2026-06-15", 4]);
    expect(dolomiti?.viaggio.giorni).toHaveLength(5);
    expect(roma?.viaggio.giorni).toHaveLength(3);
  });

  it("TRIP-DEMO-GARDA: volo di andata il venerdì mattina, volo di ritorno il lunedì sera, trekking impegnativo il sabato mattina", () => {
    const { viaggio, istantanea: ist } = costruiti()[0]!;
    const voli = (v: Viaggio) => v.giorni.flatMap((g) => g.elementi.filter((e) => e.tipo === "spostamento" && e.mezzo === "volo").map((e) => ({ data: g.data, e })));
    const [andata, ritorno] = voli(viaggio) as [ReturnType<typeof voli>[number], ReturnType<typeof voli>[number]];
    expect(andata.data).toBe("2026-06-12");
    expect(andata.e.inizio < "12:00" && andata.e.orarioFisso === true && andata.e.prenotazione !== undefined).toBe(true);
    expect(ist.luoghi.find((l) => l.id === (andata.e as { da: string }).da)?.nome).toBe("Aeroporto di Roma Fiumicino");
    expect(ritorno.data).toBe("2026-06-15");
    expect(ritorno.e.inizio >= "18:00" && ritorno.e.orarioFisso === true && ritorno.e.prenotazione !== undefined).toBe(true);
    const sabato = viaggio.giorni.find((g) => g.data === "2026-06-13")!;
    const trek = sabato.elementi.find((e) => e.tipo === "attivita" && ist.attivita.find((a) => a.id === e.attivitaId)?.intensita === "impegnativa");
    expect(trek).toBeDefined();
    expect(trek!.inizio < "12:00").toBe(true);
  });

  it("TRIP-DEMO-DOLOMITI ha il treno di andata e ritorno a orario fisso con la prenotazione", () => {
    const { viaggio } = costruiti()[1]!;
    const treni = viaggio.giorni.flatMap((g) => g.elementi.filter((e) => e.tipo === "spostamento" && e.mezzo === "treno"));
    expect(treni).toHaveLength(2);
    expect(treni.every((t) => t.orarioFisso === true && t.prenotazione !== undefined)).toBe(true);
  });

  it("il primo avvio li salva nella base dati: confermati con la sola versione 1, Roma in bozza con la revisione B1", () => {
    const cartella = nuovaCartella();
    statoSalvato(cartella);
    sullaBaseDati(cartella, (db) => {
      const stati = Object.fromEntries(elencaViaggi(db).map((v) => [v.id, v.stato]));
      expect(stati).toMatchObject({ "TRIP-DEMO-GARDA": "confermato", "TRIP-DEMO-DOLOMITI": "confermato", "TRIP-DEMO-ROMA": "bozza" });
      for (const id of ["TRIP-DEMO-GARDA", "TRIP-DEMO-DOLOMITI"]) {
        const storico = leggiStoricoDelViaggio(db, id);
        expect(storico?.ok && storico.storico.versioni.length, id).toBe(1);
      }
      expect(leggiStoricoDelViaggio(db, "TRIP-DEMO-ROMA")).toBeNull();
      const revisioni = elencaRevisioniBozza(db, "TRIP-DEMO-ROMA");
      expect(revisioni.ok && revisioni.revisioni.length).toBe(1);
      expect(leggiIstantanea(db, "garda-2026-10-09")).not.toBeNull();
    });
  });
});
