// @vitest-environment jsdom
/**
 * REQ-CHAT-001 CA-4 (ST-CHAT-001B), parte che gira nel browser dell'app: il pannello segue l'area visibile
 * (`visualViewport`) e il campo di testo si porta in vista quando riceve il focus.
 */
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LayoutViaggio } from "../src/ui/LayoutViaggio";
import { PannelloChat } from "../src/ui/PannelloChat";
import { monta, preparaChat, smonta } from "./supporto-chat";

preparaChat();

class AreaVisibileFinta extends EventTarget {
  height = 700;
  offsetTop = 0;
}

afterEach(() => {
  Reflect.deleteProperty(window, "visualViewport");
});

describe("CA-4 la tastiera non copre il campo di testo (pannello)", () => {
  it("CA-4 il contenitore della chat segue l'altezza dell'area visibile quando la tastiera si apre e si chiude", () => {
    const area = new AreaVisibileFinta();
    Object.defineProperty(window, "visualViewport", { value: area, configurable: true });
    const vista = monta(<LayoutViaggio itinerario={<p>Programma</p>} mappa={<p>Mappa</p>} chat={<PannelloChat messaggi={[]} />} />);
    const contenitore = vista.querySelector<HTMLElement>(".ui-layout-viaggio__chat");
    expect(contenitore?.style.getPropertyValue("--altezza-visibile")).toBe("700px");

    area.height = 380;
    area.offsetTop = 24;
    act(() => {
      area.dispatchEvent(new Event("resize"));
    });
    expect(contenitore?.style.getPropertyValue("--altezza-visibile")).toBe("380px");
    expect(contenitore?.style.getPropertyValue("--scostamento-visibile")).toBe("24px");
  });

  it("CA-4 chiudendo la chat le misure sono tolte e non restano ascoltatori", () => {
    const area = new AreaVisibileFinta();
    const rimossi: string[] = [];
    area.removeEventListener = ((tipo: string) => void rimossi.push(tipo)) as typeof area.removeEventListener;
    Object.defineProperty(window, "visualViewport", { value: area, configurable: true });
    const vista = monta(<PannelloChat messaggi={[]} />);
    const pannello = vista.querySelector<HTMLElement>(".ui-chat");
    expect(pannello?.style.getPropertyValue("--altezza-visibile")).toBe("700px");
    smonta();
    expect(rimossi).toEqual(["resize", "scroll"]);
    expect(pannello?.style.getPropertyValue("--altezza-visibile")).toBe("");
  });

  it("CA-4 senza visualViewport (browser vecchi) il pannello funziona lo stesso", () => {
    const vista = monta(<PannelloChat messaggi={[]} />);
    expect(vista.querySelector(".ui-chat")?.getAttribute("style")).toBeNull();
  });

  it("CA-4 il campo di testo riceve il focus e si porta in vista", () => {
    const vista = monta(<PannelloChat messaggi={[]} />);
    const campo = vista.querySelector<HTMLInputElement>("input[name='messaggio']");
    if (campo === null) throw new Error("manca il campo");
    const portaInVista = vi.fn();
    campo.scrollIntoView = portaInVista;
    act(() => campo.focus());
    expect(portaInVista).toHaveBeenCalledWith({ block: "nearest" });
  });
});
