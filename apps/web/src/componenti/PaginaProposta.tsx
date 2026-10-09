import Link from "next/link";
import { PERCORSO_DEMO, percorsoConfronto, percorsoGiornoDa, percorsoVersione } from "../percorsi";
import { NOME_PREDEFINITO } from "../stato/stato";
import type { VistaProposta } from "../viste/proposta";
import type { AzioniProposta } from "./azioni";
import { Avviso } from "./Avvisi";
import { ProblemaInRiga, TabellaElementi } from "./TabellaElementi";

function Decisione({ vista, azioni }: { vista: VistaProposta; azioni: AzioniProposta }) {
  return (
    <section className="scheda decisione" aria-labelledby="decisione-titolo">
      <h2 id="decisione-titolo">Decisione</h2>
      {vista.decisione !== null && (
        <p data-decisione="">
          {vista.decisione.testo}
          {vista.decisione.versione !== null && (
            <>
              {" "}
              <Link href={percorsoVersione(vista.decisione.versione)}>Vedi la versione {vista.decisione.versione}</Link>
              {vista.giorno !== null && (
                <>
                  {" · "}
                  <Link href={percorsoGiornoDa(percorsoVersione(vista.decisione.versione), vista.giorno.data)}>il giorno {vista.giorno.dataEstesa}</Link>
                </>
              )}
              {vista.decisione.versione > 1 && (
                <>
                  {" · "}
                  <Link href={percorsoConfronto(vista.decisione.versione - 1, vista.decisione.versione)}>
                    confronto {vista.decisione.versione - 1} → {vista.decisione.versione}
                  </Link>
                </>
              )}
            </>
          )}
        </p>
      )}
      {vista.decidibile && (
        <>
          <p>
            La proposta diventa una nuova versione solo se la accetti. Momento dell&apos;accettazione (orologio simulato):{" "}
            <strong>{vista.orologioEsteso}</strong> (<Link href={PERCORSO_DEMO}>cambia</Link>).
          </p>
          <div className="modulo-riga">
            <form action={azioni.accetta} className="modulo-riga">
              <input type="hidden" name="proposta" value={vista.id} />
              <label>
                Nome di chi accetta <input type="text" name="nome" defaultValue={NOME_PREDEFINITO} required maxLength={80} />
              </label>
              <button type="submit">Accetta</button>
            </form>
            <form action={azioni.rifiuta}>
              <input type="hidden" name="proposta" value={vista.id} />
              <button type="submit" className="pulsante-secondario">
                Rifiuta
              </button>
            </form>
          </div>
        </>
      )}
    </section>
  );
}

/**
 * Vista della proposta (REQ-WEB-002): imprevisto, impatto, modifiche (prima → dopo), itinerario risultante del
 * giorno, spiegazione, esito con i problemi, elementi a rischio evidenziati e alternative come link. I link li apre
 * il browser del viaggiatore, su clic, in una nuova scheda: la web app e il motore non li aprono mai.
 */
