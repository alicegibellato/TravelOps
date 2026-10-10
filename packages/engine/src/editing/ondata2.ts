/**
 * Modifiche richieste aggiunte da REQ-EDIT-002 (CR su REQ-EDIT-001): prolunga il soggiorno (R2-PRO), accorcia il
 * viaggio (R2-ACC), cambia ritmo di un giorno (R2-RIT), rigenera un giorno (R2-RIG). Ognuna diventa una proposta
 * con le stesse garanzie delle modifiche di REQ-EDIT-001 (controllo di fattibilità, spiegazione, alternative,
 * accettazione con lo storico) e dichiara il livello di ripianificazione (§7.6).
 *
 * Le regole esatte sono quelle fissate nel contratto della storia ST-EDIT-002. Deterministica: nessun orologio,
 * nessuna casualità, nessuna rete; il viaggio ricevuto non viene modificato.
 */
import { controllaFattibilita, eFattibile } from "../feasibility/index.js";
import { confrontaItinerari } from "../history/index.js";
import type {
  AttivitaCatalogo,
  Catalogo,
  Data,
  Elemento,
  ElementoAttivita,
  LivelloRipianificazione,
  ModificaOndata2,
  ModificaRichiesta,
  Modifiche,
  Orario,
  Priorita,
  Problema,
  Proposta,
  RitmoGiorno,
  SorgenteDatiContesto,
  Viaggio,
} from "../model/index.js";
import { costruisciAlternative } from "../replanning/alternative.js";
import { creaLavoro, elementiDel, type Lavoro } from "../replanning/lavoro.js";
import {
  confronta,
  copiaDati,
  eFisso,
  giornoDi,
  minuti,
  orariDi,
  orario,
  prioritaDi,
  trovaElemento,
} from "../replanning/supporto.js";
import { giorniTesto, piuGiorni } from "./date.js";
import { erroreModifica, type CodiceErroreModifica } from "./errori.js";
import { colloca, togli, type DaCollocare } from "./operazioni.js";
import { scriviSpiegazioneModifica } from "./spiegazione.js";

/** Codici di errore aggiunti da REQ-EDIT-002; valgono anche quelli di R-ED-1 (per esempio `GIORNO_INESISTENTE`). */
export const CODICI_ERRORE_ONDATA2 = ["GIORNI_NON_VALIDI", "NESSUNA_ATTIVITA"] as const;

export type CodiceErroreOndata2 = CodiceErroreModifica | (typeof CODICI_ERRORE_ONDATA2)[number];

/** Errore di una modifica di REQ-EDIT-002: non nasce nessuna proposta. */
export interface ErroreModificaOndata2 {
  codice: CodiceErroreOndata2;
  motivo: string;
  /** Messaggio completo: `[CODICE] motivo`. */
  messaggio: string;
}

/** Problema bloccante di R2-PRO e R2-ACC: un elemento a orario fisso resta fuori dalle nuove date del viaggio. */
export const PROBLEMA_ORARIO_FISSO_DA_RIPROGRAMMARE = "ORARIO_FISSO_DA_RIPROGRAMMARE";

/** Massimo dei giorni che si possono aggiungere con una sola richiesta. */
export const GIORNI_MASSIMI_PROLUNGA = 30;

/** Orario da cui riempire una giornata vuota (R2-RIT "più piena" su un giorno senza elementi). */
export const INIZIO_GIORNATA_VUOTA = "09:00";

/**
 * Origine di una proposta di REQ-EDIT-002. Il modello (`OrigineProposta`) ammette solo le operazioni di
 * REQ-EDIT-001 e `src/history` è fuori dal perimetro di questa storia: la modifica viaggia qui con una conversione
 * di tipo, mentre la causa della versione usa sempre `descrizione` (`causaVersione`), mai la modifica.
 * La modifica tipizzata è in `PropostaModificaOndata2.modificaOndata2`.
 */
export interface OrigineModificaOndata2 {
  tipo: "modifica";
  modifica: ModificaRichiesta;
  /** Per esempio "prolunga il soggiorno di 1 giorno dopo il 2026-06-13". */
  descrizione: string;
}

