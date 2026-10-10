/**
 * Le operazioni delle modifiche richieste (REQ-EDIT-001 R-ED-1…R-ED-5), applicate allo stato di lavoro
 * della ripianificazione (`Lavoro`): il viaggio in lavorazione è sempre una copia e ogni elemento toccato
 * riceve il suo perché, che la spiegazione riporta. Ogni operazione restituisce un errore (R-ED-1) oppure
 * `null` se la modifica è stata applicata.
 */
import { minutiDaOrario } from "../feasibility/orari.js";
import type {
  AttivitaCatalogo,
  Data,
  Elemento,
  ElementoAttivita,
  ElementoSpostamento,
  ModificaRichiesta,
  Orario,
  Percorso,
  Priorita,
} from "../model/index.js";
import { elementiDel, impostaElementi, type Lavoro } from "../replanning/lavoro.js";
import { contornoAttivita, rimuoviAttivitaConSpostamenti } from "../replanning/rimozione.js";
import {
  FINE_GIORNATA,
  giornoDi,
  minuti,
  minutiTesto,
  orariDi,
  orario,
  prioritaDi,
  trovaElemento,
} from "../replanning/supporto.js";
import { erroreModifica, type ErroreModifica } from "./errori.js";

/** Priorità di un'attività aggiunta senza priorità (R-ED-2, `modello-dominio.md` §2.1). */
export const PRIORITA_AGGIUNTA: Priorita = "desiderata";

/** Applica la modifica richiesta al lavoro; restituisce l'errore di R-ED-1 o `null`. */
export function applicaModifica(lavoro: Lavoro, modifica: ModificaRichiesta): ErroreModifica | null {
  switch (modifica.operazione) {
    case "aggiungi":
      return aggiungi(lavoro, modifica.data, modifica.attivitaId, modifica.inizio, modifica.priorita);
    case "rimuovi":
      return rimuovi(lavoro, modifica.elementoId);
    case "sposta":
      return sposta(lavoro, modifica.elementoId, modifica.data, modifica.inizio);
    case "cambia_priorita":
      return cambiaPriorita(lavoro, modifica.elementoId, modifica.priorita);
    case "imposta_orario_fisso":
      return impostaOrarioFisso(lavoro, modifica.elementoId, modifica.orarioFisso);
  }
}

// R-ED-2 Aggiungi

function aggiungi(
  lavoro: Lavoro,
  data: Data,
  attivitaId: string,
  inizio: Orario,
  priorita: Priorita | undefined,
): ErroreModifica | null {
  const giorno = controllaGiorno(lavoro, data);
  if (giorno) return giorno;
  const attivita = lavoro.indice.attivita.get(attivitaId);
  if (!attivita) {
    return erroreModifica("ATTIVITA_INESISTENTE", `l'attività ${attivitaId} non è nel catalogo`);
  }
  return colloca(lavoro, data, attivita, inizio, (inizioAttivita, fineAttivita) => ({
    elemento: {
      id: "",
      tipo: "attivita",
      inizio: inizioAttivita,
      fine: fineAttivita,
      orarioFisso: false,
      attivitaId: attivita.id,
      priorita: priorita ?? PRIORITA_AGGIUNTA,
    },
    nuovo: true,
    motivo:
      `aggiunta su richiesta del viaggiatore, con la durata tipica (${minutiTesto(attivita.durataTipica)}) ` +
      `e priorità ${priorita ?? PRIORITA_AGGIUNTA}${priorita === undefined ? " (valore predefinito)" : ""}`,
  }));
}

/** L'attività da collocare: un elemento nuovo (l'id arriva alla collocazione) o quello che si sposta (R-ED-4). */
export interface DaCollocare {
  elemento: ElementoAttivita;
  nuovo: boolean;
  /** Il perché della modifica, per la spiegazione. */
  motivo: string;
}

/**
 * Colloca l'attività nel giorno `data` alle `inizio` (R-ED-2): luogo di partenza, luogo di destinazione,
 * spostamenti di andata e ritorno con il mezzo più veloce; gli elementi esistenti non cambiano.
 * Gli id nuovi si assegnano in ordine di inizio (`modello-dominio.md` §2.1).
 */
