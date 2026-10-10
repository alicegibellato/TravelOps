// @vitest-environment jsdom
/**
 * ST-UX-004B (REQ-UX-004, CB-1..CB-6): meteo per giorno nella bozza e in Oggi, intestazione compatta, card dei viaggi
 * distinguibili, Sorprendimi che si riassume, copione e etichette della Demo, un solo pannello azione in bozza.
 */
import { creaMeteoFinto, type ServizioMeteo } from "@travelops/sources";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PaginaOggi from "../app/viaggi/[viaggio]/oggi/page";
import { Guscio } from "../src/ui/Guscio";
import { PaginaDemo } from "../src/componenti/PaginaDemo";
import { PaginaHome } from "../src/componenti/PaginaHome";
import { PaginaBozza } from "../src/componenti/PaginaBozza";
import { Sorprendimi } from "../src/componenti/Sorprendimi";
import { VIAGGI } from "../src/dati/viaggi";
import { dimenticaServizi } from "../src/servizi/esterni";
import { meteoDelViaggio } from "../src/servizi/meteo-viaggio";
import { leggiStato } from "../src/stato/archivio";
import { impostaOrologio } from "../src/stato/operazioni";
import { IllustrazioneLuogo } from "../src/ui/IllustrazioneLuogo";
import { MenuIntestazione } from "../src/ui/MenuIntestazione";
import { regoleMenuCompatto, SOGLIA_MENU_COMPATTO_PX } from "../src/ui/configurazione-intestazione";
import { stagioneDellaData } from "../src/ui/luoghi-config";
import { vistaDemo } from "../src/viste/demo";
import { vistaHome } from "../src/viste/home";
import { catalogoDiRiferimento } from "../src/dati/scenari";
import { html } from "./supporto";
import { azioniDi, nuovaBozza, premiEAttendi, pulsanteIn, schedeAttivita } from "./supporto-bozza";
import { attendi, clic, monta, preparaChat } from "./supporto-chat";
import { MESI_DI_PROVA, servizioDiProva } from "./supporto-destinazioni";
import { AZIONI_DEMO, nuovaCartella } from "./supporto-stato";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  notFound: vi.fn(() => {
    throw new Error("NOT FOUND");
  }),
  redirect: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

preparaChat();

afterEach(() => {
  vi.restoreAllMocks();
  dimenticaServizi();
});

const piove = (data: string): ServizioMeteo => creaMeteoFinto({ condizione: (_c, d) => (d === data ? "pioggia" : "sereno") });

describe("CB-1 previsione per giorno nella bozza e in Oggi", () => {
  it("la bozza mostra la previsione di ogni giorno, con le porte di ST-INTEG-001 (meteo finto marcato come esempio)", async () => {
    const bozza = nuovaBozza();
    const dati = bozza.servizio.datiPerMeteo(bozza.viaggioId);
    expect(dati).not.toBeNull();
    const meteo = await meteoDelViaggio(dati!.viaggio, dati!.catalogo, { meteo: piove(bozza.vista.date[1]!.valore) });
    const vista = monta(<PaginaBozza vista={bozza.vista} azioni={azioniDi(bozza)} meteo={meteo.perGiorno} />);
    const giorni = [...vista.querySelectorAll<HTMLElement>(".bozza__giorno")];
    expect(giorni).toHaveLength(bozza.vista.giorni.length);
    for (const giorno of giorni) expect(giorno.querySelector(".previsione-giorno"), giorno.dataset["data"]).not.toBeNull();
    expect(giorni[1]!.querySelector(".previsione-giorno")?.getAttribute("data-meteo")).toBe("pioggia");
    expect(giorni[1]!.querySelector(".previsione-giorno")?.textContent).toContain("(esempio)");
  });

  it("senza meteo la bozza è quella di prima", () => {
    const bozza = nuovaBozza();
    const vista = monta(<PaginaBozza vista={bozza.vista} azioni={azioniDi(bozza)} />);
    expect(vista.querySelector(".previsione-giorno")).toBeNull();
  });

  it("datiPerMeteo di una bozza che non c'è è null", () => {
    expect(nuovaBozza().servizio.datiPerMeteo("non-esiste")).toBeNull();
  });

  it("la pagina Oggi mostra la previsione del giorno dell'orologio simulato, nella stessa modalità finta/reale dei servizi", async () => {
    const cartella = nuovaCartella();
    impostaOrologio(`${cartella}/.data`, "2026-06-13", "10:30");
    vi.spyOn(process, "cwd").mockReturnValue(cartella);
    const markup = html(await PaginaOggi({ params: Promise.resolve({ viaggio: "versione-1" }), searchParams: Promise.resolve({}) }));
    expect(markup).toContain("data-meteo-oggi");
    expect((markup.match(/class="previsione-giorno"/g) ?? []).length).toBe(1);
    expect(markup).toContain('data-origine="finto"');
    expect(markup).toContain("(esempio)");
  });
});

