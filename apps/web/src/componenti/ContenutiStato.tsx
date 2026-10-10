/**
 * Contenuto delle pagine che leggono lo stato locale (REQ-WEB-002): Demo, proposta, versioni e viste di una
 * versione. Le pagine di `app/` leggono il file e passano qui l'esito; tutto il resto è qui, così i test lo
 * verificano senza avviare Next.js.
 */
import type { MeteoViaggio } from "@travelops/sources";
import type { ReactNode } from "react";
import { catalogoDiRiferimento } from "../dati/scenari";
import { percorsoVersione } from "../percorsi";
import { trovaProposta } from "../stato/operazioni";
import type { EsitoLetturaStato, StatoDemo } from "../stato/stato";
import { vistaDemo } from "../viste/demo";
import { dettagliDelGiorno, dettaglioElemento } from "../viste/elemento";
import { vistaGiorno } from "../viste/giorno";
import { datiMappa } from "../viste/mappa";
import { vistaProposta } from "../viste/proposta";
import { vistaViaggio } from "../viste/viaggio";
import { leggiVersioneStato, segnaliGiornoVersione, vistaVersioni } from "../viste/versioni";
import type { Azione, AzioniDemo, AzioniProposta } from "./azioni";
import { LayoutViaggio } from "../ui/LayoutViaggio";
import { dataEstesa } from "../viste/etichette";
import { StatoNonValido } from "./Avvisi";
import { DettaglioElemento } from "./DettaglioElemento";
import { EvidenziazioneGiorno } from "./Evidenziazione";
import { PaginaDemo } from "./PaginaDemo";
import { PaginaProposta, PropostaNonDisponibile } from "./PaginaProposta";
import { IntestazioneVersione, PaginaVersioni } from "./PaginaVersioni";
import { SezioneMappa } from "./SezioneMappa";
import { VistaGiorno } from "./VistaGiorno";
import { VistaViaggio } from "./VistaViaggio";

function NonTrovato({ cosa }: { cosa: string }) {
  return (
    <section className="errori" role="alert">
      <h1>Non trovato</h1>
      <p>{cosa}</p>
    </section>
  );
}

/** Con uno stato non valido si mostra il motivo e "Ripristina"; altrimenti il contenuto. */
function ConStato({
  esito,
  ripristina,
  children,
}: {
  esito: EsitoLetturaStato;
  ripristina: Azione;
  children: (stato: StatoDemo) => ReactNode;
}) {
  return esito.ok ? <>{children(esito.stato)}</> : <StatoNonValido motivo={esito.motivo} azione={ripristina} />;
}

export function ContenutoDemo({ esito, azioni, errore = null }: { esito: EsitoLetturaStato; azioni: AzioniDemo; errore?: string | null }) {
  const vista = esito.ok ? vistaDemo(esito.stato, catalogoDiRiferimento()) : null;
  return <PaginaDemo esito={esito} vista={vista} azioni={azioni} errore={errore} />;
}

export function ContenutoProposta({
  esito,
  id,
  azioni,
  ripristina,
}: {
  esito: EsitoLetturaStato;
  id: number | null;
  azioni: AzioniProposta;
  ripristina: Azione;
}) {
  return (
    <ConStato esito={esito} ripristina={ripristina}>
      {(stato) => {
        const salvata = id === null ? null : trovaProposta(stato, id);
        return salvata === null ? (
          <PropostaNonDisponibile />
        ) : (
          <PaginaProposta vista={vistaProposta(salvata, stato, catalogoDiRiferimento())} azioni={azioni} />
        );
      }}
    </ConStato>
  );
}

export function ContenutoVersioni({
  esito,
  a,
  b,
  ripristina,
}: {
  esito: EsitoLetturaStato;
  a: number | null;
  b: number | null;
  ripristina: Azione;
}) {
  return (
    <ConStato esito={esito} ripristina={ripristina}>
      {(stato) => <PaginaVersioni vista={vistaVersioni(stato, catalogoDiRiferimento(), a, b)} />}
    </ConStato>
  );
}