export function colloca(
  lavoro: Lavoro,
  data: Data,
  attivita: AttivitaCatalogo,
  inizioTesto: Orario,
  crea: (inizio: Orario, fine: Orario) => DaCollocare,
): ErroreModifica | null {
  const { indice, sorgente } = lavoro;
  const inizio = minutiDaOrario(inizioTesto);
  if (inizio === null) {
    return erroreModifica("ORARIO_NON_VALIDO", `l'orario di inizio "${inizioTesto}" non è un orario HH:mm valido`);
  }
  const giorno = giornoDi(lavoro.viaggio, data);
  if (!giorno) return erroreModifica("GIORNO_INESISTENTE", `il ${data} non è un giorno del viaggio`);
  const elementi = elementiDel(lavoro, data);
  const fine = inizio + attivita.durataTipica;
  const luogo = attivita.luogoId;

  // Luogo di partenza: dove si trova il viaggiatore alla fine dell'ultimo elemento che termina entro l'inizio.
  const ultimo = elementi.reduce<Elemento | undefined>(
    (scelto, e) => (minuti(e.fine) <= inizio && (!scelto || minuti(e.fine) >= minuti(scelto.fine)) ? e : scelto),
    undefined,
  );
  const partenza = ultimo ? indice.luogoFine(ultimo) : giorno.luogoPartenza;
  const perchePartenza = ultimo
    ? `dove si trova alla fine di ${ultimo.id}, alle ${ultimo.fine}`
    : "il luogo di partenza del giorno";

  // Luogo di destinazione: dove inizia il primo elemento che inizia dall'inizio richiesto in poi; se no l'alloggio.
  const primo = elementi.find((e) => minuti(e.inizio) >= inizio);
  const destinazione = primo ? indice.luogoInizio(primo) : giorno.alloggio;
  const percheDestinazione = primo
    ? `dove inizia ${primo.id}, alle ${primo.inizio}`
    : "l'alloggio della notte";

  // Spostamenti necessari, con il mezzo più veloce.
  const tratta = (da: string, a: string, quale: string): Percorso | ErroreModifica =>
    sorgente.percorsoPiuVeloce(da, a) ??
    erroreModifica(
      "PERCORSO_SCONOSCIUTO",
      `serve uno spostamento di ${quale}, ma non c'è un tempo di percorrenza noto ` +
        `da «${indice.nomeLuogo(da)}» a «${indice.nomeLuogo(a)}»`,
    );
  const andata = partenza !== luogo ? tratta(partenza, luogo, `andata (il viaggiatore è a «${indice.nomeLuogo(partenza)}», ${perchePartenza})`) : null;
  if (andata && "codice" in andata) return andata;
  const ritorno =
    destinazione !== undefined && destinazione !== luogo
      ? tratta(luogo, destinazione, `ritorno (verso ${percheDestinazione})`)
      : null;
  if (ritorno && "codice" in ritorno) return ritorno;

  // Un elemento creato non può iniziare prima delle 00:00 né finire dopo le 24:00.
  const inizioAndata = inizio - (andata?.minuti ?? 0);
  const fineRitorno = fine + (ritorno?.minuti ?? 0);
  if (inizioAndata < 0 || fineRitorno > FINE_GIORNATA) {
    const fuori =
      inizioAndata < 0
        ? `lo spostamento di andata dovrebbe partire ${minutiTesto(-inizioAndata)} prima della mezzanotte`
        : fine > FINE_GIORNATA
          ? `l'attività (${minutiTesto(attivita.durataTipica)}) finirebbe alle ${orario(fine)}, oltre le 24:00`
          : `lo spostamento di ritorno finirebbe alle ${orario(fineRitorno)}, oltre le 24:00`;
    return erroreModifica("FUORI_GIORNATA", `${fuori}: un elemento non può attraversare la mezzanotte`);
  }

  const daCollocare = crea(orario(inizio), orario(fine));
  const creati: Elemento[] = [];
  const nuovoId = (): string => {
    const id = `N${lavoro.viaggio.prossimoNumeroId}`;
    lavoro.viaggio.prossimoNumeroId += 1;
    return id;
  };
  // Ordine di inizio: andata, attività, ritorno.
  const elementoAndata: ElementoSpostamento | undefined = andata
    ? {
        id: nuovoId(),
        tipo: "spostamento",
        inizio: orario(inizioAndata),
        fine: orario(inizio),
        orarioFisso: false,
        da: partenza,
        a: luogo,
        mezzo: andata.mezzo,
      }
    : undefined;
  const elementoAttivita: ElementoAttivita = daCollocare.nuovo
    ? { ...daCollocare.elemento, id: nuovoId() }
    : daCollocare.elemento;
  const elementoRitorno: ElementoSpostamento | undefined =
    ritorno && destinazione !== undefined
      ? {
          id: nuovoId(),
          tipo: "spostamento",
          inizio: orario(fine),
          fine: orario(fineRitorno),
          orarioFisso: false,
          da: luogo,
          a: destinazione,
          mezzo: ritorno.mezzo,
        }
      : undefined;

  const nome = indice.descrivi(elementoAttivita);
  lavoro.motivi.set(elementoAttivita.id, daCollocare.motivo);
  if (elementoAndata && andata) {
    creati.push(elementoAndata);
    lavoro.motivi.set(
      elementoAndata.id,
      `porta il viaggiatore da «${indice.nomeLuogo(partenza)}» (${perchePartenza}) a «${indice.nomeLuogo(luogo)}» ` +
        `con il mezzo più veloce (${minutiTesto(andata.minuti)}) e arriva all'inizio di ${nome}`,
    );
  }
  creati.push(elementoAttivita);
  if (elementoRitorno && ritorno) {
    creati.push(elementoRitorno);
    lavoro.motivi.set(
      elementoRitorno.id,
      `riporta il viaggiatore da «${indice.nomeLuogo(luogo)}» a «${indice.nomeLuogo(elementoRitorno.a)}» ` +
        `(${percheDestinazione}) con il mezzo più veloce (${minutiTesto(ritorno.minuti)}), alla fine di ${nome}`,
    );
  }

  const senza: string[] = [];
  if (!andata) senza.push(`non serve uno spostamento di andata: il viaggiatore è già a «${indice.nomeLuogo(luogo)}» (${perchePartenza})`);
  if (!ritorno) {
    senza.push(
      destinazione === undefined
        ? "non serve uno spostamento di ritorno: è l'ultimo giorno, dopo l'attività non c'è nessun elemento né un alloggio"
        : `non serve uno spostamento di ritorno: ${percheDestinazione} è nello stesso luogo`,
    );
  }
  lavoro.note.push(
    `${nome} il ${data} ${orariDi(elementoAttivita)}: il viaggiatore parte da «${indice.nomeLuogo(partenza)}» (${perchePartenza})` +
      (destinazione === undefined ? "" : ` e poi va a «${indice.nomeLuogo(destinazione)}» (${percheDestinazione})`) +
      (senza.length === 0 ? "" : `; ${senza.join("; ")}`) +
      ". Gli altri elementi del giorno non cambiano.",
  );

  impostaElementi(lavoro, data, [...elementi, ...creati]);
  return null;
}

