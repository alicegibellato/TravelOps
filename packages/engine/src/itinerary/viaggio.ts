/**
 * Viaggio e itinerario: caricamento e validazione con le regole R-1…R-8 (REQ-ITIN-001).
 */
import type { Catalogo, Elemento, Giorno, Viaggio } from "../model/index.js";
import { idDelCatalogo, type IdCatalogo } from "./catalogo.js";
import type { ErroreValidazione, RisultatoCaricamento } from "./errori.js";
import { dataDaNumero, descrivi, PRIORITA, PRIORITA_PREDEFINITA, TIPI_ELEMENTO, VALORI_AMMESSI } from "./valori.js";
import {
  campo,
  decodifica,
  eOggetto,
  eseguiCaricamento,
  percorso,
  Verifica,
  type DataLetta,
  type OrarioLetto,
  type Posizione,
} from "./verifica.js";

const RADICE = "viaggio";

/**
 * Carica il viaggio con il suo itinerario dal JSON già letto (testo o valore decodificato).
 * Applica le regole R-1…R-8; i riferimenti al catalogo (R-6) si controllano solo se il catalogo è passato.
 * Valori predefiniti: priorità `desiderata`, orario fisso `false`.
 * Restituisce il viaggio oppure tutti gli errori trovati; non solleva eccezioni.
 */
export function caricaViaggio(json: unknown, catalogo?: Catalogo): RisultatoCaricamento<Viaggio> {
  return eseguiCaricamento(RADICE, (verifica) => {
    const decodificato = decodifica(json, RADICE, verifica);
    if (decodificato === null) return null;
    return analizzaViaggio(decodificato.dati, catalogo === undefined ? undefined : idDelCatalogo(catalogo), verifica);
  });
}

/**
 * Valida un itinerario rispetto al catalogo con tutte le regole R-1…R-8.
 * Restituisce l'elenco degli errori, vuoto se l'itinerario è valido; non solleva eccezioni.
 */
export function validaItinerario(viaggio: Viaggio, catalogo: Catalogo): ErroreValidazione[] {
  const esito = eseguiCaricamento(RADICE, (verifica) => analizzaViaggio(viaggio, idDelCatalogo(catalogo), verifica));
  return esito.ok ? [] : esito.errori;
}

interface Periodo {
  inizio: DataLetta;
  fine: DataLetta;
}

/** Stato condiviso durante la lettura di un viaggio. */
interface Lettura {
  verifica: Verifica;
  riferimenti: IdCatalogo | undefined;
  periodo: Periodo | undefined;
  /** Id degli elementi già visti, con il giorno in cui compaiono la prima volta (R-5). */
  idElementi: Map<string, string>;
  /** Date valide dei giorni, nell'ordine dell'elenco (R-7). */
  dateGiorni: { data: DataLetta; dove: string }[];
}

function analizzaViaggio(dati: unknown, riferimenti: IdCatalogo | undefined, verifica: Verifica): Viaggio | null {
  if (!eOggetto(dati)) {
    verifica.segnala("VALORE_NON_VALIDO", RADICE, "", `il viaggio deve essere un oggetto (valore trovato: ${descrivi(dati)})`);
    return null;
  }
  const id = verifica.testo(dati, "id", { id: RADICE, base: "" });
  const pos: Posizione = { id: id ?? RADICE, base: "" };
  const titolo = verifica.testo(dati, "titolo", pos);
  const dataInizio = verifica.data(dati, "dataInizio", pos);
  const dataFine = verifica.data(dati, "dataFine", pos);
  const fusoOrario = verifica.testo(dati, "fusoOrario", pos);
  const numeroViaggiatori = verifica.intero(dati, "numeroViaggiatori", pos, 1, "il numero di viaggiatori");
  const prossimoNumeroId = verifica.intero(dati, "prossimoNumeroId", pos, 1, "il prossimo numero per gli id nuovi");
  const giorniGrezzi = verifica.elenco(dati, "giorni", pos);

  let periodo: Periodo | undefined;
  if (dataInizio !== undefined && dataFine !== undefined) {
    if (dataFine.numero < dataInizio.numero) {
      verifica.segnala(
        "GIORNI_NON_VALIDI",
        pos.id,
        "dataFine",
        `la data di fine (${dataFine.testo}) precede la data di inizio (${dataInizio.testo})`,
      );
    } else {
      periodo = { inizio: dataInizio, fine: dataFine };
    }
  }

  const lettura: Lettura = { verifica, riferimenti, periodo, idElementi: new Map(), dateGiorni: [] };
  const giorni: Giorno[] = [];
  giorniGrezzi?.forEach((grezzo, i) => {
    const giorno = leggiGiorno(grezzo, percorso("giorni", i), lettura);
    if (giorno !== undefined) giorni.push(giorno);
  });
  if (giorniGrezzi !== undefined) controllaGiorni(lettura, pos.id);

  if (
    verifica.errori.length > 0 ||
    id === undefined ||
    titolo === undefined ||
    dataInizio === undefined ||
    dataFine === undefined ||
    fusoOrario === undefined ||
    numeroViaggiatori === undefined ||
    prossimoNumeroId === undefined
  ) {
    return null;
  }
  return {
    id,
    titolo,
    dataInizio: dataInizio.testo,
    dataFine: dataFine.testo,
    fusoOrario,
    numeroViaggiatori,
    prossimoNumeroId,
    giorni,
  };
}

