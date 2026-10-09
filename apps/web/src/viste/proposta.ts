/**
 * Dati per la vista della proposta (REQ-WEB-002): imprevisto, impatto, modifiche (prima → dopo), itinerario
 * risultante del giorno, spiegazione, esito con i problemi, elementi a rischio, alternative.
 * Tutto viene dalla proposta del motore (`proponiRipianificazione`): qui si trasforma solo in testo da mostrare.
 */
import {
  descriviImprevisto,
  versioneCorrente,
  type Catalogo,
  type Elemento,
  type Imprevisto,
  type TipoAlternativa,
  type Viaggio,
} from "@travelops/engine";
import { trovaScenario } from "../dati/scenari";
import type { Decisione, EsitoAzione, PropostaSalvata, StatoDemo } from "../stato/stato";
import { momentoEsteso } from "./demo";
import { ETICHETTE_MEZZO, intervallo } from "./etichette";
import { descriviElemento, vistaGiorno, type RigaElemento } from "./giorno";
import { problemaVista, segnaliGiorno, type ProblemaVista, type SegnaliGiorno } from "./segnalazioni";

export const ETICHETTE_ALTERNATIVA: Record<TipoAlternativa, string> = {
  gestione_prenotazione: "Gestione della prenotazione",
  ricerca_voli: "Ricerca voli",
  ricerca_treni: "Ricerca treni",
};

export interface ElementoInBreve {
  id: string;
  /** Per esempio "09:50–10:00 · Hotel sul lago, Riva del Garda → MAG Museo Alto Garda · A piedi". */
  testo: string;
}

export interface RigaImpatto extends ElementoInBreve {
  motivo: string;
}

export interface RigaModifica {
  id: string;
  tipo: "aggiunto" | "rimosso" | "modificato";
  tipoEtichetta: string;
  prima: string | null;
  dopo: string | null;
}

export interface AlternativaVista {
  tipo: TipoAlternativa;
  tipoEtichetta: string;
  elementoId: string;
  etichetta: string;
  /** L'indirizzo costruito dal motore: lo apre il browser del viaggiatore, su clic, in una nuova scheda. */
  indirizzo: string;
}

export interface GiornoProposta {
  data: string;
  dataEstesa: string;
  righe: RigaElemento[];
  segnali: SegnaliGiorno;
}

export interface VistaProposta {
  id: number;
  scenario: { id: string; titolo: string };
  versioneBase: number;
  versioneCorrente: number;
  imprevisto: string;
  impatto: RigaImpatto[];
  modifiche: RigaModifica[];
  giorno: GiornoProposta | null;
  /** La spiegazione del motore, riga per riga. */
  spiegazione: string[];
  fattibile: boolean;
  esito: string;
  problemi: ProblemaVista[];
  aRischio: ElementoInBreve[];
  alternative: AlternativaVista[];
  decisione: { testo: string; versione: number | null } | null;
  ultimoEsito: EsitoAzione | null;
  /** Vero finché il viaggiatore non ha deciso: si mostrano Accetta e Rifiuta. */
  decidibile: boolean;
  orologioEsteso: string;
}

/** La prima lettera in maiuscolo. */
function maiuscola(testo: string): string {
  return testo.charAt(0).toUpperCase() + testo.slice(1);
}

/** Un elemento in una riga: orario, attività o tratta, mezzo. */
export function elementoInBreve(elemento: Elemento, catalogo: Catalogo): string {
  const parti = [intervallo(elemento.inizio, elemento.fine), descriviElemento(elemento, catalogo)];
  if (elemento.tipo === "spostamento") parti.push(ETICHETTE_MEZZO[elemento.mezzo]);
  return parti.join(" · ");
}

/** L'elemento con quell'id: nell'itinerario risultante oppure, se è stato rimosso, tra i rimossi. */
function trovaInProposta(salvata: PropostaSalvata, id: string): Elemento | null {
  const { proposta } = salvata;
  for (const giorno of proposta.itinerario.giorni) {
    const trovato = giorno.elementi.find((e) => e.id === id);
    if (trovato !== undefined) return trovato;
  }
  return proposta.modifiche.rimossi.find((e) => e.id === id) ?? null;
}

function inBreve(salvata: PropostaSalvata, id: string, catalogo: Catalogo): ElementoInBreve {
  const elemento = trovaInProposta(salvata, id);
  return { id, testo: elemento === null ? id : elementoInBreve(elemento, catalogo) };
}