export interface PropostaModificaOndata2 extends Proposta {
  origine: OrigineModificaOndata2;
  livello: LivelloRipianificazione;
  /** La modifica richiesta, con il suo tipo. */
  modificaOndata2: ModificaOndata2;
}

export type EsitoModificaOndata2 =
  | { ok: true; proposta: PropostaModificaOndata2 }
  | { ok: false; errore: ErroreModificaOndata2 };

function errore(codice: CodiceErroreOndata2, motivo: string): ErroreModificaOndata2 {
  return { codice, motivo, messaggio: `[${codice}] ${motivo}` };
}

/** Un elemento a orario fisso (o lo spostamento che lo raggiunge) rimasto nella sua data, da riprogrammare. */
interface DaRiprogrammare {
  elemento: Elemento;
  /** La data in cui resta. */
  data: Data;
  /** La data che corrisponde alle nuove date del viaggio: lì vanno cercate le alternative. */
  nuovaData: Data;
}

interface Applicata {
  livello: LivelloRipianificazione;
  daRiprogrammare: DaRiprogrammare[];
}

/** La descrizione della modifica, la stessa della causa della versione. */
export function descriviModificaOndata2(modifica: ModificaOndata2): string {
  switch (modifica.operazione) {
    case "prolunga":
      return `prolunga il soggiorno di ${giorniTesto(modifica.giorni)} dopo il ${modifica.dopo}`;
    case "accorcia":
      return `accorcia il viaggio di ${giorniTesto(modifica.giorni)}`;
    case "cambia_ritmo":
      return `giornata ${modifica.ritmo === "piu_leggero" ? "più leggera" : "più piena"} il ${modifica.data}`;
    case "rigenera_giorno":
      return `rigenera la giornata del ${modifica.data}`;
  }
}

/**
 * Propone una modifica di REQ-EDIT-002.
 *
 * @param viaggio il viaggio della versione corrente (non viene modificato).
 * @param versioneBase il numero della versione corrente, su cui la proposta è costruita.
 * @param catalogo zone, luoghi e attività.
 * @param sorgente dati di contesto: tempi di percorrenza, meteo, chiusure.
 * @param modifica la modifica richiesta.
 */
