/**
 * I viaggi demo della CR-001 §8.3 (REQ-DEMO-001): TRIP-DEMO-GARDA, TRIP-DEMO-DOLOMITI e TRIP-DEMO-ROMA, costruiti dal
 * generatore del motore (`generaBozza`) con i profili PR-1, PR-2 e PR-3 sulle istantanee precaricate. Le specifiche
 * (profilo, collegamenti a orario fisso, luoghi aggiunti) stanno in `packages/engine/data/reference/viaggi-demo.json`:
 * qui non c'è nessun dato del viaggio, solo il montaggio.
 */
import specifiche from "@travelops/engine/data/reference/viaggi-demo.json";
import {
  applicaOperazioneBozza,
  avviaBozza,
  revisioneCorrente,
  caricaViaggio,
  controllaFattibilita,
  creaSorgenteDaDati,
  creaStorico,
  validaProfilo,
  type Catalogo,
  type Elemento,
  type IstantaneaCatalogo,
  type Viaggio,
} from "@travelops/engine";
import {
  aggiungiRevisioneBozza,
  eliminaViaggio,
  inTransazione,
  leggiIstantanea,
  salvaIstantanea,
  salvaProfilo,
  salvaStoricoDelViaggio,
  salvaViaggio,
  scriviImpostazione,
  type BaseDati,
  type StatoViaggio,
} from "../basedati";
import { CHIAVE_DATI_BOZZA } from "../bozza/chiavi";

export interface CollegamentoDemo {
  data: string;
  da: string;
  a: string;
  mezzo: "volo" | "treno";
  inizio: string;
  fine: string;
  /** Durata del collegamento in minuti. */
  minuti: number;
  fornitore: string;
  codice: string;
  linkGestione: string;
}

export interface SpecificaViaggioDemo {
  id: string;
  titolo: string;
  stato: StatoViaggio;
  /** Identificativo dell'istantanea precaricata su cui si costruisce. */
  istantanea: string;
  profilo: Record<string, unknown>;
  arrivo?: string;
  partenza?: string;
  /** Attività impegnativa del sabato mattina (serve alla demo della pioggia e dell'infortunio). */
  attivitaBloccata?: { data: string; attivitaId: string; inizio: string };
  /** Tipi di luogo da togliere dall'istantanea derivata, perché arrivo e partenza passino dal collegamento a orario fisso. */
  togliTipi?: string[];
  luoghiAggiunti: Record<string, unknown>[];
  zoneAggiunte: Record<string, unknown>[];
  /** Minuti in auto tra ogni alloggio e i luoghi aggiunti. */
  minutiDagliAlloggi: Record<string, number>;
  collegamenti: CollegamentoDemo[];
}

/** Le specifiche dei viaggi demo (JSON del motore, incluso nella build). */
export function leggiSpecificheDemo(): SpecificaViaggioDemo[] {
  return (specifiche as unknown as { viaggi: SpecificaViaggioDemo[] }).viaggi;
}

/**
 * Il suffisso dell'istantanea derivata (la base più i luoghi dei collegamenti): l'istantanea precaricata non cambia e
 * quella derivata serve solo al viaggio demo, non compare tra le destinazioni da scegliere.
 */
export const SUFFISSO_ISTANTANEA_DEMO = "-demo";

/** L'istantanea precaricata più i luoghi, le zone e i tempi dei collegamenti della specifica. */
export function istantaneaDemo(base: IstantaneaCatalogo, spec: SpecificaViaggioDemo): IstantaneaCatalogo {
  const tolti = new Set(spec.togliTipi ?? []);
  const luoghiTolti = new Set(base.luoghi.filter((l) => tolti.has(l.tipo)).map((l) => l.id));
  const tempi = base.tempiPercorrenza.filter((t) => !luoghiTolti.has(t.da) && !luoghiTolti.has(t.a));
  for (const alloggio of base.luoghi.filter((l) => l.tipo === "alloggio")) {
    for (const [id, minuti] of Object.entries(spec.minutiDagliAlloggi)) {
      tempi.push({ da: alloggio.id, a: id, mezzo: "auto", minuti });
    }
  }
  for (const c of spec.collegamenti) {
    const presente = tempi.some((t) => t.mezzo === c.mezzo && ((t.da === c.da && t.a === c.a) || (t.da === c.a && t.a === c.da)));
    if (!presente) tempi.push({ da: c.da, a: c.a, mezzo: c.mezzo, minuti: c.minuti });
  }
  return {
    ...base,
    id: base.id + SUFFISSO_ISTANTANEA_DEMO,
    luoghi: [...base.luoghi.filter((l) => !luoghiTolti.has(l.id)), ...(spec.luoghiAggiunti as unknown as IstantaneaCatalogo["luoghi"])],
    zone: [...base.zone, ...(spec.zoneAggiunte as unknown as IstantaneaCatalogo["zone"])],
    tempiPercorrenza: tempi,
  };
}


/** Aggiunge i collegamenti a orario fisso (voli, treni) in testa o in coda al giorno, con la prenotazione di esempio. */
function conCollegamenti(viaggio: Viaggio, collegamenti: readonly CollegamentoDemo[]): Viaggio {
  const giorni = viaggio.giorni.map((g, indice) => {
    let prossimo = g.elementi.reduce((massimo, e) => Math.max(massimo, Number(/-E(\d+)$/.exec(e.id)?.[1] ?? 0)), 0) + 1;
    const prima = collegamenti.filter((c) => c.data === g.data && c.inizio < (g.elementi[0]?.inizio ?? "99:99"));
    const dopo = collegamenti.filter((c) => c.data === g.data && !prima.includes(c));
    const elemento = (c: CollegamentoDemo): Elemento =>
      ({
        id: `D${indice + 1}-E${prossimo++}`,
        inizio: c.inizio,
        fine: c.fine,
        tipo: "spostamento",
        da: c.da,
        a: c.a,
        mezzo: c.mezzo,
        orarioFisso: true,
        prenotazione: { fornitore: c.fornitore, codice: c.codice, linkGestione: c.linkGestione },
      }) as Elemento;
    return {
      ...g,
      ...(prima.length > 0 ? { luogoPartenza: prima[0]!.da } : {}),
      elementi: [...prima.map(elemento), ...g.elementi, ...dopo.map(elemento)],
    };
  });
  return { ...viaggio, giorni };
}