interface ProprietaVersione {
  esito: EsitoLetturaStato;
  numero: number | null;
  ripristina: Azione;
  /** Previsione per giorno dei servizi esterni (REQ-INTEG-001); senza, nessuna previsione. */
  meteo?: MeteoViaggio;
}

/** Vista viaggio di una versione dello stato locale. */
export function ContenutoVersioneViaggio({ esito, numero, ripristina, meteo }: ProprietaVersione) {
  return (
    <ConStato esito={esito} ripristina={ripristina}>
      {(stato) => {
        const letta = numero === null ? null : leggiVersioneStato(stato, numero);
        if (letta === null || !letta.ok) return <NonTrovato cosa={letta?.ok === false ? letta.messaggio : "Versione inesistente."} />;
        const { versione } = letta;
        const catalogo = catalogoDiRiferimento();
        return (
          <>
            <IntestazioneVersione numero={versione.numero} causa={versione.causa} corrente={versione.corrente} />
            <VistaViaggio chiave="" radice={percorsoVersione(versione.numero)} vista={vistaViaggio(versione.viaggio, catalogo)} {...(meteo === undefined ? {} : { meteo })} />
          </>
        );
      }}
    </ConStato>
  );
}

/** Vista giorno di una versione, con i problemi di fattibilità accanto agli elementi coinvolti e la mappa. */
export function ContenutoVersioneGiorno({ esito, numero, ripristina, data, meteo }: ProprietaVersione & { data: string }) {
  return (
    <ConStato esito={esito} ripristina={ripristina}>
      {(stato) => {
        const letta = numero === null ? null : leggiVersioneStato(stato, numero);
        if (letta === null || !letta.ok) return <NonTrovato cosa={letta?.ok === false ? letta.messaggio : "Versione inesistente."} />;
        const { versione } = letta;
        const catalogo = catalogoDiRiferimento();
        const vista = vistaGiorno(versione.viaggio, catalogo, data);
        const mappa = datiMappa(versione.viaggio, catalogo, data);
        const segnali = segnaliGiornoVersione(stato, versione.viaggio, catalogo, data, meteo?.previsioni);
        return (
          <>
            <IntestazioneVersione numero={versione.numero} causa={versione.causa} corrente={versione.corrente} />
            {vista === null || mappa === null || segnali === null ? (
              <NonTrovato cosa={`La versione ${versione.numero} non ha il giorno ${dataEstesa(data)}.`} />
            ) : (
              <EvidenziazioneGiorno>
                <LayoutViaggio
                  itinerario={
                    <VistaGiorno
                      chiave=""
                      radice={percorsoVersione(versione.numero)}
                      vista={vista}
                      segnali={segnali}
                      dettagli={dettagliDelGiorno(versione.viaggio, catalogo, data)}
                      {...(meteo?.perGiorno[data] === undefined ? {} : { meteo: meteo.perGiorno[data] })}
                    />
                  }
                  mappa={<SezioneMappa dati={mappa} />}
                />
              </EvidenziazioneGiorno>
            )}
          </>
        );
      }}
    </ConStato>
  );
}

/** Dettaglio di un elemento in una versione. */
export function ContenutoVersioneElemento({ esito, numero, ripristina, id }: ProprietaVersione & { id: string }) {
  return (
    <ConStato esito={esito} ripristina={ripristina}>
      {(stato) => {
        const letta = numero === null ? null : leggiVersioneStato(stato, numero);
        if (letta === null || !letta.ok) return <NonTrovato cosa={letta?.ok === false ? letta.messaggio : "Versione inesistente."} />;
        const { versione } = letta;
        const dettaglio = dettaglioElemento(versione.viaggio, catalogoDiRiferimento(), id);
        return (
          <>
            <IntestazioneVersione numero={versione.numero} causa={versione.causa} corrente={versione.corrente} />
            {dettaglio === null ? (
              <NonTrovato cosa={`Questo elemento non fa parte della versione ${versione.numero}.`} />
            ) : (
              <DettaglioElemento chiave="" radice={percorsoVersione(versione.numero)} dettaglio={dettaglio} />
            )}
          </>
        );
      }}
    </ConStato>
  );
}
