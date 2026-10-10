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
  // REQ-CHAT-003 (TB-CHAT-019): l'assistente finto non aggiorna i filtri, quindi non dice di aver capito destinazione,
  // date o viaggiatori. CA-6: «Crea la mia bozza» riceve una risposta chiara con il modo per proseguire.
  risposte: [
    {
      parole: ["crea la mia bozza"],
      risposta: {
        testo: "Ho ricevuto la richiesta. Sono l'assistente di prova e qui non preparo la bozza: aprila dalla pagina Preferenze con «Crea la mia bozza».",
      },
    },
    {
      parole: ["garda"],
      risposta: {
        testo: "Bella idea! Sono l'assistente di prova e non segno nulla nei filtri: scegli destinazione e date nei passi qui accanto. Vi piace di più la natura o il buon vino?",
        risposteRapide: ["Natura", "Buon vino", "Tutte e due"],
      },
    },
    { parole: ["montagna", "sorprend"], risposta: { testo: "Per le idee usa Sorprendimi nel passo «Dove»: scegli cosa ti piace e il mese, e ti propongo tre mete." } },
  ],
  altrimenti: { testo: "Dimmi qualcosa in più sul viaggio: dove, quando e con chi." },
};
