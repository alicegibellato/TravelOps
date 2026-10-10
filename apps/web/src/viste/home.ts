/**
 * Dati per la home (REQ-UX-001): una scheda per ogni viaggio, con titolo, variante, periodo, giorni, viaggiatori e
 * stato. I viaggi sono quelli di riferimento, caricati e validati dal motore (`src/dati/viaggi.ts`).
 */
import type { Catalogo, Viaggio } from "@travelops/engine";
import type { StatoViaggio } from "../testi";
import { caricaViaggioScelto, type VoceViaggio } from "../dati/viaggi";
import { percorsoViaggio } from "../percorsi";
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
    periodo: periodo(viaggio.dataInizio, viaggio.dataFine),
    dettagli: `${plurale(viaggio.giorni.length, "giorno", "giorni")} · ${plurale(viaggio.numeroViaggiatori, "viaggiatore", "viaggiatori")}`,
    datiNonValidi: false,
  };
}

export function vistaHome(viaggi: readonly VoceViaggio[]): SchedaViaggioHome[] {
  return viaggi.map(schedaViaggio);
}
