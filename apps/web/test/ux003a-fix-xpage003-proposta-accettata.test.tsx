/**
 * ST-UX-003A-FIX-TB-XPAGE-003 (TB-XPAGE-003): accettata la proposta dello scenario «Chiusura del MUSE» (S4) sul
 * viaggio della modalità presentazione, le pagine del viaggio di riferimento (`/viaggi/versione-1`, il giorno e
 * l'elemento) mostrano la versione corrente, come «Oggi»: nessuna mostra ancora la visita al MUSE del 2026-06-14.
 * Un viaggio di riferimento diverso da quello della presentazione resta l'itinerario di riferimento.
 */
import { versioneCorrente } from "@travelops/engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import PaginaGiorno from "../app/viaggi/[viaggio]/giorni/[data]/page";
import PaginaViaggio from "../app/viaggi/[viaggio]/page";
import { caricaViaggioScelto } from "../src/dati/viaggi";
import { caricaViaggioDellApp } from "../src/dati/viaggi-salvati";
import { datiOggi } from "../src/oggi/operazioni";
import { accettaProposta, avviaScenario, impostaOrologio } from "../src/stato/operazioni";
import { html } from "./supporto";
import { nuovaCartella, statoSalvato } from "./supporto-stato";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((indirizzo: string) => {
    throw new Error(`REDIRECT ${indirizzo}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT FOUND");
  }),
  usePathname: () => "/viaggi/versione-1",
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
});

const VIAGGIO = "versione-1";
const GIORNO_MUSE = "2026-06-14";
const ATTIVITA_MUSE = "A-MUSE";

/** Gli id delle attività di un giorno. */
function attivitaDelGiorno(viaggio: { giorni: { data: string; elementi: unknown[] }[] }, data: string): string[] {
  const giorno = viaggio.giorni.find((g) => g.data === data);
  return (giorno?.elementi ?? []).map((e) => (e as { attivitaId?: string }).attivitaId ?? "").filter((id) => id !== "");
}

/** Avvia S4 (chiusura del MUSE il 2026-06-14) e accetta la proposta: nasce la versione 2. */
function accettaChiusuraMuse(cartella: string): void {
  const avvio = avviaScenario(cartella, "S4");
  if (!avvio.ok) throw new Error(avvio.messaggio);
  const orologio = impostaOrologio(cartella, "2026-06-13", "20:00");
  if (!orologio.ok) throw new Error(orologio.messaggio);
  const esito = accettaProposta(cartella, avvio.proposta.id, "Alice");
  if (!esito.ok) throw new Error(esito.messaggio);
}

describe("TB-XPAGE-003 la proposta accettata si vede in tutte le pagine del viaggio di riferimento", () => {
  it("prima della fix il viaggio di riferimento ha il MUSE il 2026-06-14 (precondizione del caso)", () => {
    const riferimento = caricaViaggioScelto(VIAGGIO);
    if (riferimento?.ok !== true) throw new Error("viaggio di riferimento non valido");
    expect(attivitaDelGiorno(riferimento.viaggio, GIORNO_MUSE)).toContain(ATTIVITA_MUSE);
  });

  it("caricaViaggioDellApp restituisce la versione corrente, la stessa di «Oggi»", () => {
    const cartella = nuovaCartella();
    accettaChiusuraMuse(cartella);
    const corrente = versioneCorrente(statoSalvato(cartella).storico);
    expect(corrente.numero).toBe(2);
    expect(attivitaDelGiorno(corrente.viaggio, GIORNO_MUSE)).not.toContain(ATTIVITA_MUSE);

    const caricato = caricaViaggioDellApp(cartella, VIAGGIO);
    if (caricato?.esito.ok !== true) throw new Error("viaggio non caricato");
    expect(caricato.riferimento).toBe(true);
    expect(caricato.esito.viaggio).toEqual(corrente.viaggio);
    expect(caricato.esito.viaggio).toEqual(datiOggi(cartella, VIAGGIO)?.viaggio);
  });

  it("le pagine del viaggio e del giorno non mostrano più la visita al MUSE", async () => {
    const cartella = nuovaCartella();
    const dati = `${cartella}/.data`;
    accettaChiusuraMuse(dati);
    vi.spyOn(process, "cwd").mockReturnValue(cartella);
    const giorno = html(await PaginaGiorno({ params: Promise.resolve({ viaggio: VIAGGIO, data: GIORNO_MUSE }) }));
    expect(giorno).not.toContain("Visita al MUSE");
    const viaggio = html(await PaginaViaggio({ params: Promise.resolve({ viaggio: VIAGGIO }) }));
    expect(viaggio).not.toContain("Visita al MUSE");
  });

  it("senza proposte accettate, o per un altro viaggio di riferimento, resta l'itinerario di riferimento", () => {
    const cartella = nuovaCartella();
    const prima = caricaViaggioDellApp(cartella, VIAGGIO);
    if (prima?.esito.ok !== true) throw new Error("viaggio non caricato");
    expect(attivitaDelGiorno(prima.esito.viaggio, GIORNO_MUSE)).toContain(ATTIVITA_MUSE);

    accettaChiusuraMuse(cartella);
    const altro = caricaViaggioDellApp(cartella, "v-irr");
    const riferimentoAltro = caricaViaggioScelto("v-irr");
    if (altro?.esito.ok !== true || riferimentoAltro?.ok !== true) throw new Error("variante non caricata");
    expect(altro.esito.viaggio).toEqual(riferimentoAltro.viaggio);
  });
});
