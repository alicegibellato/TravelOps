/**
 * Il monitoraggio dei viaggi confermati nella web app (REQ-MONITOR-001): collega il motore (`eseguiControllo`) allo stato
 * locale. Nessuna regola di ripianificazione qui: impatto e proposta li calcola il motore; qui si leggono i viaggi
 * confermati, si salvano le proposte nello stato (le stesse della Demo e di «Ho un imprevisto», così si decidono
 * con la stessa pagina) e si ricordano le notifiche.
 *
 * - Orologio: quello simulato dello stato (lo stesso della vista Oggi).
 * - Viaggi: quelli «confermati» o «in corso» della base dati che la web app sa caricare (i viaggi di riferimento).
 * - Un controllo alla volta: le chiamate si accodano (scheduler e apertura di Oggi non si sovrappongono) e, prima di
 *   salvare, le chiavi si ricontrollano, quindi due controlli ravvicinati non producono duplicati (CA-4).
 * - Una proposta si salva solo se è ancora costruita sulla versione corrente del viaggio; altrimenti la condizione
 *   resta non segnalata e il controllo successivo la rivaluta.
 */
import {
  creaRegistroInMemoria,
  eseguiControllo,
  esportaStorico,
  versioneCorrente,
  type ConfigMonitoraggio,
  type EsitoControllo,
  type ImprevistoRilevato,
  type SorgenteCondizioni,
  type ViaggioMonitorato,
} from "@travelops/engine";
import {
  elencaViaggi,
  inTransazione,
  leggiImpostazione,
  leggiStoricoDelViaggio,
  scriviImpostazione,
  sostituisciProposteDelViaggio,
  testoStoricoDelViaggio,
  trovaViaggio,
  elencaProposteDelViaggio,
  type BaseDati,
} from "../basedati";
import { catalogoDiRiferimento, sorgenteDiRiferimento } from "../dati/scenari";
import { caricaViaggioScelto } from "../dati/viaggi";
import { usaBaseDati } from "../stato/avvio";
import { CHIAVE_PRESENTAZIONE, leggiStatoDemo, salvaStatoDemo } from "../stato/presentazione";
import { statoIniziale, verificaStato, type PropostaSalvata, type StatoDemo } from "../stato/stato";
import { leggiStatoMonitoraggio, salvaStatoMonitoraggio, type NotificaMonitoraggio } from "./stato";

export interface ContestoMonitoraggio {
  sorgente: SorgenteCondizioni;
  config: Pick<ConfigMonitoraggio, "orizzonteGiorni">;
}

/** L'esito di un controllo su un viaggio; `saltato` se il viaggio non si controlla (non confermato, non caricabile, stato non valido). */
export type EsitoMonitoraggio =
  | { ok: true; controllo: EsitoControllo; notifiche: NotificaMonitoraggio[] }
  | { ok: false; motivo: string };

// --- un controllo alla volta -----------------------------------------------------------------------------

let coda: Promise<unknown> = Promise.resolve();

/** Mette il lavoro in coda dietro a quello in corso; un errore non blocca la coda. */
function inCoda<T>(lavoro: () => Promise<T>): Promise<T> {
  const risultato = coda.then(lavoro, lavoro);
  coda = risultato.catch(() => undefined);
  return risultato;
}

// --- stato di un viaggio -----------------------------------------------------------------------------------

/**
 * Lo stato (storico e proposte) di un viaggio qualsiasi. Per il viaggio di partenza è lo stato stesso; per gli altri
 * si rileggono dalla base dati lo storico e le proposte del viaggio. `null` se non si possono leggere.
 */
function statoDelViaggio(db: BaseDati, stato: StatoDemo, chiave: string): StatoDemo | null {
  if (stato.partenza === chiave) return stato;
  const testo = testoStoricoDelViaggio(db, chiave);
  const base = statoIniziale(chiave, null, stato.orologio, stato.prossimaProposta);
  const proposte = elencaProposteDelViaggio(db, chiave).map((p) => ({
    id: p.id,
    scenario: p.origine,
    proposta: p.proposta,
    decisione: p.decisione,
    ultimoEsito: p.esito,
  }));
  const letto = verificaStato({
    partenza: chiave,
    scenario: null,
    orologio: stato.orologio,
    storico: testo ?? esportaStorico(base.storico),
    proposte,
    prossimaProposta: Math.max(stato.prossimaProposta, ...proposte.map((p) => p.id + 1)),
  });
  return letto.ok ? letto.stato : null;
}

