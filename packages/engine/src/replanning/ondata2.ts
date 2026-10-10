/**
 * Ripianificazione degli imprevisti della §7.4 di `modello-dominio-estensioni.md` (REQ-REPLAN-004):
 * salute (R2-SAL), volo o treno perso (R2-VOL), sciopero (R2-SCI), bagaglio smarrito (R2-BAG), documenti
 * smarriti (R2-DOC) e stanchezza (R2-STA). Riusa le regole di REQ-REPLAN-002: sostituzione R-SOS, rimozione
 * R-SOS-5, ritardo R-RIT, cancellazione R-CAN e alternative R-ALT. Deterministica, nessuna rete.
 */
import type {
  AttivitaCatalogo,
  Elemento,
  ElementoAttivita,
  ElementoSpostamento,
  ImprevistoBagaglioSmarrito,
  ImprevistoDocumentiSmarriti,
  ImprevistoRitardo,
  ImprevistoSalute,
  ImprevistoSciopero,
  ImprevistoStanchezza,
  ImprevistoVoloPerso,
  Intensita,
  Priorita,
} from "../model/index.js";
import { valutaAttivita } from "../preferences/punteggio.js";
import { ATTIVITA_PER_RITMO } from "../preferences/tipi.js";
import { alternativaPolizia, alternativeSalute, costruisciAlternative } from "./alternative.js";
import { ripianificaCancellazione } from "./cancellazione.js";
import { calcolaImpatto, type ImpattoDettagliato } from "./impatto.js";
import { chiedi, elementiDel, impostaElementi, type Lavoro } from "./lavoro.js";
import { contornoAttivita, rimuoviAttivitaConSpostamenti } from "./rimozione.js";
import { ripianificaRitardo } from "./ritardo.js";
import {
  applicaSostituta,
  categoriaDi,
  collocaNellaFinestra,
  ripianificaSostituzione,
  type Collocata,
} from "./sostituzione.js";
import {
  FINE_GIORNATA,
  confronta,
  eFisso,
  elenca,
  giornoDi,
  minuti,
  minutiTesto,
  orario,
  percorso,
  prioritaDi,
  trovaElemento,
} from "./supporto.js";

/** Codice del problema bloccante quando bagaglio o documenti smarriti non trovano il tempo necessario (R2-BAG, R2-DOC). */
export const FINESTRA_NON_TROVATA = "FINESTRA_NON_TROVATA";

const ORDINE_PRIORITA: Readonly<Record<Priorita, number>> = { opzionale: 0, desiderata: 1, irrinunciabile: 2 };
const GRADO_INTENSITA: Readonly<Record<Intensita, number>> = { facile: 1, moderata: 2, impegnativa: 3 };

// ---------------------------------------------------------------------------------------------------------------
// R2-SAL: salute

/**
 * Le attività colpite si sostituiscono con R-SOS (filtro di intensità e accessibilità al posto di "al coperto").
 * Con "riposo" (intensità massima `nessuna`) restano solo pasti, elementi a orario fisso e irrinunciabili, questi
 * ultimi a rischio. Alternative: "Farmacie vicine" e "Pronto soccorso vicino" con il nome della zona dell'alloggio.
 */
