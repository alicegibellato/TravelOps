/**
 * Gli strumenti del motore (ST-ORCH-001B): definizioni con schema rigoroso, validazione degli argomenti e, per ogni
 * strumento, un caso con argomenti validi e uno o più con argomenti non validi. Dati: le istantanee precaricate di
 * `packages/sources/snapshots/` con la sorgente registrata (nessuna rete).
 */
import { describe, expect, it } from "vitest";
import { caricaViaggio } from "@travelops/engine";
import type { EsitoCostruzione, SorgenteDestinazioni } from "@travelops/sources";
import {
  creaArchivioInMemoria,
  ErroreStrumento,
  NOMI_STRUMENTI,
  problemiArgomenti,
  STRUMENTI_CHE_SCRIVONO,
  validaArgomenti,
  schemaOggetto,
  type SchemaValore,
} from "../../src/index.js";
import {
  AREA_GARDA,
  ARGOMENTI_PROFILO_GARDA,
  banco,
  bancoConBozza,
  bancoConfermato,
  GARDA,
  istantanea,
  sorgenteRegistrata,
} from "./supporto.js";

/** Lo strumento rifiuta gli argomenti con un `ErroreStrumento` (il modello lo vede e si può correggere). */
async function rifiuta(promessa: Promise<unknown>, testo?: RegExp): Promise<void> {
  const errore = await promessa.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(errore).toBeInstanceOf(ErroreStrumento);
  if (testo !== undefined) expect((errore as Error).message).toMatch(testo);
}

/** Controlla le regole della modalità rigorosa di OpenAI su uno schema e su tutti gli oggetti annidati. */
function controllaRigoroso(schema: SchemaValore, dove: string): void {
  const tipi = typeof schema.type === "string" ? [schema.type] : schema.type;
  if (tipi.includes("object")) {
    expect(schema.additionalProperties, `${dove}: additionalProperties`).toBe(false);
    expect([...(schema.required ?? [])].sort(), `${dove}: required`).toEqual(Object.keys(schema.properties ?? {}).sort());
    for (const [nome, figlio] of Object.entries(schema.properties ?? {})) controllaRigoroso(figlio, `${dove}.${nome}`);
  }
  if (schema.items !== undefined) controllaRigoroso(schema.items, `${dove}[]`);
  if (schema.enum !== undefined && tipi.includes("null")) expect(schema.enum, `${dove}: enum con null`).toContain(null);
}

describe("definizioni", () => {
  it("13 strumenti con i nomi previsti, tutti rigorosi e con lo schema compatibile con la modalità strict", () => {
    const { strumenti } = banco();
    expect(strumenti.map((s) => s.definizione.nome)).toEqual([...NOMI_STRUMENTI]);
    for (const { definizione } of strumenti) {
      expect(definizione.rigoroso).toBe(true);
      expect(definizione.descrizione.length).toBeGreaterThan(20);
      expect(definizione.parametri.type).toBe("object");
      controllaRigoroso(definizione.parametri as unknown as SchemaValore, definizione.nome);
    }
    expect(STRUMENTI_CHE_SCRIVONO.every((n) => (NOMI_STRUMENTI as readonly string[]).includes(n))).toBe(true);
  });
});

describe("validazione con lo schema", () => {
  const schema = schemaOggetto({
    testo: { type: "string" },
    numero: { type: ["integer", "null"], minimum: 1, maximum: 5 },
    data: { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "data AAAA-MM-GG" },
    scelte: { type: ["array", "null"], items: { type: "string", enum: ["a", "b"] }, minItems: 1 },
  });

  it("accetta argomenti validi e completa con null le proprietà facoltative assenti", () => {
    expect(validaArgomenti(schema, { testo: "ciao" })).toEqual({ testo: "ciao", numero: null, data: null, scelte: null });
    expect(problemiArgomenti(schema, { testo: "x", numero: 3, data: "2026-10-20", scelte: ["a"] })).toEqual([]);
  });

  it("elenca i problemi in italiano: tipo, mancante, in più, limiti, formato, valori ammessi", () => {
    expect(problemiArgomenti(schema, { numero: 9, data: "20/10", scelte: ["c"], extra: 1 })).toEqual([
      "manca argomenti.testo",
      "argomenti.extra non è previsto",
      "argomenti.numero deve essere al massimo 5",
      "argomenti.data non ha il formato atteso (data AAAA-MM-GG)",
      "argomenti.scelte[0] deve essere uno di: \"a\", \"b\"",
    ]);
    expect(problemiArgomenti(schema, "testo")).toEqual(["argomenti deve essere un oggetto"]);
    expect(problemiArgomenti(schema, { testo: 1, numero: 1.5, data: null, scelte: [] })).toEqual([
      "argomenti.testo deve essere un testo",
      "argomenti.numero deve essere un numero intero oppure null",
      "argomenti.scelte deve avere almeno 1 elementi",
    ]);
    expect(() => validaArgomenti(schema, {})).toThrow(ErroreStrumento);
  });
});

