import Link from "next/link";
import { percorsoGiornoDa, percorsoViaggio } from "../percorsi";
import type { DettaglioElemento as DatiDettaglio, OrariAperturaVista } from "../viste/elemento";
import { TESTI_STILI } from "../testi";
import { RiepilogoPrenotazione } from "./GestisciPrenotazione";

function OrariApertura({ orari }: { orari: OrariAperturaVista }) {
  return (
    <section className="orari" aria-labelledby="dettaglio-orari-titolo">
      <h3 id="dettaglio-orari-titolo">Orari di apertura del luogo</h3>
      <p>{orari.testo}</p>
    </section>
  );
}

/** Dettaglio di un elemento: tutti i campi; per un'attività anche i dati del catalogo e gli orari del luogo in parole. */
export function DettaglioElemento({
  chiave,
  dettaglio,
  radice = percorsoViaggio(chiave),
}: {
  chiave: string;
  dettaglio: DatiDettaglio;
  /** Indirizzo della vista viaggio; se manca è quello del viaggio di riferimento con questa chiave. */
  radice?: string;
}) {
  const { attivita } = dettaglio;
  return (
    <section className="dettaglio" aria-labelledby="dettaglio-titolo">
      <nav className="navigazione-giorni" aria-label="Ritorno al giorno">
        <Link href={percorsoGiornoDa(radice, dettaglio.data)}>← Torna a {dettaglio.dataEstesa}</Link>
      </nav>
      <h1 id="dettaglio-titolo">{dettaglio.titolo}</h1>
      <div className="schede">
        <div className="scheda">
          <h2>Elemento</h2>
          <dl className="campi">
            {dettaglio.campi.map((campo) => (
              <div key={campo.etichetta} className="campo">
                <dt>{campo.etichetta}</dt>
                <dd>{campo.valore}</dd>
              </div>
            ))}
          </dl>
          <RiepilogoPrenotazione prenotazione={dettaglio.prenotazione} />
        </div>
        {attivita !== null && (
          <div className="scheda">
            <h2>Attività del catalogo</h2>
            <p>{attivita.descrizione}</p>
            <span className="ui-badge ui-badge--stile" data-stile={attivita.stile}>
              {TESTI_STILI[attivita.stile]}
            </span>
            <dl className="campi">
              <div className="campo">
                <dt>Nome</dt>
                <dd>{attivita.nome}</dd>
              </div>
              <div className="campo">
                <dt>Categoria</dt>
                <dd>{attivita.categoria}</dd>
              </div>
              <div className="campo">
                <dt>All&apos;aperto o al coperto</dt>
                <dd>{attivita.ambiente}</dd>
              </div>
              <div className="campo">
                <dt>Durata tipica</dt>
                <dd>{attivita.durataTipica}</dd>
              </div>
              {attivita.costo !== null && (
                <div className="campo">
                  <dt>Costo</dt>
                  <dd>{attivita.costo}</dd>
                </div>
              )}
              <div className="campo">
                <dt>Luogo</dt>
                <dd>{attivita.luogo.nome}</dd>
              </div>
              {attivita.luogo.tipo !== "" && (
                <div className="campo">
                  <dt>Tipo di luogo</dt>
                  <dd>{attivita.luogo.tipo}</dd>
                </div>
              )}
              {attivita.luogo.zona !== "" && (
                <div className="campo">
                  <dt>Zona</dt>
                  <dd>{attivita.luogo.zona}</dd>
                </div>
              )}
            </dl>
            {attivita.orariApertura !== null && <OrariApertura orari={attivita.orariApertura} />}
          </div>
        )}
      </div>
    </section>
  );
}