export function ripianificaSalute(lavoro: Lavoro, imprevisto: ImprevistoSalute, impatto: ImpattoDettagliato): void {
  const { indice } = lavoro;
  const descrizione = imprevisto.descrizione.trim();
  const perSalute = descrizione === "" ? "per il problema di salute indicato" : `per «${descrizione}»`;
  if (imprevisto.intensitaMassima === "nessuna") {
    for (const colpito of impatto.elementiColpiti) {
      const elementi = elementiDel(lavoro, colpito.data);
      const giorno = giornoDi(lavoro.viaggio, colpito.data);
      const i = elementi.findIndex((e) => e.id === colpito.elementoId);
      const x = elementi[i];
      if (!giorno || !x || x.tipo !== "attivita") continue;
      const nome = indice.descrivi(x);
      if (eFisso(x) || prioritaDi(x) === "irrinunciabile") {
        const perche = eFisso(x) ? "è a orario fisso" : "è irrinunciabile";
        lavoro.aRischio.set(x.id, `${perSalute} serve riposo, ma ${perche}: resta al suo posto`);
        chiedi(lavoro, `${nome} ${perche} ma ${perSalute} serve riposo: vuoi tenerla, spostarla o rinunciarci?`);
        continue;
      }
      lavoro.motivi.set(x.id, `${perSalute} serve riposo: restano solo pasti, elementi a orario fisso e irrinunciabili`);
      rimuoviAttivitaConSpostamenti(lavoro, colpito.data, elementi, x, contornoAttivita(indice, giorno, elementi, i));
    }
    lavoro.note.push(`${perSalute.charAt(0).toUpperCase()}${perSalute.slice(1)} serve riposo: si tolgono le attività che non sono pasti, a orario fisso o irrinunciabili.`);
  } else {
    ripianificaSostituzione(lavoro, imprevisto, impatto);
  }
  const giorno = giornoDi(lavoro.originale, imprevisto.dataInizio) ?? lavoro.originale.giorni[0];
  const alloggio = giorno ? (giorno.alloggio ?? giorno.luogoPartenza) : undefined;
  const zona = alloggio === undefined ? undefined : indice.luoghi.get(alloggio)?.zonaId;
  lavoro.alternativeExtra.push(...alternativeSalute(zona === undefined ? "" : indice.nomeZona(zona)));
}

// ---------------------------------------------------------------------------------------------------------------
// R2-VOL: volo o treno perso

/**
 * Come R-CAN-2: lo spostamento perso resta com'è, a rischio, con le alternative di R-ALT. Con l'arrivo previsto, gli
 * elementi che iniziano prima dell'arrivo si trattano come un ritardo che inizia all'orario originale dello
 * spostamento (R-RIT-2…R-RIT-4), giorno per giorno, anche sul giorno successivo.
 */
