import { dataEstesa } from "../viste/etichette";
import type { DatiMappa } from "../viste/mappa";
import { LegendaMappa } from "./LegendaMappa";
import { MappaGiorno } from "./MappaGiorno";

interface Proprieta {
  dati: DatiMappa;
  /** `id` del titolo: va cambiato se la stessa pagina mostra più mappe (per esempio /stile). */
  idTitolo?: string;
  titolo?: string;
}

/** Mappa del giorno, legenda delle attività numerate e, sotto la mappa, i luoghi senza coordinate. */
export function SezioneMappa({ dati, idTitolo = "mappa-titolo", titolo = "Mappa del giorno" }: Proprieta) {
  const vuota = dati.indicatori.length === 0 && dati.linee.length === 0;
  return (
    <section className="sezione-mappa" aria-labelledby={idTitolo}>
      <h2 id={idTitolo}>{titolo}</h2>
      {vuota ? (
        <p className="mappa-vuota">Nessun luogo del giorno ha le coordinate: la mappa non è disponibile.</p>
      ) : (
        <MappaGiorno dati={dati} etichetta={`Mappa di ${dataEstesa(dati.data)}${titolo === "Mappa del giorno" ? "" : ` (${titolo})`}`} />
      )}
      {dati.indicatori.length > 0 && (
        <LegendaMappa indicatori={dati.indicatori} />
      )}
      {dati.luoghiSenzaCoordinate.length > 0 && (
        <div className="senza-coordinate">
          <h3>Luoghi senza coordinate</h3>
          <p>Questi luoghi non hanno coordinate nel catalogo e non compaiono sulla mappa.</p>
          <ul>
            {dati.luoghiSenzaCoordinate.map((luogo) => (
              <li key={luogo.luogoId} data-luogo={luogo.luogoId} data-elementi={luogo.elementi.join(" ")}>
                {luogo.nome} — {luogo.usatoDa.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
