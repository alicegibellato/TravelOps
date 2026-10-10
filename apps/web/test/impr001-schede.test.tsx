/**
 * ST-IMPR-001 nella web app: "Ho un imprevisto".
 *
 * - CA-2 ogni tipo di imprevisto (modello-dominio.md §2.4 e modello-dominio-estensioni.md §7.4) e ogni richiesta
 *   (restare di più, tornare prima) ha la sua scheda e il suo modulo breve, precompilato con oggi e l'elemento in corso;
 * - ogni modulo inviato diventa una proposta del motore sulla versione corrente, che si apre nella vista della
 *   proposta (REQ-WEB-004) con Accetta e Rifiuta;
 * - CA-3 nessuna proposta cambia il viaggio finché il viaggiatore non la accetta.
 */
import { TIPO_IMPREVISTO } from "@travelops/agents";
import { versioneCorrente } from "@travelops/engine";
import { describe, expect, it } from "vitest";
import { PaginaImprevisti } from "../src/componenti/PaginaImprevisti";
import { IntestazioneVersione } from "../src/componenti/PaginaVersioni";
import { leggiModulo, precompila } from "../src/imprevisti/modulo";
import { catalogoPerImprevisti, segnalaImprevisto } from "../src/imprevisti/operazione";
import { SCHEDE, trovaScheda } from "../src/imprevisti/schede";
import { catalogoDiRiferimento } from "../src/dati/scenari";
import { accettaProposta, impostaOrologio } from "../src/stato/operazioni";
import { vistaProposta } from "../src/viste/proposta";
import { html } from "./supporto";
import { nuovaCartella, statoSalvato } from "./supporto-stato";

/** I tipi del motore, per nome: i quattro dell'ondata 1 e i sei della §7.4. */
const TIPI = Object.keys(TIPO_IMPREVISTO);

const nessuna = async (): Promise<void> => undefined;

/** Una cartella con lo stato iniziale (versione 1 di riferimento) e l'orologio di sabato 13 giugno alle 10:30. */
function preparato(): string {
  const cartella = nuovaCartella();
  const orologio = impostaOrologio(cartella, "2026-06-13", "10:30");
  if (!orologio.ok) throw new Error(orologio.messaggio);
  return cartella;
}

