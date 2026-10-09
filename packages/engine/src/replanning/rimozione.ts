/**
 * Rimozione di un'attività con i suoi spostamenti di andata e ritorno (REQ-REPLAN-002 R-SOS-5, con la
 * parte di R-SOS-1 che individua spostamenti e luoghi di ingresso e uscita).
 *
 * È la stessa regola usata dalla sostituzione quando non c'è una candidata e, per REQ-EDIT-001 R-ED-3,
 * dalla rimozione chiesta dal viaggiatore: per questo vive in un modulo a sé, senza dipendere dal motivo
 * della rimozione (che resta a chi la chiama).
 */
import type { Elemento, ElementoAttivita, ElementoSpostamento, Giorno } from "../model/index.js";
import { chiedi, impostaElementi, type Lavoro } from "./lavoro.js";
import { eFisso, minuti, minutiTesto, orario, type IndiceCatalogo } from "./supporto.js";

/** Gli elementi attorno a un'attività e i luoghi in cui il viaggiatore entra ed esce (R-SOS-1). */
export interface ContornoAttivita {
  /** Lo spostamento immediatamente precedente, se è uno spostamento non a orario fisso. */
  andata: ElementoSpostamento | undefined;
  /** Lo spostamento immediatamente successivo, se è uno spostamento non a orario fisso. */
  ritorno: ElementoSpostamento | undefined;
  /** L'elemento prima dell'andata (o, senza andata, prima dell'attività). */
  precedente: Elemento | undefined;
  /** L'elemento dopo il ritorno (o, senza ritorno, dopo l'attività). */
  successivo: Elemento | undefined;
  /** Dove si trova il viaggiatore prima dell'andata (o, senza andata, prima dell'attività). */
  ingresso: string;
  /**
   * Dove va il viaggiatore dopo il ritorno: il luogo dell'elemento successivo, se no l'alloggio della notte,
   * se no l'arrivo del ritorno originale. Senza spostamento di ritorno non c'è un luogo di uscita.
   */
  uscita: string | undefined;
}

/**
 * Il contorno dell'attività in posizione `i` tra gli `elementi` (in ordine di inizio) del `giorno`.
 * Uno spostamento a orario fisso non vale come andata o ritorno: non si sposta né si rimuove (R-2).
 */
export function contornoAttivita(
  indice: IndiceCatalogo,
  giorno: Giorno,
  elementi: readonly Elemento[],
  i: number,
): ContornoAttivita {
  const mobile = (e: Elemento | undefined): e is ElementoSpostamento => e?.tipo === "spostamento" && !eFisso(e);
  const prima = elementi[i - 1];
  const dopo = elementi[i + 1];
  const andata = mobile(prima) ? prima : undefined;
  const ritorno = mobile(dopo) ? dopo : undefined;
  const precedente = andata ? elementi[i - 2] : prima;
  const successivo = ritorno ? elementi[i + 2] : dopo;
  const ingresso = andata ? andata.da : precedente ? indice.luogoFine(precedente) : giorno.luogoPartenza;
  const uscita = ritorno ? (successivo ? indice.luogoInizio(successivo) : (giorno.alloggio ?? ritorno.a)) : undefined;
  return { andata, ritorno, precedente, successivo, ingresso, uscita };
}

/**
 * R-SOS-5: rimuove l'attività `x` dal giorno `data` e unisce i due spostamenti attorno in uno solo, dal luogo
 * di ingresso a quello di uscita, con il mezzo più veloce, in partenza all'orario dell'andata originale (o,
 * senza andata, all'inizio dell'attività). Lo spostamento unico tiene l'id dell'andata (o del ritorno); se i
 * due luoghi coincidono entrambi gli spostamenti vengono rimossi; se tra i due luoghi non c'è percorso lo
 * spostamento unico non si crea e l'elemento successivo, se c'è, è a rischio.
 *
 * Registra il perché di ogni spostamento toccato; il perché della rimozione di `x` resta a chi chiama.
 */
export function rimuoviAttivitaConSpostamenti(
  lavoro: Lavoro,
  data: string,
  elementi: readonly Elemento[],
  x: ElementoAttivita,
  contorno: Pick<ContornoAttivita, "andata" | "ritorno" | "ingresso" | "uscita" | "successivo">,
): void {
  const { indice, sorgente } = lavoro;
  const { andata, ritorno, ingresso, uscita } = contorno;
  const togli = new Set([x.id]);
  const cambia = new Map<string, Elemento>();

  // Senza spostamento di ritorno non c'è un luogo di uscita: l'andata porta già dove serve.
  if (ritorno && uscita !== undefined) {
    const tenuto = andata ?? ritorno;
    const altro = andata ? ritorno : undefined;
    const partenza = minuti((andata ?? x).inizio);
    if (ingresso === uscita) {
      for (const s of [andata, ritorno]) {
        if (!s) continue;
        togli.add(s.id);
        lavoro.motivi.set(s.id, `non serve più: senza ${x.id} il viaggiatore resta a «${indice.nomeLuogo(ingresso)}»`);
      }
    } else {
      const p = sorgente.percorsoPiuVeloce(ingresso, uscita);
      if (!p) {
        for (const s of [andata, ritorno]) {
          if (!s) continue;
          togli.add(s.id);
          lavoro.motivi.set(
            s.id,
            `rimosso: non c'è un percorso noto da «${indice.nomeLuogo(ingresso)}» a «${indice.nomeLuogo(uscita)}»`,
          );
        }
        if (contorno.successivo) {
          lavoro.aRischio.set(
            contorno.successivo.id,
            `senza ${x.id} non c'è un percorso noto da «${indice.nomeLuogo(ingresso)}» a «${indice.nomeLuogo(uscita)}» per raggiungerlo`,
          );
          chiedi(lavoro, `non c'è un modo noto per raggiungere ${indice.descrivi(contorno.successivo)}: come vuoi arrivarci?`);
        }
      } else {
        cambia.set(tenuto.id, {
          ...tenuto,
          da: ingresso,
          a: uscita,
          mezzo: p.mezzo,
          inizio: orario(partenza),
          fine: orario(partenza + p.minuti),
        });
        lavoro.motivi.set(
          tenuto.id,
          `diventa un unico spostamento ${indice.tratta(ingresso, uscita, p.mezzo)}, con il mezzo più veloce (${minutiTesto(p.minuti)}), al posto dell'andata e del ritorno di ${x.id}`,
        );
        if (altro) {
          togli.add(altro.id);
          lavoro.motivi.set(altro.id, `non serve più: è unito a ${tenuto.id}`);
        }
      }
    }
  }
  impostaElementi(
    lavoro,
    data,
    elementi.flatMap((e) => (togli.has(e.id) ? [] : [cambia.get(e.id) ?? e])),
  );
}