function leggiGiorno(grezzo: unknown, base: string, lettura: Lettura): Giorno | undefined {
  const { verifica, riferimenti, periodo } = lettura;
  if (!eOggetto(grezzo)) {
    verifica.segnala("VALORE_NON_VALIDO", base, base, `il giorno deve essere un oggetto (valore trovato: ${descrivi(grezzo)})`);
    return undefined;
  }
  const errori = verifica.errori.length;
  const dataGrezza = campo(grezzo, "data");
  const pos: Posizione = { id: typeof dataGrezza === "string" && dataGrezza.trim() !== "" ? dataGrezza : base, base };
  const data = verifica.data(grezzo, "data", pos);
  if (data !== undefined) lettura.dateGiorni.push({ data, dove: percorso(base, "data") });

  const luogoPartenza = verifica.testo(grezzo, "luogoPartenza", pos);
  // L'alloggio della notte manca solo nell'ultimo giorno (e nei giorni già fuori dalle date del viaggio).
  const alloggioObbligatorio =
    periodo !== undefined && data !== undefined && data.numero >= periodo.inizio.numero && data.numero < periodo.fine.numero;
  const alloggio = verifica.testo(grezzo, "alloggio", pos, alloggioObbligatorio);
  if (riferimenti !== undefined) {
    if (luogoPartenza !== undefined && !riferimenti.luoghi.has(luogoPartenza)) {
      verifica.segnala(
        "RIFERIMENTO_INESISTENTE",
        pos.id,
        percorso(base, "luogoPartenza"),
        `il luogo di partenza "${luogoPartenza}" non esiste nel catalogo`,
      );
    }
    if (alloggio !== undefined && !riferimenti.luoghi.has(alloggio)) {
      verifica.segnala(
        "RIFERIMENTO_INESISTENTE",
        pos.id,
        percorso(base, "alloggio"),
        `l'alloggio "${alloggio}" non esiste nel catalogo`,
      );
    }
  }

  const elementiGrezzi = verifica.elenco(grezzo, "elementi", pos);
  const elementi: Elemento[] = [];
  let precedente: { id: string; inizio: OrarioLetto } | undefined;
  elementiGrezzi?.forEach((grezzoElemento, j) => {
    const baseElemento = percorso(percorso(base, "elementi"), j);
    const letto = leggiElemento(grezzoElemento, baseElemento, pos.id, lettura);
    if (letto.elemento !== undefined) elementi.push(letto.elemento);
    if (letto.inizio === undefined) return;
    // R-4: ogni elemento inizia non prima di quello che lo precede nell'elenco.
    if (precedente !== undefined && letto.inizio.minuti < precedente.inizio.minuti) {
      verifica.segnala(
        "ORDINE_NON_VALIDO",
        letto.id,
        percorso(baseElemento, "inizio"),
        `l'elemento inizia alle ${letto.inizio.testo}, prima dell'elemento precedente ${precedente.id} ` +
          `(${precedente.inizio.testo}): nel giorno ${pos.id} gli elementi vanno in ordine di inizio`,
      );
    }
    precedente = { id: letto.id, inizio: letto.inizio };
  });

  if (verifica.errori.length > errori || data === undefined || luogoPartenza === undefined || elementiGrezzi === undefined) {
    return undefined;
  }
  return { data: data.testo, luogoPartenza, ...(alloggio !== undefined ? { alloggio } : {}), elementi };
}

interface ElementoLetto {
  /** L'id dell'elemento, oppure la sua posizione nel JSON se l'id manca. */
  id: string;
  inizio?: OrarioLetto;
  elemento?: Elemento;
}

