import { ExternalLink } from "lucide-react";
import { classiPulsante } from "../ui/Pulsante";
import type { PrenotazioneVista } from "../viste/giorno";

/**
 * Il pulsante "Gestisci prenotazione": c'è solo se la prenotazione ha un link di gestione. Il link si apre in una
 * nuova scheda solo con un clic: la web app non lo chiama (REQ-WEB-001, CA-6).
 */
export function GestisciPrenotazione({ prenotazione }: { prenotazione: PrenotazioneVista | null }) {
  if (prenotazione === null || prenotazione.linkGestione === null) return null;
  return (
    <a
      href={prenotazione.linkGestione}
      target="_blank"
      rel="noopener noreferrer"
      className={classiPulsante({ variante: "primario" }, "gestisci-prenotazione")}
    >
      <span className="ui-pulsante__icona" aria-hidden="true">
        <ExternalLink size={18} />
      </span>
      <span>Gestisci prenotazione</span>
    </a>
  );
}

/** Fornitore e codice della prenotazione, con il pulsante di gestione quando c'è il link. */
export function RiepilogoPrenotazione({ prenotazione }: { prenotazione: PrenotazioneVista | null }) {
  if (prenotazione === null) return null;
  return (
    <div className="prenotazione-riepilogo">
      <p>
        Prenotazione {prenotazione.fornitore}: codice <strong className="codice">{prenotazione.codice}</strong>
      </p>
      <GestisciPrenotazione prenotazione={prenotazione} />
    </div>
  );
}