// R-ED-3 Rimuovi

/** Trova l'attività `id` che il viaggiatore vuole rimuovere o spostare, con gli errori di R-ED-1. */
function attivitaMobile(lavoro: Lavoro, id: string, azione: "rimuovere" | "spostare"): ElementoAttivita | ErroreModifica {
  const elemento = cercaElemento(lavoro, id);
  if ("codice" in elemento) return elemento;
  if (elemento.tipo !== "attivita") {
    return nonAttivita(lavoro, elemento, `si possono ${azione} solo le attività (uno spostamento segue l'attività a cui serve)`);
  }
  if (elemento.orarioFisso === true) {
    return erroreModifica(
      "ORARIO_FISSO",
      `${lavoro.indice.descrivi(elemento)} è a orario fisso: TravelOps non lo sposta né lo rimuove`,
    );
  }
  return elemento;
}

/** Rimuove l'attività con la regola R-SOS-5 di REQ-REPLAN-002 (R-ED-3). */
export function togli(lavoro: Lavoro, x: ElementoAttivita): void {
  const trovato = trovaElemento(lavoro.viaggio, x.id);
  if (!trovato) return;
  const data = trovato.giorno.data;
  const elementi = elementiDel(lavoro, data);
  const i = elementi.findIndex((e) => e.id === x.id);
  rimuoviAttivitaConSpostamenti(lavoro, data, elementi, x, contornoAttivita(lavoro.indice, trovato.giorno, elementi, i));
}

