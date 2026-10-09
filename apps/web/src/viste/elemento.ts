/**
 * Dati per il dettaglio di un elemento: tutti i campi; per un'attività anche categoria, all'aperto o al coperto,
 * durata tipica e orari di apertura del luogo. Gli `id` (dell'elemento, dell'attività, dei luoghi) restano nei dati ma
 * non nei campi mostrati (REQ-UX-001, CA-6).
 */
import {
  PRIORITA_PREDEFINITA,
  trovaAttivita,
  trovaLuogo,
  type Catalogo,
  type Elemento,
  type OrariApertura,
  type Viaggio,
} from "@travelops/engine";
import {
  dataEstesa,
  durata,
  ETICHETTE_CATEGORIA,
  ETICHETTE_MEZZO,
  ETICHETTE_PRIORITA,
  ETICHETTE_TIPO,
  ETICHETTE_TIPO_LUOGO,
  GIORNI_SETTIMANA,
  intervallo,
} from "./etichette";
import { descriviElemento, prenotazioneVista, type PrenotazioneVista } from "./giorno";
import { nomeZona, riferimentoLuogo } from "./luoghi";

export interface Campo {
  etichetta: string;
  valore: string;
}

export interface OrarioGiornoSettimana {
  giorno: string;
  /** Le fasce di apertura, per esempio "09:30–17:00"; vuoto se il luogo è chiuso. */
  fasce: string[];
}

/** Orari di apertura del luogo: sempre aperto, oppure le fasce di ogni giorno della settimana. */
export type OrariAperturaVista = { sempre: true } | { sempre: false; settimana: OrarioGiornoSettimana[] };

export interface DettaglioAttivita {
  attivitaId: string;
  nome: string;
  categoria: string;
  /** "All'aperto" o "Al coperto". */
  ambiente: string;
  durataTipica: string;
  luogo: { id: string; nome: string; tipo: string; zona: string };
  orariApertura: OrariAperturaVista | null;
}

export interface DettaglioElemento {
  id: string;
  tipo: Elemento["tipo"];
  titolo: string;
  data: string;
  dataEstesa: string;
  /** Tutti i campi dell'elemento, nell'ordine in cui si mostrano. */
  campi: Campo[];
  prenotazione: PrenotazioneVista | null;
  /** Solo per le attività: i dati del catalogo. */
  attivita: DettaglioAttivita | null;
}

export function orariAperturaVista(apertura: OrariApertura): OrariAperturaVista {
  if ("sempre" in apertura) return { sempre: true };
  return {
    sempre: false,
    settimana: GIORNI_SETTIMANA.map(({ chiave, nome }) => ({
      giorno: nome,
      fasce: (apertura.settimana[chiave] ?? []).map((fascia) => intervallo(fascia.apertura, fascia.chiusura)),
    })),
  };
}

function dettaglioAttivita(attivitaId: string, catalogo: Catalogo): DettaglioAttivita | null {
  const attivita = trovaAttivita(catalogo, attivitaId);
  if (attivita === null) return null;
  const luogo = trovaLuogo(catalogo, attivita.luogoId);
  return {
    attivitaId: attivita.id,
    nome: attivita.nome,
    categoria: ETICHETTE_CATEGORIA[attivita.categoria],
    ambiente: attivita.allAperto ? "All'aperto" : "Al coperto",
    durataTipica: durata(attivita.durataTipica),
    luogo: {
      id: attivita.luogoId,
      nome: luogo?.nome ?? attivita.luogoId,
      tipo: luogo === null ? "" : ETICHETTE_TIPO_LUOGO[luogo.tipo],
      zona: luogo === null ? "" : nomeZona(catalogo, luogo.zonaId),
    },
    orariApertura: luogo === null ? null : orariAperturaVista(luogo.apertura),
  };
}

function campiElemento(elemento: Elemento, data: string, catalogo: Catalogo): Campo[] {
  const campi: Campo[] = [
    { etichetta: "Tipo", valore: ETICHETTE_TIPO[elemento.tipo] },
    { etichetta: "Giorno", valore: dataEstesa(data) },
    { etichetta: "Inizio", valore: elemento.inizio },
    { etichetta: "Fine", valore: elemento.fine },
  ];
  if (elemento.tipo === "attivita") {
    campi.push(
      { etichetta: "Attività", valore: descriviElemento(elemento, catalogo) },
      { etichetta: "Priorità", valore: ETICHETTE_PRIORITA[elemento.priorita ?? PRIORITA_PREDEFINITA] },
    );
  } else {
    const da = riferimentoLuogo(catalogo, elemento.da);
    const a = riferimentoLuogo(catalogo, elemento.a);
    campi.push(
      { etichetta: "Partenza", valore: da.nome },
      { etichetta: "Arrivo", valore: a.nome },
      { etichetta: "Mezzo", valore: ETICHETTE_MEZZO[elemento.mezzo] },
    );
  }
  campi.push({ etichetta: "Orario fisso", valore: elemento.orarioFisso === true ? "Sì" : "No" });
  if (elemento.prenotazione === undefined) {
    campi.push({ etichetta: "Prenotazione", valore: "Nessuna" });
  } else {
    campi.push(
      { etichetta: "Fornitore", valore: elemento.prenotazione.fornitore },
      { etichetta: "Codice di prenotazione", valore: elemento.prenotazione.codice },
      { etichetta: "Link di gestione", valore: elemento.prenotazione.linkGestione ?? "Non indicato" },
    );
  }
  return campi;
}

/** Il dettaglio dell'elemento con quell'id, cercato in tutti i giorni del viaggio; `null` se non esiste. */
export function dettaglioElemento(viaggio: Viaggio, catalogo: Catalogo, id: string): DettaglioElemento | null {
  for (const giorno of viaggio.giorni) {
    const elemento = giorno.elementi.find((voce) => voce.id === id);
    if (elemento === undefined) continue;
    return {
      id: elemento.id,
      tipo: elemento.tipo,
      titolo: descriviElemento(elemento, catalogo),
      data: giorno.data,
      dataEstesa: dataEstesa(giorno.data),
      campi: campiElemento(elemento, giorno.data, catalogo),
      prenotazione: prenotazioneVista(elemento),
      attivita: elemento.tipo === "attivita" ? dettaglioAttivita(elemento.attivitaId, catalogo) : null,
    };
  }
  return null;
}
