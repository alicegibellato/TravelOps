import Link from "next/link";
import { percorsoGiorno } from "../percorsi";
import type { VistaViaggio as DatiVistaViaggio } from "../viste/viaggio";

/** Vista viaggio: titolo, date e, per ogni giorno, luogo di partenza, alloggio e numero di elementi. */
export function VistaViaggio({ chiave, vista }: { chiave: string; vista: DatiVistaViaggio }) {
  return (
    <section className="vista-viaggio" aria-labelledby="viaggio-titolo">
      <h1 id="viaggio-titolo">{vista.titolo}</h1>
      <p className="sottotitolo">
        Dal <time dateTime={vista.dataInizio}>{vista.dataInizioEstesa}</time> a{" "}
        <time dateTime={vista.dataFine}>{vista.dataFineEstesa}</time>
        <span className="separatore" aria-hidden="true">
          ·
        </span>
        {vista.numeroViaggiatori} {vista.numeroViaggiatori === 1 ? "viaggiatore" : "viaggiatori"}
        <span className="separatore" aria-hidden="true">
          ·
        </span>
        fuso orario {vista.fusoOrario}
      </p>
      <table className="tabella giorni">
        <caption>Giorni del viaggio</caption>
        <thead>
          <tr>
            <th scope="col">Giorno</th>
            <th scope="col">Data</th>
            <th scope="col">Partenza da</th>
            <th scope="col">Alloggio della notte</th>
            <th scope="col" className="numero">
              Elementi
            </th>
          </tr>
        </thead>
        <tbody>
          {vista.giorni.map((giorno) => (
            <tr key={giorno.data} data-data={giorno.data}>
              <td>Giorno {giorno.numero}</td>
              <td>
                <Link href={percorsoGiorno(chiave, giorno.data)}>
                  <time dateTime={giorno.data}>{giorno.dataEstesa}</time>
                </Link>
              </td>
              <td>{giorno.luogoPartenza.nome}</td>
              <td>{giorno.alloggio === null ? "Nessuno (fine del viaggio)" : giorno.alloggio.nome}</td>
              <td className="numero">{giorno.numeroElementi}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
