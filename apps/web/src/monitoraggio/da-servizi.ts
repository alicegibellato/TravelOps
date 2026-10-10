// Adattatore verso le porte Meteo ed Eventi di ST-INTEG-001 (@travelops/sources): traduce i loro risultati in `SorgenteCondizioni`.
//
// ServizioMeteo.previsione e ServizioEventi.cerca rispondono con RisultatoServizio<T> ({ disponibile, dati } oppure
// { disponibile: false, messaggio }), compatibile con RisultatoCondizioni del motore. Le fasce di PrevisioneGiorno hanno
// gia' la forma di FasciaCondizione.
//
// Eventi: l'`Evento` di INTEG-001 ha il luogo come testo libero e nessun effetto sull'accessibilita': l'adattatore non
// puo' dire se un luogo del catalogo sia chiuso, quindi non produce chiusure (`chiudeLuogo` resta falso) finche' un fornitore
// reale non indichera' l'effetto dell'evento. Gli eventi informativi non generano imprevisti.
import type { EventoLocale, FasciaCondizione, SorgenteCondizioni } from "@travelops/engine";
import { creaServizi, leggiConfigurazioneServizi, type Ambiente, type ServiziEsterni } from "@travelops/sources";

export function sorgenteDaServizi(servizi: Pick<ServiziEsterni, "meteo" | "eventi">): SorgenteCondizioni {
  return {
    async meteo({ coordinate, data }) {
      if (coordinate === null) return { disponibile: false, messaggio: "Meteo non disponibile: la zona non ha coordinate" };
      const r = await servizi.meteo.previsione({ coordinate, dataInizio: data, dataFine: data });
      if (!r.disponibile) return { disponibile: false, messaggio: r.messaggio };
      const fasce: FasciaCondizione[] = r.dati.filter((g) => g.data === data).flatMap((g) => g.fasce);
      return { disponibile: true, dati: fasce };
    },
    async eventi({ coordinate, data }) {
      if (coordinate === null) return { disponibile: true, dati: [] };
      const r = await servizi.eventi.cerca({ coordinate, dataInizio: data, dataFine: data });
      if (!r.disponibile) return { disponibile: false, messaggio: r.messaggio };
      // Nessun evento del fornitore chiude un luogo del catalogo (vedi sopra): risposta valida, nessuna chiusura.
      const chiusure: EventoLocale[] = [];
      return { disponibile: true, dati: chiusure };
    },
  };
}

export function sorgenteDaAmbiente(env: Ambiente = process.env): SorgenteCondizioni {
  return sorgenteDaServizi(creaServizi(leggiConfigurazioneServizi(env)));
}