export function proponiModificaOndata2(
  viaggio: Viaggio,
  versioneBase: number,
  catalogo: Catalogo,
  sorgente: SorgenteDatiContesto,
  modifica: ModificaOndata2,
): EsitoModificaOndata2 {
  const originale = copiaDati(viaggio);
  const lavoro = creaLavoro(originale, copiaDati(originale), catalogo, sorgente);
  const esito = applica(lavoro, modifica);
  if ("codice" in esito) return { ok: false, errore: esito };

  const itinerario = lavoro.viaggio;
  const differenza = confrontaItinerari(originale, itinerario);
  const modifiche: Modifiche = {
    aggiunti: differenza.aggiunti.map((v) => v.elemento),
    rimossi: differenza.rimossi.map((v) => v.elemento),
    modificati: differenza.modificati.map((m) => ({ id: m.id, prima: m.prima.elemento, dopo: m.dopo.elemento })),
  };

  // Controllo di REQ-FEAS-001, più il problema bloccante degli elementi a orario fisso rimasti fuori dalle nuove date.
  const problemi: Problema[] = [...controllaFattibilita(itinerario, catalogo, sorgente)];
  if (esito.daRiprogrammare.length > 0) {
    const ids = esito.daRiprogrammare.map((r) => r.elemento.id);
    const nuove = [...new Set(esito.daRiprogrammare.map((r) => r.nuovaData))];
    problemi.unshift({
      codice: PROBLEMA_ORARIO_FISSO_DA_RIPROGRAMMARE,
      gravita: "bloccante",
      elementi: ids,
      messaggio:
        `${ids.join(" e ")} ${ids.length === 1 ? "resta" : "restano"} nella data originale (a orario fisso o legato a un ` +
        `elemento a orario fisso), ma con le nuove date del viaggio andrebbe riprogrammato per il ${nuove.join(" e ")}: ` +
        "TravelOps non modifica le prenotazioni",
    });
  }
  const fattibile = eFattibile(problemi);

  // Elementi a rischio (modello-dominio.md §2.6): quelli rimasti fuori dalle nuove date e, se la proposta non è
  // fattibile, quelli dei problemi bloccanti.
  const perche = new Map<string, string[]>();
  const segnala = (id: string, motivo: string): void => {
    const elenco = perche.get(id) ?? [];
    if (!elenco.includes(motivo)) elenco.push(motivo);
    perche.set(id, elenco);
  };
  for (const [id, motivo] of lavoro.aRischio) segnala(id, motivo);
  if (!fattibile) {
    for (const problema of problemi) {
      if (problema.gravita !== "bloccante" || problema.codice === PROBLEMA_ORARIO_FISSO_DA_RIPROGRAMMARE) continue;
      for (const id of problema.elementi) segnala(id, `${problema.codice}: ${problema.messaggio.replace(/\.$/, "")}`);
    }
  }
  const aRischio = [...perche.entries()]
    .flatMap(([id, motivi]) => {
      const trovato = trovaElemento(itinerario, id);
      return trovato ? [{ data: trovato.giorno.data, elemento: trovato.elemento, perche: motivi }] : [];
    })
    .sort(perPosizione);

  // Le alternative degli elementi da riprogrammare cercano la nuova data; le altre la data in cui sono.
  const nuovaData = new Map(esito.daRiprogrammare.map((r) => [r.elemento.id, r.nuovaData]));
  const alternative = costruisciAlternative(
    aRischio.map((r) => ({ data: nuovaData.get(r.elemento.id) ?? r.data, elemento: r.elemento })),
    lavoro.indice,
  );

  const descrizione = descriviModificaOndata2(modifica);
  const spiegazione = scriviSpiegazioneModifica(
    {
      modifica,
      livello: esito.livello,
      descrizione,
      originale,
      differenza,
      motivi: lavoro.motivi,
      note: lavoro.note,
      fattibile,
      problemi,
      aRischio,
      alternative,
      domande: [
        ...lavoro.domande,
        ...(!fattibile && lavoro.domande.length === 0
          ? ["la proposta non è fattibile: vuoi accettarla comunque, rifiutarla o chiedere una modifica diversa?"]
          : []),
      ],
    },
    lavoro.indice,
  );

  return {
    ok: true,
    proposta: {
      versioneBase,
      // Vedi `OrigineModificaOndata2`: la causa della versione usa la descrizione.
      origine: { tipo: "modifica", modifica: copiaDati(modifica) as unknown as ModificaRichiesta, descrizione },
      livello: esito.livello,
      modificaOndata2: copiaDati(modifica),
      impatto: { elementiColpiti: [] },
      modifiche,
      itinerario,
      spiegazione,
      fattibile,
      problemi,
      elementiARischio: aRischio.map((r) => r.elemento.id),
      alternative,
    },
  };
}

function applica(lavoro: Lavoro, modifica: ModificaOndata2): Applicata | ErroreModificaOndata2 {
  switch (modifica.operazione) {
    case "prolunga":
      return prolunga(lavoro, modifica.dopo, modifica.giorni);
    case "accorcia":
      return accorcia(lavoro, modifica.giorni);
    case "cambia_ritmo":
      return cambiaRitmo(lavoro, modifica.data, modifica.ritmo);
    case "rigenera_giorno":
      return rigeneraGiorno(lavoro, modifica.data);
  }
}

// Elementi bloccati: a orario fisso, con lo spostamento che li raggiunge

/**
 * Gli elementi a orario fisso del giorno e, per ciascuno, lo spostamento immediatamente precedente che porta al
 * suo luogo di partenza (per esempio il trasferimento all'aeroporto prima del volo): restano insieme.
 */
