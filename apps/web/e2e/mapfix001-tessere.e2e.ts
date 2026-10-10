/**
 * ST-MAP-FIX-001: nel browser vero le tessere di OpenStreetMap della mappa partono con
 * `referrerpolicy="strict-origin-when-cross-origin"` e con l'origine della web app come Referer, che la tile usage
 * policy di OSM richiede (senza Referer risponde 403). Le tessere sono servite in locale dal flusso: nessuna chiamata
 * esce verso OpenStreetMap.
 */
import { expect } from "vitest";
import { ORIGINE_TESSERE_OSM, POLITICA_REFERRER_TESSERE_OSM } from "../src/rete";
import { flusso } from "./flussi";

/** PNG trasparente di 1×1 pixel, al posto della tessera vera. */
const TESSERA_VUOTA = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

flusso("ST-MAP-FIX-001: tessere OSM con il referrer dell'origine", async (f) => {
  const { pagina } = f;
  const referer: (string | undefined)[] = [];

  await f.passo("Servo le tessere di OpenStreetMap in locale e ne registro il Referer", async () => {
    await pagina.route(`${ORIGINE_TESSERE_OSM}/**`, async (instradamento) => {
      referer.push((await instradamento.request().allHeaders())["referer"]);
      await instradamento.fulfill({ status: 200, contentType: "image/png", body: TESSERA_VUOTA });
    });
  });

  await f.passo("Apro Oggi e aspetto le tessere della mappa", async () => {
    await pagina.goto(`${f.url}/oggi`);
    await pagina.locator(".leaflet-tile").first().waitFor({ state: "attached" });
  });

  await f.passo("Ogni tessera ha referrerpolicy strict-origin-when-cross-origin", async () => {
    const politiche = await pagina.locator(".leaflet-tile").evaluateAll((tessere) => tessere.map((t) => t.getAttribute("referrerpolicy")));
    expect(politiche.length).toBeGreaterThan(0);
    for (const politica of politiche) expect(politica).toBe(POLITICA_REFERRER_TESSERE_OSM);
  });

  await f.passo("Le richieste delle tessere portano come Referer solo l'origine della web app", async () => {
    expect(referer.length).toBeGreaterThan(0);
    for (const valore of referer) expect(valore).toBe(`${f.url}/`);
  });

  await f.passo("La pagina resta con Referrer-Policy no-referrer", async () => {
    const risposta = await pagina.request.get(`${f.url}/oggi`);
    expect(risposta.headers()["referrer-policy"]).toBe("no-referrer");
  });
});