describe("cerca_destinazione", () => {
  it("valida: trova Riva del Garda con l'area già pronta", async () => {
    const b = banco();
    const r = await b.esegui("cerca_destinazione", { testo: "Riva del Garda" });
    expect(r.risultati[0]).toMatchObject({ areaId: AREA_GARDA, nome: "Riva del Garda", giaPronta: true });
    expect(b.archivio.scritture).toEqual([]);
  });

  it("valida: nessun risultato è un messaggio, non un errore", async () => {
    expect(await banco().esegui("cerca_destinazione", { testo: "Atlantide sommersa" })).toEqual({
      risultati: [],
      messaggio: "Non ho trovato destinazioni con questo nome.",
    });
  });

  it("non valida: testo assente, non testo, troppo corto, proprietà in più", async () => {
    const b = banco();
    await rifiuta(b.esegui("cerca_destinazione", {}), /manca argomenti\.testo/);
    await rifiuta(b.esegui("cerca_destinazione", { testo: 42 }), /deve essere un testo/);
    await rifiuta(b.esegui("cerca_destinazione", { testo: " a " }), /almeno 2 lettere/);
    await rifiuta(b.esegui("cerca_destinazione", { testo: "Roma", paese: "IT" }), /non è previsto/);
  });
});

describe("prepara_destinazione", () => {
  it("valida: salva l'istantanea, collega il viaggio e aggiorna la destinazione del profilo", async () => {
    const b = banco();
    const r = await b.esegui("prepara_destinazione", { areaId: AREA_GARDA, testo: "Riva del Garda" });
    expect(r).toMatchObject({ pronta: true, istantaneaId: GARDA, destinazione: "Lago di Garda (Riva del Garda e dintorni)" });
    expect(r.attivita).toBeGreaterThanOrEqual(15);
    const contenuto = b.archivio.contenuto();
    expect(contenuto.scheda).toMatchObject({ stato: "bozza", istantaneaId: GARDA });
    expect(contenuto.istantanee.has(GARDA)).toBe(true);
    expect(contenuto.profilo?.destinazione).toEqual({ tipo: "luogo", nome: "Lago di Garda (Riva del Garda e dintorni)", riferimento: GARDA });
    expect(r.cosaManca).toEqual(["Mancano le date: scegli i giorni precisi, oppure il mese e quanti giorni."]);
  });

  it("valida: senza testo trova comunque un'area già pronta", async () => {
    expect(await banco().esegui("prepara_destinazione", { areaId: "osm:relation/41485", testo: null })).toMatchObject({ pronta: true, istantaneaId: "roma-2026-10-09" });
  });

  it("valida: destinazione sotto i minimi → messaggio e alternative, nessuna scrittura", async () => {
    const area = istantanea(GARDA).area;
    const finta: SorgenteDestinazioni = {
      ...sorgenteRegistrata(),
      tipo: "registrata",
      elencaIstantanee: async () => [],
      cercaDestinazioni: async () => [{ ...area, id: "osm:node/1", nome: "Borgo piccolo" }],
      costruisciIstantanea: async (): Promise<EsitoCostruzione> => ({
        ok: false,
        motivo: "minimi_non_rispettati",
        messaggio: "Qui ci sono troppo poche cose da fare per un viaggio.",
        mancanze: [],
        alternative: [area],
      }),
      leggiIstantanea: async () => null,
    };
    const b = banco({ sorgente: finta });
    expect(await b.esegui("prepara_destinazione", { areaId: "osm:node/1", testo: "Borgo piccolo" })).toEqual({
      pronta: false,
      messaggio: "Qui ci sono troppo poche cose da fare per un viaggio.",
      alternative: [{ areaId: AREA_GARDA, nome: area.nome, descrizione: area.descrizione }],
    });
    expect(b.archivio.scritture).toEqual([]);
  });

  it("non valida: area sconosciuta, areaId mancante o vuoto di tipo, viaggio già confermato", async () => {
    const b = banco();
    await rifiuta(b.esegui("prepara_destinazione", { areaId: "osm:relation/0", testo: "Riva del Garda" }), /Non trovo questa destinazione/);
    await rifiuta(b.esegui("prepara_destinazione", { testo: "Roma" }), /manca argomenti\.areaId/);
    await rifiuta(b.esegui("prepara_destinazione", { areaId: null, testo: "Roma" }), /areaId deve essere un testo/);
    const confermato = await bancoConfermato();
    await rifiuta(confermato.esegui("prepara_destinazione", { areaId: AREA_GARDA, testo: null }), /già confermato/);
  });
});