function bloccati(lavoro: Lavoro, elementi: readonly Elemento[]): Set<string> {
  const ids = new Set<string>();
  elementi.forEach((e, i) => {
    if (!eFisso(e)) return;
    ids.add(e.id);
    const prima = elementi[i - 1];
    if (prima?.tipo === "spostamento" && !eFisso(prima) && prima.a === lavoro.indice.luogoInizio(e) && minuti(prima.fine) <= minuti(e.inizio)) {
      ids.add(prima.id);
    }
  });
  return ids;
}

function motivoBloccato(lavoro: Lavoro, elemento: Elemento, fissi: readonly Elemento[], data: Data, nuovaData: Data): string {
  if (eFisso(elemento)) {
    return (
      `è a orario fisso: resta il ${data} ${orariDi(elemento)}, mentre con le nuove date andrebbe il ${nuovaData}; ` +
      "va riprogrammato con il fornitore (TravelOps non modifica le prenotazioni)"
    );
  }
  const servito = fissi.find((f) => eFisso(f) && lavoro.indice.luogoInizio(f) === (elemento.tipo === "spostamento" ? elemento.a : ""));
  return `porta a ${servito ? lavoro.indice.descrivi(servito) : "un elemento a orario fisso"}, a orario fisso: resta con lui il ${data}`;
}

function giorniValidi(n: number, massimo: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= massimo;
}

// R2-PRO Prolunga il soggiorno

function prolunga(lavoro: Lavoro, dopo: Data, n: number): Applicata | ErroreModificaOndata2 {
  const viaggio = lavoro.viaggio;
  if (!giorniValidi(n, GIORNI_MASSIMI_PROLUNGA)) {
    return errore("GIORNI_NON_VALIDI", `si può prolungare di un numero intero di giorni da 1 a ${GIORNI_MASSIMI_PROLUNGA}, non di ${n}`);
  }
  const i = viaggio.giorni.findIndex((g) => g.data === dopo);
  if (i < 0) {
    return erroreModifica("GIORNO_INESISTENTE", `il ${dopo} non è un giorno del viaggio (dal ${viaggio.dataInizio} al ${viaggio.dataFine})`);
  }
  const base = viaggio.giorni[i]!;
  // L'alloggio delle notti in più: quello del giorno indicato; se è l'ultimo giorno (senza alloggio), dove inizia.
  const alloggio = base.alloggio ?? base.luogoPartenza;
  const liberi = Array.from({ length: n }, (_, k) => ({
    data: piuGiorni(dopo, k + 1),
    luogoPartenza: alloggio,
    alloggio,
    elementi: [] as Elemento[],
  }));
  const seguenti = viaggio.giorni.slice(i + 1);
  const daRiprogrammare: DaRiprogrammare[] = [];
  const giorni = [
    ...viaggio.giorni.slice(0, i),
    // L'ultimo giorno non aveva alloggio: con i giorni in più lo prende.
    { ...base, alloggio },
    ...liberi,
    ...seguenti.map((g) => ({ ...g, data: piuGiorni(g.data, n), elementi: [...g.elementi] })),
  ];
  for (const g of seguenti) {
    const nuova = piuGiorni(g.data, n);
    const fermi = bloccati(lavoro, g.elementi);
    for (const e of g.elementi) {
      if (fermi.has(e.id)) {
        daRiprogrammare.push({ elemento: e, data: g.data, nuovaData: nuova });
        lavoro.aRischio.set(e.id, motivoBloccato(lavoro, e, g.elementi, g.data, nuova));
      } else {
        lavoro.motivi.set(e.id, `slitta di ${giorniTesto(n)} con il resto del viaggio: dal ${g.data} al ${nuova}`);
      }
    }
    const spostato = giorni.find((x) => x.data === nuova)!;
    spostato.elementi = spostato.elementi.filter((e) => !fermi.has(e.id));
    const rimasto = giorni.find((x) => x.data === g.data)!;
    rimasto.elementi = ordina([...rimasto.elementi, ...g.elementi.filter((e) => fermi.has(e.id))]);
  }
  // Se si prolunga dopo l'ultimo giorno, l'ultimo dei giorni liberi è il nuovo ultimo giorno: senza alloggio.
  if (seguenti.length === 0) delete giorni.at(-1)!.alloggio;
  lavoro.viaggio = { ...viaggio, dataFine: piuGiorni(viaggio.dataFine, n), giorni };
  const date = liberi.map((g) => g.data);
  lavoro.note.push(
    `${date.length === 1 ? "Nuovo giorno libero" : "Nuovi giorni liberi"} il ${date.join(", il ")}, con l'alloggio ` +
      `«${lavoro.indice.nomeLuogo(alloggio)}»: ${date.length === 1 ? "si può riempire" : "si possono riempire"} con «Riempi questo giorno». ` +
      `Il viaggio ora finisce il ${piuGiorni(viaggio.dataFine, n)}.`,
  );
  return { livello: "resto", daRiprogrammare };
}

