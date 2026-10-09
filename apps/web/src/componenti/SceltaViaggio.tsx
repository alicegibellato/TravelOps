import Link from "next/link";
import { VIAGGI } from "../dati/viaggi";
import { percorsoGiorno, percorsoViaggio } from "../percorsi";

interface Proprieta {
  /** Chiave del viaggio mostrato. */
  attiva: string;
  /** Se indicata, ogni scelta porta allo stesso giorno dell'altro viaggio. */
  data?: string;
}

/** Scelta del viaggio: versione 1 di riferimento e varianti V-IRR, V-FISSO, V-VOLO. */
export function SceltaViaggio({ attiva, data }: Proprieta) {
  return (
    <nav className="scelta-viaggio" aria-label="Scelta del viaggio">
      <span className="scelta-viaggio__titolo">Viaggio:</span>
      <ul>
        {VIAGGI.map((voce) => {
          const corrente = voce.chiave === attiva;
          const href = data === undefined ? percorsoViaggio(voce.chiave) : percorsoGiorno(voce.chiave, data);
          return (
            <li key={voce.chiave}>
              <Link
                href={href}
                className={corrente ? "scelta-viaggio__voce scelta-viaggio__voce--attiva" : "scelta-viaggio__voce"}
                aria-current={corrente ? "page" : undefined}
                title={voce.descrizione}
              >
                {voce.etichetta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
