import { ArrowRight, CalendarRange, Sailboat, Users } from "lucide-react";
import Link from "next/link";
import { BadgeStato } from "../ui/Badge";
import { Illustrazione } from "../ui/Illustrazione";
import { StatoVuoto } from "../ui/StatoVuoto";
import type { SchedaViaggioHome } from "../viste/home";
import { PianificaViaggio } from "./PianificaViaggio";

function SchedaViaggio({ scheda }: { scheda: SchedaViaggioHome }) {
  return (
    <li className="scheda-viaggio" data-viaggio={scheda.chiave}>
      <Illustrazione icona={Sailboat} />
      <div className="scheda-viaggio__corpo">
        <div className="scheda-viaggio__testa">
          <BadgeStato stato={scheda.stato} />
        </div>
        <h3 className="scheda-viaggio__titolo">
          <Link href={scheda.href} className="scheda-viaggio__link">
            {scheda.titolo}
            <span className="ui-solo-lettori">: </span>
            <span className="scheda-viaggio__variante">{scheda.variante}</span>
          </Link>
        </h3>
        <p className="scheda-viaggio__descrizione">{scheda.descrizione}</p>
        {scheda.datiNonValidi ? (
          <p className="scheda-viaggio__errore">I dati di questo viaggio non sono validi: aprilo per vedere cosa correggere.</p>
        ) : (
          <ul className="scheda-viaggio__dati">
            <li>
              <CalendarRange size={16} aria-hidden="true" />
              <span>{scheda.periodo}</span>
            </li>
            <li>
              <Users size={16} aria-hidden="true" />
              <span>{scheda.dettagli}</span>
            </li>
          </ul>
        )}
        <span className="scheda-viaggio__apri" aria-hidden="true">
          Apri <ArrowRight size={16} />
        </span>
      </div>
    </li>
  );
}

/**
 * Home (REQ-UX-001): titolo accogliente, "Pianifica un viaggio", le schede dei viaggi (in griglia su schermo
 * grande, una sotto l'altra sul telefono) e lo stato vuoto illustrato quando non ci sono viaggi.
 */
export function PaginaHome({ viaggi }: { viaggi: readonly SchedaViaggioHome[] }) {
  return (
    <div className="home">
      <section className="home__benvenuto" aria-labelledby="home-titolo">
        <div>
          <p className="home__saluto">Ciao!</p>
          <h1 id="home-titolo">Dove si va questa volta?</h1>
          <p className="home__sottotitolo">
            TravelOps prepara il programma giorno per giorno, controlla che stia in piedi e, se qualcosa va storto, ti propone
            come sistemarlo.
          </p>
        </div>
        <PianificaViaggio />
      </section>

      <section className="home__viaggi" aria-labelledby="miei-viaggi">
        <h2 id="miei-viaggi">I miei viaggi</h2>
        {viaggi.length === 0 ? (
          <StatoVuoto
            titolo="Non hai ancora viaggi"
            livello={3}
            descrizione="Quando pianificherai un viaggio lo troverai qui, con le date e lo stato."
            azione={<PianificaViaggio />}
          />
        ) : (
          <ul className="home__griglia">
            {viaggi.map((scheda) => (
              <SchedaViaggio key={scheda.chiave} scheda={scheda} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