// R2-ACC Accorcia il viaggio

function accorcia(lavoro: Lavoro, n: number): Applicata | ErroreModificaOndata2 {
  const viaggio = lavoro.viaggio;
  if (!giorniValidi(n, viaggio.giorni.length - 1)) {
    return errore(
      "GIORNI_NON_VALIDI",
      `si può accorciare di un numero intero di giorni da 1 a ${viaggio.giorni.length - 1} (il viaggio ha ${giorniTesto(viaggio.giorni.length)}), non di ${n}`,
    );
  }
  const restano = viaggio.giorni.slice(0, -n).map((g) => ({ ...g }));
  const tolti = viaggio.giorni.slice(-n);
  const nuovaFine = piuGiorni(viaggio.dataFine, -n);
  const daRiprogrammare: DaRiprogrammare[] = [];
  for (const g of tolti) {
    const fermi = bloccati(lavoro, g.elementi);
    const nuova = piuGiorni(g.data, -n);
    for (const e of g.elementi) {
      if (fermi.has(e.id)) {
        daRiprogrammare.push({ elemento: e, data: g.data, nuovaData: nuova });
        lavoro.aRischio.set(e.id, motivoBloccato(lavoro, e, g.elementi, g.data, nuova));
      } else {
        lavoro.motivi.set(e.id, `tolto: il viaggio finisce ${giorniTesto(n)} prima, il ${nuovaFine}`);
      }
    }
    if (fermi.size > 0) restano.push({ ...g, elementi: g.elementi.filter((e) => fermi.has(e.id)) });
  }
  const ultimo = restano.at(-1)!;
  if (daRiprogrammare.length === 0) delete ultimo.alloggio;
  lavoro.viaggio = { ...viaggio, dataFine: ultimo.data, giorni: restano };
  lavoro.note.push(
    daRiprogrammare.length === 0
      ? `Il viaggio ora finisce il ${nuovaFine}: l'ultimo giorno non ha più un alloggio per la notte.`
      : `Il viaggio dovrebbe finire il ${nuovaFine}, ma restano elementi a orario fisso nei giorni tolti: finché non li riprogrammi, ` +
          `l'itinerario arriva fino al ${ultimo.data}.`,
  );
  return { livello: "resto", daRiprogrammare };
}

// R2-RIT Cambia ritmo di un giorno

const RANGO_PRIORITA: Readonly<Record<Priorita, number>> = { opzionale: 0, desiderata: 1, irrinunciabile: 2 };

/** Le attività del giorno che si possono togliere o ricollocare: non bloccate, non irrinunciabili, senza prenotazione. */
function attivitaMobili(lavoro: Lavoro, elementi: readonly Elemento[]): ElementoAttivita[] {
  const fermi = bloccati(lavoro, elementi);
  return elementi.filter(
    (e): e is ElementoAttivita =>
      e.tipo === "attivita" && !fermi.has(e.id) && prioritaDi(e) !== "irrinunciabile" && e.prenotazione === undefined,
  );
}

function cambiaRitmo(lavoro: Lavoro, data: Data, ritmo: RitmoGiorno): Applicata | ErroreModificaOndata2 {
  const giorno = controllaGiorno(lavoro, data);
  if (giorno) return giorno;
  return ritmo === "piu_leggero" ? alleggerisci(lavoro, data) : riempi(lavoro, data);
}

