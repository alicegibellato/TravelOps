import Link from "next/link";
import { percorsoGiornoDa, percorsoViaggio } from "../percorsi";
import type { VistaGiorno as DatiVistaGiorno } from "../viste/giorno";
import type { SegnaliGiorno } from "../viste/segnalazioni";
import { TabellaElementi } from "./TabellaElementi";

interface Proprieta {
  chiave: string;
  vista: DatiVistaGiorno;
  /** Indirizzo della vista viaggio; se manca è quello del viaggio di riferimento con questa chiave. */
  radice?: string;
  /** Problemi di fattibilità del giorno (REQ-WEB-002), da mostrare accanto agli elementi coinvolti. */
  segnali?: SegnaliGiorno;
}

/**
 * Vista giorno: gli elementi in ordine con orari, tipo, attività o tratta, mezzo, priorità, orario fisso e
 * prenotazione (codice e link di gestione); se indicati, i problemi di fattibilità accanto agli elementi.
 */
export function VistaGiorno({ chiave, vista, radice = percorsoViaggio(chiave), segnali }: Proprieta) {
  return (
    <section className="vista-giorno" aria-labelledby="giorno-titolo">
      <nav className="navigazione-giorni" aria-label="Giorni">
        <Link href={radice}>Tutto il viaggio</Link>
        {vista.dataPrecedente !== null && (
          <Link href={percorsoGiornoDa(radice, vista.dataPrecedente)} rel="prev">
            ← Giorno precedente
          </Link>
        )}
        {vista.dataSuccessiva !== null && (
          <Link href={percorsoGiornoDa(radice, vista.dataSuccessiva)} rel="next">
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
      {segnali !== undefined && (
        <p className={segnali.problemi.length === 0 ? "esito-giorno esito-giorno--ok" : "esito-giorno esito-giorno--problemi"} data-problemi-giorno={segnali.problemi.length}>
          {segnali.problemi.length === 0
            ? "Nessun problema di fattibilità in questo giorno."
            : segnali.problemi.length === 1
              ? "Un problema di fattibilità in questo giorno, segnalato accanto agli elementi coinvolti."
              : `${segnali.problemi.length} problemi di fattibilità in questo giorno, segnalati accanto agli elementi coinvolti.`}
        </p>
      )}
      {vista.elementi.length === 0 ? (
        <p>Nessun elemento in programma.</p>
      ) : (
        <TabellaElementi righe={vista.elementi} radice={radice} {...(segnali === undefined ? {} : { segnali })} />
      )}
    </section>
  );
}
