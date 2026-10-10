/**
 * Riassunti compatti dei dati del motore, da restituire al modello (ST-ORCH-001B).
 *
 * Ogni nome che arriva al modello viene dal catalogo dell'istantanea (attività, luoghi, zone) o dal motore
 * (spiegazioni, avvisi, problemi): qui non si scrive mai un luogo (REQ-ORCH-001 CA-2). Gli `id` restano accanto ai
 * nomi perché il modello li deve ripassare agli strumenti (modifiche, imprevisti).
 */
import type {
  BozzaItinerario,
  Elemento,
  IstantaneaCatalogo,
  Mezzo,
  Problema,
  Proposta,
  Viaggio,
} from "@travelops/engine";

/** Il mezzo in parole semplici. */
export const TESTO_MEZZO: Readonly<Record<Mezzo, string>> = {
  piedi: "a piedi",
  mezzi_pubblici: "mezzi pubblici",
  treno: "treno",
  auto: "auto",
  volo: "volo",
};

/** Un elemento del programma di un giorno, come lo vede il modello. */
export type VoceProgramma =
  | {
      id: string;
      dalle: string;
      alle: string;
      attivita: string;
      attivitaId: string;
      luogoId: string;
      priorita?: string;
      orarioFisso?: true;
      prenotata?: true;
    }
  | { id: string; dalle: string; alle: string; spostamento: string; mezzo: string; orarioFisso?: true; prenotata?: true };

export interface GiornoRiassunto {
  data: string;
  programma: VoceProgramma[];
  perche?: string;
}

/** Nomi di attività e luoghi dell'istantanea, per `id`. */
export interface Nomi {
  attivita(id: string): { nome: string; luogoId: string } | undefined;
  luogo(id: string): string;
}

export function nomiDi(istantanea: IstantaneaCatalogo): Nomi {
  const attivita = new Map(istantanea.attivita.map((a) => [a.id, { nome: a.nome, luogoId: a.luogoId }]));
  const luoghi = new Map(istantanea.luoghi.map((l) => [l.id, l.nome]));
  return {
    attivita: (id) => attivita.get(id),
    luogo: (id) => luoghi.get(id) ?? id,
  };
}

export function voce(elemento: Elemento, nomi: Nomi): VoceProgramma {
  const extra = {
    ...(elemento.orarioFisso === true ? { orarioFisso: true as const } : {}),
    ...(elemento.prenotazione !== undefined ? { prenotata: true as const } : {}),
  };
  if (elemento.tipo === "spostamento") {
    return {
      id: elemento.id,
      dalle: elemento.inizio,
      alle: elemento.fine,
      spostamento: `${nomi.luogo(elemento.da)} → ${nomi.luogo(elemento.a)}`,
      mezzo: TESTO_MEZZO[elemento.mezzo],
      ...extra,
    };
  }
  const attivita = nomi.attivita(elemento.attivitaId);
  return {
    id: elemento.id,
    dalle: elemento.inizio,
    alle: elemento.fine,
    attivita: attivita?.nome ?? elemento.attivitaId,
    attivitaId: elemento.attivitaId,
    luogoId: attivita?.luogoId ?? "",
    ...(elemento.priorita !== undefined && elemento.priorita !== "desiderata" ? { priorita: elemento.priorita } : {}),
    ...extra,
  };
}

/** Il programma giorno per giorno di un viaggio. */
export function giorniDi(viaggio: Viaggio, nomi: Nomi, perche?: ReadonlyMap<string, string>): GiornoRiassunto[] {
  return viaggio.giorni.map((giorno) => {
    const motivo = perche?.get(giorno.data);
    return {
      data: giorno.data,
      programma: giorno.elementi.map((e) => voce(e, nomi)),
      ...(motivo === undefined ? {} : { perche: motivo }),
    };
  });
}

/** Il viaggio in breve: date, alloggio e programma. */
export function riassuntoViaggio(viaggio: Viaggio, istantanea: IstantaneaCatalogo, perche?: ReadonlyMap<string, string>) {
  const nomi = nomiDi(istantanea);
  const alloggio = viaggio.giorni.find((g) => g.alloggio !== undefined)?.alloggio;
  return {
    titolo: viaggio.titolo,
    dal: viaggio.dataInizio,
    al: viaggio.dataFine,
    ...(alloggio === undefined ? {} : { alloggio: nomi.luogo(alloggio) }),
    giorni: giorniDi(viaggio, nomi, perche),
  };
}

/** I problemi in breve: solo gravità e messaggio del motore. */
export function problemiInBreve(problemi: readonly Problema[]): { gravita: string; messaggio: string }[] {
  return problemi.map((p) => ({ gravita: p.gravita, messaggio: p.messaggio }));
}

/** La bozza generata in breve, con le frasi "perché te lo propongo" del motore. */
export function riassuntoBozza(bozza: BozzaItinerario, istantanea: IstantaneaCatalogo) {
  const perche = new Map(bozza.giorni.map((g) => [g.data, g.perche]));
  return {
    destinazione: istantanea.destinazione,
    fattibile: bozza.fattibile,
    spiegazione: bozza.spiegazione,
    ...(bozza.avvisi.length === 0 ? {} : { avvisi: bozza.avvisi }),
    ...riassuntoViaggio(bozza.viaggio, istantanea, perche),
  };
}

/** Una proposta del motore in breve: che cosa cambia, se è fattibile e la spiegazione. */
export function riassuntoProposta(numero: number, proposta: Proposta, istantanea: IstantaneaCatalogo) {
  const nomi = nomiDi(istantanea);
  return {
    propostaId: numero,
    versioneBase: proposta.versioneBase,
    fattibile: proposta.fattibile,
    spiegazione: proposta.spiegazione,
    cambiamenti: {
      aggiunti: proposta.modifiche.aggiunti.map((e) => voce(e, nomi)),
      rimossi: proposta.modifiche.rimossi.map((e) => voce(e, nomi)),
      modificati: proposta.modifiche.modificati.map((m) => ({ prima: voce(m.prima, nomi), dopo: voce(m.dopo, nomi) })),
    },
    ...(proposta.problemi.length === 0 ? {} : { problemi: problemiInBreve(proposta.problemi) }),
    ...(proposta.alternative.length === 0 ? {} : { linkUtili: proposta.alternative.map((a) => ({ etichetta: a.etichetta, indirizzo: a.indirizzo })) }),
    nota: "È solo una proposta: il viaggio cambia quando il viaggiatore la accetta con il pulsante.",
  };
}