export function ripianificaVoloPerso(lavoro: Lavoro, imprevisto: ImprevistoVoloPerso, impatto: ImpattoDettagliato): void {
  const trovato = trovaElemento(lavoro.viaggio, imprevisto.elementoId);
  if (!trovato || trovato.elemento.tipo !== "spostamento") return;
  if (!impatto.elementiColpiti.some((c) => c.elementoId === imprevisto.elementoId)) return;
  const perso: ElementoSpostamento = trovato.elemento;
  const giornoPerso = trovato.giorno.data;
  const { indice } = lavoro;
  const nome = indice.descrivi(perso);
  const cosa = perso.mezzo === "volo" ? "il volo" : "il treno";
  lavoro.aRischio.set(perso.id, `${cosa} è perso: TravelOps non cambia lo spostamento e non agisce sulla prenotazione`);
  chiedi(lavoro, `${nome} è perso: come vuoi raggiungere «${indice.nomeLuogo(perso.a)}»?`);

  const arrivo = imprevisto.arrivoPrevisto;
  if (!arrivo) {
    lavoro.note.push(`${cosa.charAt(0).toUpperCase()}${cosa.slice(1)} è perso e non è indicato un arrivo previsto: l'itinerario resta com'è.`);
    return;
  }
  lavoro.note.push(
    `${cosa.charAt(0).toUpperCase()}${cosa.slice(1)} è perso; l'arrivo previsto con il nuovo mezzo è il ${arrivo.data} alle ${arrivo.orario}: ` +
      "gli elementi che iniziano prima si trattano come un ritardo.",
  );
  const date = [...new Set(impatto.elementiColpiti.filter((c) => c.elementoId !== perso.id).map((c) => c.data))].sort(confronta);
  for (const data of date) {
    const inizio = data === giornoPerso ? minuti(perso.inizio) : 0;
    const fine = data === arrivo.data ? minuti(arrivo.orario) : FINE_GIORNATA;
    if (fine <= inizio) continue;
    const ritardo: ImprevistoRitardo = {
      tipo: "RITARDO",
      data,
      momento: orario(inizio),
      minuti: fine - inizio,
      motivo: `${nome} perso`,
    };
    // Lo spostamento perso non si sposta (R-CAN-2): durante il ritardo si toglie dal giorno e poi si rimette.
    const conPerso = elementiDel(lavoro, data);
    const senza = conPerso.filter((e) => e.id !== perso.id);
    const tolto = senza.length !== conPerso.length;
    impostaElementi(lavoro, data, senza);
    const impattoRitardo = calcolaImpatto(lavoro.viaggio, lavoro.catalogo, ritardo);
    lavoro.impattiDerivati.push(impattoRitardo);
    ripianificaRitardo(lavoro, ritardo, impattoRitardo, `l'arrivo previsto il ${arrivo.data} alle ${arrivo.orario} dopo ${cosa} perso`);
    if (tolto) impostaElementi(lavoro, data, [...elementiDel(lavoro, data), perso]);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// R2-SCI: sciopero

/** R-CAN-1 su ogni spostamento colpito dallo sciopero, in ordine di inizio. */
export function ripianificaSciopero(lavoro: Lavoro, impatto: ImpattoDettagliato, imprevisto: ImprevistoSciopero): void {
  const mezzo = imprevisto.mezzo === "treno" ? "dei treni" : "dei mezzi pubblici";
  for (const colpito of impatto.elementiColpiti) {
    ripianificaCancellazione(
      lavoro,
      { tipo: "CANCELLAZIONE_SPOSTAMENTO", elementoId: colpito.elementoId },
      `è colpito dallo sciopero ${mezzo}`,
    );
  }
}

// ---------------------------------------------------------------------------------------------------------------
// R2-BAG e R2-DOC: bagaglio e documenti smarriti

/** Le regole di R2-BAG e R2-DOC: attività di servizio da aggiungere, minuti necessari, ora entro cui finire. */
export const REGOLE_SERVIZIO = {
  BAGAGLIO_SMARRITO: { attivita: "Acquisti essenziali", minuti: 90, entro: "13:00" },
  DOCUMENTI_SMARRITI: { attivita: "Denuncia e documenti provvisori", minuti: 180, entro: "13:00" },
} as const;

/**
 * R2-BAG / R2-DOC: serve una finestra libera di 90 (180) minuti entro le 13:00 del giorno vicino all'alloggio. Prima
 * si cerca uno spazio libero tra due elementi, dopo il momento dell'imprevisto; se non c'è si toglie l'attività
 * `opzionale`, poi `desiderata`, col punteggio più basso che libera la finestra (R-RIT-3 per le parità) e al suo posto
 * si colloca l'attività di servizio (R-SOS-1, R-SOS-3). Alternative: la gestione della prenotazione del volo di arrivo
 * (R2-BAG) o la denuncia alla Polizia di Stato (R2-DOC); con i documenti smarriti gli elementi a orario fisso dei
 * giorni successivi sono a rischio.
 */
export function ripianificaServizio(lavoro: Lavoro, imprevisto: ImprevistoBagaglioSmarrito | ImprevistoDocumentiSmarriti): void {
  const { indice, sorgente } = lavoro;
  const regola = REGOLE_SERVIZIO[imprevisto.tipo];
  const entro = minuti(regola.entro);
  const momento = minuti(imprevisto.momento);
  const data = imprevisto.data;
  const causa = imprevisto.tipo === "BAGAGLIO_SMARRITO" ? "il bagaglio smarrito" : "i documenti smarriti";

  alternativeServizio(lavoro, imprevisto);

  const giorno = giornoDi(lavoro.viaggio, data);
  if (!giorno || data < lavoro.viaggio.dataInizio || data > lavoro.viaggio.dataFine) {
    lavoro.note.push(`Il ${data} non è un giorno del viaggio: l'itinerario resta com'è.`);
    return;
  }
  const alloggio = giorno.alloggio ?? giorno.luogoPartenza;

  // L'attività di servizio nel luogo più vicino all'alloggio (a parità, id in ordine alfabetico).
  const servizio = lavoro.catalogo.attivita
    .filter((a) => categoriaDi(a) === "servizio" && a.nome === regola.attivita)
    .flatMap((a) => {
      const p = percorso(sorgente, alloggio, a.luogoId);
      return p ? [{ a, minuti: p.minuti }] : [];
    })
    .sort((x, y) => x.minuti - y.minuti || confronta(x.a.id, y.a.id))[0]?.a;
  const testoTempo = `${minutiTesto(regola.minuti)} liberi entro le ${regola.entro} del ${data} vicino all'alloggio`;
  if (!servizio) {
    nonTrovata(lavoro, `Per ${causa} servono ${testoTempo}, ma nel catalogo non c'è l'attività «${regola.attivita}» raggiungibile da «${indice.nomeLuogo(alloggio)}».`, data);
    return;
  }
  const nomeServizio = `«${servizio.nome}» a «${indice.nomeLuogo(servizio.luogoId)}»`;

  // 1. Uno spazio libero tra due elementi.
  if (inSpazioLibero(lavoro, servizio, data, momento, entro, regola.minuti, causa)) {
    lavoro.note.push(`Per ${causa} servono ${testoTempo}: c'è uno spazio libero, quindi si aggiunge ${nomeServizio} senza togliere nulla.`);
    return;
  }

  // 2. Togliere l'attività che libera la finestra: opzionale, poi desiderata; punteggio più basso; R-RIT-3.
  const elementi = elementiDel(lavoro, data);
  const punteggio = (e: ElementoAttivita): number => {
    if (!lavoro.profilo) return 0;
    return valutaAttivita(indice.attivitaDi(e), lavoro.profilo).punteggio ?? Number.NEGATIVE_INFINITY;
  };
  const pasto = (e: ElementoAttivita): number => (indice.attivitaDi(e).categoria === "pasto" ? 1 : 0);
  const rimovibili = elementi
    .filter(
      (e): e is ElementoAttivita =>
        e.tipo === "attivita" &&
        !eFisso(e) &&
        prioritaDi(e) !== "irrinunciabile" &&
        minuti(e.inizio) < entro &&
        minuti(e.fine) > momento,
    )
    .sort(
      (a, b) =>
        ORDINE_PRIORITA[prioritaDi(a)] - ORDINE_PRIORITA[prioritaDi(b)] ||
        punteggio(a) - punteggio(b) ||
        pasto(a) - pasto(b) ||
        minuti(a.inizio) - minuti(b.inizio) ||
        confronta(a.id, b.id),
    );
  for (const x of rimovibili) {
    const i = elementi.findIndex((e) => e.id === x.id);
    const { andata, ritorno, precedente, successivo, ingresso, uscita } = contornoAttivita(indice, giorno, elementi, i);
    const inizioFinestra = Math.max(precedente ? minuti(precedente.fine) : minuti((andata ?? x).inizio), momento);
    const fineFinestra = successivo ? minuti(successivo.inizio) : FINE_GIORNATA;
    const scelta: Collocata | null = collocaNellaFinestra(lavoro, servizio, data, {
      andata: andata !== undefined,
      ritorno: ritorno !== undefined,
      ingresso,
      uscita,
      vincoloSenzaRitorno: ritorno ? undefined : successivo ? indice.luogoInizio(successivo) : giorno.alloggio,
      inizioFinestra,
      fineFinestra,
      fineEntro: entro,
      durataMinima: regola.minuti,
    });
    if (!scelta) continue;
    const motivoX =
      `rimossa per ${causa}: servono ${testoTempo} e togliere ${indice.descrivi(x)} ` +
      `(${prioritaDi(x)}${lavoro.profilo ? `, punteggio ${punteggio(x)}` : ""}) è il modo di liberarli`;
    applicaSostituta(
      lavoro,
      { data, elementi, x, andata, ritorno, ingresso, uscita, motivoX },
      scelta,
      {
        priorita: "irrinunciabile",
        motivoX,
        motivoNuova: `serve per ${causa}: ${minutiTesto(scelta.fine - scelta.inizio)} a «${indice.nomeLuogo(servizio.luogoId)}», il luogo più vicino all'alloggio, entro le ${regola.entro}`,
      },
    );
    lavoro.note.push(
      `Per ${causa} servono ${testoTempo}: non c'è uno spazio libero, quindi si toglie ${indice.descrivi(x)} ` +
        `e al suo posto si aggiunge ${nomeServizio} (${orario(scelta.inizio)}–${orario(scelta.fine)}).`,
    );
    return;
  }

  // 3. Nessuna finestra: l'itinerario non cambia e il livello minimo non è fattibile.
  nonTrovata(
    lavoro,
    `Per ${causa} servono ${testoTempo} per ${nomeServizio}: non c'è uno spazio libero e nemmeno togliendo un'attività ` +
      (rimovibili.length === 0
        ? "(non ce ne sono che si possano togliere prima delle 13:00)"
        : `(${elenca(rimovibili.map((e) => indice.descrivi(e)))})`) +
      " si riesce a liberarli.",
    data,
  );
}

function nonTrovata(lavoro: Lavoro, messaggio: string, data: string): void {
  lavoro.problemiExtra.push({ codice: FINESTRA_NON_TROVATA, gravita: "bloccante", elementi: [], messaggio });
  lavoro.note.push(`${messaggio} L'itinerario resta com'è.`);
  chiedi(lavoro, `non trovo il tempo necessario il ${data}: vuoi scegliere tu cosa togliere o rigenerare la giornata?`);
}

/**
 * Cerca uno spazio libero tra due elementi del giorno (o prima del primo, o dopo l'ultimo) dopo il momento
 * dell'imprevisto: il servizio finisce entro l'ora indicata, con spostamenti nuovi di andata e ritorno col mezzo più
 * veloce. Se lo trova lo aggiunge con id nuovi in ordine di orario e restituisce `true`.
 */
function inSpazioLibero(
  lavoro: Lavoro,
  servizio: AttivitaCatalogo,
  data: string,
  momento: number,
  entro: number,
  durataMinima: number,
  causa: string,
): boolean {
  const { indice, sorgente } = lavoro;
  const giorno = giornoDi(lavoro.viaggio, data);
  if (!giorno) return false;
  const elementi = elementiDel(lavoro, data);
  const durata = Math.max(servizio.durataTipica, durataMinima);
  const luogo = servizio.luogoId;
  for (let k = 0; k <= elementi.length; k++) {
    const prima = elementi[k - 1];
    const dopo = elementi[k];
    const inizioSpazio = Math.max(prima ? minuti(prima.fine) : 0, momento);
    const fineSpazio = dopo ? minuti(dopo.inizio) : FINE_GIORNATA;
    if (inizioSpazio >= entro || inizioSpazio >= fineSpazio) continue;
    const da = prima ? indice.luogoFine(prima) : giorno.luogoPartenza;
    const verso = dopo ? indice.luogoInizio(dopo) : giorno.alloggio;
    const andata = percorso(sorgente, da, luogo);
    const ritorno = verso === undefined ? { mezzo: "piedi" as const, minuti: 0 } : percorso(sorgente, luogo, verso);
    if (!andata || !ritorno) continue;
    for (const fascia of indice.fasceApertura(luogo, data)) {
      const inizio = Math.max(inizioSpazio + andata.minuti, fascia.apertura);
      const fine = inizio + durata;
      if (fine > fascia.chiusura || fine > entro || fine + ritorno.minuti > fineSpazio) continue;
      const nuovi: Elemento[] = [];
      const nuovoId = (): string => {
        const id = `N${lavoro.viaggio.prossimoNumeroId}`;
        lavoro.viaggio.prossimoNumeroId += 1;
        return id;
      };
      if (da !== luogo) {
        const s: ElementoSpostamento = {
          id: nuovoId(),
          tipo: "spostamento",
          inizio: orario(inizio - andata.minuti),
          fine: orario(inizio),
          orarioFisso: false,
          da,
          a: luogo,
          mezzo: andata.mezzo,
        };
        nuovi.push(s);
        lavoro.motivi.set(s.id, `porta a «${indice.nomeLuogo(luogo)}» per ${causa}`);
      }
      const attivita: ElementoAttivita = {
        id: nuovoId(),
        tipo: "attivita",
        inizio: orario(inizio),
        fine: orario(fine),
        orarioFisso: false,
        attivitaId: servizio.id,
        priorita: "irrinunciabile",
      };
      nuovi.push(attivita);
      lavoro.motivi.set(
        attivita.id,
        `serve per ${causa}: ${minutiTesto(durata)} a «${indice.nomeLuogo(luogo)}», il luogo più vicino all'alloggio, nello spazio libero entro le ${orario(entro)}`,
      );
      if (verso !== undefined && verso !== luogo) {
        const s: ElementoSpostamento = {
          id: nuovoId(),
          tipo: "spostamento",
          inizio: orario(fine),
          fine: orario(fine + ritorno.minuti),
          orarioFisso: false,
          da: luogo,
          a: verso,
          mezzo: ritorno.mezzo,
        };
        nuovi.push(s);
        lavoro.motivi.set(s.id, `riporta a «${indice.nomeLuogo(verso)}» dopo ${indice.descrivi(attivita)}`);
      }
      impostaElementi(lavoro, data, [...elementi, ...nuovi]);
      return true;
    }
  }
  return false;
}

/** Le alternative e gli elementi a rischio di R2-BAG (volo di arrivo) e R2-DOC (polizia, orari fissi dei giorni dopo). */
function alternativeServizio(lavoro: Lavoro, imprevisto: ImprevistoBagaglioSmarrito | ImprevistoDocumentiSmarriti): void {
  const { indice } = lavoro;
  if (imprevisto.tipo === "BAGAGLIO_SMARRITO") {
    // Il volo di arrivo: il primo spostamento in volo del primo giorno del viaggio.
    const primo = lavoro.originale.giorni[0];
    const volo = primo?.elementi.find((e) => e.tipo === "spostamento" && e.mezzo === "volo");
    if (primo && volo) {
      lavoro.alternativeExtra.push(
        ...costruisciAlternative([{ data: primo.data, elemento: volo }], indice).filter((a) => a.tipo === "gestione_prenotazione"),
      );
    }
    return;
  }
  lavoro.alternativeExtra.push(alternativaPolizia());
  for (const giorno of lavoro.originale.giorni) {
    if (giorno.data <= imprevisto.data) continue;
    for (const e of giorno.elementi) {
      if (eFisso(e)) lavoro.aRischio.set(e.id, "serve un documento valido");
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------
// R2-STA: stanchezza

/**
 * Si rimuovono le attività colpite fino a lasciare il numero del ritmo `lento` (pasti esclusi), partendo dalle
 * `opzionali` e dall'intensità più alta (a parità, R-RIT-3: inizio più presto, poi id); pasti, irrinunciabili e
 * orari fissi restano.
 */
export function ripianificaStanchezza(lavoro: Lavoro, imprevisto: ImprevistoStanchezza, impatto: ImpattoDettagliato): void {
  const { indice } = lavoro;
  const data = imprevisto.data;
  const giorno = giornoDi(lavoro.viaggio, data);
  if (!giorno || impatto.elementiColpiti.length === 0) return;
  const limite = ATTIVITA_PER_RITMO.lento;
  const nonPasti = (elementi: readonly Elemento[]): ElementoAttivita[] =>
    elementi.filter((e): e is ElementoAttivita => e.tipo === "attivita" && indice.attivitaDi(e).categoria !== "pasto");
  const presenti = nonPasti(elementiDel(lavoro, data)).length;
  if (presenti <= limite) {
    lavoro.note.push(
      `Per la stanchezza il ${data} si lasciano al massimo ${limite} attività (ritmo lento, pasti esclusi): ` +
        `la giornata ne ha già ${presenti}, quindi non c'è nulla da togliere.`,
    );
    return;
  }
  const colpiti = new Set(impatto.elementiColpiti.map((c) => c.elementoId));
  const intensita = (e: ElementoAttivita): number => {
    const valore = indice.attivitaDi(e).intensita;
    return valore === undefined ? 0 : GRADO_INTENSITA[valore];
  };
  const daTogliere = nonPasti(elementiDel(lavoro, data))
    .filter((e) => colpiti.has(e.id))
    .sort(
      (a, b) =>
        ORDINE_PRIORITA[prioritaDi(a)] - ORDINE_PRIORITA[prioritaDi(b)] ||
        intensita(b) - intensita(a) ||
        minuti(a.inizio) - minuti(b.inizio) ||
        confronta(a.id, b.id),
    )
    .slice(0, presenti - limite);
  for (const x of daTogliere) {
    const elementi = elementiDel(lavoro, data);
    const i = elementi.findIndex((e) => e.id === x.id);
    lavoro.motivi.set(
      x.id,
      `rimossa per la stanchezza: la giornata scende a ${limite} attività (ritmo lento); si tolgono prima le opzionali e le più impegnative`,
    );
    rimuoviAttivitaConSpostamenti(lavoro, data, elementi, x, contornoAttivita(indice, giorno, elementi, i));
  }
  const rimaste = nonPasti(elementiDel(lavoro, data)).length;
  lavoro.note.push(
    `Per la stanchezza il ${data} si lasciano al massimo ${limite} attività (ritmo lento, pasti esclusi): ` +
      `si tolgono ${elenca(daTogliere.map((e) => indice.descrivi(e)))}` +
      (rimaste > limite ? `; ne restano ${rimaste} perché le altre sono pasti, irrinunciabili o a orario fisso.` : "."),
  );
}
