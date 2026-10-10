import { CalendarDays, ArrowRight, SlidersHorizontal, Undo2 } from "lucide-react";
import type { ReactNode } from "react";
import { Avviso } from "./Avviso";
import { Badge } from "./Badge";
import { classiPulsante, Pulsante } from "./Pulsante";

/** Una riga del riepilogo delle preferenze. */
export interface VocePreferenzeScheda {
  etichetta: string;
  valore: string;
}

/** Riepilogo delle preferenze del viaggiatore dentro la conversazione. */
export function SchedaPreferenze({ titolo, voci }: { titolo: string; voci: readonly VocePreferenzeScheda[] }) {
  return (
    <article className="ui-scheda-chat ui-scheda-chat--preferenze">
      <h4 className="ui-scheda-chat__titolo">
        <SlidersHorizontal size={18} aria-hidden="true" /> {titolo}
      </h4>
      <dl className="ui-scheda-chat__voci">
        {voci.map((voce) => (
          <div key={voce.etichetta} className="ui-scheda-chat__voce">
            <dt>{voce.etichetta}</dt>
            <dd>{voce.valore}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

export interface GiornoBozzaScheda {
  titolo: string;
  attivita: readonly string[];
  /** Dove porta "Apri". */
  href: string;
}

/** Bozza del viaggio: una miniatura per giorno, con le attività e "Apri". */
export function SchedaBozza({ titolo, giorni }: { titolo: string; giorni: readonly GiornoBozzaScheda[] }) {
  return (
    <article className="ui-scheda-chat ui-scheda-chat--bozza">
      <div className="ui-scheda-chat__testa">
        <h4 className="ui-scheda-chat__titolo">
          <CalendarDays size={18} aria-hidden="true" /> {titolo}
        </h4>
        <Badge tono="accento">Bozza</Badge>
      </div>
      <ul className="ui-scheda-chat__giorni">
        {giorni.map((giorno) => (
          <li key={giorno.href} className="ui-scheda-chat__giorno">
            <div className="ui-scheda-chat__giorno-testo">
              <p className="ui-scheda-chat__giorno-titolo">{giorno.titolo}</p>
              {giorno.attivita.length > 0 && <p className="ui-scheda-chat__giorno-attivita">{giorno.attivita.join(" · ")}</p>}
            </div>
            <a className={classiPulsante({ variante: "secondario" })} href={giorno.href}>
              <span>Apri</span>
              <span className="ui-solo-lettori">: {giorno.titolo}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}

interface ProprietaConferma {
  titolo: string;
  testo: string;
  /** Vero dopo "Annulla": la scheda lo dice e il pulsante sparisce. */
  annullata?: boolean | undefined;
  onAnnulla?: (() => void) | undefined;
}

/** Conferma di un'azione fatta dalla chat, con "Annulla". */
export function SchedaConferma({ titolo, testo, annullata = false, onAnnulla }: ProprietaConferma) {
  const azione: ReactNode =
    annullata ? (
      <Badge tono="neutro">Annullata</Badge>
    ) : onAnnulla === undefined ? undefined : (
      <Pulsante variante="secondario" icona={<Undo2 size={18} />} onClick={onAnnulla}>
        Annulla
      </Pulsante>
    );
  return (
    <div className="ui-scheda-chat ui-scheda-chat--conferma">
      <Avviso tono={annullata ? "info" : "successo"} titolo={annullata ? "Annullato" : titolo} azione={azione}>
        {annullata ? "Il programma è tornato com'era." : testo}
      </Avviso>
    </div>
  );
}
