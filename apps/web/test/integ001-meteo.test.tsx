/**
 * REQ-INTEG-001 (ST-INTEG-001), CA-2/CA-3/CA-4/CA-5 nella web app: servizi finti di predefinito, previsione per giorno nelle viste,
 * meteo nella fattibilità, degrado esplicito quando il meteo non risponde. Nessuna rete.
 */
import { creaMeteoFinto, creaMeteoOpenMeteo, leggiConfigurazioneServizi, creaServizi, type FetchServizio, type ServizioMeteo } from "@travelops/sources";
import { describe, expect, it } from "vitest";
import { ContenutoViaggio } from "../src/componenti/Contenuti";
import { PrevisioneGiorno } from "../src/componenti/PrevisioneGiorno";
import { sorgenteDestinazioniLocale } from "../src/destinazioni/sorgente";
import { dimenticaServizi, serviziEsterni } from "../src/servizi/esterni";
import { meteoDelViaggio } from "../src/servizi/meteo-viaggio";
import { catalogoDiRiferimento } from "../src/dati/scenari";
import { problemiDelViaggio } from "../src/viste/versioni";
import { statoIniziale } from "../src/stato/stato";
import { datiValidi, html } from "./supporto";
import { nuovaCartella } from "./supporto-stato";

const { viaggio, catalogo } = datiValidi("versione-1");
const piove = (data: string): ServizioMeteo => creaMeteoFinto({ condizione: (_c, d) => (d === data ? "pioggia" : "sereno") });
const senzaRete: FetchServizio = async () => {
  throw new TypeError("fetch failed");
};

describe("CA-2 modalità dai servizi", () => {
  it("senza variabili d'ambiente tutti i servizi sono finti", () => {
    dimenticaServizi();
    const s = serviziEsterni({});
    expect([s.meteo.modalita, s.geocoding.modalita, s.percorsi.modalita, s.voli.modalita, s.eventi.modalita]).toEqual(["finto", "finto", "finto", "finto", "finto"]);
  });
  // ST-QA-FIX-002: senza configurazione le destinazioni sono reali (con ripiego sulle pronte); finte su richiesta e nei test.
  it("la sorgente delle destinazioni è la registrata se TRAVELOPS_GEOCODING è finto o nei test", () => {
    expect(sorgenteDestinazioniLocale(nuovaCartella(), { VITEST: "true" }).tipo).toBe("registrata");
    expect(sorgenteDestinazioniLocale(nuovaCartella(), { TRAVELOPS_GEOCODING: "finto" }).tipo).toBe("registrata");
    expect(sorgenteDestinazioniLocale(nuovaCartella(), { TRAVELOPS_PERCORSI: "finto" }).tipo).toBe("registrata");
  });
  it("senza configurazione, fuori dai test, la sorgente delle destinazioni è quella reale", () => {
    expect(sorgenteDestinazioniLocale(nuovaCartella(), {}).tipo).toBe("reale");
  });
  it("con TRAVELOPS_GEOCODING=reale la sorgente delle destinazioni è quella reale (Nominatim e fonti di packages/sources)", () => {
    expect(sorgenteDestinazioniLocale(nuovaCartella(), { TRAVELOPS_GEOCODING: "reale" }).tipo).toBe("reale");
  });
});

