import type { PrenotazioneVista } from "../viste/giorno";

/** Codice della prenotazione e link di gestione (un link che apre il viaggiatore: la web app non lo chiama). */
export function Prenotazione({ prenotazione }: { prenotazione: PrenotazioneVista | null }) {
  if (prenotazione === null) return <span className="assente">—</span>;
  return (
    <span className="prenotazione">
      <span>
        Codice <strong className="codice">{prenotazione.codice}</strong>
      </span>
      {prenotazione.linkGestione !== null && (
        <a href={prenotazione.linkGestione} target="_blank" rel="noopener noreferrer" className="link-esterno">
          Gestisci la prenotazione
        </a>
      )}
    </span>
  );
}
