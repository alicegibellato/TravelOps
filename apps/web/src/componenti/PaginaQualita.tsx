import { CircleCheck, CircleX, FileText, MinusCircle, TriangleAlert } from "lucide-react";
import { Avviso } from "../ui/Avviso";
import { Badge, type TonoBadge } from "../ui/Badge";
import { StatoVuoto } from "../ui/StatoVuoto";
import { VARIABILE_RAPPORTO, formattaDataOra, formattaDurata, type EsitoLetturaRapporto, type EsitoSuite, type RapportoTest, type SuiteTest } from "../qualita/rapporto";

/** L'indirizzo del log di una suite (servito da `app/qualita/log/[suite]`). */
export const percorsoLogSuite = (id: string): string => `/qualita/log/${encodeURIComponent(id)}`;

const ASPETTO_ESITO: Readonly<Record<EsitoSuite, { tono: TonoBadge; testo: string }>> = {
  superata: { tono: "successo", testo: "Superata" },
  fallita: { tono: "errore", testo: "Fallita" },
  errore: { tono: "attenzione", testo: "Non eseguita" },
};

const TIPI: Readonly<Record<SuiteTest["tipo"], string>> = { unit: "Unit", e2e: "End-to-end" };

function Comandi() {
  return (
    <p className="qualita__comandi">
      <code>npm test</code> <span aria-hidden="true">·</span> <code>npm run e2e</code>
    </p>
  );
}

/** Nessun report (o non leggibile): dice dove lo cerca e come generarlo. */
function ReportMancante({ esito }: { esito: Exclude<EsitoLetturaRapporto, { stato: "ok" }> }) {
  const nonValido = esito.stato === "non_valido";
  return (
    <section aria-labelledby="qualita-titolo" className="qualita" data-stato={nonValido ? "non-valido" : "assente"}>
      <StatoVuoto
        livello={1}
        titolo={nonValido ? "Il report dei test non è leggibile" : "Nessun report dei test"}
        descrizione={
          nonValido
            ? `Il file ${esito.percorso} non è valido: ${esito.motivo}. Rigeneralo lanciando i test.`
            : `Non c'è ancora un report in ${esito.percorso}. Si crea da solo la prima volta che lanci i test.`
        }
        azione={
          <>
            <Comandi />
            <p className="sottotitolo">
              Per leggere il report da un altro file imposta <code>{VARIABILE_RAPPORTO}</code>.
            </p>
          </>
        }
      />
    </section>
  );
}

function Riepilogo({ rapporto }: { rapporto: RapportoTest }) {
  const { totali } = rapporto;
  const voci: { chiave: string; etichetta: string; valore: number }[] = [
    { chiave: "totali", etichetta: "Test totali", valore: totali.totali },
    { chiave: "superati", etichetta: "Superati", valore: totali.superati },
    { chiave: "falliti", etichetta: "Falliti", valore: totali.falliti },
    { chiave: "saltati", etichetta: "Saltati", valore: totali.saltati },
  ];
  return (
    <dl className="qualita__riepilogo" aria-label="Totali di tutte le suite">
      {voci.map((v) => (
        <div key={v.chiave} className={`qualita__voce qualita__voce--${v.chiave}`} data-totale={v.chiave}>
          <dt>{v.etichetta}</dt>
          <dd>{v.valore.toLocaleString("it-IT")}</dd>
        </div>
      ))}
    </dl>
  );
}

