/**
 * Dati per la pagina Demo (REQ-WEB-002): gli scenari S1–S8 con la loro descrizione, l'orologio simulato e lo stato
 * locale (viaggio di partenza, scenario in corso, versione corrente, proposta mostrata).
 * La descrizione dell'imprevisto è quella del motore (`descriviImprevisto`).
 */
import { descriviImprevisto, versioneCorrente, type Catalogo, type Momento, type Viaggio } from "@travelops/engine";
import { SCENARI, trovaScenario, viaggioDelloScenario, type Scenario } from "../dati/scenari";
import { caricaViaggioScelto, trovaVoceViaggio } from "../dati/viaggi";
import type { PropostaSalvata, StatoDemo } from "../stato/stato";
import { dataEstesa } from "./etichette";

export interface VoceScenario {
  id: string;
  titolo: string;
  /** Il viaggio di partenza: "Versione 1" o la variante. */
  viaggio: string;
  descrizioneViaggio: string;
  /** L'imprevisto in parole, dal motore. */
  imprevisto: string;
  /** Vero se è lo scenario in corso. */
  attivo: boolean;
}

export interface StatoProposta {
  id: number;
  scenario: string;
  /** "In attesa di decisione", "Accettata (versione 2)", "Rifiutata"… */
  stato: string;
}

export interface VistaDemo {
  orologio: Momento;
  orologioEsteso: string;
  partenza: { chiave: string; etichetta: string };
  scenarioAttivo: { id: string; titolo: string; imprevisto: string } | null;
  versioneCorrente: { numero: number; causa: string };
  numeroVersioni: number;
  proposta: StatoProposta | null;
  scenari: VoceScenario[];
}

/** Un momento in parole, per esempio "sabato 13 giugno 2026 alle 07:30". */
export function momentoEsteso(momento: Momento): string {
  return `${dataEstesa(momento.data)} alle ${momento.ora}`;
}

/** Il viaggio di partenza di uno scenario, caricato e validato dal motore. */
function viaggioDiPartenza(scenario: Scenario): Viaggio | null {
  const esito = caricaViaggioScelto(viaggioDelloScenario(scenario).chiave);
  return esito?.ok === true ? esito.viaggio : null;
}

function imprevistoInParole(scenario: Scenario, catalogo: Catalogo): string {
  const viaggio = viaggioDiPartenza(scenario);
  return viaggio === null ? scenario.titolo : descriviImprevisto(scenario.imprevisto, viaggio, catalogo);
}

export function statoProposta(salvata: PropostaSalvata): string {
  const { decisione } = salvata;
  if (decisione === null) return "In attesa di decisione";
  if (decisione.tipo === "rifiutata") return "Rifiutata";
  return decisione.versione === null ? "Accettata, senza nuova versione" : `Accettata (versione ${decisione.versione})`;
}

export function vistaDemo(stato: StatoDemo, catalogo: Catalogo): VistaDemo {
  const corrente = versioneCorrente(stato.storico);
  const voce = trovaVoceViaggio(stato.partenza);
  const attivo = stato.scenario === null ? null : trovaScenario(stato.scenario);
  const ultima = stato.proposte[stato.proposte.length - 1];
  return {
    orologio: { ...stato.orologio },
    orologioEsteso: momentoEsteso(stato.orologio),
    partenza: { chiave: stato.partenza, etichetta: voce?.etichetta ?? stato.partenza },
    scenarioAttivo: attivo === null ? null : { id: attivo.id, titolo: attivo.titolo, imprevisto: imprevistoInParole(attivo, catalogo) },
    versioneCorrente: { numero: corrente.numero, causa: corrente.causa },
    numeroVersioni: stato.storico.versioni.length,
    proposta: ultima === undefined ? null : { id: ultima.id, scenario: ultima.scenario, stato: statoProposta(ultima) },
    scenari: SCENARI.map((scenario) => {
      const viaggio = viaggioDelloScenario(scenario);
      return {
        id: scenario.id,
        titolo: scenario.titolo,
        viaggio: viaggio.etichetta,
        descrizioneViaggio: viaggio.descrizione,
        imprevisto: imprevistoInParole(scenario, catalogo),
        attivo: scenario.id === stato.scenario,
      };
    }),
  };
}
