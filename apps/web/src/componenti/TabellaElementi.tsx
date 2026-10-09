import Link from "next/link";
import { percorsoElementoDa } from "../percorsi";
import type { RigaElemento } from "../viste/giorno";
import { ETICHETTE_CAMBIO, type ProblemaVista, type SegnaliElemento, type SegnaliGiorno } from "../viste/segnalazioni";
import { Prenotazione } from "./Prenotazione";

/** Un problema di fattibilità accanto all'elemento coinvolto: in parole, il codice resta solo in `data-problema`. */
export function ProblemaInRiga({ problema }: { problema: ProblemaVista }) {
  return (
    <span className={`problema problema--${problema.gravita}`} data-problema={problema.codice}>
      <span className="problema__codice">
        {problema.gravitaEtichetta}: {problema.titolo}
      </span>
      <span className="problema__messaggio">{problema.messaggio}</span>
    </span>
  );
}

function Segnalazioni({ segnali }: { segnali: SegnaliElemento | undefined }) {
  if (segnali === undefined || (segnali.problemi.length === 0 && !segnali.aRischio && segnali.cambio === null)) {
    return <span className="assente">—</span>;
  }
  return (
    <span className="segnalazioni">
      {segnali.aRischio && <span className="etichetta etichetta--rischio">A rischio</span>}
      {segnali.cambio !== null && (
        <span className={`etichetta etichetta--${segnali.cambio}`}>{ETICHETTE_CAMBIO[segnali.cambio]}</span>
      )}
      {segnali.problemi.map((problema, indice) => (
        <ProblemaInRiga key={`${problema.codice}-${indice}`} problema={problema} />
      ))}
    </span>
  );
}

function classeRiga(riga: RigaElemento, segnali: SegnaliElemento | undefined): string {
  const classi = ["elemento", `elemento--${riga.tipo}`];
  if (segnali?.aRischio) classi.push("elemento--a-rischio");
  if (segnali !== undefined && segnali.problemi.length > 0) classi.push("elemento--con-problemi");
  if (segnali?.cambio) classi.push(`elemento--${segnali.cambio}`);
  return classi.join(" ");
}

interface Proprieta {
  righe: readonly RigaElemento[];
  /** Radice delle pagine degli elementi; senza radice la descrizione non è un link (per esempio in una proposta). */
  radice?: string;
  /** Se indicate, una colonna in più mostra problemi, elementi a rischio e cambi accanto agli elementi. */
  segnali?: SegnaliGiorno;
  didascalia?: string;
}

/**
 * Gli elementi di un giorno in ordine, con orari, tipo, attività o tratta, mezzo, priorità, orario fisso,
 * prenotazione (codice e link di gestione) e, se indicate, le segnalazioni. L'`id` di ogni elemento è solo in
 * `data-elemento` (REQ-UX-001, CA-6). Sul telefono ogni riga diventa una scheda e ogni cella mostra la sua etichetta
 * (`data-etichetta`), così la pagina non scorre in orizzontale (CA-4).
 */
export function TabellaElementi({ righe, radice, segnali, didascalia = "Programma del giorno" }: Proprieta) {
  return (
    <table className="tabella elementi tabella--schede">
      <caption>{didascalia}</caption>
      <thead>
        <tr>
          <th scope="col">Orario</th>
          <th scope="col">Tipo</th>
          <th scope="col">Attività o tratta</th>
          <th scope="col">Mezzo</th>
          <th scope="col">Priorità</th>
          <th scope="col">Orario fisso</th>
          <th scope="col">Prenotazione</th>
          {segnali !== undefined && <th scope="col">Segnalazioni</th>}
        </tr>
      </thead>
      <tbody>
        {righe.map((riga) => {
          const segnaliRiga = segnali?.perElemento[riga.id];
          return (
            <tr key={riga.id} data-elemento={riga.id} className={classeRiga(riga, segnaliRiga)}>
              <td className="orario" data-etichetta="Orario">
                <time>{riga.inizio}</time>–<time>{riga.fine}</time>
              </td>
              <td data-etichetta="Tipo">{riga.tipoEtichetta}</td>
              <td className="cella-principale" data-etichetta="Attività o tratta">
                {radice === undefined ? riga.descrizione : <Link href={percorsoElementoDa(radice, riga.id)}>{riga.descrizione}</Link>}
              </td>
              <td data-etichetta="Mezzo">{riga.mezzo ?? <span className="assente">—</span>}</td>
              <td data-etichetta="Priorità">{riga.priorita ?? <span className="assente">—</span>}</td>
              <td data-etichetta="Orario fisso">
                {riga.orarioFisso ? (
                  <span className="etichetta etichetta--fisso">Sì</span>
                ) : (
                  <span className="assente">No</span>
                )}
              </td>
              <td data-etichetta="Prenotazione">
                <Prenotazione prenotazione={riga.prenotazione} />
              </td>
              {segnali !== undefined && (
                <td data-etichetta="Segnalazioni">
                  <Segnalazioni segnali={segnaliRiga} />
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