function RigaSuite({ suite, fuso }: { suite: SuiteTest; fuso: string }) {
  const { tono, testo } = ASPETTO_ESITO[suite.esito];
  const Icona = suite.esito === "superata" ? CircleCheck : suite.esito === "fallita" ? CircleX : TriangleAlert;
  return (
    <tr data-suite={suite.id} data-esito={suite.esito}>
      <td className="cella-principale" data-etichetta="Suite">
        <strong>{suite.nome}</strong>
        <span className="qualita__tipo">{TIPI[suite.tipo]}</span>
        {suite.errore !== null && <span className="qualita__errore">{suite.errore}</span>}
      </td>
      <td data-etichetta="Esito">
        <Badge tono={tono} icona={<Icona size={14} />}>
          {testo}
        </Badge>
      </td>
      <td className="numero" data-etichetta="Totali">{suite.totali.toLocaleString("it-IT")}</td>
      <td className="numero" data-etichetta="Superati">{suite.superati.toLocaleString("it-IT")}</td>
      <td className="numero" data-etichetta="Falliti">{suite.falliti.toLocaleString("it-IT")}</td>
      <td className="numero" data-etichetta="Saltati">{suite.saltati.toLocaleString("it-IT")}</td>
      <td data-etichetta="Durata">{formattaDurata(suite.durataMs)}</td>
      <td data-etichetta="Eseguita il">{formattaDataOra(suite.avviata, fuso)}</td>
      <td data-etichetta="Log">
        {suite.log === null ? (
          <span className="assente">Non disponibile</span>
        ) : (
          <a className="qualita__log" href={percorsoLogSuite(suite.id)}>
            <FileText size={16} aria-hidden="true" />
            Apri il log<span className="ui-solo-lettori"> di {suite.nome}</span>
          </a>
        )}
      </td>
    </tr>
  );
}

/**
 * Qualità dei test (ST-OBS-001A, REQ-OBS-001): l'ultimo report dei test scritto dagli script `npm test` e `npm run e2e`,
 * con i totali, l'esito di ogni suite, la data, la durata e il link al log. Senza il file (o con un file rotto) dice come generarlo.
 */
export function PaginaQualita({ esito, fuso }: { esito: EsitoLetturaRapporto; fuso: string }) {
  if (esito.stato !== "ok") return <ReportMancante esito={esito} />;
  const { rapporto } = esito;
  const falliti = rapporto.totali.falliti;
  const nonEseguite = rapporto.suite.filter((s) => s.esito === "errore").length;
  const tutteOk = falliti === 0 && nonEseguite === 0 && rapporto.suite.every((s) => s.esito === "superata");
  return (
    <section aria-labelledby="qualita-titolo" data-stato="report" className="qualita">
      <h1 id="qualita-titolo">Qualità dei test</h1>
      <p className="sottotitolo">
        Ultimo report: {formattaDataOra(rapporto.generato, fuso)} · durata complessiva {formattaDurata(rapporto.durataMs)}
      </p>
      {tutteOk ? (
        <Avviso tono="successo" titolo="Tutti i test sono superati" dati={{ "data-esito": "ok" }}>
          {rapporto.totali.superati.toLocaleString("it-IT")} test superati in {rapporto.suite.length} suite
          {rapporto.totali.saltati > 0 ? `, ${rapporto.totali.saltati.toLocaleString("it-IT")} saltati` : ""}.
        </Avviso>
      ) : (
        <Avviso tono="errore" titolo={falliti > 0 ? `${falliti.toLocaleString("it-IT")} test falliti` : "Una suite non è stata eseguita"} dati={{ "data-esito": "ko" }}>
          Controlla le suite qui sotto e apri il log per vedere il dettaglio.
        </Avviso>
      )}
      <Riepilogo rapporto={rapporto} />
      <table className="tabella tabella--schede qualita__tabella">
        <caption>Esito per suite</caption>
        <thead>
          <tr>
            <th scope="col">Suite</th>
            <th scope="col">Esito</th>
            <th scope="col" className="numero">Totali</th>
            <th scope="col" className="numero">Superati</th>
            <th scope="col" className="numero">Falliti</th>
            <th scope="col" className="numero">Saltati</th>
            <th scope="col">Durata</th>
            <th scope="col">Eseguita il</th>
            <th scope="col">Log</th>
          </tr>
        </thead>
        <tbody>
          {rapporto.suite.map((suite) => (
            <RigaSuite key={suite.id} suite={suite} fuso={fuso} />
          ))}
        </tbody>
      </table>
      <p className="sottotitolo qualita__nota">
        <MinusCircle size={14} aria-hidden="true" /> «Saltati» sono i test marcati come da non eseguire (per esempio quelli che richiedono la rete). Il report si aggiorna a ogni <code>npm test</code> e <code>npm run e2e</code>.
      </p>
    </section>
  );
}