describe("CB-2 intestazione in una riga con menu compatto", () => {
  it("il guscio ha il pulsante «Menu» e il pannello con sezioni, presentazione e selettore del tema", () => {
    const d = new DOMParser().parseFromString(html(<Guscio><p>Contenuto</p></Guscio>), "text/html");
    const pulsante = d.querySelector("header button.ui-intestazione__menu-pulsante");
    expect(pulsante?.getAttribute("aria-expanded")).toBe("false");
    const pannello = d.getElementById(pulsante?.getAttribute("aria-controls") ?? "-");
    expect(pannello?.querySelector("nav[aria-label='Sezioni']")).not.toBeNull();
    expect(pannello?.querySelector("a.ui-intestazione__presentazione")).not.toBeNull();
    expect(pannello?.querySelector("fieldset.ui-selettore-tema")).not.toBeNull();
    expect(d.querySelector("header > .ui-intestazione__riga > a.ui-intestazione__marchio")).not.toBeNull();
  });

  it("la soglia è configurabile: le regole del menu compatto vengono dal valore, non dal foglio di stile", () => {
    expect(regoleMenuCompatto()).toContain(`(max-width: ${SOGLIA_MENU_COMPATTO_PX - 1}px)`);
    expect(regoleMenuCompatto()).toContain(`(min-width: ${SOGLIA_MENU_COMPATTO_PX}px)`);
    expect(regoleMenuCompatto(800)).toContain("(max-width: 799px)");
    expect(regoleMenuCompatto(800)).toContain("(min-width: 800px)");
  });

  it("il pulsante apre e chiude il pannello; Esc chiude e il focus torna sul pulsante", () => {
    const vista = monta(
      <MenuIntestazione>
        <a href="/x">Voce</a>
      </MenuIntestazione>,
    );
    const pulsante = vista.querySelector<HTMLButtonElement>("button")!;
    const pannello = vista.querySelector<HTMLElement>(".ui-intestazione__pannello")!;
    expect(pannello.dataset["aperto"]).toBe("no");
    clic(pulsante);
    expect(pulsante.getAttribute("aria-expanded")).toBe("true");
    expect(pannello.dataset["aperto"]).toBe("si");
    act(() => {
      pannello.querySelector("a")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(pannello.dataset["aperto"]).toBe("no");
    expect(document.activeElement).toBe(pulsante);
    clic(pulsante);
    clic(pulsante);
    expect(pannello.dataset["aperto"]).toBe("no");
  });
});

describe("CB-3 card dei viaggi distinguibili", () => {
  it("il titolo dice luogo e date, e il disegno dipende dal tipo di luogo e dalla stagione", () => {
    const schede = vistaHome(VIAGGI);
    for (const scheda of schede) {
      expect(scheda.tipoLuogo).toBe("lago");
      expect(scheda.stagione).toBe("estate");
    }
    const vista = monta(<PaginaHome viaggi={schede} />);
    for (const li of vista.querySelectorAll<HTMLElement>(".scheda-viaggio")) {
      expect(li.querySelector("h3")?.textContent).toMatch(/^Weekend sul Garda · 12–14 giugno 2026 /);
      expect(li.querySelector(".ui-luogo")?.getAttribute("data-luogo")).toBe("lago");
      expect(li.querySelector(".ui-luogo")?.getAttribute("data-stagione")).toBe("estate");
    }
    const disegni = [...vista.querySelectorAll(".scheda-viaggio .ui-luogo svg")].map((s) => s.innerHTML);
    expect(new Set(disegni).size).toBe(disegni.length);
  });

  it("stagioni e tipi diversi danno illustrazioni diverse, con i valori dalla configurazione", () => {
    expect(["2026-01-10", "2026-04-02", "2026-07-20", "2026-10-05", "2026-12-24"].map(stagioneDellaData)).toEqual(["inverno", "primavera", "estate", "autunno", "inverno"]);
    expect(stagioneDellaData("non una data")).toBeUndefined();
    const d = (tipo: "lago" | "montagna", stagione: "estate" | "inverno") => html(<IllustrazioneLuogo nome="Posto" tipo={tipo} stagione={stagione} seme="x" />);
    expect(d("lago", "estate")).toContain('data-stagione="estate"');
    expect(d("lago", "estate")).not.toBe(d("lago", "inverno"));
    expect(d("lago", "estate")).not.toBe(d("montagna", "estate"));
  });
});

describe("CB-4 Sorprendimi si riassume dopo la scelta", () => {
  it("scelta un'idea, il modulo e le idee spariscono e resta una riga con «Scegli un'altra idea»", async () => {
    const scelte: string[] = [];
    const vista = monta(<Sorprendimi servizio={servizioDiProva()} mesi={MESI_DI_PROVA} onScegli={(p) => scelte.push(p.id)} />);
    clic([...vista.querySelectorAll("button")].find((b) => b.textContent === "Sorprendimi")!);
    await attendi();
    const proposte = [...vista.querySelectorAll<HTMLElement>(".sorprendimi__proposta")];
    expect(proposte).toHaveLength(3);
    const nome = proposte[0]!.querySelector("h3")!.textContent!;
    clic([...proposte[0]!.querySelectorAll("button")].find((b) => b.textContent === `Scegli ${nome}`)!);
    expect(scelte).toHaveLength(1);
    expect(vista.querySelectorAll(".sorprendimi__proposta")).toHaveLength(0);
    expect(vista.querySelector("select")).toBeNull();
    expect(vista.querySelector(".sorprendimi--scelta")?.textContent).toContain(`Hai scelto ${nome}`);
    clic([...vista.querySelectorAll("button")].find((b) => b.textContent === "Scegli un'altra idea")!);
    expect(vista.querySelectorAll(".sorprendimi__proposta")).toHaveLength(3);
  });
});

describe("CB-5 Demo: copione nella pagina ed etichette senza punteggiatura ridondante", () => {
  it("la pagina ha il link al copione, il copione, e i pulsanti degli scenari senza due punti", () => {
    const cartella = nuovaCartella();
    const esito = leggiStato(cartella);
    if (!esito.ok) throw new Error("stato non valido");
    const vista = vistaDemo(esito.stato, catalogoDiRiferimento());
    const d = new DOMParser().parseFromString(html(<PaginaDemo esito={esito} vista={vista} azioni={AZIONI_DEMO} />), "text/html");
    expect(d.querySelector("a[href='#copione-titolo']")?.textContent).toBe("Vai al copione della demo");
    expect(d.querySelector("section[data-copione] h2#copione-titolo")).not.toBeNull();
    const pulsanti = [...d.querySelectorAll("[data-scenario] button")].map((b) => b.textContent ?? "");
    expect(pulsanti.length).toBeGreaterThanOrEqual(8);
    for (const testo of pulsanti) expect(testo).toMatch(/^Avvia lo scenario [^:]+$/);
  });
});

describe("CB-6 in bozza un solo pannello azione alla volta", () => {
  it("aprire «Sposta» su un'altra attività chiude il pannello precedente; «Sostituisci» sostituisce «Sposta»", async () => {
    const bozza = nuovaBozza();
    const vista = monta(<PaginaBozza vista={bozza.vista} azioni={azioniDi(bozza)} />);
    const giorno = bozza.vista.date.map((d) => schedeAttivita(vista, d.valore)).find((schede) => schede.length >= 2);
    const [a, b] = giorno ?? [];
    await premiEAttendi(pulsanteIn(a!, "Sposta"));
    expect(vista.querySelectorAll(".bozza__pannello")).toHaveLength(1);
    expect(a!.querySelector(".bozza__pannello")).not.toBeNull();
    await premiEAttendi(pulsanteIn(b!, "Sposta"));
    expect(vista.querySelectorAll(".bozza__pannello")).toHaveLength(1);
    expect(b!.querySelector(".bozza__pannello")).not.toBeNull();
    await premiEAttendi(pulsanteIn(a!, "Sostituisci"));
    expect(vista.querySelectorAll(".bozza__pannello")).toHaveLength(1);
    expect(a!.querySelector(".bozza__alternative")).not.toBeNull();
    expect(vista.querySelector(".bozza__modulo.bozza__pannello")).toBeNull();
    await premiEAttendi(pulsanteIn(a!, "Non sostituire"));
    expect(vista.querySelectorAll(".bozza__pannello")).toHaveLength(0);
  });

  it("dopo la conferma il menu del giorno si chiama «Proponi una modifica»", async () => {
    const bozza = nuovaBozza();
    const vista = monta(<PaginaBozza vista={bozza.vista} azioni={azioniDi(bozza)} />);
    const etichette = () => [...vista.querySelectorAll(".bozza__giorno-menu")].map((e) => e.textContent ?? "");
    expect(etichette().every((t) => t.startsWith("Modifica giorno"))).toBe(true);
    await premiEAttendi(pulsanteIn(vista, "Conferma l'itinerario"));
    expect(etichette().length).toBeGreaterThan(0);
    expect(etichette().every((t) => t.startsWith("Proponi una modifica") && !t.includes("Modifica giorno"))).toBe(true);
  });
});