/** Salva lo stato di un viaggio: se è quello di partenza, tutto lo stato; altrimenti le sue proposte e il contatore. */
function salvaStatoDelViaggio(db: BaseDati, partenza: string, nuovo: StatoDemo): void {
  if (nuovo.partenza === partenza) {
    salvaStatoDemo(db, nuovo);
    return;
  }
  inTransazione(db, () => {
    sostituisciProposteDelViaggio(
      db,
      nuovo.partenza,
      nuovo.proposte.map((p) => ({ id: p.id, origine: p.scenario, proposta: p.proposta, decisione: p.decisione, esito: p.ultimoEsito })),
    );
    const impostazioni = leggiImpostazione(db, CHIAVE_PRESENTAZIONE);
    if (typeof impostazioni === "object" && impostazioni !== null) {
      scriviImpostazione(db, CHIAVE_PRESENTAZIONE, { ...impostazioni, prossimaProposta: nuovo.prossimaProposta });
    }
  });
}

/** Una proposta è «aperta» se non è ancora stata decisa ed è costruita sulla versione corrente del viaggio. */
function propostaAperta(stato: StatoDemo, numero: number): boolean {
  const p = stato.proposte.find((x) => x.id === numero);
  return p !== undefined && p.decisione === null && p.proposta.informativa !== true && p.proposta.versioneBase === versioneCorrente(stato.storico).numero;
}

// --- il controllo --------------------------------------------------------------------------------------------

interface Preparazione {
  viaggio: ViaggioMonitorato;
  orologio: StatoDemo["orologio"];
  chiavi: Set<string>;
}

function prepara(db: BaseDati, chiave: string): Preparazione | { motivo: string } {
  const salvato = trovaViaggio(db, chiave);
  if (salvato === null || (salvato.stato !== "confermato" && salvato.stato !== "in_corso")) return { motivo: "il viaggio non è confermato" };
  const riferimento = caricaViaggioScelto(chiave);
  if (riferimento === null || !riferimento.ok) return { motivo: "il viaggio non si può controllare" };
  const letto = leggiStatoDemo(db);
  if (!letto.ok) return { motivo: `lo stato salvato non è valido (${letto.motivo})` };
  const storico = leggiStoricoDelViaggio(db, chiave);
  const corrente = storico !== null && storico.ok ? versioneCorrente(storico.storico) : null;
  return {
    viaggio: {
      id: chiave,
      viaggio: corrente?.viaggio ?? riferimento.viaggio,
      versioneBase: corrente?.numero ?? 1,
      catalogo: catalogoDiRiferimento(),
      contesto: sorgenteDiRiferimento(),
    },
    orologio: letto.stato.orologio,
    chiavi: leggiStatoMonitoraggio(db).chiavi,
  };
}

/** Salva i nuovi imprevisti: proposte nello stato del viaggio e notifiche. Restituisce quelli davvero salvati. */
function salva(db: BaseDati, chiave: string, nuovi: readonly ImprevistoRilevato[]): ImprevistoRilevato[] {
  return inTransazione(db, () => {
    const generale = leggiStatoDemo(db);
    if (!generale.ok) return [];
    let stato = statoDelViaggio(db, generale.stato, chiave);
    if (stato === null) return [];
    const monitoraggio = leggiStatoMonitoraggio(db);
    const salvati: ImprevistoRilevato[] = [];
    for (const n of nuovi) {
      if (n.chiavi.every((c) => monitoraggio.chiavi.has(c))) continue;
      if (n.versioneBase !== versioneCorrente(stato.storico).numero) continue;
      const proposta: PropostaSalvata = { id: stato.prossimaProposta, scenario: n.descrizione, proposta: n.proposta, decisione: null, ultimoEsito: null };
      stato = { ...stato, proposte: [...stato.proposte, proposta], prossimaProposta: proposta.id + 1 };
      for (const c of n.chiavi) monitoraggio.chiavi.add(c);
      monitoraggio.notifiche.push({
        id: monitoraggio.notifiche.reduce((m, x) => Math.max(m, x.id), 0) + 1,
        viaggio: chiave,
        proposta: proposta.id,
        testo: n.descrizione,
        condizione: n.condizione,
        creata: { ...stato.orologio },
      });
      salvati.push(n);
    }
    if (salvati.length > 0) {
      salvaStatoDelViaggio(db, generale.stato.partenza, stato);
      salvaStatoMonitoraggio(db, monitoraggio);
    }
    return salvati;
  });
}