describe("ST-IMPR-001 CA-2 una scheda e un modulo per ogni imprevisto e richiesta", () => {
  it("le 12 schede coprono i 10 tipi di imprevisto e le 2 richieste di durata", () => {
    expect(SCHEDE).toHaveLength(12);
    const tipi = SCHEDE.flatMap((s) => (s.genere.tipo === "imprevisto" ? [s.genere.imprevisto] : []));
    expect([...tipi].sort()).toEqual([...TIPI].sort());
    expect(SCHEDE.flatMap((s) => (s.genere.tipo === "richiesta" ? [s.genere.operazione] : []))).toEqual(["prolunga", "accorcia"]);
    expect(SCHEDE.map((s) => s.titolo)).toEqual([
      "Volo cancellato",
      "Ho perso il volo o il treno",
      "Sono in ritardo",
      "Maltempo",
      "Posto chiuso",
      "Sciopero",
      "Non sto bene / mi sono fatto male",
      "Bagaglio smarrito",
      "Documenti persi o rubati",
      "Sono stanco",
      "Voglio restare di più",
      "Voglio tornare prima",
    ]);
  });

  it("il modulo è precompilato con oggi, l'ora dell'orologio e l'elemento in corso", () => {
    const cartella = preparato();
    const stato = statoSalvato(cartella);
    const viaggio = versioneCorrente(stato.storico).viaggio;
    const ritardo = precompila(trovaScheda("ritardo")!, viaggio, catalogoPerImprevisti(), stato.orologio);
    expect(ritardo.valori).toMatchObject({ data: "2026-06-13", momento: "10:30" });
    expect(ritardo.inCorso).not.toBeNull();
    // Fuori dalle date del viaggio "oggi" diventa il primo giorno.
    const fuori = precompila(trovaScheda("stanchezza")!, viaggio, catalogoPerImprevisti(), { data: "2026-07-01", ora: "10:00" });
    expect(fuori.valori.data).toBe(viaggio.dataInizio);
  });

  it.each(SCHEDE.map((s) => [s.id, s.titolo] as const))(
    "%s (%s): con i valori precompilati il modulo diventa una proposta del motore, e il viaggio non cambia (CA-3)",
    (id) => {
      const cartella = preparato();
      const scheda = trovaScheda(id)!;
      const prima = statoSalvato(cartella);
      const corrente = versioneCorrente(prima.storico);
      const { valori } = precompila(scheda, corrente.viaggio, catalogoPerImprevisti(), prima.orologio);
      const letto = leggiModulo(scheda, valori, corrente.viaggio, catalogoPerImprevisti());
      expect(letto.ok, JSON.stringify(letto)).toBe(true);
      if (!letto.ok) return;
      const esito = segnalaImprevisto(cartella, scheda, letto.scelta);
      expect(esito.ok, esito.ok ? "" : esito.messaggio).toBe(true);
      if (!esito.ok) return;

      const dopo = statoSalvato(cartella);
      // La proposta è salvata, il viaggio è ancora alla stessa versione (CA-3).
      expect(dopo.storico.versioni).toHaveLength(prima.storico.versioni.length);
      expect(dopo.proposte.map((p) => p.id)).toContain(esito.proposta.id);
      expect(esito.proposta.scenario).toBe(`Imprevisto segnalato: ${scheda.titolo}`);
      // Si apre con la vista della proposta (REQ-WEB-004).
      const vista = vistaProposta(esito.proposta, dopo, catalogoDiRiferimento());
      expect(vista.scenario.titolo).toBe(`Imprevisto segnalato: ${scheda.titolo}`);
    },
  );

  it("un modulo incompleto o sbagliato dà errori in parole semplici, senza proposta", () => {
    const ritardo = trovaScheda("ritardo")!;
    const viaggio = versioneCorrente(statoSalvato(preparato()).storico).viaggio;
    const letto = leggiModulo(ritardo, { data: "2026-06-13", momento: "25:00", minuti: "0" }, viaggio, catalogoPerImprevisti());
    expect(letto.ok).toBe(false);
    if (letto.ok) return;
    expect(letto.errori).toEqual(["«Da che ora» deve essere un'ora, per esempio 09:30.", "«Quanti minuti di ritardo» deve essere un numero da 5 a 720."]);
    const maltempo = leggiModulo(trovaScheda("maltempo")!, { zonaId: "Z", data: "2026-06-13", inizio: "12:00", fine: "10:00", condizione: "pioggia" }, viaggio, catalogoPerImprevisti());
    expect(maltempo).toEqual({ ok: false, errori: ["L'ora di fine deve venire dopo l'ora di inizio."] });
    // I controlli sull'imprevisto sono quelli dello strumento della chat: una zona che non c'è.
    const zona = leggiModulo(trovaScheda("maltempo")!, { zonaId: "NESSUNA", data: "2026-06-13", inizio: "10:00", fine: "12:00", condizione: "pioggia" }, viaggio, catalogoPerImprevisti());
    expect(zona.ok).toBe(false);
  });

  it("CA-3 accettata come le altre proposte: solo allora nasce la versione 2", () => {
    const cartella = preparato();
    const scheda = trovaScheda("stanchezza")!;
    const stato = statoSalvato(cartella);
    const { valori } = precompila(scheda, versioneCorrente(stato.storico).viaggio, catalogoPerImprevisti(), stato.orologio);
    const letto = leggiModulo(scheda, valori, versioneCorrente(stato.storico).viaggio, catalogoPerImprevisti());
    if (!letto.ok) throw new Error(letto.errori.join(" "));
    const esito = segnalaImprevisto(cartella, scheda, letto.scelta);
    if (!esito.ok) throw new Error(esito.messaggio);
    expect(statoSalvato(cartella).storico.versioni).toHaveLength(1);
    const accettata = accettaProposta(cartella, esito.proposta.id, "Alice");
    if (!accettata.ok) throw new Error(accettata.messaggio);
    expect(["successo", "avviso"]).toContain(accettata.esito.livello);
  });
});

describe("ST-IMPR-001 la pagina e il pulsante", () => {
  it("la pagina mostra le 12 schede e, con una scheda aperta, il suo modulo con «Prepara la proposta»", () => {
    const cartella = preparato();
    const stato = statoSalvato(cartella);
    const scheda = trovaScheda("salute")!;
    const precompilazione = precompila(scheda, versioneCorrente(stato.storico).viaggio, catalogoPerImprevisti(), stato.orologio);
    const markup = html(<PaginaImprevisti aperta={{ scheda, precompilazione }} errori={[]} azione={nessuna} viaggio="Weekend sul Garda, versione 1" />);
    expect(markup.match(/data-scheda=/g)).toHaveLength(12);
    expect(markup).toContain('aria-current="true" data-scheda="salute"');
    for (const nome of ["data", "giorni", "intensitaMassima", "mobilitaRidotta", "descrizione"]) expect(markup).toContain(`name="${nome}"`);
    expect(markup).toContain("Prepara la proposta");
    expect(markup).toContain("il viaggio cambia solo se la accetti");
  });

  it("«Ho un imprevisto» compare sulla versione corrente del viaggio confermato, non sulle versioni passate", () => {
    expect(html(<IntestazioneVersione numero={2} causa="Imprevisto" corrente={2} />)).toContain("Ho un imprevisto");
    expect(html(<IntestazioneVersione numero={1} causa="Prima versione" corrente={2} />)).not.toContain("Ho un imprevisto");
  });
});
