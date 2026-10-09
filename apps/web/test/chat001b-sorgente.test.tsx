/**
 * ST-CHAT-001B: la sorgente delle risposte è un'interfaccia piccola e sostituibile; oggi c'è solo quella finta, senza
 * AI e senza rete. Il copione viene dai dati e dal motore; la chat sta nelle pagine dei giorni di tutti i viaggi.
 */
import { describe, expect, it } from "vitest";
import { copioneViaggio } from "../src/chat/copione";
import { creaSorgenteFinta, ErroreSorgente, RITARDO_PREDEFINITO_MS } from "../src/chat/sorgente";
import { ContenutoGiorno } from "../src/componenti/Contenuti";
import { VIAGGI } from "../src/dati/viaggi";
import { datiValidi, html } from "./supporto";
import { leggiApp } from "./supporto-ux";

describe("Sorgente delle risposte della chat", () => {
  const copione = copioneViaggio("versione-1", datiValidi("versione-1"));

  it("la sorgente finta sceglie la risposta dal copione senza badare a maiuscole e accenti", async () => {
    const sorgente = creaSorgenteFinta({ copione, ritardoMs: 0 });
    expect((await sorgente.rispondi("MOSTRAMI LE PREFERENZE", [])).scheda?.tipo).toBe("preferenze");
    expect((await sorgente.rispondi("Che tempo fa? Sabato PIOVE", [])).scheda?.tipo).toBe("proposta");
    expect((await sorgente.rispondi("Una bozza, per favore", [])).scheda?.tipo).toBe("bozza");
    expect((await sorgente.rispondi("blablabla", [])).scheda).toBeUndefined();
  });

  it("il benvenuto ha tre suggerimenti e ognuno porta a una risposta del copione, non al ripiego", async () => {
    const sorgente = creaSorgenteFinta({ copione, ritardoMs: 0 });
    const { suggerimenti } = await sorgente.benvenuto();
    expect(suggerimenti).toHaveLength(3);
    for (const suggerimento of suggerimenti) expect((await sorgente.rispondi(suggerimento, [])).scheda).toBeDefined();
  });

  it("la sorgente finta aspetta il ritardo indicato (di predefinito abbastanza da far vedere «sta scrivendo»)", async () => {
    expect(RITARDO_PREDEFINITO_MS).toBeGreaterThanOrEqual(500);
    const sorgente = creaSorgenteFinta({ copione, ritardoMs: 40 });
    const inizio = Date.now();
    await sorgente.rispondi("ciao", []);
    expect(Date.now() - inizio).toBeGreaterThanOrEqual(30);
  });

  it("l'errore di una sorgente ha un codice: «non-disponibile» spegne la chat, «errore» si può riprovare", () => {
    expect(new ErroreSorgente("non-disponibile").codice).toBe("non-disponibile");
    expect(new ErroreSorgente("errore", "Ops").message).toBe("Ops");
    expect(new ErroreSorgente("errore")).toBeInstanceOf(Error);
  });

  it("il copione è costruito con i dati e il motore: preferenze e bozza per ogni viaggio, la proposta dove c'è uno scenario", () => {
    for (const voce of VIAGGI) {
      const prova = copioneViaggio(voce.chiave, datiValidi(voce.chiave));
      const [preferenze, imprevisto, bozza] = prova.risposte.map((r) => r.risposta);
      expect(preferenze?.scheda?.tipo).toBe("preferenze");
      expect(bozza?.scheda?.tipo).toBe("bozza");
      // Il viaggio con il pranzo a orario fisso non ha uno scenario tra i dati di riferimento: risposta di sole parole.
      expect(imprevisto?.scheda?.tipo).toBe(voce.chiave === "v-fisso" ? undefined : "proposta");
      expect(imprevisto?.testo).toBeTruthy();
    }
  });

  it("non c'è nessun SDK di AI tra le dipendenze della web app e il modulo della sorgente non apre connessioni", () => {
    const pacchetto = JSON.parse(leggiApp("package.json")) as { dependencies: Record<string, string> };
    expect(Object.keys(pacchetto.dependencies).filter((nome) => /(^|[/-])ai($|[/-])|llm|gpt/i.test(nome))).toEqual([]);
    for (const file of ["src/chat/sorgente.ts", "src/chat/ChatViaggio.tsx", "src/chat/copione.ts"]) {
      expect(leggiApp(file)).not.toMatch(/\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/);
    }
  });
});

describe("La chat nelle pagine dei giorni", () => {
  it("ogni giorno di ogni viaggio ha la chat nella colonna a sinistra, con la scheda «Chat» sul telefono", () => {
    for (const voce of VIAGGI) {
      const esito = datiValidi(voce.chiave);
      for (const giorno of esito.viaggio.giorni) {
        const pagina = html(<ContenutoGiorno chiave={voce.chiave} esito={esito} data={giorno.data} />);
        expect(pagina).toContain('data-chat="aperta"');
        expect(pagina).toContain('data-riquadro="chat"');
        expect(pagina).toContain('class="ui-chat"');
        expect(pagina).toMatch(/<span>Chat<\/span>/);
      }
    }
  });
});
