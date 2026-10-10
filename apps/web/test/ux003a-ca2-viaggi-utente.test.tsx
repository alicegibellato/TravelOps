/**
 * ST-UX-003A, CA-2 di REQ-UX-003: i viaggi creati dalla chat o dai filtri compaiono in "I miei viaggi" e in Oggi, non
 * solo i viaggi demo. La home legge i viaggi della base dati (una bozza porta a `/bozza/<id>`, un viaggio confermato
 * alla sua pagina); la pagina del viaggio, i giorni, gli elementi e la vista Oggi funzionano anche per un viaggio
 * confermato del viaggiatore. Base dati in una cartella temporanea, nessuna rete.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../app/page";
import PaginaOggiGenerale from "../app/oggi/page";
import PaginaViaggio from "../app/viaggi/[viaggio]/page";
import PaginaElemento from "../app/viaggi/[viaggio]/elementi/[elemento]/page";
import PaginaGiorno from "../app/viaggi/[viaggio]/giorni/[data]/page";
import PaginaOggi from "../app/viaggi/[viaggio]/oggi/page";
import { elencaProposteDelViaggio, salvaViaggio } from "../src/basedati";
import { servizioBozza } from "../src/bozza/server";
import { caricaViaggioDellApp, schedeHome } from "../src/dati/viaggi-salvati";
import { datiOggi, segnalaRitardoDaOggi } from "../src/oggi/operazioni";
import { usaBaseDati } from "../src/stato/avvio";
import { impostaOrologio } from "../src/stato/operazioni";
import { html } from "./supporto";
import { nuovaCartella } from "./supporto-stato";
import { conViaggioUtente } from "./supporto-ux003a";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((indirizzo: string) => {
    throw new Error(`REDIRECT ${indirizzo}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT FOUND");
  }),
  usePathname: () => "/",
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const ORIGINALE = process.env.TRAVELOPS_OROLOGIO;

beforeEach(() => {
  // L'ora reale non entra mai nei test: l'orologio è sempre quello simulato.
  process.env.TRAVELOPS_OROLOGIO = "simulato";
});

afterEach(() => {
  vi.restoreAllMocks();
  if (ORIGINALE === undefined) delete process.env.TRAVELOPS_OROLOGIO;
  else process.env.TRAVELOPS_OROLOGIO = ORIGINALE;
});

/** Una cartella di lavoro finta per Next.js (`<cartella>/.data`), con un viaggio confermato e una bozza del viaggiatore. */
function cartellaConViaggi(): string {
  const cartella = nuovaCartella();
  const dati = `${cartella}/.data`;
  conViaggioUtente(dati, { id: "viaggio-1", titolo: "Viaggio a Lago di Garda", ordine: 100 });
  conViaggioUtente(dati, { id: "viaggio-2", titolo: "Il mio weekend al lago", stato: "bozza", ordine: 101 });
  // Un viaggio appena nato in chat, ancora senza bozza: non si può aprire, quindi non compare.
  usaBaseDati(dati, (db) =>
    salvaViaggio(db, { id: "chat-7", titolo: "Nuovo viaggio", stato: "bozza", demo: false, ordine: 102, destinazione: null, istantanea: null }),
  );
  // Next.js legge i dati da `<cartella di lavoro>/.data`: la cartella di lavoro si finge dopo il primo avvio, che
  // carica le istantanee del repository a partire da quella vera.
  vi.spyOn(process, "cwd").mockReturnValue(cartella);
  return dati;
}

const parametri = <T,>(valori: T) => Promise.resolve(valori);

// Il primo avvio della base dati (istantanee e viaggi demo) richiede qualche secondo su questa macchina.
const LENTO = { timeout: 60_000 };

describe("CA-2 «I miei viaggi» elenca i viaggi della base dati", LENTO, () => {
  it("CA-2 prima i viaggi del viaggiatore (bozza → /bozza/<id>, confermato → /viaggi/<id>), poi tutti i viaggi demo", () => {
    const dati = cartellaConViaggi();
    const schede = schedeHome(dati);
    const chiavi = schede.map((s) => s.chiave);
    expect(chiavi.slice(0, 2)).toEqual(["viaggio-2", "viaggio-1"]);
    expect(chiavi).not.toContain("chat-7");
    // TB-NEW-D6: gli itinerari di riferimento (scenari della presentazione) non sono viaggi dell'utente: niente card doppie.
    expect(chiavi.slice(2)).toEqual(["TRIP-DEMO-GARDA", "TRIP-DEMO-DOLOMITI", "TRIP-DEMO-ROMA"]);
    for (const riferimento of ["versione-1", "v-irr", "v-fisso", "v-volo"]) expect(chiavi).not.toContain(riferimento);

    const bozza = schede.find((s) => s.chiave === "viaggio-2");
    expect(bozza).toMatchObject({ href: "/bozza/viaggio-2", stato: "bozza", titolo: "Il mio weekend al lago", datiNonValidi: false });
    expect(bozza?.periodo).toContain("giugno 2026");
    const confermato = schede.find((s) => s.chiave === "viaggio-1");
    expect(confermato).toMatchObject({ href: "/viaggi/viaggio-1", stato: "confermato", datiNonValidi: false });
    // La destinazione fa da variante quando il titolo non la dice già per intero.
    expect(confermato?.variante).toContain("Riva del Garda");
    expect(confermato?.dettagli).toMatch(/^4 giorni · \d+ viaggiator/);
    expect(schede.find((s) => s.chiave === "TRIP-DEMO-ROMA")?.href).toBe("/bozza/TRIP-DEMO-ROMA");
    expect(schede.find((s) => s.chiave === "TRIP-DEMO-GARDA")?.href).toBe("/viaggi/TRIP-DEMO-GARDA");
  });

  it("CA-2 la pagina home mostra le schede con i collegamenti giusti", () => {
    cartellaConViaggi();
    const markup = html(Home());
    expect(markup).toContain('href="/viaggi/viaggio-1"');
    expect(markup).toContain('href="/bozza/viaggio-2"');
    expect(markup).not.toContain('href="/viaggi/versione-1"');
    expect(markup).toContain("Il mio weekend al lago");
  });
});

