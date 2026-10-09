/**
 * CA-3: senza chiave l'app funziona. `creaClienteDaAmbiente` senza `OPENAI_API_KEY` restituisce lo stato "non
 * disponibile" con il messaggio previsto, senza errori e senza rete; con la chiave restituisce il client OpenAI.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { creaClienteDaAmbiente, MESSAGGIO_AI_NON_DISPONIBILE, MODELLO_PREDEFINITO } from "../src/index.js";
import { chiaveFinta } from "./supporto.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("CA-3 funzionamento senza chiave", () => {
  it("CA-3 il messaggio per il viaggiatore è esattamente quello del requisito", () => {
    expect(MESSAGGIO_AI_NON_DISPONIBILE).toBe("La chat non è disponibile in questo momento: puoi continuare con i pulsanti");
  });

  it.each([
    ["assente", {}],
    ["vuota", { OPENAI_API_KEY: "" }],
    ["solo spazi", { OPENAI_API_KEY: "   " }],
    ["assente anche con il modello impostato", { TRAVELOPS_MODEL: "gpt-prova" }],
  ])("CA-3 chiave %s → non disponibile con il messaggio previsto", (_caso, ambiente) => {
    expect(creaClienteDaAmbiente(ambiente)).toEqual({
      disponibile: false,
      motivo: "chiave_mancante",
      messaggio: "La chat non è disponibile in questo momento: puoi continuare con i pulsanti",
    });
  });

  it("CA-3 per impostazione predefinita legge process.env del server", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(creaClienteDaAmbiente().disponibile).toBe(false);
    vi.stubEnv("OPENAI_API_KEY", chiaveFinta());
    vi.stubEnv("TRAVELOPS_MODEL", "");
    const stato = creaClienteDaAmbiente();
    expect(stato.disponibile).toBe(true);
    if (stato.disponibile) expect(stato.modello).toBe(MODELLO_PREDEFINITO);
  });

  it("con la chiave c'è il client OpenAI, con il modello predefinito gpt-6-luna o quello di TRAVELOPS_MODEL", () => {
    const predefinito = creaClienteDaAmbiente({ OPENAI_API_KEY: chiaveFinta() });
    expect(predefinito.disponibile).toBe(true);
    if (!predefinito.disponibile) return;
    expect(predefinito.modello).toBe("gpt-6-luna");
    expect(predefinito.cliente.fornitore).toBe("openai");
    expect(predefinito.cliente.modello).toBe("gpt-6-luna");

    const scelto = creaClienteDaAmbiente({ OPENAI_API_KEY: chiaveFinta(), TRAVELOPS_MODEL: " gpt-prova " });
    expect(scelto.disponibile && scelto.cliente.modello).toBe("gpt-prova");
  });

  it("CA-3 importare il pacchetto senza chiave non legge l'ambiente e non solleva errori", async () => {
    vi.stubEnv("OPENAI_API_KEY", undefined);
    vi.resetModules();
    const pacchetto = await import("../src/index.js");
    expect(typeof pacchetto.creaClienteDaAmbiente).toBe("function");
    expect(pacchetto.creaClienteDaAmbiente().disponibile).toBe(false);
  });
});