export function PaginaProposta({ vista, azioni }: { vista: VistaProposta; azioni: AzioniProposta }) {
  return (
    <article className="proposta" aria-labelledby="proposta-titolo" data-proposta={vista.id}>
      <nav className="navigazione-giorni" aria-label="Demo">
        <Link href={PERCORSO_DEMO}>← Torna alla Demo</Link>
      </nav>
      <h1 id="proposta-titolo">
        Proposta per {vista.scenario.id} — {vista.scenario.titolo}
      </h1>
      <p className="sottotitolo">
        Costruita sulla versione {vista.versioneBase}
        <span className="separatore" aria-hidden="true">
          ·
        </span>
        versione corrente: {vista.versioneCorrente}
      </p>

      {vista.ultimoEsito !== null && <Avviso livello={vista.ultimoEsito.livello} messaggio={vista.ultimoEsito.messaggio} />}

      <p className={vista.fattibile ? "esito esito--fattibile" : "esito esito--non-fattibile"} data-esito={vista.fattibile ? "fattibile" : "non-fattibile"}>
        Esito: <strong>{vista.esito}</strong>
      </p>

      <section aria-labelledby="imprevisto-titolo">
        <h2 id="imprevisto-titolo">Imprevisto</h2>
        <p data-imprevisto="">{vista.imprevisto}</p>
        <h3>Impatto</h3>
        {vista.impatto.length === 0 ? (
          <p>Nessun elemento colpito.</p>
        ) : (
          <ul className="elenco-impatto">
            {vista.impatto.map((riga) => (
              <li key={riga.id} data-colpito={riga.id}>
                <strong>{riga.id}</strong> <span className="assente">{riga.testo}</span>
                <br />
                {riga.motivo}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="modifiche-titolo">
        <h2 id="modifiche-titolo">Modifiche</h2>
        {vista.modifiche.length === 0 ? (
          <p data-modifiche="nessuna">Nessuna: l&apos;itinerario resta com&apos;è.</p>
        ) : (
          <table className="tabella modifiche">
            <caption>Modifiche proposte (prima → dopo)</caption>
            <thead>
              <tr>
                <th scope="col">Elemento</th>
                <th scope="col">Cambio</th>
                <th scope="col">Prima</th>
                <th scope="col">Dopo</th>
              </tr>
            </thead>
            <tbody>
              {vista.modifiche.map((riga) => (
                <tr key={`${riga.tipo}-${riga.id}`} data-modifica={riga.id} data-tipo={riga.tipo} className={`modifica modifica--${riga.tipo}`}>
                  <td>
                    <strong>{riga.id}</strong>
                  </td>
                  <td>{riga.tipoEtichetta}</td>
                  <td>{riga.prima ?? <span className="assente">—</span>}</td>
                  <td>{riga.dopo ?? <span className="assente">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {vista.giorno !== null && (
        <section aria-labelledby="giorno-proposta-titolo">
          <h2 id="giorno-proposta-titolo">Itinerario risultante: {vista.giorno.dataEstesa}</h2>
          <TabellaElementi righe={vista.giorno.righe} segnali={vista.giorno.segnali} didascalia="Il giorno con la proposta" />
        </section>
      )}

      <section aria-labelledby="spiegazione-titolo">
        <h2 id="spiegazione-titolo">Spiegazione</h2>
        <div className="spiegazione" data-spiegazione="">
          {vista.spiegazione.map((riga, indice) => (
            <p key={indice}>{riga}</p>
          ))}
        </div>
      </section>

      <section aria-labelledby="problemi-titolo">
        <h2 id="problemi-titolo">Problemi</h2>
        {vista.problemi.length === 0 ? (
          <p>Nessun problema di fattibilità.</p>
        ) : (
          <ul className="elenco-problemi">
            {vista.problemi.map((problema, indice) => (
              <li key={`${problema.codice}-${indice}`} data-elementi={problema.elementi.join(" ")}>
                <ProblemaInRiga problema={problema} /> <span className="assente">({problema.elementi.join(", ")})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="rischio-titolo">
        <h2 id="rischio-titolo">Elementi a rischio</h2>
        {vista.aRischio.length === 0 ? (
          <p>Nessun elemento a rischio.</p>
        ) : (
          <ul className="elenco-rischio">
            {vista.aRischio.map((elemento) => (
              <li key={elemento.id} data-a-rischio={elemento.id} className="a-rischio">
                <span className="etichetta etichetta--rischio">A rischio</span> <strong>{elemento.id}</strong> {elemento.testo}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="alternative-titolo">
        <h2 id="alternative-titolo">Alternative</h2>
        {vista.alternative.length === 0 ? (
          <p>Nessuna alternativa.</p>
        ) : (
          <>
            <p className="assente">I link si aprono in una nuova scheda solo quando li scegli: TravelOps non agisce sulle prenotazioni.</p>
            <ul className="elenco-alternative">
              {vista.alternative.map((alternativa) => (
                <li key={`${alternativa.tipo}-${alternativa.elementoId}`} data-alternativa={alternativa.tipo}>
                  <span className="assente">
                    {alternativa.tipoEtichetta} · {alternativa.elementoId}:
                  </span>{" "}
                  <a href={alternativa.indirizzo} target="_blank" rel="noopener noreferrer" className="link-esterno">
                    {alternativa.etichetta}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <Decisione vista={vista} azioni={azioni} />
    </article>
  );
}

/** La proposta richiesta non c'è (scenario riavviato, stato ripristinato o indirizzo sbagliato). */
export function PropostaNonDisponibile() {
  return (
    <section className="errori" role="alert">
      <h1>Proposta non disponibile</h1>
      <p>
        La proposta non è più disponibile: avvia di nuovo lo scenario dalla <Link href={PERCORSO_DEMO}>pagina Demo</Link>.
      </p>
    </section>
  );
}
