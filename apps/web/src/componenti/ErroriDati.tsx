import type { ErroreDati } from "../dati/carica";

const ORIGINI: Record<ErroreDati["origine"], string> = {
  catalogo: "Catalogo",
  viaggio: "Viaggio",
};

/** Gli errori trovati dal motore nei dati: si mostrano al posto della vista (REQ-WEB-001, CA-5). */
export function ErroriDati({ errori }: { errori: readonly ErroreDati[] }) {
  return (
    <section className="errori" role="alert" aria-labelledby="errori-titolo">
      <h2 id="errori-titolo">I dati del viaggio non sono validi</h2>
      <p>
        Il motore ha trovato {errori.length === 1 ? "un errore" : `${errori.length} errori`}: la vista non viene mostrata
        finché i dati non sono corretti.
      </p>
      <table className="tabella">
        <thead>
          <tr>
            <th scope="col">Documento</th>
            <th scope="col">Codice</th>
            <th scope="col">Coinvolto</th>
            <th scope="col">Campo</th>
            <th scope="col">Motivo</th>
          </tr>
        </thead>
        <tbody>
          {errori.map((errore, indice) => (
            <tr key={`${errore.origine}-${indice}`} className="errore">
              <td>{ORIGINI[errore.origine]}</td>
              <td>
                <code>{errore.codice}</code>
              </td>
              <td>{errore.id}</td>
              <td>{errore.percorso === "" ? "—" : <code>{errore.percorso}</code>}</td>
              <td>{errore.motivo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