function rimuovi(lavoro: Lavoro, id: string): ErroreModifica | null {
  const x = attivitaMobile(lavoro, id, "rimuovere");
  if ("codice" in x) return x;
  togli(lavoro, x);
  lavoro.motivi.set(
    x.id,
    prioritaDi(x) === "irrinunciabile"
      ? "rimossa su richiesta del viaggiatore (è irrinunciabile, ma la rimozione la chiede il viaggiatore)"
      : "rimossa su richiesta del viaggiatore",
  );
  return null;
}

// R-ED-4 Sposta

function sposta(lavoro: Lavoro, id: string, data: Data, inizio: Orario): ErroreModifica | null {
  const x = attivitaMobile(lavoro, id, "spostare");
  if ("codice" in x) return x;
  const giorno = controllaGiorno(lavoro, data);
  if (giorno) return giorno;
  const attivita = lavoro.indice.attivita.get(x.attivitaId);
  if (!attivita) {
    return erroreModifica("ATTIVITA_INESISTENTE", `l'attività ${x.attivitaId} di ${x.id} non è nel catalogo`);
  }
  const prima = trovaElemento(lavoro.viaggio, x.id);
  togli(lavoro, x);
  return colloca(lavoro, data, attivita, inizio, (inizioNuovo, fineNuova) => ({
    elemento: { ...x, inizio: inizioNuovo, fine: fineNuova },
    nuovo: false,
    motivo:
      `spostata su richiesta del viaggiatore (prima il ${prima?.giorno.data ?? "?"} ${orariDi(x)}): ` +
      `mantiene id e priorità (${prioritaDi(x)}) e dura ${minutiTesto(attivita.durataTipica)}, la sua durata tipica`,
  }));
}

// R-ED-5 Cambia priorità, imposta orario fisso

function cambiaPriorita(lavoro: Lavoro, id: string, priorita: Priorita): ErroreModifica | null {
  const elemento = cercaElemento(lavoro, id);
  if ("codice" in elemento) return elemento;
  if (elemento.tipo !== "attivita") return nonAttivita(lavoro, elemento, "la priorità vale solo per le attività");
  const prima = prioritaDi(elemento);
  cambiaCampo(lavoro, { ...elemento, priorita });
  lavoro.motivi.set(
    id,
    prima === priorita
      ? `la priorità è già ${priorita}`
      : `priorità cambiata su richiesta del viaggiatore, da ${prima} a ${priorita}; orari e luoghi non cambiano`,
  );
  return null;
}

function impostaOrarioFisso(lavoro: Lavoro, id: string, orarioFisso: boolean): ErroreModifica | null {
  const elemento = cercaElemento(lavoro, id);
  if ("codice" in elemento) return elemento;
  cambiaCampo(lavoro, { ...elemento, orarioFisso });
  lavoro.motivi.set(
    id,
    orarioFisso
      ? "ora è a orario fisso, su richiesta del viaggiatore: TravelOps non lo sposterà né lo rimuoverà"
      : "non è più a orario fisso, su richiesta del viaggiatore: TravelOps potrà spostarlo o rimuoverlo se serve",
  );
  return null;
}

// Supporto

function controllaGiorno(lavoro: Lavoro, data: Data): ErroreModifica | null {
  if (giornoDi(lavoro.viaggio, data)) return null;
  const { dataInizio, dataFine } = lavoro.viaggio;
  return erroreModifica("GIORNO_INESISTENTE", `il ${data} non è un giorno del viaggio (dal ${dataInizio} al ${dataFine})`);
}

function cercaElemento(lavoro: Lavoro, id: string): Elemento | ErroreModifica {
  return (
    trovaElemento(lavoro.viaggio, id)?.elemento ??
    erroreModifica("ELEMENTO_INESISTENTE", `l'elemento ${id} non è nell'itinerario`)
  );
}

function nonAttivita(lavoro: Lavoro, elemento: Elemento, perche: string): ErroreModifica {
  return erroreModifica(
    "NON_ATTIVITA",
    `${lavoro.indice.descrivi(elemento)} è uno spostamento, non un'attività: ${perche}`,
  );
}

/** Sostituisce l'elemento con lo stesso `id` nel suo giorno: cambia solo il campo richiesto (R-ED-5). */
function cambiaCampo(lavoro: Lavoro, nuovo: Elemento): void {
  const trovato = trovaElemento(lavoro.viaggio, nuovo.id);
  if (!trovato) return;
  impostaElementi(
    lavoro,
    trovato.giorno.data,
    trovato.giorno.elementi.map((e) => (e.id === nuovo.id ? nuovo : e)),
  );
}
