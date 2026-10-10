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
import { linkGestioneDaMostrare } from "../servizi/link-prenotazione";
import { trovaScenario } from "../dati/scenari";
import { contestoTesti, inParole, TESTI_ALTERNATIVE, TESTI_IMPREVISTI, type ContestoTesti } from "../testi";
import type { LivelloRipianificazione } from "../testi-ui";
import type { Decisione, EsitoAzione, PropostaSalvata, StatoDemo } from "../stato/stato";
import { momentoEsteso } from "./demo";
import { ETICHETTE_MEZZO, intervallo } from "./etichette";
import { descriviElemento, vistaGiorno, type RigaElemento } from "./giorno";
import { problemaVista, segnaliGiorno, type ProblemaVista, type SegnaliGiorno } from "./segnalazioni";

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
  /** L'elemento in parole (attività o tratta), per la prima colonna. */
  descrizione: string;
  tipo: "aggiunto" | "rimosso" | "modificato";
  tipoEtichetta: string;
  prima: string | null;
  dopo: string | null;
}

export interface AlternativaVista {
  tipo: TipoAlternativa;
  tipoEtichetta: string;
  elementoId: string;
  /** L'elemento a cui si riferisce, in parole. */
  elemento: string;
  etichetta: string;
  /** L'indirizzo costruito dal motore: lo apre il browser del viaggiatore, su clic, in una nuova scheda. */
  indirizzo: string;
}

/** Come cambia un elemento del giorno nella proposta; `null` se resta com'è. */
export type CambioVoce = "rimosso" | "aggiunto" | "spostato";

/** Una voce della linea del tempo del giorno con la proposta: gli elementi rimossi stanno al loro posto, barrati. */
export interface VoceGiornoProposta {
  riga: RigaElemento;
  cambio: CambioVoce | null;
}

export interface GiornoProposta {
  data: string;
  dataEstesa: string;
  /** Gli elementi dell'itinerario risultante. */
  righe: RigaElemento[];
  /** Risultanti e rimossi insieme, nell'ordine degli orari. */
  voci: VoceGiornoProposta[];
  segnali: SegnaliGiorno;
}

export interface VistaProposta {
  id: number;
  scenario: { id: string; titolo: string };
  /** Il titolo in parole semplici, per esempio "Pioggia sul trekking: ti propongo il MAG al posto del trekking". */
  titolo: string;
  /**
   * Il livello di ripianificazione (`modello-dominio-estensioni.md` §7.6). Le proposte che il motore costruisce per un
   * imprevisto (`proponiRipianificazione`) sono sempre di livello minimo: cambiano solo gli elementi colpiti.
   */
  livello: LivelloRipianificazione;
  /** Il tipo di imprevisto in parole, per esempio "Maltempo". */
  tipoImprevisto: string | null;
  versioneBase: number;
  versioneCorrente: number;
  imprevisto: string;
  impatto: RigaImpatto[];
  modifiche: RigaModifica[];
  giorno: GiornoProposta | null;
  /** Il riepilogo in evidenza: al massimo tre frasi (ST-UX-004A CA-4). */
  riepilogo: string;
  /** La spiegazione completa del motore, riga per riga: sta nei dettagli espandibili. */
  spiegazione: string[];
  /** Solo una nota informativa (per esempio un ritardo che non cambia nessuna attività): niente da accettare. */
  informativa: boolean;
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
  return { id, testo: elemento === null ? "Elemento non più nel programma" : elementoInBreve(elemento, catalogo) };
}

