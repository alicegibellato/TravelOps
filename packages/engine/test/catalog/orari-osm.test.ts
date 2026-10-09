import { describe, expect, it } from "vitest";
import { classificaLuogoOsm, leggiOrariOsm, ORARI_PREDEFINITI, orariDelLuogo } from "../../src/catalog/index.js";
import { caricaCatalogoEsteso } from "../../src/itinerary/index.js";
import type { OrariApertura } from "../../src/model/index.js";
import { esempioOsm, esempiOsm, settimana } from "./supporto.js";

const SEMPRE: OrariApertura = { sempre: true };

/** Orari attesi per ogni esempio registrato leggibile, scritti a mano dal valore di `opening_hours`. */
const LEGGIBILI: { id: number; caso: string; atteso: OrariApertura }[] = [
  { id: 9100000001, caso: "museo chiuso il lunedì", atteso: settimana({ tutti: "10:00-18:00", lun: "" }) },
  { id: 9100000002, caso: "ristorante, due fasce ogni giorno", atteso: settimana({ tutti: "12:00-14:30,19:00-22:30" }) },
  { id: 9100000003, caso: "ospedale 24/7", atteso: SEMPRE },
  {
    id: 9100000004,
    caso: "farmacia, due fasce nei feriali, sabato mattina, domenica chiusa",
    atteso: settimana({ tutti: "08:30-12:30,15:30-19:30", sab: "08:30-12:30", dom: "" }),
  },
  {
    id: 9100000005,
    caso: "castello, più regole e lunedì off",
    atteso: settimana({ tutti: "09:30-17:00", dom: "09:30-13:00", lun: "" }),
  },
  { id: 9100000006, caso: "negozio, domenica ridotta", atteso: settimana({ tutti: "09:00-19:30", dom: "10:00-13:00" }) },
  {
    id: 9100000007,
    caso: "osteria, elenco di giorni con martedì chiuso, due fasce",
    atteso: settimana({ tutti: "12:00-15:00,19:00-23:00", mar: "" }),
  },
  { id: 9100000008, caso: "cantina, regola dei festivi ignorata", atteso: settimana({ tutti: "10:00-19:00" }) },
  {
    id: 9100000009,
    caso: "pizzeria oltre la mezzanotte: la parte dopo le 24:00 va al giorno dopo",
    atteso: settimana({
      tutti: "",
      gio: "18:00-24:00",
      ven: "00:00-02:00,18:00-24:00",
      sab: "00:00-02:00,18:00-24:00",
      dom: "00:00-02:00",
    }),
  },
  {
    id: 9100000010,
    caso: "galleria, regola aggiuntiva separata da virgola",
    atteso: settimana({ tutti: "09:00-13:00", sab: "10:00-12:00", dom: "" }),
  },
  { id: 9100000011, caso: "funivia, tutti i giorni", atteso: settimana({ tutti: "08:30-17:30" }) },
  { id: 9100000012, caso: "hotel 00:00-24:00 ogni giorno: sempre aperto", atteso: SEMPRE },
  { id: 9100000013, caso: "panificio, pausa pranzo e domenica chiusa", atteso: settimana({ tutti: "07:00-13:00,16:00-19:30", dom: "" }) },
];

/** Esempi registrati non leggibili (o senza orari): orario predefinito del tipo di luogo, non verificato. */
const NON_LEGGIBILI: { id: number; caso: string; tipo: "museo" | "punto_panoramico" | "ristorante" | "parco" }[] = [
  { id: 9100000014, caso: "orari stagionali (mesi)", tipo: "museo" },
  { id: 9100000015, caso: "alba e tramonto", tipo: "punto_panoramico" },
  { id: 9100000016, caso: "testo libero", tipo: "ristorante" },
  { id: 9100000017, caso: "nessun tag opening_hours", tipo: "parco" },
];

