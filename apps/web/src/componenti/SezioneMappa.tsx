import type { DatiMappa } from "../viste/mappa";
import { MappaGiorno } from "./MappaGiorno";

/** Mappa del giorno, legenda delle attività numerate e, sotto la mappa, i luoghi senza coordinate. */
export function SezioneMappa({ dati }: { dati: DatiMappa }) {
  const vuota = dati.indicatori.length === 0 && dati.linee.length === 0;
  return (
    <section className="sezione-mappa" aria-labelledby="mappa-titolo">
      <h2 id="mappa-titolo">Mappa del giorno</h2>
      {vuota ? (
        <p className="mappa-vuota">Nessun luogo del giorno ha le coordinate: la mappa non è disponibile.</p>
      ) : (
        <MappaGiorno dati={dati} />
      )}
      {dati.indicatori.length > 0 && (
        <ol className="legenda" aria-label="Attività sulla mappa">
          {dati.indicatori.map((indicatore) => (
            <li key={indicatore.elementoId} data-elemento={indicatore.elementoId}>
              <span className="indicatore indicatore--legenda" aria-hidden="true">
                <span>{indicatore.numero}</span>
              </span>
              <span>
                {indicatore.attivita} <span className="assente">· {indicatore.orario} · {indicatore.nome}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
      {dati.luoghiSenzaCoordinate.length > 0 && (
        <div className="senza-coordinate">
          <h3>Luoghi senza coordinate</h3>
          <p>Questi luoghi non hanno coordinate nel catalogo e non compaiono sulla mappa.</p>
          <ul>
            {dati.luoghiSenzaCoordinate.map((luogo) => (
              <li key={luogo.luogoId} data-luogo={luogo.luogoId}>
                {luogo.nome} ({luogo.luogoId}) — {luogo.elementi.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
