import { CircleCheck, CircleX } from "lucide-react";
import type { ConversazioneTracciata, RispostaTracciata, VoceTracciaAgenti } from "../stato/tracce-agenti";
import { percorsoAgentiConversazione, percorsoAgentiViaggio } from "../percorsi";
import { formattaDataOra, formattaDurata } from "../qualita/rapporto";
import { Badge } from "../ui/Badge";
import { StatoVuoto } from "../ui/StatoVuoto";

/** Che cosa mostra il dettaglio: una conversazione, tutte quelle di un viaggio, oppure niente (solo l'elenco). */
export type SelezioneAgenti =
  | { tipo: "nessuna" }
  | { tipo: "conversazione"; id: number; risposte: RispostaTracciata[] }
  | { tipo: "viaggio"; id: string; risposte: RispostaTracciata[] };

interface Proprieta {
  elenco: ConversazioneTracciata[];
  selezione: SelezioneAgenti;
  fuso: string;
}

const TIPI: Readonly<Record<VoceTracciaAgenti["tipo"], string>> = { delega: "Delega", strumento: "Strumento" };

const plurale = (n: number, uno: string, molti: string): string => `${n.toLocaleString("it-IT")} ${n === 1 ? uno : molti}`;

function Elenco({ elenco, selezione, fuso }: Proprieta) {
  return (
    <nav aria-labelledby="agenti-elenco" className="agenti__elenco">
      <h2 id="agenti-elenco">Conversazioni</h2>
      <ul>
        {elenco.map((c) => {
          const corrente = selezione.tipo === "conversazione" && selezione.id === c.conversazioneId;
          return (
            <li key={c.conversazioneId} data-conversazione={c.conversazioneId}>
              <a href={percorsoAgentiConversazione(c.conversazioneId)} aria-current={corrente ? "page" : undefined}>
                Conversazione {c.conversazioneId}
              </a>
              <span className="agenti__meta">
                {plurale(c.risposte, "risposta", "risposte")} · {plurale(c.voci, "voce", "voci")}
                {c.errori > 0 ? ` · ${plurale(c.errori, "errore", "errori")}` : ""} · {formattaDataOra(c.ultima, fuso)}
              </span>
              {c.viaggioId !== null && (
                <a className="agenti__viaggio" href={percorsoAgentiViaggio(c.viaggioId)}>
                  Tutte le tracce del viaggio {c.viaggioId}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function RigaVoce({ voce, fuso }: { voce: VoceTracciaAgenti; fuso: string }) {
  const ok = voce.esito === "ok";
  return (
    <tr data-tipo={voce.tipo} data-esito={voce.esito}>
      <td data-etichetta="Tipo">{TIPI[voce.tipo]}</td>
      <td data-etichetta="Agente">{voce.agente}</td>
      <td data-etichetta="Strumento">{voce.strumento ?? <span className="assente">—</span>}</td>
      <td data-etichetta="Input riassunto" className="agenti__input">
        {voce.input}
        {voce.dettaglio !== undefined && <span className="agenti__dettaglio">{voce.dettaglio}</span>}
      </td>
      <td data-etichetta="Esito">
        <Badge tono={ok ? "successo" : "errore"} icona={ok ? <CircleCheck size={14} /> : <CircleX size={14} />}>
          {ok ? "Riuscita" : "Errore"}
        </Badge>
      </td>
      <td data-etichetta="Durata">{formattaDurata(voce.durataMs)}</td>
      <td data-etichetta="Inizio">{formattaDataOra(voce.inizio, fuso)}</td>
    </tr>
  );
}

function Risposta({ risposta, conConversazione, fuso }: { risposta: RispostaTracciata; conConversazione: boolean; fuso: string }) {
  const id = `risposta-${risposta.conversazioneId}-${risposta.risposta}`;
  return (
    <section aria-labelledby={id} className="agenti__risposta" data-risposta={risposta.risposta}>
      <h3 id={id}>
        {conConversazione ? `Conversazione ${risposta.conversazioneId}, risposta ${risposta.risposta}` : `Risposta ${risposta.risposta}`}
      </h3>
      <p className="agenti__domanda">
        Il viaggiatore ha scritto: <q>{risposta.domanda}</q>
      </p>
      <table className="tabella tabella--schede agenti__tabella">
        <caption className="ui-solo-lettori">Che cosa hanno fatto gli agenti per questa risposta</caption>
        <thead>
          <tr>
            <th scope="col">Tipo</th>
            <th scope="col">Agente</th>
            <th scope="col">Strumento</th>
            <th scope="col">Input riassunto</th>
            <th scope="col">Esito</th>
            <th scope="col">Durata</th>
            <th scope="col">Inizio</th>
          </tr>
        </thead>
        <tbody>
          {risposta.voci.map((voce, i) => (
            <RigaVoce key={i} voce={voce} fuso={fuso} />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Dettaglio({ selezione, fuso }: { selezione: Exclude<SelezioneAgenti, { tipo: "nessuna" }>; fuso: string }) {
  const titolo = selezione.tipo === "conversazione" ? `Conversazione ${selezione.id}` : `Viaggio ${selezione.id}`;
  return (
    <section aria-labelledby="agenti-dettaglio" className="agenti__dettaglio-pannello" data-selezione={selezione.tipo}>
      <h2 id="agenti-dettaglio">{titolo}</h2>
      {selezione.risposte.length === 0 ? (
        <p className="sottotitolo" data-stato="senza-tracce">
          Nessuna traccia per {selezione.tipo === "conversazione" ? "questa conversazione" : "questo viaggio"}.
        </p>
      ) : (
        selezione.risposte.map((r) => (
          <Risposta key={`${r.conversazioneId}-${r.risposta}`} risposta={r} conConversazione={selezione.tipo === "viaggio"} fuso={fuso} />
        ))
      )}
    </section>
  );
}

/**
 * Cosa hanno fatto gli agenti (ST-OBS-001B, REQ-OBS-001 CA-3): le tracce runtime di REQ-ORCH-002 per conversazione e
 * per viaggio, risposta per risposta, con agente, strumento, input riassunto, esito e durata. Senza tracce lo dice.
 */
export function PaginaAgenti({ elenco, selezione, fuso }: Proprieta) {
  if (elenco.length === 0 && selezione.tipo === "nessuna") {
    return (
      <section aria-labelledby="agenti-titolo" className="agenti" data-stato="vuoto">
        <StatoVuoto
          livello={1}
          titolo="Gli agenti non hanno ancora fatto nulla"
          descrizione="Qui compaiono le tracce di ogni risposta della chat (a quale agente è stata delegata, gli strumenti chiamati, l'esito e la durata). Scrivi qualcosa nella chat di Pianifica con l'assistente collegato al modello e torna qui."
        />
      </section>
    );
  }
  return (
    <section aria-labelledby="agenti-titolo" className="agenti" data-stato="tracce">
      <h1 id="agenti-titolo">Cosa hanno fatto gli agenti</h1>
      <p className="sottotitolo">Le tracce di ogni risposta della chat: deleghe agli agenti e chiamate agli strumenti.</p>
      <div className="agenti__corpo">
        <Elenco elenco={elenco} selezione={selezione} fuso={fuso} />
        {selezione.tipo === "nessuna" ? (
          <p className="sottotitolo agenti__suggerimento">Scegli una conversazione per vedere le sue tracce.</p>
        ) : (
          <Dettaglio selezione={selezione} fuso={fuso} />
        )}
      </div>
    </section>
  );
}
