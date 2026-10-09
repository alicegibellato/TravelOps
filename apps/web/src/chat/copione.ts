/**
 * Il copione della sorgente finta (REQ-CHAT-001, ST-CHAT-001B): le risposte scritte in anticipo per un viaggio di
 * riferimento. I contenuti dei viaggi (giorni, attività, periodo) e la proposta vengono dai dati e dal motore, come
 * nel resto dell'app: la proposta è quella che il motore costruisce per lo scenario di imprevisto del viaggio
 * (`proponiRipianificazione`, via `vistaProposta`). Qui si scelgono solo i testi di contorno. Gira sul server; il
 * browser riceve il risultato come dati semplici.
 */
import { proponiRipianificazione, versioneCorrente } from "@travelops/engine";
import type { EsitoDati } from "../dati/carica";
import { catalogoDiRiferimento, SCENARI, sorgenteDiRiferimento } from "../dati/scenari";
import { percorsoGiorno } from "../percorsi";
import { statoIniziale, type PropostaSalvata } from "../stato/stato";
import { dataEstesa, periodo } from "../viste/etichette";
import { descriviElemento } from "../viste/giorno";
import { vistaProposta } from "../viste/proposta";
import type { Copione } from "./sorgente";
import type { CambioScheda, RispostaChat, SchedaChat } from "./tipi";

const SUGGERIMENTI = ["Voglio un weekend sul lago", "Sabato piove: cosa cambio?", "Mostrami le mie preferenze"] as const;

type SchedaProposta = Extract<SchedaChat, { tipo: "proposta" }>;

/** La proposta del motore per lo scenario di imprevisto del viaggio, in parole semplici; `null` se non c'è. */
function schedaProposta(chiave: string): SchedaProposta | null {
  const scenario = SCENARI.find((s) => s.chiaveViaggio === chiave);
  if (scenario === undefined) return null;
  const catalogo = catalogoDiRiferimento();
  const stato = statoIniziale(chiave, scenario.id);
  const corrente = versioneCorrente(stato.storico);
  const salvata: PropostaSalvata = {
    id: stato.prossimaProposta,
    scenario: scenario.id,
    proposta: proponiRipianificazione(corrente.viaggio, corrente.numero, catalogo, sorgenteDiRiferimento(), scenario.imprevisto),
    decisione: null,
    ultimoEsito: null,
  };
  const vista = vistaProposta(salvata, stato, catalogo);
  const cambi: CambioScheda[] = vista.modifiche.map((riga) => {
    if (riga.tipo === "rimosso") return { tipo: "rimosso", testo: riga.descrizione };
    if (riga.tipo === "aggiunto") return { tipo: "aggiunto", testo: riga.descrizione };
    return { tipo: "spostato", testo: riga.descrizione, prima: riga.prima ?? undefined, dopo: riga.dopo ?? undefined };
  });
  return {
    tipo: "proposta",
    titolo: scenario.titolo,
    livello: "minimo",
    cambi,
    avviso: vista.aRischio.length === 0 ? undefined : `Da controllare: ${vista.aRischio.map((e) => e.testo).join("; ")}`,
    conferma: { titolo: "Fatto: ho aggiornato il programma", testo: `Ho applicato la proposta «${scenario.titolo}». Se cambi idea puoi annullare.` },
    rifiuto: "Va bene, lascio il programma com'è. Se vuoi, cerchiamo un'altra soluzione.",
  };
}

function viaggiatori(numero: number): string {
  return `${numero} ${numero === 1 ? "viaggiatore" : "viaggiatori"}`;
}

const cache = new Map<string, Copione>();

/**
 * Il copione per un viaggio: benvenuto con tre suggerimenti, riepilogo delle preferenze, bozza dei giorni e proposta
 * per l'imprevisto. Gli stili e il ritmo del riepilogo sono dati di esempio (le preferenze vere arrivano con
 * REQ-PREF-001).
 */
export function copioneViaggio(chiave: string, esito: Extract<EsitoDati, { ok: true }>): Copione {
  const memorizzato = cache.get(chiave);
  if (memorizzato !== undefined) return memorizzato;
  const { viaggio, catalogo } = esito;

  const preferenze: RispostaChat = {
    testo: "Ecco cosa ho capito finora. Dimmi se qualcosa non va.",
    scheda: {
      tipo: "preferenze",
      titolo: "Le tue preferenze",
      voci: [
        { etichetta: "Viaggio", valore: viaggio.titolo },
        { etichetta: "Quando", valore: periodo(viaggio.dataInizio, viaggio.dataFine) },
        { etichetta: "Chi viaggia", valore: viaggiatori(viaggio.numeroViaggiatori) },
        { etichetta: "Stili", valore: "Cultura e gastronomia" },
        { etichetta: "Ritmo", valore: "Tranquillo, due o tre attività al giorno" },
      ],
    },
    risposteRapide: [SUGGERIMENTI[0], SUGGERIMENTI[1]],
  };

  const bozza: RispostaChat = {
    testo: "Ho preparato una bozza del weekend. Puoi aprire ogni giorno per vedere i dettagli.",
    scheda: {
      tipo: "bozza",
      titolo: viaggio.titolo,
      giorni: viaggio.giorni.map((giorno) => ({
        titolo: dataEstesa(giorno.data),
        attivita: giorno.elementi.filter((e) => e.tipo === "attivita").map((e) => descriviElemento(e, catalogo)),
        href: percorsoGiorno(chiave, giorno.data),
      })),
    },
    risposteRapide: [SUGGERIMENTI[1], SUGGERIMENTI[2]],
  };

  const proposta = schedaProposta(chiave);
  // Un viaggio senza scenario di imprevisto tra i dati di riferimento non ha una proposta pronta: lo si dice.
  const imprevisto: RispostaChat =
    proposta === null
      ? {
          testo: "Per questo viaggio non ho una proposta di cambio pronta. Raccontami cosa è successo e lo guardiamo insieme.",
          risposteRapide: [SUGGERIMENTI[0], SUGGERIMENTI[2]],
        }
      : { testo: "Capita. Ti propongo di cambiare solo il necessario: guarda e dimmi se ti va bene.", scheda: proposta };

  const copione: Copione = {
    benvenuto: {
      testo: "Ciao! Sono TravelOps. Posso aiutarti a preparare il viaggio e a sistemarlo se qualcosa cambia. Da dove cominciamo?",
      suggerimenti: SUGGERIMENTI,
    },
    risposte: [
      { parole: ["preferenz", "profilo", "gusti"], risposta: preferenze },
      { parole: ["piov", "meteo", "imprevist", "trekking", "alternativ", "cambio"], risposta: imprevisto },
      { parole: ["bozza", "weekend", "lago", "pianific", "programma", "itinerario"], risposta: bozza },
    ],
    altrimenti: {
      testo: "Non ho capito bene. Posso aiutarti con una di queste cose.",
      risposteRapide: SUGGERIMENTI,
    },
  };
  cache.set(chiave, copione);
  return copione;
}
