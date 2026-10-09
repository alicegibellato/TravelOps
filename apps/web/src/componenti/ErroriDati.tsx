import type { ErroreDati } from "../dati/carica";
import { inParole, TESTI_CODICI } from "../testi";

const ORIGINI: Record<ErroreDati["origine"], string> = {
  catalogo: "Catalogo",
  viaggio: "Viaggio",
};

/**
 * Gli errori trovati dal motore nei dati: si mostrano al posto della vista (REQ-WEB-001, CA-5). Il viaggiatore legge
 * il problema in parole (REQ-UX-001, CA-6); codici, elementi e campi del JSON restano nei "Dettagli tecnici", chiusi,
 * per chi deve correggere i dati.
 */
export function ErroriDati({ errori }: { errori: readonly ErroreDati[] }) {
  return (
    <section className="errori" role="alert" aria-labelledby="errori-titolo">
      <h2 id="errori-titolo">I dati del viaggio non sono validi</h2>
      <p>
        Il motore ha trovato {errori.length === 1 ? "un errore" : `${errori.length} errori`}: la vista non viene mostrata
        finché i dati non sono corretti.
      </p>
      <table className="tabella tabella--schede">
        <thead>
          <tr>
            <th scope="col">Documento</th>
            <th scope="col">Problema</th>
            <th scope="col">Motivo</th>
          </tr>
        </thead>
        <tbody>
          {errori.map((errore, indice) => (
            <tr key={`${errore.origine}-${indice}`} className="errore" data-codice={errore.codice}>
              <td data-etichetta="Documento">{ORIGINI[errore.origine]}</td>
              <td data-etichetta="Problema">{TESTI_CODICI[errore.codice]}</td>
              <td data-etichetta="Motivo">{inParole(errore.motivo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <details className="dettagli-tecnici">
        <summary>Dettagli tecnici</summary>
        <table className="tabella tabella--schede">
          <thead>
            <tr>
              <th scope="col">Codice</th>
              <th scope="col">Coinvolto</th>
              <th scope="col">Campo</th>
            </tr>
          </thead>
          <tbody>
            {errori.map((errore, indice) => (
              <tr key={`${errore.origine}-${indice}`}>
                <td data-etichetta="Codice">
                  <code>{errore.codice}</code>
                </td>
                <td data-etichetta="Coinvolto">{errore.id}</td>
                <td data-etichetta="Campo">{errore.percorso === "" ? "—" : <code>{errore.percorso}</code>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
