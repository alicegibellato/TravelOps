// @vitest-environment jsdom
/**
 * ST-PLAN-002, CA-1 di REQ-PLAN-002: ogni operazione sulla bozza ha il suo pulsante (scheda dell'attività, giorno,
 * barra in alto) e la stessa operazione, come dato semplice, passa dall'unica API del motore che userà la chat.
 * «Crea la mia bozza» dalle preferenze prepara la revisione B1 e apre la pagina della bozza.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { conBaseDati, elencaRevisioniBozza, trovaViaggio } from "../src/basedati";
import { servizioBozza } from "../src/bozza/server";
import type { OperazioneBozza } from "../src/bozza/tipi";
import { PercorsoPreferenze } from "../src/componenti/PercorsoPreferenze";
import { opzioniPercorso } from "../src/preferenze/opzioni";
import { creaServizioPreferenze } from "../src/preferenze/servizio";
import { percorsoBozza } from "../src/percorsi";
import { nuovaBozza, montaBozza, premiEAttendi, primaAttivitaDelSelettore, profiloGarda, pulsanteIn, voceScambio, revisioneMostrata, schedeAttivita, ISTANTANEA_GARDA } from "./supporto-bozza";
import { attendi, monta, preparaChat } from "./supporto-chat";
import { compilaProfilo, destinazioniFinte, MESI_PREFERENZE, preparaPercorso } from "./supporto-preferenze";
import { nuovaCartella } from "./supporto-stato";

preparaChat();
preparaPercorso();

const revisioniSalvate = (cartella: string, viaggioId: string): number =>
  conBaseDati(cartella, (db) => {
    const elencate = elencaRevisioniBozza(db, viaggioId);
    return elencate.ok ? elencate.revisioni.length : -1;
  });

/** Codici tecnici che non devono mai comparire a vista (REQ-UX-001 CA-6). */
const CODICI = /\bD\d+-E\d+\b|\bN\d+\b|A-OSM|\b[A-Z]{3,}_[A-Z_]{3,}\b/;

describe("«Crea la mia bozza» prepara la revisione B1 e apre la pagina della bozza", () => {
  it("dal percorso guidato con una destinazione pronta: viaggio in stato bozza, B1 «Bozza iniziale», indirizzo della pagina", async () => {
    const cartella = nuovaCartella();
    const servizio = servizioBozza(cartella);
    const preferenze = { ...creaServizioPreferenze((lavoro) => conBaseDati(cartella, lavoro)), creaBozza: (b: Parameters<typeof servizio.crea>[0]) => Promise.resolve(servizio.crea(b)) };
    const aperta = vi.fn();
    // Il primo avvio carica le istantanee del repository.
    servizio.vista("nessuno");
    const vista = monta(
      <PercorsoPreferenze
        preferenze={preferenze}
        destinazioni={destinazioniFinte()}
        opzioni={opzioniPercorso()}
        mesi={MESI_PREFERENZE}
        precaricate={[{ id: ISTANTANEA_GARDA, nome: "Lago di Garda" }]}
        onBozzaCreata={aperta}
      />,
    );
    await compilaProfilo(vista, { ...profiloGarda(), destinazione: { tipo: "luogo", nome: "Lago di Garda" } });
    await attendi();
    expect(aperta).toHaveBeenCalledWith(percorsoBozza("viaggio-1"));
    conBaseDati(cartella, (db) => {
      expect(trovaViaggio(db, "viaggio-1")).toMatchObject({ stato: "bozza", demo: false, istantanea: ISTANTANEA_GARDA });
      const revisioni = elencaRevisioniBozza(db, "viaggio-1");
      expect(revisioni.ok && revisioni.revisioni.map((r) => [r.numero, r.causa])).toEqual([[1, "Bozza iniziale"]]);
    });
  });

  it("senza una destinazione pronta la bozza non nasce e il viaggiatore sa cosa fare", () => {
    const servizio = servizioBozza(nuovaCartella());
    const esito = servizio.crea({ ...profiloGarda(), destinazione: { tipo: "sorprendimi" } });
    expect(esito.esito).toBe("errore");
    if (esito.esito === "errore") expect(esito.messaggio).toMatch(/destinazioni pronte/);
  });
});

