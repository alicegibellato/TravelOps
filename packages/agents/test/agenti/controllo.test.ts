/**
 * CA-2 (REQ-ORCH-001 revisione 2, ST-ORCH-001C): nessuna risposta dell'agente contiene un itinerario che non viene
 * dal motore. Il controllo è nel codice (`controllaRisposta`, chiamato da `rispondiAlMessaggio` prima di salvare la
 * risposta): qui si prova da solo e dentro la chat, dove sostituisce il testo che non lo supera.
 */
import { describe, expect, it } from "vitest";
import {
  controllaRisposta,
  creaClienteFinto,
  estraiNomiPropri,
  NOMI_STRUMENTI,
  rispondiAlMessaggioCompleto,
  TESTO_RISPOSTA_SOSTITUITA,
  type Messaggio,
} from "../../src/index.js";
import { sorgenteRegistrata } from "../strumenti/supporto.js";
import { archivioViaggioConfermato, istantaneaRiferimento, SABATO_MATTINA } from "./supporto.js";

const istantanea = istantaneaRiferimento();

describe("CA-2 estrarre i nomi propri", () => {
  it("riconosce nomi di più parole con i connettori, e segna quelli a inizio frase", () => {
    const nomi = estraiNomiPropri("Domani visitate il Castello del Buonconsiglio. Poi pranzo a Riva del Garda e sosta da Fra' Luca.");
    expect(nomi).toEqual([
      { parole: ["Domani"], inizioFrase: true },
      { parole: ["Castello", "del", "Buonconsiglio"], inizioFrase: false },
      { parole: ["Poi"], inizioFrase: true },
      { parole: ["Riva", "del", "Garda"], inizioFrase: false },
      { parole: ["Fra", "Luca"], inizioFrase: false },
    ]);
  });
});

describe("CA-2 controllare una risposta", () => {
  it("CA-2 una risposta con i soli nomi dell'istantanea e del viaggio passa", () => {
    const testo =
      "Ecco la proposta: al posto del trekking sul Sentiero del Ponale, la Visita al MAG dalle 10 alle 12. " +
      "Il pranzo resta al Ristorante sul lago. Domenica c'è il Castello del Buonconsiglio, poi il MUSE a Trento. Premi «Accetta» se ti va bene. Sabato si parte alle 09:50.";
    expect(controllaRisposta(testo, { istantanea })).toEqual([]);
  });

  it("CA-2 un itinerario inventato viene segnalato, nome per nome", () => {
    const testo = "Giorno 1: mattina a Gardaland e pomeriggio a Sirmione. La sera cena alla Trattoria Da Mario, vicino al Lungolago di Riva.";
    expect(controllaRisposta(testo, { istantanea }).map((p) => p.testo)).toEqual(["Gardaland", "Sirmione", "Trattoria Da Mario"]);
  });

  it("CA-2 un nome a inizio frase si controlla senza la prima parola", () => {
    expect(controllaRisposta("Malcesine e Limone vi aspettano.", { istantanea }).map((p) => p.testo)).toEqual(["Limone"]);
    expect(controllaRisposta("Visitate Castel Toblino domani.", { istantanea }).map((p) => p.testo)).toEqual(["Visitate Castel Toblino"]);
  });

  it("CA-2 un luogo citato dal viaggiatore o restituito da uno strumento è ammesso; un testo dell'assistente no", () => {
    const conversazione: Messaggio[] = [
      { ruolo: "utente", testo: "Vorrei andare a Lisbona." },
      { ruolo: "assistente", testo: "Ti consiglio Sintra." },
      { ruolo: "strumento", idChiamata: "c1", nome: "proponi_destinazioni", risultato: JSON.stringify({ destinazioni: [{ destinazione: "Dolomiti – Val di Fassa", esempi: ["Escursione: Via ferrata delle Scalette"] }] }) },
    ];
    expect(controllaRisposta("Lisbona è bella, ma c'è anche la Via ferrata delle Scalette in Val di Fassa.", { conversazione })).toEqual([]);
    expect(controllaRisposta("Allora andiamo a Sintra.", { conversazione }).map((p) => p.testo)).toEqual(["Sintra"]);
  });

  it("CA-2 dire di aver prenotato, pagato o cancellato qualcosa viene segnalato", () => {
    const problemi = controllaRisposta("Fatto! Ti ho prenotato la visita al MAG e ho cancellato il volo.", { istantanea });
    expect(problemi).toEqual([
      { tipo: "prenotazione_dichiarata", testo: "Ti ho prenotato" },
      { tipo: "prenotazione_dichiarata", testo: "ho cancellato" },
    ]);
    expect(controllaRisposta("Ho tolto la visita al MAG. TravelOps non prenota nulla.", { istantanea })).toEqual([]);
  });
});