describe("proponi_destinazioni (sorprendimi)", () => {
  it("valida: le istantanee precaricate ordinate per punteggio del profilo, senza scritture", async () => {
    const b = banco({ archivio: creaArchivioInMemoria({ profilo: { stili: ["natura", "avventura"], formaFisica: "impegnativo" } }) });
    const r = await b.esegui("proponi_destinazioni", { limite: null });
    expect(r.destinazioni).toHaveLength(3);
    const punteggi = r.destinazioni.map((d: { punteggio: number }) => d.punteggio);
    expect(punteggi).toEqual([...punteggi].sort((x, y) => y - x));
    for (const d of r.destinazioni) {
      const ist = istantanea(d.istantaneaId);
      expect(d.areaId).toBe(ist.area.id);
      for (const nome of d.esempi) expect(ist.attivita.map((a) => a.nome)).toContain(nome);
    }
    expect((await b.esegui("proponi_destinazioni", { limite: 1 })).destinazioni).toHaveLength(1);
    expect(b.archivio.scritture).toEqual([]);
  });

  it("valida: il profilo cambia l'ordine (relax e gastronomia contro natura e avventura)", async () => {
    const ordine = async (profilo: object): Promise<string[]> =>
      (await banco({ archivio: creaArchivioInMemoria({ profilo }) }).esegui("proponi_destinazioni", { limite: null })).destinazioni.map((d: { istantaneaId: string }) => d.istantaneaId);
    expect((await ordine({ stili: ["natura", "avventura"], formaFisica: "impegnativo" }))[0]).toBe("dolomiti-val-di-fassa-2026-10-09");
    expect((await ordine({ stili: ["relax", "gastronomia"] }))[0]).toBe("roma-2026-10-09");
  });

  it("non valida: limite fuori intervallo o non intero", async () => {
    const b = banco();
    await rifiuta(b.esegui("proponi_destinazioni", { limite: 0 }), /almeno 1/);
    await rifiuta(b.esegui("proponi_destinazioni", { limite: 11 }), /al massimo 10/);
    await rifiuta(b.esegui("proponi_destinazioni", { limite: "tre" }), /numero intero/);
  });
});

