import { Check } from "lucide-react";
import type { PassoAvanzamento } from "../destinazioni/tipi";

/**
 * L'avanzamento della costruzione di una destinazione: una barra e i passi, per esempio "Cerco i luoghi…",
 * "Scelgo i ristoranti…", "Calcolo i percorsi…". Senza passi (la costruzione è in corso) la barra è indeterminata.
 */
export function AvanzamentoCostruzione({ passi, inCorso = false, titolo }: { passi: readonly PassoAvanzamento[]; inCorso?: boolean; titolo: string }) {
  const totale = passi[0]?.totale ?? passi.length;
  const fatti = inCorso ? 0 : passi.length;
  return (
    <div className="avanzamento" role="status" aria-live="polite" data-avanzamento={inCorso ? "in-corso" : "finito"}>
      <p className="avanzamento__titolo">{titolo}</p>
      {inCorso ? (
        <progress className="avanzamento__barra" aria-label="Avanzamento della costruzione" />
      ) : (
        <progress className="avanzamento__barra" aria-label="Avanzamento della costruzione" value={fatti} max={Math.max(totale, 1)} />
      )}
      {!inCorso && passi.length > 0 && (
        <ol className="avanzamento__passi">
          {passi.map((passo) => (
            <li key={passo.numero} className="avanzamento__passo">
              <Check size={16} aria-hidden="true" />
              <span>{passo.messaggio}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