function leggiElemento(grezzo: unknown, base: string, giorno: string, lettura: Lettura): ElementoLetto {
  const { verifica, riferimenti } = lettura;
  if (!eOggetto(grezzo)) {
    verifica.segnala("VALORE_NON_VALIDO", base, base, `l'elemento deve essere un oggetto (valore trovato: ${descrivi(grezzo)})`);
    return { id: base };
  }
  const errori = verifica.errori.length;
  const id = verifica.testo(grezzo, "id", { id: base, base });
  const pos: Posizione = { id: id ?? base, base };
  if (id !== undefined) {
    const primo = lettura.idElementi.get(id);
    if (primo !== undefined) {
      verifica.segnala(
        "ID_DUPLICATO",
        id,
        percorso(base, "id"),
        `l'id "${id}" è già usato da un altro elemento del viaggio (giorno ${primo})`,
      );
    } else {
      lettura.idElementi.set(id, giorno);
    }
  }
  const tipo = verifica.scelta(grezzo, "tipo", TIPI_ELEMENTO, pos);
  const inizio = verifica.orario(grezzo, "inizio", pos, "inizio");
  const fine = verifica.orario(grezzo, "fine", pos, "fine");
  if (inizio !== undefined && fine !== undefined && fine.minuti <= inizio.minuti) {
    verifica.segnala(
      "ORARIO_NON_VALIDO",
      pos.id,
      percorso(base, "fine"),
      `la fine (${fine.testo}) non è successiva all'inizio (${inizio.testo})`,
    );
  }
  const orarioFisso = verifica.booleano(grezzo, "orarioFisso", pos, false) ?? false;
  const prenotazione = verifica.prenotazione(grezzo, pos);

  let elemento: Elemento | undefined;
  if (tipo === "attivita") {
    const attivitaId = verifica.testo(grezzo, "attivitaId", pos);
    if (attivitaId !== undefined && riferimenti !== undefined && !riferimenti.attivita.has(attivitaId)) {
      verifica.segnala(
        "RIFERIMENTO_INESISTENTE",
        pos.id,
        percorso(base, "attivitaId"),
        `l'attività "${attivitaId}" non esiste nel catalogo`,
      );
    }
    const priorita = verifica.scelta(grezzo, "priorita", PRIORITA, pos, false) ?? PRIORITA_PREDEFINITA;
    if (id !== undefined && inizio !== undefined && fine !== undefined && attivitaId !== undefined) {
      elemento = {
        id,
        tipo,
        inizio: inizio.testo,
        fine: fine.testo,
        orarioFisso,
        attivitaId,
        priorita,
        ...(prenotazione !== undefined ? { prenotazione } : {}),
      };
    }
  } else if (tipo === "spostamento") {
    const da = verifica.testo(grezzo, "da", pos);
    const a = verifica.testo(grezzo, "a", pos);
    for (const [campoLuogo, luogo] of [
      ["da", da],
      ["a", a],
    ] as const) {
      if (luogo !== undefined && riferimenti !== undefined && !riferimenti.luoghi.has(luogo)) {
        verifica.segnala(
          "RIFERIMENTO_INESISTENTE",
          pos.id,
          percorso(base, campoLuogo),
          `il luogo "${luogo}" (campo "${campoLuogo}") non esiste nel catalogo`,
        );
      }
    }
    const mezzo = verifica.scelta(grezzo, "mezzo", VALORI_AMMESSI.mezzo, pos);
    if (id !== undefined && inizio !== undefined && fine !== undefined && da !== undefined && a !== undefined && mezzo !== undefined) {
      elemento = {
        id,
        tipo,
        inizio: inizio.testo,
        fine: fine.testo,
        orarioFisso,
        da,
        a,
        mezzo,
        ...(prenotazione !== undefined ? { prenotazione } : {}),
      };
    }
  }

  const letto: ElementoLetto = { id: pos.id };
  if (inizio !== undefined) letto.inizio = inizio;
  if (elemento !== undefined && verifica.errori.length === errori) letto.elemento = elemento;
  return letto;
}

/** R-7: nessun giorno mancante, ripetuto, fuori dalle date del viaggio o fuori ordine. */
function controllaGiorni(lettura: Lettura, idViaggio: string): void {
  const { verifica, periodo, dateGiorni } = lettura;
  const visti = new Set<number>();
  let precedente: DataLetta | undefined;
  for (const { data, dove } of dateGiorni) {
    if (visti.has(data.numero)) {
      verifica.segnala("GIORNI_NON_VALIDI", data.testo, dove, `il giorno ${data.testo} è ripetuto`);
    } else if (periodo !== undefined && (data.numero < periodo.inizio.numero || data.numero > periodo.fine.numero)) {
      verifica.segnala(
        "GIORNI_NON_VALIDI",
        data.testo,
        dove,
        `il giorno ${data.testo} è fuori dalle date del viaggio (dal ${periodo.inizio.testo} al ${periodo.fine.testo})`,
      );
    } else if (precedente !== undefined && data.numero < precedente.numero) {
      verifica.segnala(
        "GIORNI_NON_VALIDI",
        data.testo,
        dove,
        `il giorno ${data.testo} viene dopo il giorno ${precedente.testo}: i giorni vanno in ordine di data`,
      );
    }
    visti.add(data.numero);
    precedente = data;
  }
  if (periodo === undefined) return;

  // Giorni mancanti, raggruppati in intervalli consecutivi: un errore per intervallo.
  const presenti = [...visti]
    .filter((numero) => numero >= periodo.inizio.numero && numero <= periodo.fine.numero)
    .sort((a, b) => a - b);
  const mancanti: [number, number][] = [];
  let ultimo = periodo.inizio.numero - 1;
  for (const numero of presenti) {
    if (numero > ultimo + 1) mancanti.push([ultimo + 1, numero - 1]);
    ultimo = numero;
  }
  if (periodo.fine.numero > ultimo) mancanti.push([ultimo + 1, periodo.fine.numero]);
  for (const [da, a] of mancanti) {
    const primo = dataDaNumero(da);
    const motivo =
      da === a
        ? `manca il giorno ${primo} del viaggio ${idViaggio}`
        : `mancano i giorni del viaggio ${idViaggio} dal ${primo} al ${dataDaNumero(a)}`;
    verifica.segnala("GIORNI_NON_VALIDI", primo, "giorni", motivo);
  }
}