describe("CA-1 ogni operazione sulla bozza è disponibile da pulsante", () => {
  it("CA-1 schede, giorni e barra hanno i pulsanti di tutte le operazioni, senza codici tecnici a vista", () => {
    const bozza = nuovaBozza();
    const vista = montaBozza(bozza);
    const testi = new Set([...vista.querySelectorAll("button")].map((b) => b.textContent?.trim()));
    // Azioni di scheda e di giorno: nei menu «…», che si aprono da tastiera.
    const [d1] = bozza.vista.date.map((d) => d.valore);
    const scheda = schedeAttivita(vista, d1!)[0]!;
    for (const testo of ["Sostituisci", "Rimuovi", "Sposta", "Blocca"]) expect(() => pulsanteIn(scheda, testo), testo).not.toThrow();
    for (const testo of ["Giornata più leggera", "Giornata più piena", "Rigenera questo giorno", "Scambia con…", "Aggiungi un'attività…"]) {
      expect(() => pulsanteIn(vista.querySelector(`[data-data='${d1}']`)!, testo), testo).not.toThrow();
    }
    for (const testo of [
      "Rigenera con queste preferenze",
      "Mostrami un'alternativa",
      "Annulla",
      "Conferma l'itinerario",
    ]) {
      expect(testi.has(testo), testo).toBe(true);
    }
    expect(revisioneMostrata(vista)).toBe("Revisione B1");
    expect(vista.textContent).not.toMatch(CODICI);
  });

  it("CA-1 ogni pulsante crea una nuova revisione con la sua causa, salvata nella base dati", async () => {
    const bozza = nuovaBozza();
    const vista = montaBozza(bozza);
    const [d1, d2, d3] = bozza.vista.date.map((d) => d.valore);
    const giorno = (data: string | undefined) => vista.querySelector(`[data-data='${data}']`)!;
    const passi: [string, () => Element | Promise<Element>][] = [
      ["Blocca", () => pulsanteIn(schedeAttivita(vista, d2!)[0]!, "Blocca")],
      ["Rigenera questo giorno", () => pulsanteIn(giorno(d2), "Rigenera questo giorno")],
      ["Giornata più piena", () => pulsanteIn(giorno(d3), "Giornata più piena")],
      ["Giornata più leggera", () => pulsanteIn(giorno(d3), "Giornata più leggera")],
      ["Scambia i due giorni", () => voceScambio(giorno(d1))],
      ["Aggiungi", () => primaAttivitaDelSelettore(giorno(d3))],
      ["Rimuovi", () => pulsanteIn(schedeAttivita(vista, d3!).at(-1)!, "Rimuovi")],
      ["Mostrami un'alternativa", () => pulsanteIn(vista, "Mostrami un'alternativa")],
      ["Rigenera con queste preferenze", () => pulsanteIn(vista, "Rigenera con queste preferenze")],
    ];
    let attesa = 1;
    for (const [nome, trova] of passi) {
      await premiEAttendi(await trova());
      attesa += 1;
      expect(revisioneMostrata(vista), nome).toBe(`Revisione B${attesa}`);
      expect(vista.querySelector("[data-messaggio='bozza']")?.textContent, nome).toMatch(new RegExp(`^B${attesa}: `));
      expect(vista.textContent, nome).not.toMatch(CODICI);
    }
    // Sostituisci: le alternative, poi la scelta.
    await premiEAttendi(pulsanteIn(schedeAttivita(vista, d2!).at(-1)!, "Sostituisci"));
    const alternative = vista.querySelector("[role='group'][aria-label^='Alternative a']");
    const scelte = [...(alternative?.querySelectorAll("button") ?? [])].filter((b) => b.textContent !== "Non sostituire");
    expect(scelte.length).toBeGreaterThan(0);
    expect(scelte.length).toBeLessThanOrEqual(3);
    const nome = scelte[0]!.textContent ?? "";
    await premiEAttendi(scelte[0]!);
    expect(revisioneMostrata(vista)).toBe(`Revisione B${attesa + 1}`);
    expect(vista.querySelector(`[data-data='${d2}']`)?.textContent).toContain(nome);
    // Sposta: giorno e ora, poi «Sposta qui».
    const scheda = schedeAttivita(vista, d2!)[0]!;
    await premiEAttendi(pulsanteIn(scheda, "Sposta"));
    await premiEAttendi(pulsanteIn(scheda, "Sposta qui"));
    expect(revisioneMostrata(vista)).toBe(`Revisione B${attesa + 2}`);
    expect(revisioniSalvate(bozza.cartella, bozza.viaggioId)).toBe(attesa + 2);
  });

  it("CA-1 dalla chat: la stessa operazione arriva come dato semplice all'unica API e dà lo stesso risultato del pulsante", async () => {
    const daPulsante = nuovaBozza();
    const daChat = nuovaBozza();
    const vista = montaBozza(daPulsante);
    const data = daPulsante.vista.date[1]!.valore;
    const scheda = schedeAttivita(vista, data)[0]!;
    await premiEAttendi(pulsanteIn(scheda, "Blocca"));
    // Lo strumento della chat manda l'operazione in JSON (vedi evidence/ST-PLAN-002.md).
    const operazione = JSON.parse(JSON.stringify({ tipo: "blocca", elementoId: scheda.dataset.elemento })) as OperazioneBozza;
    const esito = daChat.servizio.opera(daChat.viaggioId, operazione);
    expect(esito.ok).toBe(true);
    expect(esito.ok && esito.vista).toEqual(daPulsante.servizio.vista(daPulsante.viaggioId));
    // Le azioni lato server espongono la stessa operazione generica.
    const azioni = readFileSync(join(process.cwd(), "app", "bozza", "azioni.ts"), "utf8");
    expect(azioni).toMatch(/export async function operaBozzaAzione\(viaggioId: string, operazione: OperazioneBozza\)/);
  });
});