/** Costruisce il viaggio demo dalla specifica: lancia se l'istantanea precaricata manca o il viaggio non è valido. */
export function costruisciViaggioDemo(spec: SpecificaViaggioDemo, base: IstantaneaCatalogo): { viaggio: Viaggio; istantanea: IstantaneaCatalogo; profilo: ReturnType<typeof validaProfilo> & { ok: true } } {
  const istantanea = istantaneaDemo(base, spec);
  const validato = validaProfilo(spec.profilo as never);
  if (!validato.ok) throw new Error(`profilo del viaggio demo ${spec.id} non valido`);
  const contestoBozza = {
    istantanea,
    opzioni: {
      idViaggio: spec.id,
      titolo: spec.titolo,
      arrivoEPartenza: true,
      ...(spec.arrivo === undefined ? {} : { orarioArrivo: spec.arrivo }),
      ...(spec.partenza === undefined ? {} : { orarioPartenza: spec.partenza }),
      ...(spec.attivitaBloccata === undefined ? {} : { mantieni: [{ data: spec.attivitaBloccata.data, attivitaId: spec.attivitaBloccata.attivitaId }] }),
    },
  };
  let corrente = avviaBozza(validato.profilo, contestoBozza);
  if (spec.attivitaBloccata !== undefined) {
    // L'attività impegnativa entra nel suo giorno (`mantieni`); poi, con le operazioni del motore, si porta al mattino
    // e si toglie il lucchetto: serve alla demo, dove la pioggia e la caviglia la sostituiscono.
    const { data, attivitaId } = spec.attivitaBloccata;
    const elemento = revisioneCorrente(corrente).viaggio.giorni.flatMap((g) => g.elementi).find((e) => e.tipo === "attivita" && e.attivitaId === attivitaId);
    if (elemento === undefined) throw new Error(`il viaggio demo ${spec.id} non contiene l'attività ${attivitaId}`);
    for (const operazione of [
      { tipo: "sposta", elementoId: elemento.id, data, inizio: spec.attivitaBloccata.inizio },
      { tipo: "sblocca", elementoId: elemento.id },
    ] as const) {
      const esito = applicaOperazioneBozza(corrente, contestoBozza, operazione);
      if (!esito.ok) throw new Error(`il viaggio demo ${spec.id}: ${esito.motivo}`);
      corrente = esito.stato;
    }
  }
  let viaggio = revisioneCorrente(corrente).viaggio;
  viaggio = conCollegamenti(viaggio, spec.collegamenti);
  const caricato = caricaViaggio(JSON.parse(JSON.stringify(viaggio)));
  if (!caricato.ok) throw new Error(`il viaggio demo ${spec.id} non è valido: ${caricato.errori.map((e) => e.messaggio).join("; ")}`);
  return { viaggio: caricato.valore, istantanea, profilo: validato as never };
}

/** Verifica di fattibilità del viaggio demo (per i test): problemi bloccanti. */
export function problemiDelViaggioDemo(viaggio: Viaggio, istantanea: IstantaneaCatalogo) {
  const sorgente = creaSorgenteDaDati({ tempiPercorrenza: istantanea.tempiPercorrenza, previsioni: [], chiusure: [] });
  return controllaFattibilita(viaggio, istantanea as unknown as never, sorgente);
}

/**
 * Carica il viaggio demo nel suo stato iniziale (sostituendolo per intero se c'era): istantanea derivata, profilo,
 * revisione B1 della bozza e, se confermato, la versione 1 dello storico.
 */
export function caricaViaggioDemoBozza(db: BaseDati, spec: SpecificaViaggioDemo, ordine: number): boolean {
  const base = leggiIstantanea(db, spec.istantanea);
  // Senza l'istantanea precaricata (cartella delle istantanee non trovata) il viaggio non si può costruire: si salta.
  if (base === null) return false;
  const { viaggio, istantanea, profilo } = costruisciViaggioDemo(spec, base.contenuto as IstantaneaCatalogo);
  inTransazione(db, () => {
    eliminaViaggio(db, spec.id);
    salvaIstantanea(db, { id: istantanea.id, destinazione: istantanea.destinazione, contenuto: istantanea });
    salvaViaggio(db, { id: spec.id, titolo: spec.titolo, stato: spec.stato, demo: true, ordine, destinazione: istantanea.destinazione, istantanea: istantanea.id });
    salvaProfilo(db, spec.id, spec.profilo);
    aggiungiRevisioneBozza(db, spec.id, "Prima bozza", viaggio);
    let confermata: number | null = null;
    if (spec.stato === "confermato") {
      const creato = creaStorico(viaggio);
      if (!creato.ok) throw new Error(creato.errore.messaggio);
      salvaStoricoDelViaggio(db, spec.id, creato.storico);
      confermata = 1;
    }
    scriviImpostazione(db, CHIAVE_DATI_BOZZA(spec.id), { revisioni: { "1": { profilo: profilo.profilo, precedente: null } }, confermata });
  });
  return true;
}
