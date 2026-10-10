/**
 * Il servizio delle destinazioni lato server (REQ-CAT-002, REQ-PREF-001 CA-7): mette insieme la sorgente di
 * destinazioni di `@travelops/sources` e il punteggio del profilo del motore. Non contiene regole proprie: la ricerca,
 * la costruzione, i minimi e le destinazioni vicine sono della sorgente; la validazione del profilo e il punteggio
 * sono del motore; l'ordine delle candidate è di `proponiSorprendimi`.
 */
import { DURATA_MINIMA, validaProfilo } from "@travelops/engine";
import {
  ATTRIBUZIONE_OSM,
  leggiAreaDestinazione,
  proponiSorprendimi,
  type AreaDestinazione,
  type Avanzamento,
  type DestinazioneCandidata,
  type IstantaneaDestinazione,
  type SorgenteDestinazioni,
} from "@travelops/sources";
import {
  MASSIMO_DESTINAZIONI_VICINE,
  type AttribuzioniDestinazione,
  type EsitoCostruzioneWeb,
  type EsitoSorprendimi,
  type PassoAvanzamento,
  type RichiestaSorprendimi,
  type ServizioDestinazioni,
  type Suggerimento,
} from "./tipi";

export interface OpzioniServizio {
  sorgente: SorgenteDestinazioni;
  candidate: readonly DestinazioneCandidata[];
}

const comePasso = ({ numero, totale, messaggio }: Avanzamento): PassoAvanzamento => ({ numero, totale, messaggio });

const comeSuggerimento = (area: AreaDestinazione): Suggerimento => ({
  id: area.id,
  nome: area.nome,
  descrizione: area.descrizione,
  centro: { lat: area.centro.lat, lon: area.centro.lon },
  ...(area.osmId === undefined ? {} : { osmId: area.osmId }),
});

/** Fonti, autore e licenza delle immagini e fonte delle descrizioni di un'istantanea: ciò che la sorgente ha registrato. */
export function attribuzioniDi(istantanea: IstantaneaDestinazione): AttribuzioniDestinazione {
  return {
    mappa: ATTRIBUZIONE_OSM,
    fonti: istantanea.fonti.map(({ nome, attribuzione }) => ({ nome, attribuzione })),
    immagini: istantanea.attivita.flatMap((a) =>
      a.immagine === undefined ? [] : [{ attivita: a.nome, autore: a.immagine.autore, licenza: a.immagine.licenza }],
    ),
    descrizioni: istantanea.luoghi.flatMap((l) => (l.fonteDescrizione === undefined ? [] : [{ luogo: l.nome, fonte: l.fonteDescrizione }])),
  };
}

export function creaServizioDestinazioni({ sorgente, candidate }: OpzioniServizio): ServizioDestinazioni {
  return {
    async cerca(testo) {
      if (typeof testo !== "string") return [];
      return (await sorgente.cercaDestinazioni(testo)).map(comeSuggerimento);
    },

    async costruisci(grezza): Promise<EsitoCostruzioneWeb> {
      const letta = leggiAreaDestinazione(grezza);
      if (!letta.ok) return { esito: "non_disponibile", messaggio: "Non riesco a leggere la destinazione scelta. Cercala di nuovo." };
      const avanzamento: PassoAvanzamento[] = [];
      const esito = await sorgente.costruisciIstantanea(letta.area, { avanzamento: (a) => avanzamento.push(comePasso(a)) });
      if (esito.ok) {
        const { istantanea } = esito;
        return {
          esito: "pronta",
          avanzamento,
          destinazione: { nome: istantanea.destinazione, luoghi: istantanea.luoghi.length, attivita: istantanea.attivita.length },
          attribuzioni: attribuzioniDi(istantanea),
        };
      }
      if (esito.motivo === "minimi_non_rispettati") {
        return {
          esito: "troppo_piccola",
          avanzamento,
          messaggio: esito.messaggio,
          vicine: esito.alternative.slice(0, MASSIMO_DESTINAZIONI_VICINE).map(comeSuggerimento),
        };
      }
      return { esito: "non_disponibile", messaggio: esito.messaggio };
    },

    async sorprendimi(richiesta: RichiestaSorprendimi): Promise<EsitoSorprendimi> {
      // La durata serve solo a completare il profilo: la scelta della destinazione non ne dipende.
      const esito = validaProfilo({
        destinazione: { tipo: "sorprendimi" },
        date: { tipo: "mese", mese: richiesta.mese },
        durata: DURATA_MINIMA,
        ...(richiesta.stili.length > 0 ? { stili: richiesta.stili } : {}),
        daEvitare: { stili: richiesta.daEvitare },
      });
      if (!esito.ok) return { esito: "errore", messaggio: esito.problemi.map((p) => p.testo).join(" ") };
      return {
        esito: "proposte",
        proposte: proponiSorprendimi(candidate, esito.profilo).map(({ candidata, stiliInComune, meseConsigliato }) => ({
          id: candidata.id,
          nome: candidata.nome,
          descrizione: candidata.descrizione,
          stili: candidata.stili,
          stiliInComune,
          meseConsigliato,
        })),
      };
    },
  };
}
