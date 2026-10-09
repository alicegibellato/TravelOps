import Link from "next/link";
import { PERCORSO_DEMO, PERCORSO_VERSIONI, percorsoVersione } from "../percorsi";
import { classiPulsante } from "../ui/Pulsante";
import type { VistaConfronto, VistaVersioni } from "../viste/versioni";
import { Avviso } from "./Avvisi";

function Confronto({ confronto }: { confronto: VistaConfronto }) {
  return (
    <div className="confronto" data-confronto={`${confronto.a}-${confronto.b}`}>
      {confronto.vuoto && <p>Nessuna differenza tra le due versioni.</p>}
      {confronto.aggiunti.length > 0 && (
        <>
          <h3>Aggiunti</h3>
          <ul>
            {confronto.aggiunti.map((e) => (
              <li key={e.id} data-aggiunto={e.id}>
                <strong>{e.descrizione}</strong> · {e.dataEstesa}, {e.orario}
              </li>
            ))}
          </ul>
        </>
      )}
      {confronto.rimossi.length > 0 && (
        <>
          <h3>Rimossi</h3>
          <ul>
            {confronto.rimossi.map((e) => (
              <li key={e.id} data-rimosso={e.id}>
                <strong>{e.descrizione}</strong> · {e.dataEstesa}, {e.orario}
              </li>
            ))}
          </ul>
        </>
      )}
      {confronto.modificati.length > 0 && (
        <>
          <h3>Modificati</h3>
          <table className="tabella tabella--schede">
            <thead>
              <tr>
                <th scope="col">Elemento</th>
                <th scope="col">Campo</th>
                <th scope="col">Versione {confronto.a}</th>
                <th scope="col">Versione {confronto.b}</th>
              </tr>
            </thead>
            <tbody>
              {confronto.modificati.flatMap((m) =>
                m.campi.map((campo, indice) => (
                  <tr key={`${m.id}-${campo.campo}`} data-modificato={m.id} data-campo={campo.campo}>
                    <td className="cella-principale" data-etichetta="Elemento">
                      {indice === 0 ? <strong>{m.descrizione}</strong> : <span className="ui-solo-lettori">{m.descrizione}</span>}
                    </td>
                    <td data-etichetta="Campo">{campo.etichetta}</td>
                    <td data-etichetta={`Versione ${confronto.a}`}>{campo.prima}</td>
                    <td data-etichetta={`Versione ${confronto.b}`}>{campo.dopo}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

/** Versioni (REQ-WEB-002): elenco con numero, momento, causa e autore; confronto tra due versioni. */
export function PaginaVersioni({ vista }: { vista: VistaVersioni }) {
  return (
    <section aria-labelledby="versioni-titolo">
      <h1 id="versioni-titolo">Versioni dell&apos;itinerario</h1>
      <p className="sottotitolo">
        Ogni proposta accettata crea una nuova versione; le precedenti restano consultabili. <Link href={PERCORSO_DEMO}>Torna alla Demo</Link>.
      </p>
      <table className="tabella versioni tabella--schede">
        <caption>Elenco delle versioni</caption>
        <thead>
          <tr>
            <th scope="col">Numero</th>
            <th scope="col">Momento</th>
            <th scope="col">Causa</th>
            <th scope="col">Autore</th>
          </tr>
        </thead>
        <tbody>
          {vista.righe.map((riga) => (
            <tr key={riga.numero} data-versione={riga.numero} className={riga.corrente ? "versione versione--corrente" : "versione"}>
              <td className="cella-principale" data-etichetta="Numero">
                <Link href={percorsoVersione(riga.numero)}>Versione {riga.numero}</Link>
                {riga.corrente && <span className="etichetta etichetta--corrente">Corrente</span>}
              </td>
              <td data-etichetta="Momento">{riga.momento ?? <span className="assente">—</span>}</td>
              <td data-etichetta="Causa">{riga.causa}</td>
              <td data-etichetta="Autore">{riga.autore ?? <span className="assente">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Confronto</h2>
      <form method="get" action={PERCORSO_VERSIONI} className="modulo-riga">
        <label className="ui-campo">
          <span className="ui-campo__etichetta">Versione</span>
          <select className="ui-campo__controllo" name="a" defaultValue={String(vista.a)}>
            {vista.numeri.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-campo">
          <span className="ui-campo__etichetta">con la versione</span>
          <select className="ui-campo__controllo" name="b" defaultValue={String(vista.b)}>
            {vista.numeri.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={classiPulsante({ variante: "primario" })}>Confronta</button>
      </form>
      {vista.erroreConfronto !== null && <Avviso livello="errore" messaggio={vista.erroreConfronto} />}
      {vista.confronto !== null && (
        <>
          <p>
            Dalla versione {vista.confronto.a} alla versione {vista.confronto.b}:
          </p>
          <Confronto confronto={vista.confronto} />
        </>
      )}
    </section>
  );
}

/** Intestazione delle viste di una versione: numero, causa e link alle altre viste. */
export function IntestazioneVersione({ numero, causa, corrente }: { numero: number; causa: string; corrente: number }) {
  return (
    <nav className="intestazione-versione" aria-label="Versione" data-versione-mostrata={numero}>
      <span>
        <strong>Versione {numero}</strong>
        {numero === corrente ? " (corrente)" : ` di ${corrente}`} · {causa}
      </span>
      <Link href={PERCORSO_VERSIONI}>Tutte le versioni</Link>
      <Link href={PERCORSO_DEMO}>Demo</Link>
    </nav>
  );
}
