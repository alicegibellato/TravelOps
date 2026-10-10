/**
 * Controllo dei viaggi confermati (REQ-MONITOR-001, CA-1, CA-2, CA-4).
 *
 * Per ogni viaggio legge meteo ed eventi dei giorni dell'orizzonte, ne ricava le condizioni che possono toccare le
 * attività (pioggia, temporale o neve su attività all'aperto; evento che chiude un luogo) e le trasforma in un
 * imprevisto del modello. L'impatto lo calcola `calcolaImpatto` e la proposta minima `proponiRipianificazione`: nessuna
 * regola di ripianificazione nuova. Se l'impatto è nullo non si genera nulla; se una sorgente non è disponibile, quella
 * condizione è ignorata e il messaggio finisce nell'esito.
 *
 * Idempotenza: ogni attività colpita ha una chiave `viaggio|attività|condizione|data`; una condizione le cui chiavi
 * sono già nel registro non produce un secondo imprevisto, nemmeno dopo che il viaggiatore ha rifiutato la proposta.
 * Una condizione diversa (per esempio da pioggia a temporale) ha chiavi diverse ed è quindi un imprevisto nuovo.
 */
import {
  CONDIZIONI_AVVERSE,
  type AttivitaCatalogo,
  type Catalogo,
  type CondizioneAvversa,
  type Data,
  type Imprevisto,
  type Luogo,
} from "../model/index.js";
import { calcolaImpatto, proponiRipianificazione } from "../replanning/index.js";
import { chiaveControllo } from "./registro.js";
import { descriviNotifica } from "./testi.js";
import type {
  AttivitaColpita,
  EsitoControllo,
  FasciaCondizione,
  ImprevistoRilevato,
  ParametriControllo,
  RisultatoCondizioni,
  ViaggioMonitorato,
} from "./tipi.js";

interface Candidato {
  imprevisto: Imprevisto;
  condizione: string;
}

/** Somma `giorni` a una data `AAAA-MM-GG` (calendario UTC: nessun fuso, nessuna ora legale). */
export function aggiungiGiorni(data: Data, giorni: number): Data {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + giorni);
  return d.toISOString().slice(0, 10);
}

const adversa = (c: string): c is CondizioneAvversa => (CONDIZIONI_AVVERSE as readonly string[]).includes(c);

async function leggi<T>(chiamata: () => Promise<RisultatoCondizioni<T>>, nonDisponibili: string[]): Promise<T | null> {
  try {
    const risultato = await chiamata();
    if (risultato.disponibile) return risultato.dati;
    nonDisponibili.push(risultato.messaggio);
  } catch {
    nonDisponibili.push("Servizio non disponibile: la sorgente non ha risposto");
  }
  return null;
}

function mappe(catalogo: Catalogo): { attivita: Map<string, AttivitaCatalogo>; luoghi: Map<string, Luogo> } {
  return { attivita: new Map(catalogo.attivita.map((a) => [a.id, a])), luoghi: new Map(catalogo.luoghi.map((l) => [l.id, l])) };
}