/** Il contesto per i testi della proposta: prima la versione di partenza, poi l'itinerario proposto e i rimossi. */
export function contestoProposta(salvata: PropostaSalvata, stato: StatoDemo, catalogo: Catalogo): ContestoTesti {
  const { proposta } = salvata;
  const base = stato.storico.versioni.find((v) => v.numero === proposta.versioneBase)?.viaggio;
  return contestoTesti(catalogo, base === undefined ? [proposta.itinerario] : [base, proposta.itinerario], proposta.modifiche.rimossi);
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

/** "A", "A e B", "A, B e C". */
function elenco(nomi: readonly string[]): string {
  if (nomi.length <= 1) return nomi.join("");
  return `${nomi.slice(0, -1).join(", ")} e ${nomi[nomi.length - 1] ?? ""}`;
}

/** Il titolo in parole semplici: lo scenario e, se cambiano attività, quali si propongono al posto di quali. */
function titoloProposta(titoloScenario: string, salvata: PropostaSalvata, catalogo: Catalogo): string {
  const { rimossi, aggiunti } = salvata.proposta.modifiche;
  const nomi = (elementi: readonly Elemento[]): string[] =>
    elementi.filter((e) => e.tipo === "attivita").map((e) => descriviElemento(e, catalogo));
  const tolte = nomi(rimossi);
  const nuove = nomi(aggiunti);
  if (nuove.length > 0 && tolte.length > 0) return `${titoloScenario}: ti propongo ${elenco(nuove)} al posto di ${elenco(tolte)}`;
  if (nuove.length > 0) return `${titoloScenario}: ti propongo di aggiungere ${elenco(nuove)}`;
  if (tolte.length > 0) return `${titoloScenario}: ti propongo di togliere ${elenco(tolte)}`;
  return `${titoloScenario}: l'itinerario resta com'è`;
}

/** Gli elementi del giorno con la proposta; i rimossi (del giorno di partenza) vanno al loro posto per orario. */
function vociDelGiorno(righe: readonly RigaElemento[], rimossi: readonly RigaElemento[], segnali: SegnaliGiorno): VoceGiornoProposta[] {
  const voci: VoceGiornoProposta[] = righe.map((riga) => {
    const cambio = segnali.perElemento[riga.id]?.cambio ?? null;
    return { riga, cambio: cambio === null ? null : cambio === "aggiunto" ? "aggiunto" : "spostato" };
  });
  for (const riga of rimossi) {
    const posto = voci.findIndex((voce) => voce.riga.inizio > riga.inizio);
    voci.splice(posto < 0 ? voci.length : posto, 0, { riga, cambio: "rimosso" });
  }
  return voci;
}

/** Per le proposte salvate prima del riepilogo: l'imprevisto e l'esito, le due righe che dicono l'essenziale. */
function riepilogoDaSpiegazione(spiegazione: string): string {
  const righe = spiegazione.split("\n");
  const scelte = [righe[0], righe.find((r) => r.startsWith("Esito:"))].filter((r): r is string => r !== undefined);
  return scelte.map((r) => r.replace(/^(Imprevisto|Esito): /, "")).map((r) => (/[.!?]$/.test(r) ? r : `${r}.`)).join(" ");
}

export function vistaProposta(salvata: PropostaSalvata, stato: StatoDemo, catalogo: Catalogo): VistaProposta {
  const { proposta } = salvata;
  const scenario = trovaScenario(salvata.scenario);
  const imprevisto = proposta.origine.tipo === "imprevisto" ? proposta.origine.imprevisto : null;
  const viaggioBase = stato.storico.versioni.find((v) => v.numero === proposta.versioneBase)?.viaggio ?? proposta.itinerario;
  const contesto = contestoProposta(salvata, stato, catalogo);
  // Con i voli reali i link di gestione segnaposto non si mostrano né come pulsanti né nel testo della spiegazione.
  const indirizziNascosti = proposta.alternative.filter((a) => a.tipo === "gestione_prenotazione" && linkGestioneDaMostrare(a.indirizzo) === null).map((a) => a.indirizzo);

  const modifiche: RigaModifica[] = [
    ...proposta.modifiche.rimossi.map((e) => ({
      id: e.id,
      descrizione: descriviElemento(e, catalogo),
      tipo: "rimosso" as const,
      tipoEtichetta: "Tolto",
      prima: elementoInBreve(e, catalogo),
      dopo: null,
    })),
    ...proposta.modifiche.aggiunti.map((e) => ({
      id: e.id,
      descrizione: descriviElemento(e, catalogo),
      tipo: "aggiunto" as const,
      tipoEtichetta: "Aggiunto",
      prima: null,
      dopo: elementoInBreve(e, catalogo),
    })),
    ...proposta.modifiche.modificati.map((m) => ({
      id: m.id,
      descrizione: descriviElemento(m.prima, catalogo),
      tipo: "modificato" as const,
      tipoEtichetta: "Spostato",
      prima: elementoInBreve(m.prima, catalogo),
      dopo: elementoInBreve(m.dopo, catalogo),
    })),
  ];

  const data = imprevisto === null ? null : dataImprevisto(imprevisto, proposta.itinerario);
  const vista = data === null ? null : vistaGiorno(proposta.itinerario, catalogo, data);
  const idRimossi = new Set(proposta.modifiche.rimossi.map((e) => e.id));
  const rimossiDelGiorno = data === null ? [] : (vistaGiorno(viaggioBase, catalogo, data)?.elementi ?? []).filter((r) => idRimossi.has(r.id));
  const giorno: GiornoProposta | null =
    vista === null
      ? null
      : (() => {
          const segnali = segnaliGiorno(
            vista.elementi.map((r) => r.id),
            {
              problemi: proposta.problemi,
              aRischio: proposta.elementiARischio,
              aggiunti: proposta.modifiche.aggiunti.map((e) => e.id),
              modificati: proposta.modifiche.modificati.map((m) => m.id),
              contesto,
            },
          );
          return {
            data: vista.data,
            dataEstesa: vista.dataEstesa,
            righe: vista.elementi,
            voci: vociDelGiorno(vista.elementi, rimossiDelGiorno, segnali),
            segnali,
          };
        })();

  return {
    id: salvata.id,
    scenario: { id: salvata.scenario, titolo: scenario?.titolo ?? salvata.scenario },
    titolo: titoloProposta(scenario?.titolo ?? salvata.scenario, salvata, catalogo),
    livello: "minimo",
    tipoImprevisto: imprevisto === null ? null : TESTI_IMPREVISTI[imprevisto.tipo],
    versioneBase: proposta.versioneBase,
    versioneCorrente: versioneCorrente(stato.storico).numero,
    imprevisto: imprevisto === null ? "" : inParole(descriviImprevisto(imprevisto, viaggioBase, catalogo), contesto),
    impatto: proposta.impatto.elementiColpiti.map((c) => ({ ...inBreve(salvata, c.elementoId, catalogo), motivo: inParole(c.motivo, contesto) })),
    modifiche,
    giorno,
    riepilogo: inParole(proposta.riepilogo ?? riepilogoDaSpiegazione(proposta.spiegazione), contesto),
    spiegazione: proposta.spiegazione
      .split("\n")
      .filter((riga) => !indirizziNascosti.some((indirizzo) => riga.includes(indirizzo)))
      .map((riga) => inParole(riga, contesto)),
    informativa: proposta.informativa === true,
    fattibile: proposta.fattibile,
    esito: proposta.fattibile ? (proposta.elementiARischio.length > 0 ? "Fattibile, con elementi a rischio" : "Fattibile") : "Non fattibile",
    problemi: proposta.problemi.map((p) => problemaVista(p, contesto)),
    aRischio: proposta.elementiARischio.map((id) => inBreve(salvata, id, catalogo)),
    alternative: proposta.alternative
      .filter((a) => !indirizziNascosti.includes(a.indirizzo))
      .map((a) => ({
      tipo: a.tipo,
      tipoEtichetta: TESTI_ALTERNATIVE[a.tipo],
      elementoId: a.elementoId,
      elemento: inBreve(salvata, a.elementoId, catalogo).testo,
      etichetta: inParole(a.etichetta, contesto),
      indirizzo: a.indirizzo,
    })),
    decisione: salvata.decisione === null ? null : testoDecisione(salvata.decisione),
    ultimoEsito: salvata.ultimoEsito === null ? null : { ...salvata.ultimoEsito, messaggio: inParole(salvata.ultimoEsito.messaggio, contesto) },
    decidibile: salvata.decisione === null && proposta.informativa !== true,
    orologioEsteso: momentoEsteso(stato.orologio),
  };
}