describe("CA-2 nella chat: il testo che non supera il controllo non si salva", () => {
  const strumentiImprevisti = ["proponi_modifica", "proponi_ripianificazione", "proponi_cambio_durata", "cerca_catalogo", "leggi_viaggio"];

  async function rispondi(testoFinale: string | string[]) {
    const archivio = archivioViaggioConfermato();
    const cliente = creaClienteFinto({
      versione: 1,
      descrizione: "Risposta con un itinerario inventato",
      turni: [
        { atteso: { strumenti: ["scegli_agente"] }, risposta: { chiamate: [{ id: "o1", nome: "scegli_agente", argomenti: { agente: "imprevisti", motivo: "Maltempo." } }] } },
        { atteso: { strumenti: strumentiImprevisti }, risposta: { testo: "Controllo il programma.", chiamate: [{ id: "c1", nome: "leggi_viaggio", argomenti: { versione: null } }] } },
        { atteso: { strumenti: strumentiImprevisti }, risposta: { testo: testoFinale } },
      ],
    });
    const prima = archivio.scritture.length;
    const esito = await rispondiAlMessaggioCompleto({
      cliente,
      archivio,
      sorgente: sorgenteRegistrata(),
      conversazione: [],
      messaggio: "Piove, che facciamo?",
      adesso: SABATO_MATTINA,
    });
    cliente.verificaCompletata();
    expect(archivio.scritture).toHaveLength(prima);
    return esito;
  }

  it("CA-2 un itinerario inventato dal modello viene sostituito, nello streaming e nella conversazione salvata", async () => {
    const { eventi, fine } = await rispondi(["Con la pioggia andate al Museo di Rovereto ", "e poi alle Terme di Comano."]);
    const corretto = eventi.find((e) => e.tipo === "testo_corretto");
    expect(corretto).toEqual({
      tipo: "testo_corretto",
      testo: TESTO_RISPOSTA_SOSTITUITA,
      problemi: [
        { tipo: "luogo_sconosciuto", testo: "Museo di Rovereto" },
        { tipo: "luogo_sconosciuto", testo: "Terme di Comano" },
      ],
    });
    expect(fine.testo).toBe(TESTO_RISPOSTA_SOSTITUITA);
    const salvati = fine.messaggiNuovi.filter((m) => m.ruolo === "assistente").map((m) => m.testo);
    expect(salvati).toEqual(["", TESTO_RISPOSTA_SOSTITUITA]);
    expect(JSON.stringify(fine.messaggiNuovi)).not.toMatch(/Rovereto|Comano/);
    // La conversazione resta valida: la chiamata allo strumento ha ancora il suo risultato.
    expect(fine.messaggiNuovi.map((m) => m.ruolo)).toEqual(["utente", "assistente", "strumento", "assistente"]);
  });

  it("CA-2 una risposta che dice di aver prenotato viene sostituita", async () => {
    const { fine } = await rispondi("Tranquilli, vi ho prenotato la Visita al MAG per le 10.");
    expect(fine.testo).toBe(TESTO_RISPOSTA_SOSTITUITA);
  });

  it("CA-2 una risposta con i soli nomi del viaggio resta com'è", async () => {
    const { eventi, fine } = await rispondi("Con la pioggia la Visita al MAG è una buona idea al posto del trekking sul Sentiero del Ponale.");
    expect(eventi.some((e) => e.tipo === "testo_corretto")).toBe(false);
    expect(fine.testo).toMatch(/^Con la pioggia/);
  });

  it("gli strumenti del motore sono 16 e nessun agente ne ha altri", () => {
    expect(NOMI_STRUMENTI).toHaveLength(16);
  });
});