describe("CA-4 previsione per giorno nelle viste", () => {
  it("la vista viaggio mostra la previsione di ogni giorno, marcata come esempio con il meteo finto", async () => {
    const meteo = await meteoDelViaggio(viaggio, catalogo, { meteo: piove("2026-06-13") });
    const markup = html(<ContenutoViaggio chiave="versione-1" esito={datiValidi("versione-1")} meteo={meteo} />);
    expect((markup.match(/class="previsione-giorno"/g) ?? []).length).toBe(viaggio.giorni.length);
    expect(markup).toContain('data-meteo="pioggia"');
    expect(markup).toContain("(esempio)");
    expect(markup).toContain("Pioggia 80%");
  });
  it("senza meteo la vista è quella di prima", () => {
    const markup = html(<ContenutoViaggio chiave="versione-1" esito={datiValidi("versione-1")} />);
    expect(markup).not.toContain("previsione-giorno");
  });
  it("il componente mostra condizione, temperature e probabilità; con dati reali non dice «esempio»", () => {
    const markup = html(
      <PrevisioneGiorno
        meteo={{
          disponibile: true,
          data: "2026-06-13",
          zonaId: "Z",
          zonaNome: "Alto Garda",
          origine: "reale",
          previsione: { data: "2026-06-13", condizione: "temporale", temperaturaMin: 16.2, temperaturaMax: 24.6, probabilitaPrecipitazioni: 85, fasce: [] },
        }}
      />,
    );
    expect(markup).toContain("Temporale");
    expect(markup).toContain("16°–25°");
    expect(markup).toContain("Pioggia 85%");
    expect(markup).not.toContain("esempio");
  });
});

describe("CA-3 degrado esplicito", () => {
  it("meteo che non risponde: ogni giorno dice «Meteo non disponibile», nessuna eccezione e la pagina si disegna", async () => {
    const reale = creaMeteoOpenMeteo({ url: "https://meteo.test/f", timeoutMs: 50, fetch: senzaRete });
    const meteo = await meteoDelViaggio(viaggio, catalogo, { meteo: reale });
    expect(meteo.previsioni).toEqual([]);
    expect(meteo.avviso).toMatch(/^Meteo non disponibile/);
    const markup = html(<ContenutoViaggio chiave="versione-1" esito={datiValidi("versione-1")} meteo={meteo} />);
    expect(markup).toContain('data-meteo="non-disponibile"');
    expect(markup).toContain("Meteo non disponibile: il servizio non è raggiungibile");
    expect(markup).toContain("Partenza da");
  });
  it("anche un guasto imprevisto della porta non rompe la pagina", async () => {
    const guasto: ServizioMeteo = {
      modalita: "reale",
      previsione: async () => {
        throw new Error("boom");
      },
    };
    const meteo = await meteoDelViaggio(viaggio, catalogo, { meteo: guasto });
    expect(Object.values(meteo.perGiorno).every((g) => !g.disponibile)).toBe(true);
  });
  it("con la configurazione reale e senza rete il servizio completo degrada (fetch iniettato)", async () => {
    const servizi = creaServizi(leggiConfigurazioneServizi({ TRAVELOPS_METEO: "reale" }), { fetch: senzaRete });
    const meteo = await meteoDelViaggio(viaggio, catalogo, servizi);
    expect(meteo.avviso).toMatch(/^Meteo non disponibile/);
  });
});

describe("CA-4 il meteo entra nella fattibilità delle versioni", () => {
  const stato = statoIniziale();
  const ponale = (problemi: { codice: string; elementi: string[] }[]) => problemi.filter((p) => p.codice === "METEO_AVVERSO" && p.elementi.includes("D2-E2"));

  it("senza previsioni nessun avviso di meteo sul sentiero all'aperto", () => {
    expect(ponale(problemiDelViaggio(stato, viaggio, catalogoDiRiferimento()))).toEqual([]);
  });
  it("con pioggia prevista dal servizio il sentiero all'aperto ha un avviso, e i bloccanti non cambiano", async () => {
    const meteo = await meteoDelViaggio(viaggio, catalogoDiRiferimento(), { meteo: piove("2026-06-13") });
    const con = problemiDelViaggio(stato, viaggio, catalogoDiRiferimento(), meteo.previsioni);
    expect(ponale(con)).toHaveLength(1);
    const senza = problemiDelViaggio(stato, viaggio, catalogoDiRiferimento());
    expect(con.filter((p) => p.gravita === "bloccante")).toEqual(senza.filter((p) => p.gravita === "bloccante"));
  });
});
