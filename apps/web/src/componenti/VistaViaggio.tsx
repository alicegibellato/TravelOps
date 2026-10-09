import Link from "next/link";
import { percorsoGiornoDa, percorsoViaggio } from "../percorsi";
import type { VistaViaggio as DatiVistaViaggio } from "../viste/viaggio";

interface Proprieta {
  chiave: string;
  vista: DatiVistaViaggio;
  /** Indirizzo della vista viaggio; se manca è quello del viaggio di riferimento con questa chiave. */
  radice?: string;
}

/** Vista viaggio: titolo, date e, per ogni giorno, una scheda con luogo di partenza, alloggio e numero di elementi. */
export function VistaViaggio({ chiave, vista, radice = percorsoViaggio(chiave) }: Proprieta) {
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
      <ol className="giorni-viaggio" aria-label="Giorni del viaggio">
        {vista.giorni.map((giorno) => (
          <li key={giorno.data} data-data={giorno.data} className="giorno-viaggio">
            <p className="giorno-viaggio__numero">Giorno {giorno.numero}</p>
            <h2 className="giorno-viaggio__data">
              <Link href={percorsoGiornoDa(radice, giorno.data)} className="giorno-viaggio__link">
                <time dateTime={giorno.data}>{giorno.dataEstesa}</time>
              </Link>
            </h2>
            <dl className="giorno-viaggio__dati">
              <div>
                <dt>Partenza da</dt>
                <dd>{giorno.luogoPartenza.nome}</dd>
              </div>
              <div>
                <dt>Alloggio della notte</dt>
                <dd>{giorno.alloggio === null ? "Nessuno (fine del viaggio)" : giorno.alloggio.nome}</dd>
              </div>
              <div>
                <dt>Programma</dt>
                <dd>{giorno.numeroElementi === 1 ? "1 elemento" : `${giorno.numeroElementi} elementi`}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
    </section>
  );
}
