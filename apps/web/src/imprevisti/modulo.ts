/**
 * Il modulo di una scheda di "Ho un imprevisto" (REQ-IMPR-001): precompilazione con oggi, l'ora dell'orologio
 * simulato e l'elemento in corso, e lettura dei campi inviati nell'imprevisto strutturato (o nella richiesta di cambio
 * di durata). L'imprevisto lo costruisce `imprevistoDaCampi` di `@travelops/agents`, lo stesso dello strumento della
 * chat, con gli stessi controlli: qui ci sono solo la forma dei campi e i testi per il viaggiatore.
 */
import { elementoInCorso, fineDopoInizio, imprevistoDaCampi, orarioDopo } from "@travelops/agents";
import type { Catalogo, ImprevistoEsteso, ModificaOndata2, Viaggio } from "@travelops/engine";
import type { Scheda } from "./schede";

export interface Opzione {
  valore: string;
  etichetta: string;
}

/** Valori iniziali dei campi e scelte che vengono dal viaggio (zone, posti, spostamenti). */
export interface Precompilazione {
  valori: Record<string, string>;
  scelte: Record<string, readonly Opzione[]>;
  /** L'elemento in corso (o il prossimo), in parole semplici, se c'è. */
  inCorso: string | null;
}

export type SceltaImprevisto = { tipo: "imprevisto"; imprevisto: ImprevistoEsteso } | { tipo: "richiesta"; modifica: ModificaOndata2 };

export type EsitoModulo = { ok: true; scelta: SceltaImprevisto } | { ok: false; errori: string[] };

type ElementoViaggio = Viaggio["giorni"][number]["elementi"][number];

/** "Oggi" nel viaggio: il giorno dell'orologio se è un giorno del viaggio, altrimenti il primo giorno. */
function oggiNelViaggio(viaggio: Viaggio, data: string): string {
  return viaggio.giorni.some((g) => g.data === data) ? data : viaggio.dataInizio;
}

/** Precompila il modulo della scheda: oggi, adesso e l'elemento in corso del viaggio. */
export function precompila(scheda: Scheda, viaggio: Viaggio, catalogo: Catalogo, orologio: { data: string; ora: string }): Precompilazione {
  const oggi = oggiNelViaggio(viaggio, orologio.data);
  const adesso = oggi === orologio.data ? orologio.ora : "09:00";
  const inCorso = elementoInCorso(viaggio, oggi, adesso);

  const nomeLuogo = (id: string) => catalogo.luoghi.find((l) => l.id === id)?.nome ?? id;
  const nomeAttivita = (id: string) => catalogo.attivita.find((a) => a.id === id)?.nome ?? id;
  const luogoDi = (e: ElementoViaggio): string | null => (e.tipo === "attivita" ? (catalogo.attivita.find((a) => a.id === e.attivitaId)?.luogoId ?? null) : e.a);
  const descrivi = (e: ElementoViaggio): string => (e.tipo === "attivita" ? nomeAttivita(e.attivitaId) : `${nomeLuogo(e.da)} → ${nomeLuogo(e.a)}`);

  const spostamenti = viaggio.giorni.flatMap((g) => g.elementi.flatMap((e) => (e.tipo === "spostamento" ? [{ e, data: g.data }] : [])));
  const voliETreni = spostamenti.filter(({ e }) => e.tipo === "spostamento" && (e.mezzo === "volo" || e.mezzo === "treno"));
  const opzioneSpostamento = ({ e, data }: (typeof spostamenti)[number]): Opzione => ({ valore: e.id, etichetta: `${data} ${e.inizio} · ${descrivi(e)}` });
  const luoghiDelViaggio = [...new Set(viaggio.giorni.flatMap((g) => g.elementi.flatMap((e) => (e.tipo === "attivita" ? [luogoDi(e) ?? ""] : []))).filter(Boolean))];
  const luogoInCorso = inCorso === null ? null : luogoDi(inCorso);
  const zonaInCorso = catalogo.luoghi.find((l) => l.id === luogoInCorso)?.zonaId ?? catalogo.zone[0]?.id ?? "";
  // Lo spostamento proposto: il primo volo o treno dal giorno di oggi (per il volo perso o cancellato), altrimenti il primo.
  const prossimo = (voliETreni.find(({ data }) => data >= oggi) ?? voliETreni[0] ?? spostamenti.find(({ data }) => data >= oggi) ?? spostamenti[0])?.e.id ?? "";

  const scelte: Record<string, readonly Opzione[]> = {
    elementoId: (scheda.id === "volo-perso" && voliETreni.length > 0 ? voliETreni : spostamenti).map(opzioneSpostamento),
    zonaId: catalogo.zone.map((z) => ({ valore: z.id, etichetta: z.nome })),
    luogoId: luoghiDelViaggio.map((id) => ({ valore: id, etichetta: nomeLuogo(id) })),
  };
  const valori: Record<string, string> = {
    data: oggi,
    momento: adesso,
    inizio: adesso,
    fine: orarioDopo(adesso, 240),
    minuti: "30",
    condizione: "pioggia",
    zonaId: scheda.id === "sciopero" ? "" : zonaInCorso,
    luogoId: luogoInCorso !== null && luoghiDelViaggio.includes(luogoInCorso) ? luogoInCorso : (luoghiDelViaggio[0] ?? ""),
    elementoId: prossimo,
    mezzo: "treno",
    giorni: scheda.genere.tipo === "richiesta" ? "1" : "",
    intensitaMassima: "facile",
    dopo: viaggio.dataFine,
  };
  return { valori, scelte, inCorso: inCorso === null ? null : `${inCorso.inizio}–${inCorso.fine} ${descrivi(inCorso)}` };
}