/** Le condizioni candidate di un viaggio, nell'ordine dei giorni (le chiamate alle sorgenti sono una per zona e per luogo, per giorno). */
async function candidatiDelViaggio(
  v: ViaggioMonitorato,
  da: Data,
  a: Data,
  sorgente: ParametriControllo["sorgente"],
  nonDisponibili: string[],
): Promise<Candidato[]> {
  const { attivita, luoghi } = mappe(v.catalogo);
  const zone = new Map(v.catalogo.zone.map((z) => [z.id, z]));
  const candidati: Candidato[] = [];
  for (const giorno of v.viaggio.giorni) {
    if (giorno.data < da || giorno.data > a) continue;
    const usate = giorno.elementi.flatMap((e) => (e.tipo === "attivita" ? [attivita.get(e.attivitaId)] : []));
    const aperto = [...new Set(usate.flatMap((x) => (x?.allAperto === true ? [luoghi.get(x.luogoId)?.zonaId] : [])))].filter((z): z is string => z !== undefined).sort();
    for (const zonaId of aperto) {
      const fasce = await leggi<readonly FasciaCondizione[]>(
        () => sorgente.meteo({ zonaId, coordinate: zone.get(zonaId)?.coordinate ?? null, data: giorno.data }),
        nonDisponibili,
      );
      for (const fascia of fasce ?? []) {
        if (!adversa(fascia.condizione)) continue;
        candidati.push({
          condizione: `meteo:${fascia.condizione}`,
          imprevisto: { tipo: "METEO_AVVERSO", zonaId, data: giorno.data, inizio: fascia.inizio, fine: fascia.fine, condizione: fascia.condizione },
        });
      }
    }
    const luoghiDelGiorno = [...new Set(usate.flatMap((x) => (x === undefined ? [] : [x.luogoId])))].sort();
    for (const luogoId of luoghiDelGiorno) {
      const eventi = await leggi(
        () => sorgente.eventi({ luogoId, coordinate: luoghi.get(luogoId)?.coordinate ?? null, data: giorno.data }),
        nonDisponibili,
      );
      for (const evento of eventi ?? []) {
        if (!evento.chiudeLuogo || evento.luogoId !== luogoId || evento.data !== giorno.data) continue;
        candidati.push({
          condizione: `chiusura:${evento.id}`,
          imprevisto: { tipo: "CHIUSURA_LUOGO", luogoId, data: giorno.data, inizio: evento.inizio, fine: evento.fine },
        });
      }
    }
  }
  return candidati;
}

/** Esegue un controllo di tutti i viaggi indicati: vedi il commento del modulo. Non solleva eccezioni per le sorgenti. */
export async function eseguiControllo(parametri: ParametriControllo): Promise<EsitoControllo> {
  const { viaggi, sorgente, orologio, registro, config } = parametri;
  const momento = orologio.adesso();
  const ultimo = aggiungiGiorni(momento.data, config.orizzonteGiorni);
  const esito: EsitoControllo = { momento, viaggiControllati: 0, nuovi: [], giaSegnalate: 0, senzaImpatto: 0, nonDisponibili: [] };

  for (const v of viaggi) {
    esito.viaggiControllati += 1;
    const { attivita } = mappe(v.catalogo);
    for (const { imprevisto, condizione } of await candidatiDelViaggio(v, momento.data, ultimo, sorgente, esito.nonDisponibili)) {
      const impatto = calcolaImpatto(v.viaggio, v.catalogo, imprevisto);
      const colpite: AttivitaColpita[] = [];
      for (const colpito of impatto.elementiColpiti) {
        const elemento = v.viaggio.giorni.flatMap((g) => g.elementi).find((e) => e.id === colpito.elementoId);
        if (elemento === undefined || elemento.tipo !== "attivita") continue;
        // Un'attività già finita oggi non si può più ripianificare.
        if (colpito.data === momento.data && elemento.fine <= momento.ora) continue;
        colpite.push({
          elementoId: elemento.id,
          attivitaId: elemento.attivitaId,
          nome: attivita.get(elemento.attivitaId)?.nome ?? elemento.attivitaId,
          data: colpito.data,
          inizio: elemento.inizio,
          fine: elemento.fine,
        });
      }
      if (colpite.length === 0) {
        esito.senzaImpatto += 1;
        continue;
      }
      const chiavi = colpite.map((c) => chiaveControllo(v.id, c.attivitaId, condizione, c.data));
      if (chiavi.every((c) => registro.ha(c))) {
        esito.giaSegnalate += 1;
        continue;
      }
      const proposta = proponiRipianificazione(v.viaggio, v.versioneBase, v.catalogo, v.contesto, imprevisto, v.profilo === undefined ? {} : { profilo: v.profilo });
      for (const c of chiavi) registro.registra(c);
      const rilevato: ImprevistoRilevato = {
        viaggioId: v.id,
        versioneBase: v.versioneBase,
        imprevisto,
        condizione,
        data: imprevisto.tipo === "METEO_AVVERSO" || imprevisto.tipo === "CHIUSURA_LUOGO" ? imprevisto.data : colpite[0]!.data,
        attivita: colpite,
        chiavi,
        descrizione: "",
        proposta,
      };
      rilevato.descrizione = descriviNotifica(rilevato);
      esito.nuovi.push(rilevato);
    }
  }
  return esito;
}