function alleggerisci(lavoro: Lavoro, data: Data): Applicata | ErroreModificaOndata2 {
  const candidate = attivitaMobili(lavoro, elementiDel(lavoro, data)).sort(
    (a, b) =>
      RANGO_PRIORITA[prioritaDi(a)] - RANGO_PRIORITA[prioritaDi(b)] ||
      minuti(b.inizio) - minuti(a.inizio) ||
      confronta(a.id, b.id),
  );
  const x = candidate[0];
  if (!x) {
    return errore(
      "NESSUNA_ATTIVITA",
      `il ${data} non c'è un'attività da togliere: restano solo elementi a orario fisso, irrinunciabili o con una prenotazione`,
    );
  }
  togli(lavoro, x);
  lavoro.motivi.set(
    x.id,
    `tolta per alleggerire la giornata: è l'attività con la priorità più bassa (${prioritaDi(x)})` +
      (candidate.length > 1 ? ", a parità quella che inizia più tardi" : "") +
      "; gli spostamenti attorno si uniscono",
  );
  return { livello: "giornata", daRiprogrammare: [] };
}

/** Le chiavi dei problemi bloccanti, per riconoscere quelli nuovi. */
function bloccanti(lavoro: Lavoro): Set<string> {
  return new Set(
    controllaFattibilita(lavoro.viaggio, lavoro.catalogo, lavoro.sorgente)
      .filter((p) => p.gravita === "bloccante")
      .map((p) => `${p.codice}|${[...p.elementi].sort().join(",")}`),
  );
}

/** Lo stato del lavoro da ripristinare se un tentativo non va. */
function fotografia(lavoro: Lavoro): () => void {
  const viaggio = copiaDati(lavoro.viaggio);
  const motivi = new Map(lavoro.motivi);
  const note = [...lavoro.note];
  return () => {
    lavoro.viaggio = viaggio;
    lavoro.motivi.clear();
    for (const [k, v] of motivi) lavoro.motivi.set(k, v);
    lavoro.note.splice(0, lavoro.note.length, ...note);
  };
}

/**
 * Colloca l'attività dopo l'ultimo elemento del giorno: inizio = fine dell'ultimo elemento (o le 09:00 in un giorno
 * vuoto) più il percorso più veloce, ai 5 minuti per eccesso. Riesce solo se non nascono problemi bloccanti nuovi.
 */
function accodaAttivita(
  lavoro: Lavoro,
  data: Data,
  attivita: AttivitaCatalogo,
  crea: (inizio: Orario, fine: Orario) => DaCollocare,
): boolean {
  const elementi = elementiDel(lavoro, data);
  const giorno = giornoDi(lavoro.viaggio, data)!;
  const ultimo = elementi.at(-1);
  const da = ultimo ? lavoro.indice.luogoFine(ultimo) : giorno.luogoPartenza;
  const andata = da === attivita.luogoId ? 0 : lavoro.sorgente.percorsoPiuVeloce(da, attivita.luogoId)?.minuti;
  if (andata === undefined) return false;
  const inizio = Math.ceil((minuti(ultimo ? ultimo.fine : INIZIO_GIORNATA_VUOTA) + andata) / 5) * 5;
  const prima = bloccanti(lavoro);
  const ripristina = fotografia(lavoro);
  const esito = colloca(lavoro, data, attivita, orario(inizio), crea);
  const nuovi = esito === null ? [...bloccanti(lavoro)].filter((k) => !prima.has(k)) : ["errore"];
  if (nuovi.length === 0) return true;
  ripristina();
  return false;
}

