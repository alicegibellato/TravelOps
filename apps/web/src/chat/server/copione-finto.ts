/**
 * Le risposte dell'assistente finto che sostituisce il modello quando `TRAVELOPS_ASSISTENTE=finto` (prove nel browser,
 * demo senza rete): nessuna chiave e nessuna chiamata. Rispondono alle richieste più comuni del copione della demo.
 */
import type { Copione } from "../sorgente";

export const COPIONE_ASSISTENTE_FINTO: Copione = {
  benvenuto: {
    testo: "Ciao! Raccontami il viaggio che hai in mente: dove, quando, con chi e cosa vi piace.",
    suggerimenti: ["4 giorni sul Lago di Garda a giugno in coppia", "Un weekend lungo a Roma", "Sorprendimi: 5 giorni in montagna"],
  },
  risposte: [
    {
      parole: ["garda"],
      risposta: {
        testo: "Bella idea: il Lago di Garda a giugno è perfetto per una coppia. Vi piace di più la natura o il buon vino?",
        risposteRapide: ["Natura", "Buon vino", "Tutte e due"],
      },
    },
    { parole: ["montagna", "sorprend"], risposta: { testo: "Ti propongo tre mete di montagna: scegli quella che ti ispira di più." } },
  ],
  altrimenti: { testo: "Dimmi qualcosa in più sul viaggio: dove, quando e con chi." },
};
