import Link from "next/link";
import { percorsoProposta, percorsoVersione, PERCORSO_VERSIONI } from "../percorsi";
import type { EsitoLetturaStato } from "../stato/stato";
import { Badge } from "../ui/Badge";
import { classiPulsante } from "../ui/Pulsante";
import type { VistaDemo } from "../viste/demo";
import type { AzioniDemo } from "./azioni";
import { Avviso, StatoNonValido } from "./Avvisi";

interface Proprieta {
  esito: EsitoLetturaStato;
  /** I dati della vista, se lo stato è valido. */
  vista: VistaDemo | null;
  azioni: AzioniDemo;
  errore?: string | null;
}

function Orologio({ vista, azione }: { vista: VistaDemo; azione: AzioniDemo["impostaOrologio"] }) {
  return (
    <section className="scheda" aria-labelledby="orologio-titolo">
      <h2 id="orologio-titolo">Orologio simulato</h2>
      <p>
        Adesso nel viaggio: <strong data-orologio={`${vista.orologio.data} ${vista.orologio.ora}`}>{vista.orologioEsteso}</strong>. È il
        momento con cui si accettano le proposte.
      </p>
      <form action={azione} className="modulo-riga">
        <label className="ui-campo">
          <span className="ui-campo__etichetta">Data</span>
          <input type="date" className="ui-campo__controllo" name="data" defaultValue={vista.orologio.data} required />
        </label>
        <label className="ui-campo">
          <span className="ui-campo__etichetta">Ora</span>
          <input type="time" className="ui-campo__controllo" name="ora" defaultValue={vista.orologio.ora} required />
        </label>
        <button type="submit" className={classiPulsante({ variante: "primario" })}>Imposta l&apos;orologio</button>
      </form>
    </section>
  );
}

function StatoLocale({ vista, azione }: { vista: VistaDemo; azione: AzioniDemo["ripristina"] }) {
  return (
    <section className="scheda" aria-labelledby="stato-titolo">
      <h2 id="stato-titolo">Stato del viaggio</h2>
      <dl className="campi">
        <div className="campo">
          <dt>Itinerario di partenza</dt>
          <dd>{vista.partenza.etichetta}</dd>
        </div>
        <div className="campo">
          <dt>Scenario in corso</dt>
          <dd>{vista.scenarioAttivo === null ? "Nessuno" : `${vista.scenarioAttivo.id} — ${vista.scenarioAttivo.titolo}`}</dd>
        </div>
        <div className="campo">
          <dt>Versione corrente</dt>
          <dd data-versione-corrente={vista.versioneCorrente.numero}>
            <Link href={percorsoVersione(vista.versioneCorrente.numero)}>Versione {vista.versioneCorrente.numero}</Link> ·{" "}
            {vista.versioneCorrente.causa}
          </dd>
        </div>
        <div className="campo">
          <dt>Versioni</dt>
          <dd>
            <Link href={PERCORSO_VERSIONI}>
              {vista.numeroVersioni === 1 ? "1 versione" : `${vista.numeroVersioni} versioni`}: elenco e confronto
            </Link>
          </dd>
        </div>
        {vista.proposta !== null && (
          <div className="campo">
            <dt>Proposta</dt>
            <dd>
              <Link href={percorsoProposta(vista.proposta.id)}>Proposta per {vista.proposta.scenario}</Link> · {vista.proposta.stato}
            </dd>
          </div>
        )}
      </dl>
      <form action={azione} className="modulo-riga">
        <button type="submit" className={classiPulsante({ variante: "secondario" })}>
          Ripristina
        </button>
        <span className="assente">Torna all&apos;itinerario di partenza con la sola versione 1 e scarta le proposte.</span>
      </form>
    </section>
  );
}

/**
 * Pagina Demo (REQ-WEB-002): gli scenari S1–S8 con la loro descrizione, l'orologio simulato, lo stato locale e
 * "Ripristina". Avviare uno scenario carica il suo itinerario di partenza e mostra la proposta del motore.
 */
export function PaginaDemo({ esito, vista, azioni, errore = null }: Proprieta) {
  return (
    <section aria-labelledby="demo-titolo">
      <h1 id="demo-titolo">Demo: imprevisti e proposte</h1>
      <p className="sottotitolo">
        Avvia uno scenario: TravelOps carica il suo itinerario di partenza e propone come ripianificarlo. Decidi tu se
        accettare la proposta.
      </p>
      {errore !== null && <Avviso livello="errore" messaggio={errore} />}
      {!esito.ok || vista === null ? (
        <StatoNonValido motivo={esito.ok ? "" : esito.motivo} azione={azioni.ripristina} />
      ) : (
        <>
          <div className="schede">
            <Orologio vista={vista} azione={azioni.impostaOrologio} />
            <StatoLocale vista={vista} azione={azioni.ripristina} />
          </div>
          <h2>Scenari</h2>
          <ul className="elenco-scenari">
            {vista.scenari.map((scenario) => (
              <li
                key={scenario.id}
                data-scenario={scenario.id}
                className={scenario.attivo ? "scheda scenario scenario--attivo" : "scheda scenario"}
              >
                <Badge tono={scenario.attivo ? "primario" : "neutro"}>{scenario.tipoImprevisto}</Badge>
                <h3>
                  {scenario.id} — {scenario.titolo}
                </h3>
                <p className="scenario__viaggio">
                  Itinerario: <strong>{scenario.viaggio}</strong> <span className="assente">({scenario.descrizioneViaggio})</span>
                </p>
                <p className="scenario__imprevisto">{scenario.imprevisto}</p>
                <form action={azioni.avviaScenario}>
                  <input type="hidden" name="scenario" value={scenario.id} />
                  <button type="submit" className={classiPulsante({ variante: scenario.attivo ? "primario" : "secondario" })}>
                    Avvia {scenario.id}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