function riempi(lavoro: Lavoro, data: Data): Applicata | ErroreModificaOndata2 {
  const usate = new Set(lavoro.viaggio.giorni.flatMap((g) => g.elementi.flatMap((e) => (e.tipo === "attivita" ? [e.attivitaId] : []))));
  const candidate = lavoro.catalogo.attivita
    .filter((a) => a.categoria !== "pasto" && !usate.has(a.id))
    .sort((a, b) => confronta(a.id, b.id));
  for (const attivita of candidate) {
    const riuscita = accodaAttivita(lavoro, data, attivita, (inizio, fine) => ({
      elemento: { id: "", tipo: "attivita", inizio, fine, orarioFisso: false, attivitaId: attivita.id, priorita: "desiderata" },
      nuovo: true,
      motivo:
        "aggiunta per riempire la giornata: è la prima attività del catalogo (in ordine di codice) non ancora nel viaggio " +
        "che entra dopo l'ultimo elemento del giorno senza nuovi problemi",
    }));
    if (riuscita) return { livello: "giornata", daRiprogrammare: [] };
  }
  return errore(
    "NESSUNA_ATTIVITA",
    `il ${data} nessuna attività del catalogo non ancora nel viaggio entra dopo l'ultimo elemento del giorno senza nuovi problemi`,
  );
}

// R2-RIG Rigenera un giorno

function rigeneraGiorno(lavoro: Lavoro, data: Data): Applicata | ErroreModificaOndata2 {
  const giorno = controllaGiorno(lavoro, data);
  if (giorno) return giorno;
  const mobili = attivitaMobili(lavoro, elementiDel(lavoro, data)).sort(
    (a, b) =>
      RANGO_PRIORITA[prioritaDi(b)] - RANGO_PRIORITA[prioritaDi(a)] || minuti(a.inizio) - minuti(b.inizio) || confronta(a.id, b.id),
  );
  if (mobili.length === 0) {
    lavoro.note.push(`Il ${data} non ha attività da ricostruire: restano solo elementi a orario fisso, irrinunciabili o con una prenotazione.`);
    return { livello: "giornata", daRiprogrammare: [] };
  }
  for (const x of mobili) togli(lavoro, x);
  const fuori: string[] = [];
  for (const x of mobili) {
    const attivita = lavoro.indice.attivita.get(x.attivitaId);
    const prima = `${orariDi(x)}`;
    const riuscita =
      attivita !== undefined &&
      accodaAttivita(lavoro, data, attivita, (inizio, fine) => ({
        elemento: { ...x, inizio, fine },
        nuovo: false,
        motivo: `ricollocata nella giornata ricostruita (prima ${prima}): stesso id e stessa priorità (${prioritaDi(x)})`,
      }));
    if (!riuscita) {
      fuori.push(lavoro.indice.descrivi(x));
      lavoro.motivi.set(x.id, "non entra nella giornata ricostruita senza nuovi problemi: resta fuori");
    }
  }
  lavoro.note.push(
    `Giornata del ${data} ricostruita: le attività che si possono spostare sono ricollocate una dopo l'altra, in ordine di priorità ` +
      "e poi di orario, con i percorsi più veloci; restano dove sono gli elementi a orario fisso, le attività irrinunciabili e le prenotazioni" +
      (fuori.length > 0 ? `. Restano fuori: ${fuori.join(", ")}` : "") +
      ".",
  );
  return { livello: "giornata", daRiprogrammare: [] };
}

// Supporto

function controllaGiorno(lavoro: Lavoro, data: Data): ErroreModificaOndata2 | null {
  if (giornoDi(lavoro.viaggio, data)) return null;
  const { dataInizio, dataFine } = lavoro.viaggio;
  return erroreModifica("GIORNO_INESISTENTE", `il ${data} non è un giorno del viaggio (dal ${dataInizio} al ${dataFine})`);
}

/** Elementi in ordine di inizio, poi di `id`. */
function ordina(elementi: readonly Elemento[]): Elemento[] {
  return [...elementi].sort((a, b) => minuti(a.inizio) - minuti(b.inizio) || confronta(a.id, b.id));
}

/** Ordine nell'itinerario: data, inizio, `id`. */
function perPosizione(a: { data: string; elemento: Elemento }, b: { data: string; elemento: Elemento }): number {
  return (
    confronta(a.data, b.data) ||
    minuti(a.elemento.inizio) - minuti(b.elemento.inizio) ||
    confronta(a.elemento.id, b.elemento.id)
  );
}
