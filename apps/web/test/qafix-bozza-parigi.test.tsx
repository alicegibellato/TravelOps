/**
 * ST-QA-FIX-BOZZA-PARIGI: per una città grande OpenStreetMap ha più tempo (Parigi risponde in 80-100 secondi) e, se la
 * destinazione non si è potuta preparare, la pagina della bozza dice che la bozza non è stata creata e offre di
 * riprovare da Pianifica, invece di «I dati del viaggio non sono validi».
 */
import { PREDEFINITI_SERVIZI, TEMPO_OVERPASS_MS } from "@travelops/sources";
import { afterEach, describe, expect, it, vi } from "vitest";
import PaginaBozza from "../app/bozza/[viaggio]/page";
import { salvaViaggio } from "../src/basedati";
import { usaBaseDati } from "../src/stato/avvio";
import { html } from "./supporto";
import { nuovaCartella } from "./supporto-stato";

vi.mock("next/navigation", () => ({ redirect: (indirizzo: string) => { throw new Error(`REDIRECT ${indirizzo}`); }, notFound: () => { throw new Error("NOT_FOUND"); } }));

afterEach(() => vi.restoreAllMocks());

describe("ST-QA-FIX-BOZZA-PARIGI", () => {
  it("OpenStreetMap ha fino a 150 secondi e la preparazione fino a 180", () => {
    expect(TEMPO_OVERPASS_MS).toBeGreaterThanOrEqual(150_000);
    expect(PREDEFINITI_SERVIZI.timeoutDestinazioneMs).toBeGreaterThanOrEqual(180_000);
  });

  it("una bozza senza destinazione preparata dice che non è stata creata e offre di riprovare", async () => {
    const radice = nuovaCartella();
    usaBaseDati(`${radice}/.data`, (db) =>
      salvaViaggio(db, { id: "chat-9", titolo: "Nuovo viaggio", stato: "bozza", demo: false, ordine: 200, destinazione: null, istantanea: null }),
    );
    vi.spyOn(process, "cwd").mockReturnValue(radice);
    const markup = html(await PaginaBozza({ params: Promise.resolve({ viaggio: "chat-9" }) }));
    expect(markup).toContain("La bozza non è stata creata");
    expect(markup).toContain('href="/pianifica"');
    expect(markup).not.toContain("I dati del viaggio non sono validi");
  }, 60_000);
});
