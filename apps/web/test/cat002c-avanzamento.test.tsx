// @vitest-environment jsdom
/**
 * ST-CAT-002C, criterio 2: l'avanzamento della costruzione è mostrato al viaggiatore e una destinazione troppo piccola
 * dà un messaggio gentile con 2 o 3 destinazioni vicine (REQ-CAT-002 CA-5). Servizio vero sulla sorgente registrata.
 */
import { MESSAGGI_AVANZAMENTO, PASSI_COSTRUZIONE } from "@travelops/sources";
import { describe, expect, it } from "vitest";
import { SceltaDestinazione } from "../src/componenti/SceltaDestinazione";
import type { ServizioDestinazioni, Suggerimento } from "../src/destinazioni/tipi";
import { attendi, clic, monta, preparaChat, pulsante } from "./supporto-chat";
import { istantaneaGrande, istantaneaPiccola, MESI_DI_PROVA, scriviNelCampo, servizioDiProva } from "./supporto-destinazioni";

preparaChat();

const GRANDE: Suggerimento = { ...istantaneaGrande().area };
const PICCOLA: Suggerimento = { ...istantaneaPiccola().area };

describe("CA-2 avanzamento della costruzione", () => {
  it("il servizio restituisce tutti i passi della costruzione, nell'ordine, con i messaggi per il viaggiatore", async () => {
    const esito = await servizioDiProva().costruisci(GRANDE);
    expect(esito.esito).toBe("pronta");
    if (esito.esito !== "pronta") return;
    expect(esito.avanzamento.map((p) => p.messaggio)).toEqual(PASSI_COSTRUZIONE.map((p) => MESSAGGI_AVANZAMENTO[p]));
    expect(esito.avanzamento.map((p) => p.numero)).toEqual(PASSI_COSTRUZIONE.map((_, i) => i + 1));
    expect(esito.avanzamento.every((p) => p.totale === PASSI_COSTRUZIONE.length)).toBe(true);
  });

  it("mentre costruisce si vede un avanzamento in corso; a fine lavoro i passi fatti e la barra piena", async () => {
    let finisci: () => void = () => undefined;
    const vero = servizioDiProva();
    const servizio: ServizioDestinazioni = {
      ...vero,
      costruisci: (area) => new Promise((risolvi) => (finisci = () => void vero.costruisci(area).then(risolvi))),
    };
    const vista = monta(<SceltaDestinazione servizio={{ ...servizio, cerca: () => Promise.resolve([GRANDE]) }} mesi={MESI_DI_PROVA} />);
    await avvia(vista, "Borgo");
    clic(pulsante(vista, GRANDE.nome));
    const inCorso = vista.querySelector("[data-avanzamento='in-corso']");
    expect(inCorso?.getAttribute("role")).toBe("status");
    expect(inCorso?.textContent).toContain("Sto preparando Borgo di Prova");
    expect(inCorso?.querySelector("progress")?.hasAttribute("value")).toBe(false);

    finisci();
    await attendi();
    expect(vista.querySelector("[data-avanzamento='in-corso']")).toBeNull();
    const finito = vista.querySelector("[data-avanzamento='finito']");
    expect([...(finito?.querySelectorAll("li") ?? [])].map((li) => li.textContent)).toEqual(PASSI_COSTRUZIONE.map((p) => MESSAGGI_AVANZAMENTO[p]));
    const barra = finito?.querySelector("progress");
    expect(barra?.getAttribute("value")).toBe(String(PASSI_COSTRUZIONE.length));
    expect(barra?.getAttribute("max")).toBe(String(PASSI_COSTRUZIONE.length));
    expect(vista.querySelector("[data-esito='pronta']")?.textContent).toContain("tutto pronto");
  });
});

describe("CA-2 messaggio gentile con le destinazioni vicine (REQ-CAT-002 CA-5)", () => {
  it("una destinazione troppo piccola dà il messaggio della sorgente e le destinazioni vicine da scegliere", async () => {
    const esito = await servizioDiProva().costruisci(PICCOLA);
    expect(esito.esito).toBe("troppo_piccola");
    if (esito.esito !== "troppo_piccola") return;
    expect(esito.messaggio).toBe("Mi dispiace, Frazione di Prova non ha abbastanza luoghi per un itinerario completo.");
    expect(esito.vicine.map((v) => v.nome)).toEqual(["Borgo di Prova"]);
  });

  it("nella pagina: avviso gentile, nessun codice tecnico, e un clic su una vicina la costruisce", async () => {
    const vista = monta(<SceltaDestinazione servizio={servizioDiProva()} mesi={MESI_DI_PROVA} />);
    await avvia(vista, "Frazione");
    clic(pulsante(vista, "Frazione di Prova"));
    await attendi();
    const sezione = vista.querySelector("[data-esito='troppo-piccola']");
    expect(sezione?.querySelector(".ui-avviso")?.textContent).toContain("Mi dispiace, Frazione di Prova non ha abbastanza luoghi");
    expect(sezione?.textContent).not.toMatch(/OSPEDALE_MANCANTE|[A-Z]+_[A-Z_]+/);
    const vicine = [...vista.querySelectorAll("ul[aria-label='Destinazioni vicine'] button")];
    expect(vicine.map((b) => b.textContent)).toEqual(["Borgo di Prova"]);
    clic(vicine[0] as HTMLElement);
    await attendi();
    expect(vista.querySelector("[data-esito='pronta']")).not.toBeNull();
    expect(vista.querySelector("[data-esito='troppo-piccola']")).toBeNull();
  });

  it("con 3 vicine le mostra tutte (al massimo 3)", async () => {
    const vicine: Suggerimento[] = [1, 2, 3, 4].map((n) => ({ ...GRANDE, id: `prova:v${n}`, nome: `Vicina ${n}` }));
    const vista = monta(
      <SceltaDestinazione
        servizio={{
          cerca: () => Promise.resolve([PICCOLA]),
          costruisci: () => Promise.resolve({ esito: "troppo_piccola", avanzamento: [], messaggio: "Qui c'è poco.", vicine: vicine.slice(0, 3) }),
          sorprendimi: () => Promise.reject(new Error("non serve")),
        }}
        mesi={MESI_DI_PROVA}
      />,
    );
    await avvia(vista, "Frazione");
    clic(pulsante(vista, "Frazione di Prova"));
    await attendi();
    expect(vista.querySelectorAll("ul[aria-label='Destinazioni vicine'] li")).toHaveLength(3);
  });

  it("se la sorgente non può costruire dice di riprovare, senza errori tecnici", async () => {
    const vista = monta(
      <SceltaDestinazione
        servizio={{
          cerca: () => Promise.resolve([GRANDE]),
          costruisci: () => Promise.reject(new Error("rete giù")),
          sorprendimi: () => Promise.reject(new Error("non serve")),
        }}
        mesi={MESI_DI_PROVA}
      />,
    );
    await avvia(vista, "Borgo");
    clic(pulsante(vista, "Borgo di Prova"));
    await attendi();
    expect(vista.querySelector(".ui-avviso--attenzione")?.textContent).toContain("Riprova tra un attimo.");
    expect(vista.textContent).not.toContain("rete giù");
  });
});

/** Scrive nel campo e lascia passare l'attesa vera (la sorgente registrata risponde subito). */
async function avvia(vista: HTMLElement, testo: string): Promise<void> {
  scriviNelCampo(vista, testo);
  await attendi(400);
}
