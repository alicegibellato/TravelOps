/**
 * Le pagine con la vista Oggi (REQ-TODAY-001): la pagina Oggi di un viaggio e la vista viaggio di un viaggio in corso,
 * che sul telefono si apre sulla scheda "Oggi" (CA-3). Le pagine di `app/` leggono solo l'orologio simulato e lo
 * stato; tutto il resto è qui, così i test lo verificano senza avviare Next.js.
 */
import type { MeteoViaggio } from "@travelops/sources";
import type { EsitoDati } from "../dati/carica";
import type { DatiOggi } from "../oggi/operazioni";
import { vistaOggi } from "../oggi/vista";
import { NotificheMonitoraggio, type NotificaVista } from "./NotificheMonitoraggio";
import { LayoutViaggio } from "../ui/LayoutViaggio";
import { datiMappa } from "../viste/mappa";
import { vistaViaggio } from "../viste/viaggio";
import { Avviso } from "./Avvisi";
import { ErroriDati } from "./ErroriDati";
import { PannelloOggi, type AzioniOggi } from "./PannelloOggi";
import { SceltaViaggio } from "./SceltaViaggio";
import { SezioneMappa } from "./SezioneMappa";
import { VistaViaggio } from "./VistaViaggio";

/** La mappa del giorno dell'orologio simulato, se il viaggio quel giorno è in corso. */
function MappaDiOggi({ dati }: { dati: DatiOggi }) {
  const mappa = datiMappa(dati.viaggio, dati.catalogo, dati.momento.data);
  return mappa === null ? null : <SezioneMappa dati={mappa} idTitolo="oggi-mappa-titolo" titolo="Mappa di oggi" />;
}

/** La pagina Oggi di un viaggio, su tutti gli schermi. */
export function ContenutoOggi({
  chiave,
  dati,
  azioni,
  errore = null,
  notifiche = [],
  meteo,
}: {
  chiave: string;
  dati: DatiOggi;
  azioni: AzioniOggi;
  errore?: string | null;
  /** Gli imprevisti nuovi trovati dal monitoraggio (REQ-MONITOR-001), con il link alla proposta. */
  notifiche?: readonly NotificaVista[];
  /** La previsione per giorno (REQ-INTEG-001): quella di oggi sta nel pannello Oggi. */
  meteo?: MeteoViaggio | undefined;
}) {
  return (
    <>
      <SceltaViaggio attiva={chiave} />
      {errore !== null && <Avviso livello="errore" messaggio={errore} />}
      <NotificheMonitoraggio notifiche={notifiche} />
      <div className="oggi-pagina">
        <PannelloOggi chiave={chiave} vista={vistaOggi(dati.viaggio, dati.catalogo, dati.momento)} azioni={azioni} livello={1} meteo={meteo?.perGiorno[dati.momento.data]} />
        <MappaDiOggi dati={dati} />
      </div>
    </>
  );
}

/**
 * La vista viaggio di un viaggio in corso: itinerario, mappa di oggi e, sul telefono, la scheda "Oggi", che è quella
 * aperta all'inizio.
 */
export function ContenutoViaggioInCorso({ chiave, esito, dati, azioni, meteo }: { chiave: string; esito: EsitoDati; dati: DatiOggi; azioni: AzioniOggi; meteo?: MeteoViaggio | undefined }) {
  if (!esito.ok) {
    return (
      <>
        <SceltaViaggio attiva={chiave} />
        <ErroriDati errori={esito.errori} />
      </>
    );
  }
  return (
    <>
      <SceltaViaggio attiva={chiave} />
      <LayoutViaggio
        itinerario={<VistaViaggio chiave={chiave} vista={vistaViaggio(esito.viaggio, esito.catalogo)} />}
        mappa={<MappaDiOggi dati={dati} />}
        oggi={<PannelloOggi chiave={chiave} vista={vistaOggi(dati.viaggio, dati.catalogo, dati.momento)} azioni={azioni} meteo={meteo?.perGiorno[dati.momento.data]} />}
        iniziale="oggi"
      />
    </>
  );
}