/** Le notifiche del viaggio con la proposta ancora da decidere. */
export function notificheAperte(db: BaseDati, chiave: string): NotificaMonitoraggio[] {
  const generale = leggiStatoDemo(db);
  if (!generale.ok) return [];
  const proprie = leggiStatoMonitoraggio(db).notifiche.filter((n) => n.viaggio === chiave);
  if (proprie.length === 0) return [];
  const stato = statoDelViaggio(db, generale.stato, chiave);
  return stato === null ? [] : proprie.filter((n) => propostaAperta(stato, n.proposta));
}

/**
 * Controlla un viaggio confermato: meteo ed eventi dei prossimi giorni, imprevisti e proposte nuovi nello stato.
 * Le notifiche restituite sono quelle ancora da decidere per quel viaggio.
 */
export function controllaViaggio(cartella: string, chiave: string, contesto: ContestoMonitoraggio): Promise<EsitoMonitoraggio> {
  return inCoda(async () => {
    const pronto = usaBaseDati(cartella, (db) => prepara(db, chiave));
    if ("motivo" in pronto) return { ok: false, motivo: pronto.motivo };
    const controllo = await eseguiControllo({
      viaggi: [pronto.viaggio],
      sorgente: contesto.sorgente,
      orologio: { adesso: () => pronto.orologio },
      registro: creaRegistroInMemoria(pronto.chiavi),
      config: contesto.config,
    });
    const notifiche = usaBaseDati(cartella, (db) => {
      if (controllo.nuovi.length > 0) salva(db, chiave, controllo.nuovi);
      return notificheAperte(db, chiave);
    });
    return { ok: true, controllo, notifiche };
  });
}

/** Controlla tutti i viaggi confermati, uno dopo l'altro (il controllo periodico). */
export async function controllaViaggiConfermati(cartella: string, contesto: ContestoMonitoraggio): Promise<EsitoMonitoraggio[]> {
  const chiavi = usaBaseDati(cartella, (db) => elencaViaggi(db).filter((v) => v.stato === "confermato" || v.stato === "in_corso").map((v) => v.id));
  const esiti: EsitoMonitoraggio[] = [];
  for (const chiave of chiavi) esiti.push(await controllaViaggio(cartella, chiave, contesto));
  return esiti;
}

/**
 * All'apertura di Oggi di un viaggio: lo controlla e restituisce le notifiche da mostrare. Se il viaggio ha notifiche
 * aperte e non è quello di partenza, diventa il viaggio di partenza (con il suo storico e le sue proposte), perché la
 * pagina della proposta lavora su quello. Non solleva eccezioni: se il controllo non riesce, mostra le notifiche già note.
 */
export async function controlloAllApertura(cartella: string, chiave: string, contesto: ContestoMonitoraggio): Promise<NotificaMonitoraggio[]> {
  try {
    await controllaViaggio(cartella, chiave, contesto);
  } catch (errore) {
    console.error(`TravelOps: controllo del viaggio ${chiave} non riuscito (${(errore as Error).message})`);
  }
  try {
    return usaBaseDati(cartella, (db) => {
      const aperte = notificheAperte(db, chiave);
      const generale = leggiStatoDemo(db);
      if (aperte.length > 0 && generale.ok && generale.stato.partenza !== chiave) {
        const stato = statoDelViaggio(db, generale.stato, chiave);
        if (stato !== null) salvaStatoDemo(db, stato);
      }
      return aperte;
    });
  } catch {
    return [];
  }
}
