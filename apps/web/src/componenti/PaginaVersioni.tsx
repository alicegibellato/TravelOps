import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { PERCORSO_IMPREVISTI, percorsoImprevisti } from "../imprevisti/schede";
import { PERCORSO_DEMO, PERCORSO_VERSIONI, percorsoConfronto, percorsoVersione, percorsoVersioniViaggio } from "../percorsi";
import { Badge } from "../ui/Badge";
import { Cronologia, VoceCronologia } from "../ui/Cronologia";
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
          <ul className="confronto__elenco">
            {confronto.aggiunti.map((e) => (
              <li key={e.id} data-aggiunto={e.id} className="ui-proposta__cambio ui-proposta__cambio--aggiunto">
                <strong>{e.descrizione}</strong> · {e.dataEstesa}, {e.orario}
              </li>
            ))}
          </ul>
        </>
      )}
      {confronto.rimossi.length > 0 && (
        <>
          <h3>Rimossi</h3>
          <ul className="confronto__elenco">
            {confronto.rimossi.map((e) => (
              <li key={e.id} data-rimosso={e.id} className="ui-proposta__cambio ui-proposta__cambio--rimosso">
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

/**
 * Versioni (REQ-WEB-004): la cronologia dell'itinerario, dalla più vecchia alla più recente, con data, causa in parole
 * semplici, chi l'ha creata e il pulsante "Confronta" con la versione precedente; sotto, il confronto tra due versioni.
 */
export function PaginaVersioni({ vista, viaggio }: { vista: VistaVersioni; viaggio?: { chiave: string; titolo: string } }) {
  // ST-QA-FIX-004: le versioni di un viaggio salvato vivono in `/viaggi/<chiave>/versioni`; senza viaggio, quelle della
  // modalità presentazione.
  const base = viaggio === undefined ? PERCORSO_VERSIONI : percorsoVersioniViaggio(viaggio.chiave);
  const confronto = (a: number, b: number) => (viaggio === undefined ? percorsoConfronto(a, b) : `${base}?a=${a}&b=${b}`);
  return (
    <section aria-labelledby="versioni-titolo">
      <h1 id="versioni-titolo">{viaggio === undefined ? <>Versioni dell&apos;itinerario</> : <>Versioni di «{viaggio.titolo}»</>}</h1>
      <p className="sottotitolo">
        Ogni proposta accettata crea una nuova versione; le precedenti restano consultabili.{" "}
        {viaggio === undefined ? <Link href={PERCORSO_DEMO}>Torna alla modalità presentazione</Link> : (
          <>
            <Link href={`/viaggi/${encodeURIComponent(viaggio.chiave)}`}>Torna al viaggio</Link> oppure{" "}
            <Link href={percorsoImprevisti(viaggio.chiave)}>segnala un imprevisto</Link>
          </>
        )}.
      </p>
      <Cronologia etichetta="Cronologia delle versioni">
        {vista.righe.map((riga) => (
          <VoceCronologia
            key={riga.numero}
            quando={riga.momento ?? "All'inizio"}
            attuale={riga.corrente}
            dati={{ "data-versione": String(riga.numero) }}
            titolo={
              <>
                {viaggio === undefined ? <Link href={percorsoVersione(riga.numero)}>Versione {riga.numero}</Link> : <>Versione {riga.numero}</>}
                {riga.corrente && <Badge tono="primario">Corrente</Badge>}
              </>
            }
            azioni={
              riga.numero > 1 ? (
                <Link
                  href={confronto(riga.numero - 1, riga.numero)}
                  className={classiPulsante({ variante: "secondario" })}
                  aria-label={`Confronta la versione ${riga.numero} con la ${riga.numero - 1}`}
                >
                  Confronta
                </Link>
              ) : undefined
            }
          >
            <p className="ui-cronologia__causa">{riga.causa}</p>
            {riga.autore !== null && (
              <p className="assente">
                Accettata da <strong>{riga.autore}</strong>
              </p>
            )}
          </VoceCronologia>
        ))}
      </Cronologia>

      <h2>Confronto</h2>
      <form method="get" action={base} className="modulo-riga">
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
      <Link href={PERCORSO_DEMO}>Modalità presentazione</Link>
      {numero === corrente && (
        <Link href={PERCORSO_IMPREVISTI} className="ui-pulsante ui-pulsante--primario intestazione-versione__imprevisto">
          <AlertTriangle size={18} aria-hidden="true" /> Ho un imprevisto
        </Link>
      )}
    </nav>
  );
}
