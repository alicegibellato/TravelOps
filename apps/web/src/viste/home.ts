/**
 * Dati per la home (REQ-UX-001): una scheda per ogni viaggio, con titolo, variante, periodo, giorni, viaggiatori e
 * stato. Dalla REQ-UX-003 (CA-2) i viaggi sono quelli della base dati, demo e creati dal viaggiatore (dalla chat o dai
 * filtri), raccolti in `src/dati/viaggi-salvati.ts`; i viaggi di riferimento restano caricati e validati dal motore
 * (`src/dati/viaggi.ts`).
 */
import type { Catalogo, Viaggio } from "@travelops/engine";
import type { ViaggioSalvato } from "../basedati";
import type { StatoViaggio } from "../testi";
import { caricaViaggioScelto, type VoceViaggio } from "../dati/viaggi";
import { percorsoBozza, percorsoViaggio } from "../percorsi";
import { stagioneDellaData, tipoDelLuogo, type Stagione, type TipoLuogo } from "../ui/luoghi-config";
import { periodo } from "./etichette";

export interface SchedaViaggioHome {
  chiave: string;
  href: string;
  titolo: string;
  /** La variante in parole, per esempio "Con il volo di ritorno". */
  variante: string;
  descrizione: string;
  /** Per esempio "12–14 giugno 2026"; `null` se i dati non sono validi. */
  periodo: string | null;
  /** Il luogo del viaggio, per esempio "Alto Garda" (la zona dell'alloggio del primo giorno). */
  luogo: string;
  /** Il tipo di luogo e la stagione delle date: scelgono l'illustrazione (ST-UX-004B, CB-3). */
  tipoLuogo: TipoLuogo;
  stagione: Stagione | undefined;
  /** Per esempio "3 giorni · 2 viaggiatori". */
  dettagli: string | null;
  stato: StatoViaggio;
  /** Vero se il motore ha trovato errori nei dati: la scheda lo dice invece di mostrare le date. */
  datiNonValidi: boolean;
}

/**
 * I viaggi dell'ondata 1 sono itinerari già confermati (hanno la versione 1 dello storico); lo stato "In corso" e
 * "Concluso" dipende dall'orologio e arriverà con la base dati (REQ-DATA-001) e la vista "Oggi" (REQ-TODAY-001).
 */
const STATO_VIAGGI_DI_RIFERIMENTO: StatoViaggio = "confermato";

function plurale(n: number, singolare: string, plurali: string): string {
  return `${n} ${n === 1 ? singolare : plurali}`;
}

/** Il luogo del viaggio: la zona dell'alloggio (o del luogo di partenza) del primo giorno; senza, il titolo. */
function luogoDelViaggio(viaggio: Viaggio, catalogo: Catalogo): string {
  const primo = viaggio.giorni[0];
  const luogo = catalogo.luoghi.find((l) => l.id === (primo?.alloggio ?? primo?.luogoPartenza));
  return catalogo.zone.find((z) => z.id === luogo?.zonaId)?.nome ?? viaggio.titolo;
}

export function schedaViaggio(voce: VoceViaggio): SchedaViaggioHome {
  const esito = caricaViaggioScelto(voce.chiave);
  const base = {
    chiave: voce.chiave,
    href: percorsoViaggio(voce.chiave),
    variante: voce.etichetta,
    descrizione: voce.descrizione,
    stato: STATO_VIAGGI_DI_RIFERIMENTO,
  };
  if (esito === null || !esito.ok) {
    return { ...base, titolo: voce.etichetta, luogo: voce.etichetta, tipoLuogo: "generico", stagione: undefined, periodo: null, dettagli: null, datiNonValidi: true };
  }
  const { viaggio, catalogo } = esito;
  const luogo = luogoDelViaggio(viaggio, catalogo);
  return {
    ...base,
    titolo: viaggio.titolo,
    luogo,
    tipoLuogo: tipoDelLuogo(`${luogo} ${viaggio.titolo}`),
    stagione: stagioneDellaData(viaggio.dataInizio),
    ...periodoEDettagli(viaggio),
    datiNonValidi: false,
  };
}

function periodoEDettagli(viaggio: Viaggio): { periodo: string; dettagli: string } {
  return {
    periodo: periodo(viaggio.dataInizio, viaggio.dataFine),
    dettagli: `${plurale(viaggio.giorni.length, "giorno", "giorni")} · ${plurale(viaggio.numeroViaggiatori, "viaggiatore", "viaggiatori")}`,
  };
}

function descrizioneSalvato(salvato: Pick<ViaggioSalvato, "stato" | "demo">): string {
  if (salvato.stato === "bozza") return salvato.demo ? "Una bozza di esempio da completare" : "La tua bozza: continua a sistemarla";
  return salvato.demo ? "Un viaggio di esempio, pronto da consultare" : "Il tuo itinerario confermato";
}

/**
 * La scheda di un viaggio della base dati che non è di riferimento (REQ-UX-003, CA-2): una bozza porta alla sua pagina
 * della bozza, un viaggio confermato alla sua pagina. `viaggio` è la versione corrente (confermato) o l'ultima revisione
 * della bozza; `null` se non si può leggere.
 */
export function schedaViaggioSalvato(
  salvato: Pick<ViaggioSalvato, "id" | "titolo" | "stato" | "demo" | "destinazione">,
  viaggio: Viaggio | null,
): SchedaViaggioHome {
  const destinazione = salvato.destinazione ?? "";
  const base = {
    chiave: salvato.id,
    href: salvato.stato === "bozza" ? percorsoBozza(salvato.id) : percorsoViaggio(salvato.id),
    titolo: salvato.titolo,
    // La destinazione fa da variante, se il titolo non la dice già.
    variante: destinazione !== "" && !salvato.titolo.toLowerCase().includes(destinazione.toLowerCase()) ? destinazione : "",
    descrizione: descrizioneSalvato(salvato),
    stato: salvato.stato,
    // Il luogo è la destinazione salvata (senza, il titolo): sceglie anche l'illustrazione (ST-UX-004B, CB-3).
    luogo: destinazione !== "" ? destinazione : salvato.titolo,
    tipoLuogo: tipoDelLuogo(`${destinazione} ${salvato.titolo}`),
  };
  if (viaggio === null) return { ...base, stagione: undefined, periodo: null, dettagli: null, datiNonValidi: true };
  return { ...base, stagione: stagioneDellaData(viaggio.dataInizio), ...periodoEDettagli(viaggio), datiNonValidi: false };
}

export function vistaHome(viaggi: readonly VoceViaggio[]): SchedaViaggioHome[] {
  return viaggi.map(schedaViaggio);
}
