import Link from "next/link";
import { COPIONE_DEMO } from "../demo/copione";
import { percorsoProposta, percorsoVersione, PERCORSO_VERSIONI } from "../percorsi";
import type { EsitoLetturaStato } from "../stato/stato";
import { Badge } from "../ui/Badge";
import { IllustrazioneLuogo } from "../ui/IllustrazioneLuogo";
import { tipoDelLuogo } from "../ui/luoghi-config";
import { classiPulsante } from "../ui/Pulsante";
import type { VistaDemo } from "../viste/demo";
import type { AzioniDemo } from "./azioni";
import { Avviso, StatoNonValido } from "./Avvisi";
import { CopiaPrompt } from "./CopiaPrompt";

interface Proprieta {
  esito: EsitoLetturaStato;
  /** I dati della vista, se lo stato è valido. */
  vista: VistaDemo | null;
  azioni: AzioniDemo;
  errore?: string | null;
}

/**
 * Il momento attuale del viaggio in evidenza (ST-UX-003B, CB-6): l'immagine del luogo, il momento in grande e, sotto, i
 * campi per cambiarlo. È il momento con cui si accettano le proposte.
 */
function Orologio({ vista, azione }: { vista: VistaDemo; azione: AzioniDemo["impostaOrologio"] }) {
  return (
    <section className="demo-eroe" aria-labelledby="orologio-titolo">
      <IllustrazioneLuogo nome={vista.partenza.luogo} seme={vista.partenza.chiave} forma="larga" />
      <div className="demo-eroe__corpo">
        <h2 id="orologio-titolo">Orologio simulato</h2>
        <p className="demo-eroe__momento">
          <span className="demo-eroe__etichetta">Adesso nel viaggio</span>
          <strong data-orologio={`${vista.orologio.data} ${vista.orologio.ora}`}>{vista.orologioEsteso}</strong>
        </p>
        <p className="assente">È il momento con cui si accettano le proposte.</p>
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
      </div>
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

/** I prompt del copione della demo (`src/demo/copione.json`), ognuno con «Copia». */
function Copione() {
  return (
    <section aria-labelledby="copione-titolo" data-copione>
      <h2 id="copione-titolo">Copione della demo</h2>
      <p>{COPIONE_DEMO.introduzione}</p>
      {COPIONE_DEMO.atti.map((atto) => (
        <div key={atto.id} className="scheda" data-atto={atto.id}>
          <h3>{atto.titolo}</h3>
          <p className="assente">{atto.contesto}</p>
          <ol className="elenco-prompt">
            {atto.voci.map((voce) => (
              <li key={voce.id} data-prompt={voce.id} data-tipo={voce.tipo}>
                <strong>{voce.id}.</strong> <span data-testo-prompt>{voce.testo}</span>
                {voce.tipo === "prompt" && <CopiaPrompt testo={voce.testo} numero={voce.id} />}
                <p className="assente">{voce.atteso}</p>
              </li>
            ))}
          </ol>
        </div>
      ))}
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
                <IllustrazioneLuogo
                  nome={scenario.luogo}
                  tipo={tipoDelLuogo(scenario.titolo) === "generico" ? undefined : tipoDelLuogo(scenario.titolo)}
                  seme={scenario.id}
                  forma="larga"
                />
                <div className="scenario__corpo">
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
                </div>
              </li>
            ))}
          </ul>
          <Copione />
        </>
      )}
    </section>
  );
}
