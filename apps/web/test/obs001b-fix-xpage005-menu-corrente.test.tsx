/**
 * ST-OBS-001B-FIX-TB-XPAGE-005 (TB-XPAGE-005): il menu segna una sola voce come pagina corrente. Su «Oggi» di un
 * viaggio (`/viaggi/<chiave>/oggi`) prima risultavano correnti sia «I miei viaggi» sia «Oggi».
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const percorso = vi.hoisted(() => ({ valore: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => percorso.valore }));

const { Navigazione } = await import("../src/ui/Navigazione");

afterEach(() => {
  percorso.valore = "/";
});

/** Le etichette delle voci con `aria-current="page"`. */
function vociCorrenti(indirizzo: string): string[] {
  percorso.valore = indirizzo;
  const markup = renderToStaticMarkup(<Navigazione />);
  return [...markup.matchAll(/<a[^>]*aria-current="page"[^>]*>.*?<span>([^<]+)<\/span><\/a>/g)].map((m) => m[1] as string);
}

const ATTESE: readonly [string, string | null][] = [
  ["/", "I miei viaggi"],
  ["/viaggi/versione-1", "I miei viaggi"],
  ["/viaggi/TRIP-DEMO-GARDA/giorni/2026-10-11", "I miei viaggi"],
  ["/viaggi/TRIP-DEMO-GARDA/elementi/E1", "I miei viaggi"],
  ["/viaggi/versione-1/oggi", "Oggi"],
  ["/viaggi/TRIP-DEMO-GARDA/oggi", "Oggi"],
  ["/oggi", "Oggi"],
  ["/destinazione", "Destinazione"],
  ["/preferenze", "Preferenze"],
  ["/versioni/1", "Itinerario corrente"],
  ["/versioni", "Versioni"],
  ["/agenti", "Agenti"],
  ["/pagina-a-caso", null],
];

describe("TB-XPAGE-005 una sola voce corrente nel menu", () => {
  it.each(ATTESE)("%s: voce corrente %s", (indirizzo, attesa) => {
    expect(vociCorrenti(indirizzo)).toEqual(attesa === null ? [] : [attesa]);
  });
});
