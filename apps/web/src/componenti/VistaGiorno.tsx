import Link from "next/link";
import { percorsoElemento, percorsoGiorno, percorsoViaggio } from "../percorsi";
import type { VistaGiorno as DatiVistaGiorno } from "../viste/giorno";
import { Prenotazione } from "./Prenotazione";

/**
 * Vista giorno: gli elementi in ordine con orari, tipo, attività o tratta, mezzo, priorità, orario fisso e
 * prenotazione (codice e link di gestione).
 */
export function VistaGiorno({ chiave, vista }: { chiave: string; vista: DatiVistaGiorno }) {
  return (
    <section className="vista-giorno" aria-labelledby="giorno-titolo">
      <nav className="navigazione-giorni" aria-label="Giorni">
        <Link href={percorsoViaggio(chiave)}>Tutto il viaggio</Link>
        {vista.dataPrecedente !== null && (
          <Link href={percorsoGiorno(chiave, vista.dataPrecedente)} rel="prev">
            ← Giorno precedente
          </Link>
        )}
        {vista.dataSuccessiva !== null && (
          <Link href={percorsoGiorno(chiave, vista.dataSuccessiva)} rel="next">
            Giorno successivo →
          </Link>
        )}
      </nav>
      <h1 id="giorno-titolo">
        Giorno {vista.numero}: <time dateTime={vista.data}>{vista.dataEstesa}</time>
      </h1>
      <p className="sottotitolo">
        Partenza da {vista.luogoPartenza.nome}
        <span className="separatore" aria-hidden="true">
          ·
        </span>
        {vista.alloggio === null ? "Nessun alloggio: ultimo giorno del viaggio" : `Alloggio: ${vista.alloggio.nome}`}
      </p>
      {vista.elementi.length === 0 ? (
        <p>Nessun elemento in programma.</p>
      ) : (
        <table className="tabella elementi">
          <caption>Programma del giorno</caption>
          <thead>
            <tr>
              <th scope="col">Orario</th>
              <th scope="col">Tipo</th>
              <th scope="col">Attività o tratta</th>
              <th scope="col">Mezzo</th>
              <th scope="col">Priorità</th>
              <th scope="col">Orario fisso</th>
              <th scope="col">Prenotazione</th>
            </tr>
          </thead>
          <tbody>
            {vista.elementi.map((riga) => (
              <tr key={riga.id} data-elemento={riga.id} className={`elemento elemento--${riga.tipo}`}>
                <td className="orario">
                  <time>{riga.inizio}</time>–<time>{riga.fine}</time>
                </td>
                <td>{riga.tipoEtichetta}</td>
                <td>
                  <Link href={percorsoElemento(chiave, riga.id)}>{riga.descrizione}</Link>
                  <span className="id-elemento">{riga.id}</span>
                </td>
                <td>{riga.mezzo ?? <span className="assente">—</span>}</td>
                <td>{riga.priorita ?? <span className="assente">—</span>}</td>
                <td>
                  {riga.orarioFisso ? (
                    <span className="etichetta etichetta--fisso">Sì</span>
                  ) : (
                    <span className="assente">No</span>
                  )}
                </td>
                <td>
                  <Prenotazione prenotazione={riga.prenotazione} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
