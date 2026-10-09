import Link from "next/link";
import { VIAGGI } from "../src/dati/viaggi";
import { percorsoViaggio } from "../src/percorsi";

/** Pagina iniziale: scelta del viaggio da consultare. */
export default function PaginaIniziale() {
  return (
    <section aria-labelledby="scelta-titolo">
      <h1 id="scelta-titolo">Scegli il viaggio</h1>
      <p className="sottotitolo">La versione 1 di riferimento e le sue varianti.</p>
      <ul className="elenco-viaggi">
        {VIAGGI.map((voce) => (
          <li key={voce.chiave}>
            <Link href={percorsoViaggio(voce.chiave)} className="scheda scheda--link">
              <strong>{voce.etichetta}</strong>
              <span>{voce.descrizione}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