describe("CA-2 pagina del viaggio, giorni, elementi e Oggi per un viaggio confermato del viaggiatore", LENTO, () => {
  it("CA-2 il viaggio confermato si carica dalla base dati; una bozza o un viaggio sconosciuto no", () => {
    const dati = cartellaConViaggi();
    const caricato = caricaViaggioDellApp(dati, "viaggio-1");
    expect(caricato).toMatchObject({ chiave: "viaggio-1", riferimento: false, demo: false, stato: "confermato" });
    expect(caricato?.esito.ok).toBe(true);
    expect(caricaViaggioDellApp(dati, "viaggio-2")).toBeNull();
    expect(caricaViaggioDellApp(dati, "sconosciuto")).toBeNull();
    expect(caricaViaggioDellApp(dati, "versione-1")?.riferimento).toBe(true);
  });

  it("CA-2 con l'orologio sul primo giorno la pagina del viaggio si apre su «Oggi»", async () => {
    cartellaConViaggi();
    const markup = html(await PaginaViaggio({ params: parametri({ viaggio: "viaggio-1" }) }));
    expect(markup).toContain('data-riquadro="oggi"');
    expect(markup).toContain('data-momento="2026-06-12 08:00"');
    expect(markup).toContain('href="/viaggi/viaggio-1/giorni/2026-06-13"');
  });

  it("CA-2 fuori dalle date la pagina del viaggio mostra l'itinerario; giorni ed elementi si aprono", async () => {
    const dati = cartellaConViaggi();
    impostaOrologio(dati, "2026-06-30", "10:00");
    const markup = html(await PaginaViaggio({ params: parametri({ viaggio: "viaggio-1" }) }));
    expect(markup).not.toContain('data-riquadro="oggi"');
    expect(markup).toContain('id="viaggio-titolo"');
    const giorno = html(await PaginaGiorno({ params: parametri({ viaggio: "viaggio-1", data: "2026-06-13" }) }));
    expect(giorno).toContain("13 giugno");
    const caricato = caricaViaggioDellApp(dati, "viaggio-1");
    const elemento = caricato?.esito.ok === true ? caricato.esito.viaggio.giorni[1]?.elementi[0]?.id : undefined;
    if (elemento === undefined) throw new Error("manca un elemento");
    expect(html(await PaginaElemento({ params: parametri({ viaggio: "viaggio-1", elemento }) }))).toContain("viaggio-1");
    await expect(PaginaViaggio({ params: parametri({ viaggio: "viaggio-2" }) })).rejects.toThrow("NOT FOUND");
  });

  it("CA-2 la vista Oggi del viaggio del viaggiatore mostra Adesso e Dopo", async () => {
    const dati = cartellaConViaggi();
    impostaOrologio(dati, "2026-06-13", "10:30");
    expect(datiOggi(dati, "viaggio-1")?.momento).toEqual({ data: "2026-06-13", ora: "10:30" });
    const markup = html(await PaginaOggi({ params: parametri({ viaggio: "viaggio-1" }), searchParams: Promise.resolve({}) }));
    expect(markup).toContain('data-momento="2026-06-13 10:30"');
    expect(markup).toContain('data-scheda="adesso"');
  });

  it("CA-2 «Oggi» apre il viaggio del viaggiatore in corso; senza viaggi in corso, quello della modalità presentazione", async () => {
    const dati = cartellaConViaggi();
    expect(() => PaginaOggiGenerale()).toThrow("REDIRECT /viaggi/viaggio-1/oggi");
    impostaOrologio(dati, "2026-06-30", "10:00");
    expect(() => PaginaOggiGenerale()).toThrow("REDIRECT /viaggi/versione-1/oggi");
  });

  it("CA-2 un ritardo segnalato da Oggi diventa una proposta del viaggio, da decidere nella sua pagina", () => {
    const dati = cartellaConViaggi();
    impostaOrologio(dati, "2026-06-13", "09:00");
    const esito = segnalaRitardoDaOggi(dati, "viaggio-1", 30);
    expect(esito).toEqual({ ok: true, indirizzo: "/bozza/viaggio-1" });
    const proposte = usaBaseDati(dati, (db) => elencaProposteDelViaggio(db, "viaggio-1"));
    expect(proposte).toHaveLength(1);
    const proposta = proposte[0]?.proposta as { origine: { imprevisto: { data: string; momento: string } } };
    expect(proposta.origine.imprevisto).toMatchObject({ data: "2026-06-13", momento: "09:00" });
    const vista = servizioBozza(dati).vista("viaggio-1");
    expect(vista?.proposte.map((p) => p.titolo)).toEqual(["Sono in ritardo di 30 minuti"]);
    // Il viaggio di riferimento continua a usare la pagina della proposta della modalità presentazione.
    expect(segnalaRitardoDaOggi(dati, "versione-1", 15)).toMatchObject({ ok: true, indirizzo: expect.stringMatching(/^\/demo\/proposte\/\d+$/) });
  });
});
