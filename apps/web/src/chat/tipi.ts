/**
 * I dati della chat (REQ-CHAT-001): messaggi, schede ricche e risposte. Sono dati semplici, senza funzioni e senza
 * dipendenze dal motore, così si possono costruire sul server e passare al browser. Chi produce le risposte (la
 * sorgente finta di oggi, quella con l'assistente vero in ST-CHAT-001C) usa questi stessi tipi.
 */
import type { LivelloRipianificazione } from "../testi-ui";

export interface VocePreferenze {
  etichetta: string;
  valore: string;
}

export interface GiornoBozza {
  /** Per esempio "sabato 13 giugno". */
  titolo: string;
  /** I nomi delle attività del giorno. */
  attivita: readonly string[];
  /** Dove porta "Apri". */
  href: string;
}

export interface CambioScheda {
  tipo: "rimosso" | "aggiunto" | "spostato";
  testo: string;
  prima?: string | undefined;
  dopo?: string | undefined;
}

export type SchedaChat =
  | { tipo: "preferenze"; titolo: string; voci: readonly VocePreferenze[] }
  | { tipo: "bozza"; titolo: string; giorni: readonly GiornoBozza[] }
  | SchedaConfermaChat
  | {
      tipo: "proposta";
      titolo: string;
      livello: LivelloRipianificazione;
      cambi: readonly CambioScheda[];
      avviso?: string | undefined;
      /** La conferma che compare quando il viaggiatore preme Accetta (con "Annulla"). */
      conferma: { titolo: string; testo: string };
      /** La risposta di TravelOps quando il viaggiatore preme Rifiuta. */
      rifiuto: string;
    };

export type SchedaConfermaChat = { tipo: "conferma"; titolo: string; testo: string };

export interface RispostaChat {
  testo: string;
  scheda?: SchedaChat | undefined;
  /** Le risposte rapide da mostrare sotto il messaggio. */
  risposteRapide?: readonly string[] | undefined;
}

export interface Benvenuto {
  testo: string;
  /** I suggerimenti da toccare (tre) per cominciare. */
  suggerimenti: readonly string[];
}

export interface TurnoChat {
  autore: "viaggiatore" | "travelops";
  testo: string;
}