describe("CA-3 — gli orari OpenStreetMap registrati si convertono correttamente", () => {
  it("CA-3 ci sono almeno 10 esempi registrati leggibili, con fasce multiple, giorni chiusi e 24/7", () => {
    expect(LEGGIBILI.length).toBeGreaterThanOrEqual(10);
    expect(esempiOsm().map((e) => e.id)).toEqual([...LEGGIBILI, ...NON_LEGGIBILI].map((e) => e.id));
    const valori = LEGGIBILI.map(({ id }) => esempioOsm(id).tags?.["opening_hours"]);
    expect(valori).toContain("24/7");
    expect(valori.some((v) => v?.includes(","))).toBe(true);
    expect(valori.some((v) => v?.includes("off"))).toBe(true);
  });

  it.each(LEGGIBILI)("CA-3 esempio $id ($caso)", ({ id, atteso }) => {
    const elemento = esempioOsm(id);
    expect(leggiOrariOsm(elemento.tags?.["opening_hours"] ?? "")).toStrictEqual(atteso);
    const esito = classificaLuogoOsm(elemento, "GARDA_NORD");
    expect(esito?.luogo.apertura).toStrictEqual(atteso);
    expect(esito?.luogo.orariVerificati).toBe(true);
  });

  it.each(NON_LEGGIBILI)(
    "CA-3 esempio $id ($caso): orario predefinito del tipo di luogo, non verificato, senza errori",
    ({ id, tipo }) => {
      const elemento = esempioOsm(id);
      const testo = elemento.tags?.["opening_hours"];
      if (testo !== undefined) expect(leggiOrariOsm(testo)).toBeNull();
      const esito = classificaLuogoOsm(elemento, "GARDA_NORD");
      expect(esito?.luogo.tipo).toBe(tipo);
      expect(esito?.luogo.apertura).toStrictEqual(ORARI_PREDEFINITI[tipo]);
      expect(esito?.luogo.orariVerificati).toBe(false);
    },
  );

  it("CA-3 orari predefiniti: musei mar–dom 10:00–18:00, ristoranti 12:00–14:30 e 19:00–22:30, all'aperto sempre aperti", () => {
    expect(ORARI_PREDEFINITI.museo).toStrictEqual(settimana({ tutti: "10:00-18:00", lun: "" }));
    expect(ORARI_PREDEFINITI.ristorante).toStrictEqual(settimana({ tutti: "12:00-14:30,19:00-22:30" }));
    for (const tipo of ["sentiero", "spiaggia", "punto_panoramico", "parco"] as const) {
      expect(ORARI_PREDEFINITI[tipo]).toStrictEqual(SEMPRE);
    }
    expect(orariDelLuogo({}, "museo")).toStrictEqual({ apertura: ORARI_PREDEFINITI.museo, orariVerificati: false });
    expect(orariDelLuogo({ opening_hours: "24/7" }, "museo")).toStrictEqual({ apertura: SEMPRE, orariVerificati: true });
  });

  it("CA-3 tutti i luoghi degli esempi registrati formano un catalogo esteso valido", () => {
    const luoghi = esempiOsm().map((e) => classificaLuogoOsm(e, "GARDA_NORD"));
    const catalogo = {
      zone: [{ id: "GARDA_NORD", nome: "Alto Garda" }],
      luoghi: luoghi.map((l) => l?.luogo),
      attivita: luoghi.flatMap((l) => (l?.attivita ? [l.attivita] : [])),
    };
    const esito = caricaCatalogoEsteso(catalogo);
    expect(esito.ok ? [] : esito.errori).toEqual([]);
  });

  it.each([
    "",
    "   ",
    "Mo-Fr",
    "Mo-Fr 10:00",
    "Mo-Fr 10:00-",
    "Mo-Fr 25:00-26:00",
    "Mo-Fr 10:00-10:00",
    "Mo-Fr 10:60-12:00",
    "Mo-Fr 10:00-12:00 || \"su appuntamento\"",
    "Mo-Fr 10:00-12:00 \"commento\"",
    "week 01-10 Mo 10:00-12:00",
    "Mo[1] 10:00-12:00",
    "2026 Mo-Fr 10:00-12:00",
    "Jan-Mar Sa 10:00-12:00",
    "PH off",
    "Mo-Fr 10:00-12:00, 14:00-16:00 Sa",
    "Mo-Fr 10:00-60:00",
    "Monday 10:00-12:00",
    "Mo- 10:00-12:00",
    ",Mo 10:00-12:00",
    "Mo-Fr 10:00+",
  ])("CA-3 un orario non leggibile (%j) dà null, mai un'eccezione", (testo) => {
    expect(() => leggiOrariOsm(testo)).not.toThrow();
    expect(leggiOrariOsm(testo)).toBeNull();
    expect(orariDelLuogo({ opening_hours: testo }, "ristorante")).toStrictEqual({
      apertura: ORARI_PREDEFINITI.ristorante,
      orariVerificati: false,
    });
  });

  it("CA-3 valori non testuali non sollevano eccezioni", () => {
    for (const valore of [undefined, null, 42, {}, []]) {
      expect(leggiOrariOsm(valore as unknown as string)).toBeNull();
    }
  });

  it.each([
    ["Mo-Su 10:00-12:00,11:00-14:00", settimana({ tutti: "10:00-14:00" })],
    ["Mo-Su 10:00-12:00,12:00-14:00", settimana({ tutti: "10:00-14:00" })],
    ["Fr-Mo 10:00-12:00", settimana({ tutti: "", ven: "10:00-12:00", sab: "10:00-12:00", dom: "10:00-12:00", lun: "10:00-12:00" })],
    ["10:00-18:00", settimana({ tutti: "10:00-18:00" })],
    ["mo-fr 9:00-13:00", settimana({ tutti: "09:00-13:00", sab: "", dom: "" })],
    ["Mo-Su 18:00-00:00", settimana({ tutti: "18:00-24:00" })],
    ["Sa 20:00-26:00", settimana({ tutti: "", sab: "20:00-24:00", dom: "00:00-02:00" })],
    ["Mo-Sa 09:00-19:30; Su,PH 10:00-13:00", settimana({ tutti: "09:00-19:30", dom: "10:00-13:00" })],
    ["Mo-Su off", settimana({ tutti: "" })],
    ["Mo-Su open", SEMPRE],
    ["Mo-Fr 10:00-12:00;", settimana({ tutti: "10:00-12:00", sab: "", dom: "" })],
  ] as const)("regole del formato: %j", (testo, atteso) => {
    expect(leggiOrariOsm(testo)).toStrictEqual(atteso);
  });

  it("a parità di testo il risultato è identico", () => {
    for (const elemento of esempiOsm()) {
      const testo = elemento.tags?.["opening_hours"] ?? "";
      expect(leggiOrariOsm(testo)).toStrictEqual(leggiOrariOsm(testo));
    }
  });
});