describe("aggiorna_profilo", () => {
  it("valida: unisce, salva e dice che cosa manca; i campi null restano com'erano", async () => {
    const b = banco();
    const primo = await b.esegui("aggiorna_profilo", { destinazione: { tipo: "sorprendimi", nome: null }, ritmo: "lento" });
    expect(primo).toMatchObject({ salvato: true, completo: false, cosaManca: ["Mancano le date: scegli i giorni precisi, oppure il mese e quanti giorni."] });
    const secondo = await b.esegui("aggiorna_profilo", { date: { tipo: "mese", mese: "2026-11", inizio: null, fine: null }, durata: 4, budget: "€" });
    expect(secondo).toMatchObject({ completo: true, cosaManca: [] });
    expect(b.archivio.contenuto().profilo).toEqual({ destinazione: { tipo: "sorprendimi" }, ritmo: "lento", date: { tipo: "mese", mese: "2026-11" }, durata: 4, budget: "€" });
    expect(b.archivio.contenuto().scheda).toMatchObject({ stato: "bozza", destinazione: null });
  });

  it("valida: cambiare luogo toglie l'istantanea collegata al profilo, lo stesso luogo la tiene", async () => {
    const b = await bancoConBozza();
    await b.esegui("aggiorna_profilo", { destinazione: { tipo: "luogo", nome: "lago di garda (riva del garda e dintorni)" } });
    expect(b.archivio.contenuto().profilo?.destinazione).toMatchObject({ riferimento: GARDA });
    await b.esegui("aggiorna_profilo", { destinazione: { tipo: "luogo", nome: "Roma" } });
    expect(b.archivio.contenuto().profilo?.destinazione).toEqual({ tipo: "luogo", nome: "Roma" });
    await rifiuta(b.esegui("genera_bozza", {}), /non è quella preparata/);
  });

  it("non valida: valori fuori elenco, date incomplete, durata, incoerenze del profilo (non salvato)", async () => {
    const b = banco();
    await rifiuta(b.esegui("aggiorna_profilo", { ritmo: "veloce" }), /ritmo deve essere uno di/);
    await rifiuta(b.esegui("aggiorna_profilo", { date: { tipo: "precise", inizio: "2026-10-20", fine: null, mese: null } }), /servono inizio e fine/);
    await rifiuta(b.esegui("aggiorna_profilo", { durata: 20 }), /al massimo 14/);
    await rifiuta(b.esegui("aggiorna_profilo", { destinazione: { tipo: "luogo", nome: " " } }), /serve il nome/);
    await rifiuta(b.esegui("aggiorna_profilo", { stili: ["natura"], daEvitareStili: ["natura"] }), /Profilo non salvato/);
    await rifiuta(b.esegui("aggiorna_profilo", { date: { tipo: "precise", inizio: "2026-10-22", fine: "2026-10-20", mese: null } }), /Profilo non salvato/);
    expect(b.archivio.scritture).toEqual([]);
  });
});

describe("genera_bozza", () => {
  it("valida: crea la revisione B1 con il programma dal motore", async () => {
    const b = banco();
    await b.esegui("aggiorna_profilo", ARGOMENTI_PROFILO_GARDA);
    await b.esegui("prepara_destinazione", { areaId: AREA_GARDA, testo: "Riva del Garda" });
    const r = await b.esegui("genera_bozza", {});
    expect(r).toMatchObject({ revisione: 1, fattibile: true, dal: "2026-10-20", al: "2026-10-22" });
    expect(r.giorni).toHaveLength(3);
    expect(r.giorni[0].perche).toMatch(/Te lo propongo|giornata/);
    expect(b.archivio.contenuto().revisioni.map((x) => x.causa)).toEqual(["Prima bozza"]);
    expect(b.archivio.contenuto().revisioni[0]?.viaggio.id).toBe(`BOZZA-${GARDA}`);
  });

  it("non valida: argomenti in più, destinazione non pronta, profilo incompleto", async () => {
    const b = banco();
    await rifiuta(b.esegui("genera_bozza", { giorni: 3 }), /non è previsto/);
    await rifiuta(b.esegui("genera_bozza", {}), /destinazione non è ancora pronta/);
    await b.esegui("prepara_destinazione", { areaId: AREA_GARDA, testo: null });
    await rifiuta(b.esegui("genera_bozza", {}), /profilo non è completo.*Mancano le date/);
    expect(b.archivio.contenuto().revisioni).toEqual([]);
  });
});

