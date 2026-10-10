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
  type Banco,
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
  it("15 strumenti con i nomi previsti, tutti rigorosi e con lo schema compatibile con la modalità strict", () => {
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

/** Gli argomenti di `opera_bozza` (tutti i campi, null quelli non usati). */
const op = (operazione: string, resto: Record<string, unknown> = {}) => ({
  operazione,
  elementoId: null,
  attivitaId: null,
  data: null,
  conData: null,
  inizio: null,
  numero: null,
  ...resto,
});

/** Le attività vere (pasti esclusi) della revisione corrente dell'archivio. */
function attivitaDellaBozza(b: Banco, revisione = -1) {
  const ist = istantanea(GARDA);
  const categoria = new Map(ist.attivita.map((a) => [a.id, a.categoria]));
  const viaggio = b.archivio.contenuto().revisioni.at(revisione)!.viaggio;
  return viaggio.giorni.flatMap((g) =>
    g.elementi.flatMap((e) => (e.tipo === "attivita" && categoria.get(e.attivitaId) !== "pasto" ? [{ ...e, data: g.data }] : [])),
  );
}

describe("opera_bozza", () => {
  it("valida, per ogni operazione dei pulsanti: crea una revisione con la causa del motore", async () => {
    const b = await bancoConBozza();
    const [prima, seconda] = attivitaDellaBozza(b);
    const date = b.archivio.contenuto().revisioni[0]!.viaggio.giorni.map((g) => g.data);

    const rimossa = await b.esegui("opera_bozza", op("rimuovi", { elementoId: prima!.id }));
    expect(rimossa).toMatchObject({ applicata: true, revisione: 2, causa: expect.stringMatching(/^Tolto "/) });
    expect(JSON.stringify(rimossa.giorni)).not.toContain(prima!.id);

    const bloccata = await b.esegui("opera_bozza", op("blocca", { elementoId: attivitaDellaBozza(b)[0]!.id }));
    expect(bloccata).toMatchObject({ revisione: 3, causa: expect.stringMatching(/^Bloccato "/) });
    const sbloccata = await b.esegui("opera_bozza", op("sblocca", { elementoId: attivitaDellaBozza(b)[0]!.id }));
    expect(sbloccata).toMatchObject({ revisione: 4, causa: expect.stringMatching(/^Sbloccato "/) });

    const piena = await b.esegui("opera_bozza", op("giornata_piu_piena", { data: date[0] }));
    expect(piena.causa).toMatch(/più piena: aggiunto "/);
    const leggera = await b.esegui("opera_bozza", op("giornata_piu_leggera", { data: date[0] }));
    expect(leggera.causa).toMatch(/più leggera: tolto "/);
    const rigenerata = await b.esegui("opera_bozza", op("rigenera_giorno", { data: date[1] }));
    expect(rigenerata.causa).toBe(`Rigenerata la giornata del ${date[1]}`);
    const scambiata = await b.esegui("opera_bozza", op("scambia_giorni", { data: date[1], conData: date[2] }));
    expect(scambiata.causa).toBe(`Scambiati i giorni ${date[1]} e ${date[2]}`);
    const alternativa = await b.esegui("opera_bozza", op("alternativa"));
    expect(alternativa.causa).toBe("Un'alternativa con attività diverse, tenendo quelle bloccate");

    const annullata = await b.esegui("opera_bozza", op("annulla"));
    expect(annullata.causa).toMatch(/^Annullata la modifica "Un'alternativa .*": tornato alla revisione B/);
    const tornata = await b.esegui("opera_bozza", op("torna_alla_revisione", { numero: 1 }));
    expect(tornata.causa).toBe("Tornato alla revisione B1");
    expect(seconda).toBeDefined();
    expect(b.archivio.contenuto().revisioni.map((r) => r.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("valida: sostituisci con un'alternativa proposta, sposta e aggiungi", async () => {
    const b = await bancoConBozza();
    const [prima] = attivitaDellaBozza(b);
    const { alternative } = await b.esegui("alternative_bozza", { elementoId: prima!.id });
    expect(alternative.length).toBeGreaterThan(0);
    const sostituita = await b.esegui("opera_bozza", op("sostituisci", { elementoId: prima!.id, attivitaId: alternative[0].attivitaId }));
    expect(sostituita).toMatchObject({ applicata: true, revisione: 2, causa: expect.stringMatching(/^Sostituito "/) });

    const date = b.archivio.contenuto().revisioni[0]!.viaggio.giorni.map((g) => g.data);
    const rimossa = await b.esegui("opera_bozza", op("rimuovi", { elementoId: attivitaDellaBozza(b)[0]!.id }));
    const nuovaId = alternative[1]?.attivitaId ?? prima!.attivitaId;
    const aggiunta = await b.esegui("opera_bozza", op("aggiungi", { attivitaId: nuovaId, data: date[2] }));
    expect(aggiunta.causa).toMatch(/^Aggiunto "/);
    expect(rimossa.revisione).toBe(3);
    const attivita = attivitaDellaBozza(b).find((e) => e.attivitaId === nuovaId && e.data === date[2])!;
    const spostata = await b.esegui("opera_bozza", op("sposta", { elementoId: attivita.id, data: date[2], inizio: "09:30" }));
    expect(spostata.causa).toMatch(/^Spostato "/);
  });

  it("la revisione è quella che si legge dall'archivio e il viaggio resta fattibile e valido", async () => {
    const b = await bancoConBozza();
    await b.esegui("opera_bozza", op("giornata_piu_leggera", { data: "2026-10-21" }));
    const { revisioni } = b.archivio.contenuto();
    expect(revisioni).toHaveLength(2);
    expect(caricaViaggio(revisioni[1]!.viaggio).ok).toBe(true);
    expect(revisioni[1]!.causa).toMatch(/^Giornata del 2026-10-21 più leggera/);
  });

  it("non valida: campi mancanti, operazione sconosciuta, elemento o giorno inesistente, nessuna bozza, viaggio confermato", async () => {
    const b = await bancoConBozza();
    await rifiuta(b.esegui("opera_bozza", op("sostituisci", { elementoId: "D1-E1" })), /serve "attivitaId"/);
    await rifiuta(b.esegui("opera_bozza", op("rimuovi")), /serve "elementoId"/);
    await rifiuta(b.esegui("opera_bozza", op("sposta", { elementoId: "D1-E1", data: "2026-10-21" })), /serve "inizio"/);
    await rifiuta(b.esegui("opera_bozza", op("scambia_giorni", { data: "2026-10-21" })), /serve "conData"/);
    await rifiuta(b.esegui("opera_bozza", op("torna_alla_revisione")), /serve "numero"/);
    await rifiuta(b.esegui("opera_bozza", op("cancella", { elementoId: "D1-E1" })), /operazione deve essere uno di/);
    await rifiuta(b.esegui("opera_bozza", op("cambia_preferenze")), /operazione deve essere uno di/);
    await rifiuta(b.esegui("opera_bozza", op("rimuovi", { elementoId: "D9-E9" })), /L'operazione non si può fare: Non trovo questa attività/);
    await rifiuta(b.esegui("opera_bozza", op("rigenera_giorno", { data: "2026-11-01" })), /non è un giorno di questo viaggio/);
    await rifiuta(b.esegui("opera_bozza", op("rigenera_giorno", { data: "21/10/2026" })), /formato atteso/);
    await rifiuta(b.esegui("opera_bozza", op("scambia_giorni", { data: "2026-10-21", conData: "2026-10-21" })), /due giorni diversi/);
    await rifiuta(b.esegui("opera_bozza", op("annulla")), /nessuna modifica da annullare/);
    await rifiuta(b.esegui("opera_bozza", op("torna_alla_revisione", { numero: 9 })), /revisione B9 non esiste/);
    await rifiuta(b.esegui("opera_bozza", { ...op("annulla"), extra: 1 }), /non è previsto/);
    expect(b.archivio.contenuto().revisioni).toHaveLength(1);

    await rifiuta(banco().esegui("opera_bozza", op("annulla")), /destinazione non è ancora pronta/);
    const senzaBozza = banco();
    await senzaBozza.esegui("prepara_destinazione", { areaId: AREA_GARDA, testo: null });
    await rifiuta(senzaBozza.esegui("opera_bozza", op("annulla")), /Non c'è ancora una bozza/);

    await b.esegui("conferma_viaggio", {});
    await rifiuta(b.esegui("opera_bozza", op("annulla")), /già confermato/);
  });
});

describe("cambia_preferenze_bozza", () => {
  it("valida: cambia ritmo e stili, rigenera tenendo le attività bloccate e salva il profilo", async () => {
    const b = await bancoConBozza();
    const [prima] = attivitaDellaBozza(b);
    await b.esegui("opera_bozza", op("blocca", { elementoId: prima!.id }));
    const r = await b.esegui("cambia_preferenze_bozza", { ritmo: "intenso", stili: ["natura"] });
    expect(r).toMatchObject({ applicata: true, revisione: 3, causa: "Cambiate le preferenze: rigenerato il viaggio tenendo le attività bloccate" });
    expect(JSON.stringify(r.giorni)).toContain(prima!.attivitaId);
    expect(b.archivio.contenuto().profilo).toMatchObject({ ritmo: "intenso", stili: ["natura"] });
    await b.esegui("cambia_preferenze_bozza", { ritmo: "lento", stili: null });
    expect(b.archivio.contenuto().profilo).toMatchObject({ ritmo: "lento", stili: ["natura"] });
  });

  it("non valida: nessun campo, ritmo o stile sconosciuto, nessuna bozza, viaggio confermato", async () => {
    const b = await bancoConBozza();
    await rifiuta(b.esegui("cambia_preferenze_bozza", { ritmo: null, stili: null }), /almeno il ritmo o gli stili/);
    await rifiuta(b.esegui("cambia_preferenze_bozza", { ritmo: "veloce", stili: null }), /ritmo deve essere uno di/);
    await rifiuta(b.esegui("cambia_preferenze_bozza", { ritmo: null, stili: ["spiaggia"] }), /deve essere uno di/);
    await rifiuta(banco().esegui("cambia_preferenze_bozza", { ritmo: "lento", stili: null }), /destinazione non è ancora pronta/);
    expect(b.archivio.contenuto().revisioni).toHaveLength(1);
    await b.esegui("conferma_viaggio", {});
    await rifiuta(b.esegui("cambia_preferenze_bozza", { ritmo: "lento", stili: null }), /già confermato/);
  });
});

describe("alternative_bozza e confronta_bozza", () => {
  it("valida: alternative per «sostituisci» e confronto tra due revisioni, senza scrivere", async () => {
    const b = await bancoConBozza();
    const [prima] = attivitaDellaBozza(b);
    const scritture = b.archivio.scritture.length;
    const { alternative } = await b.esegui("alternative_bozza", { elementoId: prima!.id });
    const nomi = istantanea(GARDA).attivita.map((a) => a.nome);
    for (const a of alternative) expect(nomi).toContain(a.nome);
    expect((await b.esegui("alternative_bozza", { elementoId: "D1-E1" })).alternative).toEqual([]);

    await b.esegui("opera_bozza", op("rimuovi", { elementoId: prima!.id }));
    const scrittureDopo = b.archivio.scritture.length;
    const confronto = await b.esegui("confronta_bozza", { da: 1, a: 2 });
    expect(confronto).toMatchObject({ da: 1, a: 2 });
    expect(confronto.rimossi.map((e: { id: string }) => e.id)).toContain(prima!.id);
    expect(b.archivio.scritture).toHaveLength(scrittureDopo);
    expect(scrittureDopo).toBeGreaterThan(scritture);
  });

  it("non valida: elemento mancante, revisione inesistente o 0, nessuna bozza", async () => {
    const b = await bancoConBozza();
    await rifiuta(b.esegui("alternative_bozza", {}), /manca argomenti.elementoId/);
    await rifiuta(b.esegui("confronta_bozza", { da: 1, a: 7 }), /Le revisioni vanno da B1 a B1: B1 o B7 non esiste/);
    await rifiuta(b.esegui("confronta_bozza", { da: 0, a: 1 }), /almeno 1/);
    await rifiuta(b.esegui("confronta_bozza", { da: 1 }), /manca argomenti.a/);
    await rifiuta(banco().esegui("confronta_bozza", { da: 1, a: 2 }), /destinazione non è ancora pronta/);
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
    await rifiuta(c.esegui("opera_bozza", op("rimuovi", { elementoId: "D1-E1" })), /già confermato/);
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