/** La data del giorno dell'imprevisto; per una cancellazione, quella del giorno dello spostamento cancellato. */
function dataImprevisto(imprevisto: Imprevisto, itinerario: Viaggio): string | null {
  if (imprevisto.tipo !== "CANCELLAZIONE_SPOSTAMENTO") return imprevisto.data;
  return itinerario.giorni.find((g) => g.elementi.some((e) => e.id === imprevisto.elementoId))?.data ?? null;
}

function testoDecisione(decisione: Decisione): { testo: string; versione: number | null } {
  if (decisione.tipo === "rifiutata") return { testo: "Rifiutata: nessuna nuova versione.", versione: null };
  const quando = momentoEsteso(decisione.momento);
  return decisione.versione === null
    ? { testo: `Accettata da ${decisione.autore} il ${quando}, senza nuova versione.`, versione: null }
    : { testo: `Accettata da ${decisione.autore} il ${quando}: versione ${decisione.versione}.`, versione: decisione.versione };
}

export function vistaProposta(salvata: PropostaSalvata, stato: StatoDemo, catalogo: Catalogo): VistaProposta {
  const { proposta } = salvata;
  const scenario = trovaScenario(salvata.scenario);
  const imprevisto = proposta.origine.tipo === "imprevisto" ? proposta.origine.imprevisto : null;
  const viaggioBase = stato.storico.versioni.find((v) => v.numero === proposta.versioneBase)?.viaggio ?? proposta.itinerario;

  const modifiche: RigaModifica[] = [
    ...proposta.modifiche.rimossi.map((e) => ({
      id: e.id,
      tipo: "rimosso" as const,
      tipoEtichetta: "Rimosso",
      prima: elementoInBreve(e, catalogo),
      dopo: null,
    })),
    ...proposta.modifiche.aggiunti.map((e) => ({
      id: e.id,
      tipo: "aggiunto" as const,
      tipoEtichetta: "Aggiunto",
      prima: null,
      dopo: elementoInBreve(e, catalogo),
    })),
    ...proposta.modifiche.modificati.map((m) => ({
      id: m.id,
      tipo: "modificato" as const,
      tipoEtichetta: "Modificato",
      prima: elementoInBreve(m.prima, catalogo),
      dopo: elementoInBreve(m.dopo, catalogo),
    })),
  ];

  const data = imprevisto === null ? null : dataImprevisto(imprevisto, proposta.itinerario);
  const vista = data === null ? null : vistaGiorno(proposta.itinerario, catalogo, data);
  const giorno: GiornoProposta | null =
    vista === null
      ? null
      : {
          data: vista.data,
          dataEstesa: vista.dataEstesa,
          righe: vista.elementi,
          segnali: segnaliGiorno(
            vista.elementi.map((r) => r.id),
            {
              problemi: proposta.problemi,
              aRischio: proposta.elementiARischio,
              aggiunti: proposta.modifiche.aggiunti.map((e) => e.id),
              modificati: proposta.modifiche.modificati.map((m) => m.id),
            },
          ),
        };

  return {
    id: salvata.id,
    scenario: { id: salvata.scenario, titolo: scenario?.titolo ?? salvata.scenario },
    versioneBase: proposta.versioneBase,
    versioneCorrente: versioneCorrente(stato.storico).numero,
    imprevisto: imprevisto === null ? "" : maiuscola(descriviImprevisto(imprevisto, viaggioBase, catalogo)),
    impatto: proposta.impatto.elementiColpiti.map((c) => ({ ...inBreve(salvata, c.elementoId, catalogo), motivo: c.motivo })),
    modifiche,
    giorno,
    spiegazione: proposta.spiegazione.split("\n"),
    fattibile: proposta.fattibile,
    esito: proposta.fattibile ? "Fattibile" : "Non fattibile",
    problemi: proposta.problemi.map(problemaVista),
    aRischio: proposta.elementiARischio.map((id) => inBreve(salvata, id, catalogo)),
    alternative: proposta.alternative.map((a) => ({
      tipo: a.tipo,
      tipoEtichetta: ETICHETTE_ALTERNATIVA[a.tipo],
      elementoId: a.elementoId,
      etichetta: a.etichetta,
      indirizzo: a.indirizzo,
    })),
    decisione: salvata.decisione === null ? null : testoDecisione(salvata.decisione),
    ultimoEsito: salvata.ultimoEsito,
    decidibile: salvata.decisione === null,
    orologioEsteso: momentoEsteso(stato.orologio),
  };
}