/**
 * Legge i campi inviati e costruisce l'imprevisto (o la richiesta) per il viaggio. Gli errori sono in parole semplici:
 * prima quelli dei campi, poi quelli dei controlli sull'imprevisto.
 */
export function leggiModulo(scheda: Scheda, campi: Record<string, string | undefined>, viaggio: Viaggio, catalogo: Catalogo): EsitoModulo {
  const errori: string[] = [];
  const valore = (nome: string): string => (campi[nome] ?? "").trim();
  const etichetta = (nome: string) => scheda.campi.find((c) => c.nome === nome)?.etichetta ?? nome;
  const presente = (nome: string): string | null => {
    const v = valore(nome);
    const campo = scheda.campi.find((c) => c.nome === nome);
    if (v === "" && campo !== undefined && campo.facoltativo !== true) errori.push(`Manca «${etichetta(nome)}».`);
    return v === "" ? null : v;
  };
  const data = (nome: string): string | null => {
    const v = presente(nome);
    if (v !== null && !/^\d{4}-\d{2}-\d{2}$/.test(v)) errori.push(`«${etichetta(nome)}» deve essere una data.`);
    return v;
  };
  const orario = (nome: string): string | null => {
    const v = presente(nome);
    if (v !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) errori.push(`«${etichetta(nome)}» deve essere un'ora, per esempio 09:30.`);
    return v;
  };
  const intero = (nome: string, minimo: number, massimo: number): number | null => {
    const v = presente(nome);
    if (v === null) return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < minimo || n > massimo) {
      errori.push(`«${etichetta(nome)}» deve essere un numero da ${minimo} a ${massimo}.`);
      return null;
    }
    return n;
  };
  const tra = <T extends string>(nome: string, ammessi: readonly T[]): T | null => {
    const v = presente(nome);
    if (v !== null && !ammessi.includes(v as T)) errori.push(`Scegli «${etichetta(nome)}» tra quelle proposte.`);
    return v as T | null;
  };

  const g = scheda.genere;
  if (g.tipo === "richiesta") {
    const giorni = intero("giorni", 1, 30) ?? 1;
    const dopo = g.operazione === "prolunga" ? data("dopo") : null;
    if (errori.length > 0) return { ok: false, errori };
    return {
      ok: true,
      scelta: g.operazione === "prolunga" ? { tipo: "richiesta", modifica: { operazione: "prolunga", dopo: dopo ?? viaggio.dataFine, giorni } } : { tipo: "richiesta", modifica: { operazione: "accorcia", giorni } },
    };
  }

  const letti = {
    data: scheda.campi.some((c) => c.nome === "data") ? data("data") : null,
    momento: scheda.campi.some((c) => c.nome === "momento") ? orario("momento") : null,
    inizio: scheda.campi.some((c) => c.nome === "inizio") ? orario("inizio") : null,
    fine: scheda.campi.some((c) => c.nome === "fine") ? orario("fine") : null,
    minuti: scheda.campi.some((c) => c.nome === "minuti") ? intero("minuti", 5, 720) : null,
    motivo: scheda.campi.some((c) => c.nome === "motivo") ? (presente("motivo") ?? "") : null,
    zonaId: scheda.campi.some((c) => c.nome === "zonaId") ? presente("zonaId") : null,
    condizione: scheda.campi.some((c) => c.nome === "condizione") ? tra("condizione", ["pioggia", "temporale", "neve"] as const) : null,
    luogoId: scheda.campi.some((c) => c.nome === "luogoId") ? presente("luogoId") : null,
    elementoId: scheda.campi.some((c) => c.nome === "elementoId") ? presente("elementoId") : null,
    arrivoData: scheda.campi.some((c) => c.nome === "arrivoData") ? data("arrivoData") : null,
    arrivoOrario: scheda.campi.some((c) => c.nome === "arrivoOrario") ? orario("arrivoOrario") : null,
    giorni: scheda.campi.some((c) => c.nome === "giorni") ? intero("giorni", 1, 30) : null,
    intensitaMassima: scheda.campi.some((c) => c.nome === "intensitaMassima") ? tra("intensitaMassima", ["nessuna", "facile", "moderata", "impegnativa"] as const) : null,
    mobilitaRidotta: scheda.campi.some((c) => c.nome === "mobilitaRidotta") ? ["on", "true", "1", "si", "sì"].includes(valore("mobilitaRidotta").toLowerCase()) : null,
    descrizione: scheda.campi.some((c) => c.nome === "descrizione") ? (presente("descrizione") ?? "") : null,
    mezzo: scheda.campi.some((c) => c.nome === "mezzo") ? tra("mezzo", ["mezzi_pubblici", "treno"] as const) : null,
  };
  if (letti.inizio !== null && letti.fine !== null && errori.length === 0 && !fineDopoInizio(letti.inizio, letti.fine)) {
    errori.push("L'ora di fine deve venire dopo l'ora di inizio.");
  }
  if (errori.length > 0) return { ok: false, errori };
  const esito = imprevistoDaCampi(g.imprevisto, letti, viaggio, catalogo);
  return esito.ok ? { ok: true, scelta: { tipo: "imprevisto", imprevisto: esito.imprevisto } } : { ok: false, errori: [esito.messaggio] };
}
