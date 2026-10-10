/**
 * REQ-WEB-004 CA-6: nessun codice tecnico a vista in proposte, versioni e modalità presentazione (come REQ-UX-001
 * CA-6; il controllo su tutte le pagine è in ux001-ca6-codici).
 */
import { describe, expect, it } from "vitest";
import { ContenutoDemo, ContenutoProposta, ContenutoVersioni } from "../src/componenti/ContenutiStato";
import { SCENARI } from "../src/dati/scenari";
import { leggiStato } from "../src/stato/archivio";
import { accettaProposta, avviaScenario, impostaOrologio } from "../src/stato/operazioni";
import { AZIONI_DEMO, AZIONI_PROPOSTA, nuovaCartella, RIPRISTINA } from "./supporto-stato";
import { paginaCompleta, testoVisibile } from "./supporto-ux";

const CODICI = /\bD\d+-E\d+\b|\bN\d+\b|\bS[1-8]\b|\b[A-Z]{2,}(?:_[A-Z]+)+\b|\bTRIP-[A-Z]+\b/;

describe("CA-6 nessun codice tecnico a vista", () => {
  it.each(SCENARI.map((s) => [s.id] as const))("CA-6 %s: modalità presentazione, proposta e versioni senza id né codici", (id) => {
    const cartella = nuovaCartella();
    impostaOrologio(cartella, "2026-06-13", "07:30");
    const avvio = avviaScenario(cartella, id);
    if (!avvio.ok) throw new Error(avvio.messaggio);
    const pagine = {
      presentazione: <ContenutoDemo esito={leggiStato(cartella)} azioni={AZIONI_DEMO} />,
      proposta: <ContenutoProposta esito={leggiStato(cartella)} id={avvio.proposta.id} azioni={AZIONI_PROPOSTA} ripristina={RIPRISTINA} />,
    };
    accettaProposta(cartella, avvio.proposta.id, "Alice");
    const dopo = {
      "proposta decisa": <ContenutoProposta esito={leggiStato(cartella)} id={avvio.proposta.id} azioni={AZIONI_PROPOSTA} ripristina={RIPRISTINA} />,
      versioni: <ContenutoVersioni esito={leggiStato(cartella)} a={null} b={null} ripristina={RIPRISTINA} />,
    };
    for (const [nome, contenuto] of Object.entries({ ...pagine, ...dopo })) {
      const trovato = CODICI.exec(testoVisibile(paginaCompleta(contenuto)));
      expect(trovato, `${nome}: ${trovato?.[0] ?? ""}`).toBeNull();
    }
  });
});
