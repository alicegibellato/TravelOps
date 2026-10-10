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

function StatoLocale({ vista, azione }: { vista: VistaDemo; azione: AzioniDemo["ripristinaViaggiDemo"] }) {
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
          <dd>{vista.scenarioAttivo === null ? "Nessuno" : vista.scenarioAttivo.titolo}</dd>
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
              <Link href={percorsoProposta(vista.proposta.id)}>Proposta: {vista.proposta.titolo}</Link> · {vista.proposta.stato}
            </dd>
          </div>
        )}
      </dl>
      <form action={azione} className="presentazione__ripristina">
        <button type="submit" className={classiPulsante({ variante: "secondario" })}>
          Ripristina i viaggi demo
        </button>
        <span className="assente">Ricarica i viaggi demo com&apos;erano all&apos;inizio, con la sola prima versione, e scarta le proposte.</span>
      </form>
    </section>
  );
}

/**
 * Modalità presentazione (REQ-WEB-004, già pagina Demo di REQ-WEB-002): l'orologio simulato, lo stato dei viaggi demo
 * con "Ripristina i viaggi demo" e gli scenari descritti in parole semplici. Avviare uno scenario carica il suo
 * itinerario di partenza e mostra la proposta del motore.
 */
export function PaginaDemo({ esito, vista, azioni, errore = null }: Proprieta) {
  return (
    <section aria-labelledby="demo-titolo">
      <h1 id="demo-titolo">Modalità presentazione</h1>
      <p className="sottotitolo">
        Qui simuli un imprevisto durante il viaggio. Scegli uno scenario: TravelOps carica il suo itinerario di partenza e
        propone come cambiarlo. Decidi tu se accettare la proposta.
      </p>
      {errore !== null && <Avviso livello="errore" messaggio={errore} />}
      {!esito.ok || vista === null ? (
        <StatoNonValido motivo={esito.ok ? "" : esito.motivo} azione={azioni.ripristina} />
      ) : (
        <>
          <div className="schede">
            <Orologio vista={vista} azione={azioni.impostaOrologio} />
            <StatoLocale vista={vista} azione={azioni.ripristinaViaggiDemo} />
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
                <h3>{scenario.titolo}</h3>
                <p className="scenario__viaggio">
                  Itinerario: <strong>{scenario.viaggio}</strong> <span className="assente">({scenario.descrizioneViaggio})</span>
                </p>
                <p className="scenario__imprevisto">{scenario.imprevisto}</p>
                <form action={azioni.avviaScenario}>
                  <input type="hidden" name="scenario" value={scenario.id} />
                  <button type="submit" className={classiPulsante({ variante: scenario.attivo ? "primario" : "secondario" })}>
                    Avvia lo scenario<span className="ui-solo-lettori">: {scenario.titolo}</span>
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