describe("genera_alternativa", () => {
  it("valida: nuova revisione con attività diverse, i nomi vengono dall'istantanea", async () => {
    const b = await bancoConBozza();
    const r = await b.esegui("genera_alternativa", {});
    expect(r.revisione).toBe(2);
    expect(r.nuove.length).toBeGreaterThan(0);
    const nomi = istantanea(GARDA).attivita.map((a) => a.nome);
    for (const nome of [...r.tolte, ...r.nuove]) expect(nomi).toContain(nome);
  });

  it("non valida: senza bozza, con argomenti", async () => {
    const b = banco();
    await b.esegui("aggiorna_profilo", ARGOMENTI_PROFILO_GARDA);
    await b.esegui("prepara_destinazione", { areaId: AREA_GARDA, testo: null });
    await rifiuta(b.esegui("genera_alternativa", {}), /Non c'è ancora una bozza/);
    await rifiuta(b.esegui("genera_alternativa", { stile: "natura" }), /non è previsto/);
  });
});

describe("modifica_bozza", () => {
  it("valida: rimuove un'attività della bozza e crea una revisione", async () => {
    const b = await bancoConBozza();
    const bozza = b.archivio.contenuto().revisioni[0]!.viaggio;
    const elemento = bozza.giorni[1]!.elementi.find((e) => e.tipo === "attivita" && !e.attivitaId.startsWith("A-OSM-NODE-9"))!;
    const r = await b.esegui("modifica_bozza", { operazione: "rimuovi", elementoId: elemento.id });
    expect(r).toMatchObject({ applicata: true, revisione: 2 });
    expect(r.cambiamenti.rimossi.map((e: { id: string }) => e.id)).toContain(elemento.id);
    const nuova = b.archivio.contenuto().revisioni[1]!.viaggio;
    expect(nuova.giorni.flatMap((g) => g.elementi).some((e) => e.id === elemento.id)).toBe(false);
  });

  it("non valida: campi mancanti per l'operazione, elemento inesistente, operazione sconosciuta", async () => {
    const b = await bancoConBozza();
    await rifiuta(b.esegui("modifica_bozza", { operazione: "aggiungi", data: "2026-10-21", inizio: "10:00" }), /serve "attivitaId"/);
    await rifiuta(b.esegui("modifica_bozza", { operazione: "rimuovi", elementoId: "D9-E9" }), /La modifica non si può fare/);
    await rifiuta(b.esegui("modifica_bozza", { operazione: "cancella", elementoId: "D1-E1" }), /operazione deve essere uno di/);
    expect(b.archivio.contenuto().revisioni).toHaveLength(1);
  });
});

describe("rigenera_giornata", () => {
  it("valida: rifà solo il giorno chiesto, gli altri restano uguali", async () => {
    const b = await bancoConBozza();
    const prima = b.archivio.contenuto().revisioni[0]!.viaggio;
    const r = await b.esegui("rigenera_giornata", { data: "2026-10-21" });
    expect(r).toMatchObject({ rigenerata: true, revisione: 2 });
    const dopo = b.archivio.contenuto().revisioni[1]!.viaggio;
    expect(dopo.giorni[0]).toEqual(prima.giorni[0]);
    expect(dopo.giorni[2]).toEqual(prima.giorni[2]);
    expect(dopo.giorni[1]).not.toEqual(prima.giorni[1]);
    // Nessuna attività del giorno rifatto è già negli altri giorni (pasti esclusi).
    const pasti = new Set(istantanea(GARDA).attivita.filter((a) => a.categoria === "pasto").map((a) => a.id));
    const altri = new Set([...dopo.giorni[0]!.elementi, ...dopo.giorni[2]!.elementi].flatMap((e) => (e.tipo === "attivita" ? [e.attivitaId] : [])));
    for (const e of dopo.giorni[1]!.elementi) if (e.tipo === "attivita" && !pasti.has(e.attivitaId)) expect(altri.has(e.attivitaId)).toBe(false);
  });

  it("non valida: data mal scritta, giorno fuori dal viaggio, viaggio confermato", async () => {
    const b = await bancoConBozza();
    await rifiuta(b.esegui("rigenera_giornata", { data: "21/10/2026" }), /formato atteso/);
    await rifiuta(b.esegui("rigenera_giornata", { data: "2026-11-01" }), /non è un giorno del viaggio/);
    await b.esegui("conferma_viaggio", {});
    await rifiuta(b.esegui("rigenera_giornata", { data: "2026-10-21" }), /già confermato/);
  });
});

describe("conferma_viaggio", () => {
  it("valida: la bozza corrente diventa la versione 1 con lo storico", async () => {
    const b = await bancoConBozza();
    const r = await b.esegui("conferma_viaggio", {});
    expect(r).toMatchObject({ confermato: true, versione: 1, causa: "Itinerario iniziale", daRevisione: 1 });
    const { storico, revisioni, scheda } = b.archivio.contenuto();
    expect(storico?.versioni).toHaveLength(1);
    const caricato = caricaViaggio(revisioni[0]!.viaggio);
    expect(caricato.ok && storico?.versioni[0]?.viaggio).toEqual(caricato.ok ? caricato.valore : null);
    expect(scheda?.stato).toBe("confermato");
  });

  it("non valida: senza bozza, due volte, con argomenti", async () => {
    const b = banco();
    await b.esegui("prepara_destinazione", { areaId: AREA_GARDA, testo: null });
    await rifiuta(b.esegui("conferma_viaggio", {}), /Non c'è ancora una bozza/);
    const c = await bancoConfermato();
    await rifiuta(c.esegui("conferma_viaggio", {}), /già confermato/);
    await rifiuta(c.esegui("conferma_viaggio", { sicuro: true }), /non è previsto/);
    await rifiuta(c.esegui("genera_bozza", {}), /già confermato/);
    await rifiuta(c.esegui("modifica_bozza", { operazione: "rimuovi", elementoId: "D1-E1" }), /già confermato/);
  });
});

describe("proponi_modifica", () => {
  it("valida: salva una proposta sulla versione corrente e non cambia il viaggio", async () => {
    const b = await bancoConfermato();
    const viaggio = b.archivio.contenuto().storico!.versioni[0]!.viaggio;
    const elemento = viaggio.giorni[1]!.elementi.find((e) => e.tipo === "attivita")!;
    const r = await b.esegui("proponi_modifica", { operazione: "cambia_priorita", elementoId: elemento.id, priorita: "irrinunciabile" });
    expect(r).toMatchObject({ propostaId: 1, versioneBase: 1, fattibile: true });
    expect(r.nota).toMatch(/accetta/);
    expect(b.archivio.contenuto().proposte.map((p) => p.tipo)).toEqual(["modifica"]);
    expect(b.archivio.contenuto().storico!.versioni).toHaveLength(1);
  });

  it("non valida: viaggio non confermato, priorità sconosciuta, campo mancante", async () => {
    const b = await bancoConBozza();
    await rifiuta(b.esegui("proponi_modifica", { operazione: "rimuovi", elementoId: "D1-E2" }), /non è ancora confermato/);
    const c = await bancoConfermato();
    await rifiuta(c.esegui("proponi_modifica", { operazione: "cambia_priorita", elementoId: "D1-E2", priorita: "altissima" }), /priorita deve essere uno di/);
    await rifiuta(c.esegui("proponi_modifica", { operazione: "sposta", elementoId: "D1-E2", inizio: "10:00" }), /serve "data"/);
    expect(c.archivio.contenuto().proposte).toEqual([]);
  });
});

describe("proponi_ripianificazione", () => {
  it("valida: pioggia in una zona del viaggio → proposta salvata, il viaggio non cambia", async () => {
    const b = await bancoConfermato();
    const zona = istantanea(GARDA).zone[1]!.id;
    const r = await b.esegui("proponi_ripianificazione", { tipo: "METEO_AVVERSO", data: "2026-10-21", inizio: "09:00", fine: "20:00", zonaId: zona, condizione: "pioggia" });
    expect(r).toMatchObject({ propostaId: 1, versioneBase: 1 });
    expect(r.spiegazione).toMatch(/pioggia/);
    expect(b.archivio.contenuto().proposte.map((p) => p.tipo)).toEqual(["ripianificazione"]);
    expect(b.archivio.contenuto().storico!.versioni).toHaveLength(1);
  });

  it("valida: ritardo di 90 minuti", async () => {
    const b = await bancoConfermato();
    const r = await b.esegui("proponi_ripianificazione", { tipo: "RITARDO", data: "2026-10-21", momento: "12:00", minuti: 90, motivo: "treno in ritardo" });
    expect(r.propostaId).toBe(1);
  });

  it("non valida: tipo sconosciuto, zona inesistente, campi mancanti, giorno fuori dal viaggio, non uno spostamento", async () => {
    const b = await bancoConfermato();
    await rifiuta(b.esegui("proponi_ripianificazione", { tipo: "TERREMOTO", data: "2026-10-21" }), /tipo deve essere uno di/);
    await rifiuta(b.esegui("proponi_ripianificazione", { tipo: "METEO_AVVERSO", data: "2026-10-21", inizio: "09:00", fine: "20:00", zonaId: "MARTE", condizione: "neve" }), /non esiste/);
    await rifiuta(b.esegui("proponi_ripianificazione", { tipo: "RITARDO", data: "2026-10-21", momento: "12:00" }), /serve "minuti"/);
    await rifiuta(b.esegui("proponi_ripianificazione", { tipo: "RITARDO", data: "2027-01-01", momento: "12:00", minuti: 30 }), /non è un giorno del viaggio/);
    const attivita = b.archivio.contenuto().storico!.versioni[0]!.viaggio.giorni[1]!.elementi.find((e) => e.tipo === "attivita")!;
    await rifiuta(b.esegui("proponi_ripianificazione", { tipo: "CANCELLAZIONE_SPOSTAMENTO", elementoId: attivita.id }), /non è uno spostamento/);
    await rifiuta(b.esegui("proponi_ripianificazione", { tipo: "RITARDO", data: "2026-10-21", momento: "25:00", minuti: 30 }), /formato atteso/);
    expect(b.archivio.contenuto().proposte).toEqual([]);
  });
});

describe("cerca_catalogo", () => {
  it("valida: cerca per testo e per stile nella destinazione del viaggio, con l'adattezza al profilo", async () => {
    const b = await bancoConBozza();
    const scritture = b.archivio.scritture.length;
    const perTesto = await b.esegui("cerca_catalogo", { testo: "sentiero", stile: null, categoria: null, limite: 3 });
    expect(perTesto.attivita.length).toBeGreaterThan(0);
    expect(perTesto.attivita.length).toBeLessThanOrEqual(3);
    for (const a of perTesto.attivita) expect(a.nome.toLowerCase()).toContain("sentiero");
    const ristoranti = await b.esegui("cerca_catalogo", { categoria: "pasto" });
    expect(ristoranti.attivita.every((a: { categoria: string }) => a.categoria === "pasto")).toBe(true);
    const natura = await b.esegui("cerca_catalogo", { stile: "natura" });
    expect(natura.attivita.every((a: { stili: string[] }) => a.stili.includes("natura"))).toBe(true);
    expect(natura.attivita[0]).toMatchObject({ adatta: true });
    expect(b.archivio.scritture).toHaveLength(scritture);
  });

  it("valida: le attività escluse dal profilo dicono perché", async () => {
    const b = await bancoConBozza();
    await b.esegui("aggiorna_profilo", { formaFisica: "facile" });
    const r = await b.esegui("cerca_catalogo", { testo: "attrezzato", limite: 25 });
    const esclusa = r.attivita.find((a: { adatta: boolean }) => a.adatta === false);
    expect(esclusa?.perche).toContain("È più faticosa di quanto hai scelto per la forma fisica.");
  });

  it("non valida: categoria sconosciuta, limite troppo alto, senza destinazione", async () => {
    const b = await bancoConBozza();
    await rifiuta(b.esegui("cerca_catalogo", { categoria: "museo" }), /categoria deve essere uno di/);
    await rifiuta(b.esegui("cerca_catalogo", { limite: 100 }), /al massimo 25/);
    await rifiuta(banco().esegui("cerca_catalogo", { testo: "lago" }), /destinazione non è ancora pronta/);
  });
});

describe("leggi_viaggio", () => {
  it("valida: viaggio non iniziato, bozza, versioni", async () => {
    expect(await banco().esegui("leggi_viaggio", {})).toMatchObject({ esiste: false });
    const b = await bancoConBozza();
    const bozza = await b.esegui("leggi_viaggio", { versione: null });
    expect(bozza).toMatchObject({ esiste: true, stato: "bozza", cosaManca: [], bozza: { revisione: 1 } });
    expect(bozza.zone.map((z: { zonaId: string }) => z.zonaId)).toEqual(istantanea(GARDA).zone.map((z) => z.id));
    await b.esegui("conferma_viaggio", {});
    const confermato = await b.esegui("leggi_viaggio", { versione: 1 });
    expect(confermato).toMatchObject({ stato: "confermato", versioni: [{ numero: 1, causa: "Itinerario iniziale" }], versioneMostrata: 1 });
    expect(confermato.viaggio.giorni).toHaveLength(3);
  });

  it("non valida: versione 0, versione inesistente, versione prima della conferma", async () => {
    const b = await bancoConBozza();
    await rifiuta(b.esegui("leggi_viaggio", { versione: 1 }), /non è ancora confermato/);
    await b.esegui("conferma_viaggio", {});
    await rifiuta(b.esegui("leggi_viaggio", { versione: 0 }), /almeno 1/);
    await rifiuta(b.esegui("leggi_viaggio", { versione: 5 }), /non esiste/);
  });
});
