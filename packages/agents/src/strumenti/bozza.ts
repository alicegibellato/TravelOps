/**
 * Le operazioni sulla bozza per gli agenti (REQ-PLAN-003, CA-1 e CA-3).
 *
 * Le regole sono quelle del motore (`applicaOperazioneBozza`, `confermaBozza`): qui c'è solo la porta `OperatoreBozza`
 * con cui gli strumenti della chat eseguono le stesse operazioni dei pulsanti. La web app collega la porta al proprio
 * servizio della bozza (lo stesso delle azioni dei pulsanti); senza porta, `creaOperatoreDaArchivio` applica le
 * stesse funzioni del motore sull'`ArchivioViaggio`, con le stesse cause delle revisioni.
 */
import {
  applicaOperazioneBozza,
  confermaBozza,
  ricostruisciStatoBozza,
  validaProfilo,
  type BozzaProfilo,
  type ContestoBozza,
  type IstantaneaCatalogo,
  type OperazioneBozza,
  type ProfiloPreferenze,
  type SorgenteDatiContesto,
  type StatoBozza,
  type StileViaggio,
} from "@travelops/engine";
import type { ArchivioViaggio, ForseAsincrono } from "./archivio.js";

/** Le preferenze che si cambiano da «Cambia preferenze»: ritmo e stili. */
export interface CambioPreferenzeBozza {
  readonly ritmo?: NonNullable<BozzaProfilo["ritmo"]>;
  readonly stili?: readonly StileViaggio[];
}

/** L'esito di un'operazione: il messaggio per il viaggiatore, già in parole semplici. */
export type EsitoOperatoreBozza = { readonly ok: true; readonly messaggio: string | null } | { readonly ok: false; readonly messaggio: string };

/** Ciò che gli strumenti della chat chiedono alla bozza: le stesse operazioni dei pulsanti. */
export interface OperatoreBozza {
  /** Una qualsiasi operazione sulla bozza non confermata (crea una revisione). */
  opera(operazione: OperazioneBozza): ForseAsincrono<EsitoOperatoreBozza>;
  /** «Cambia preferenze»: ritmo e stili del profilo, poi rigenera tenendo le attività bloccate. */
  cambiaPreferenze(cambio: CambioPreferenzeBozza): ForseAsincrono<EsitoOperatoreBozza>;
  /** «Conferma l'itinerario»: l'ultima revisione diventa la versione 1. */
  conferma(): ForseAsincrono<EsitoOperatoreBozza>;
}

export const NESSUNA_BOZZA = "Non c'è ancora una bozza: generala con genera_bozza.";
export const CONFERMATO = "Buon viaggio!";

/** Lo stato della bozza e il suo contesto, ricostruiti dall'archivio; il motivo (testo) se non si può. */
export async function leggiStatoBozza(
  archivio: ArchivioViaggio,
  istantanea: IstantaneaCatalogo,
  contestoDi: (istantanea: IstantaneaCatalogo) => SorgenteDatiContesto,
): Promise<{ contesto: ContestoBozza; stato: StatoBozza; profilo: ProfiloPreferenze } | string> {
  const revisioni = await archivio.leggiRevisioniBozza();
  if (revisioni.length === 0) return NESSUNA_BOZZA;
  const esito = validaProfilo((await archivio.leggiProfilo()) ?? {}, { catalogo: istantanea });
  if (!esito.ok) return `Il profilo non è completo: ${esito.problemi.map((p) => p.testo).join(" ")} Usa aggiorna_profilo.`;
  const contesto: ContestoBozza = { istantanea, opzioni: { sorgente: contestoDi(istantanea) } };
  const stato = ricostruisciStatoBozza(
    contesto,
    revisioni.map((r) => ({ numero: r.numero, causa: r.causa, viaggio: r.viaggio, profilo: esito.profilo })),
  );
  return { contesto, stato, profilo: esito.profilo };
}

/**
 * L'operatore sull'archivio del viaggio: stesse funzioni del motore dei pulsanti, stesse cause. Il profilo è quello
 * del viaggio per tutte le revisioni.
 */
export function creaOperatoreDaArchivio(opzioni: {
  archivio: ArchivioViaggio;
  /** L'istantanea del viaggio o il motivo per cui manca. */
  istantanea: () => Promise<IstantaneaCatalogo | string>;
  contestoDi: (istantanea: IstantaneaCatalogo) => SorgenteDatiContesto;
}): OperatoreBozza {
  const { archivio } = opzioni;

  async function carica() {
    const istantanea = await opzioni.istantanea();
    if (typeof istantanea === "string") return istantanea;
    return await leggiStatoBozza(archivio, istantanea, opzioni.contestoDi);
  }

  async function applica(operazione: OperazioneBozza, profiloNuovo?: BozzaProfilo): Promise<EsitoOperatoreBozza> {
    const caricata = await carica();
    if (typeof caricata === "string") return { ok: false, messaggio: caricata };
    const esito = applicaOperazioneBozza(caricata.stato, caricata.contesto, operazione);
    if (!esito.ok) return { ok: false, messaggio: esito.motivo };
    const { numero, causa, viaggio } = esito.revisione;
    await archivio.aggiungiRevisioneBozza(causa, viaggio);
    if (profiloNuovo !== undefined) await archivio.salvaProfilo(profiloNuovo);
    return { ok: true, messaggio: `B${numero}: ${causa}` };
  }

  return {
    opera: (operazione) => applica(operazione),

    async cambiaPreferenze(cambio) {
      const istantanea = await opzioni.istantanea();
      if (typeof istantanea === "string") return { ok: false, messaggio: istantanea };
      const attuale = (await archivio.leggiProfilo()) ?? {};
      const nuova: BozzaProfilo = {
        ...attuale,
        ...(cambio.ritmo === undefined ? {} : { ritmo: cambio.ritmo }),
        ...(cambio.stili === undefined || cambio.stili.length === 0 ? {} : { stili: [...cambio.stili] }),
      };
      const validato = validaProfilo(nuova, { catalogo: istantanea });
      if (!validato.ok) return { ok: false, messaggio: validato.problemi.map((p) => p.testo).join(" ") };
      return await applica({ tipo: "cambia_preferenze", profilo: validato.profilo }, nuova);
    },

    async conferma() {
      const caricata = await carica();
      if (typeof caricata === "string") return { ok: false, messaggio: caricata };
      const esito = confermaBozza(caricata.stato);
      if (!esito.ok) return { ok: false, messaggio: esito.motivo };
      await archivio.salvaStorico(esito.storico);
      const scheda = await archivio.leggiScheda();
      if (scheda !== null) await archivio.salvaScheda({ ...scheda, stato: "confermato" });
      return { ok: true, messaggio: CONFERMATO };
    },
  };
}
