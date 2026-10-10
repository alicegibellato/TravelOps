import Link from "next/link";
import {
  Ban,
  BatteryLow,
  CalendarMinus,
  CalendarPlus,
  Clock,
  CloudRain,
  DoorClosed,
  HeartPulse,
  IdCard,
  Luggage,
  PlaneTakeoff,
  TrainFront,
  type LucideIcon,
} from "lucide-react";
import type { Precompilazione } from "../imprevisti/modulo";
import { percorsoImprevisti, percorsoScheda, SCHEDE, type Campo, type Scheda } from "../imprevisti/schede";
import { Avviso } from "../ui/Avviso";
import { Pulsante } from "../ui/Pulsante";

const ICONE: Readonly<Record<string, LucideIcon>> = {
  Ban,
  BatteryLow,
  CalendarMinus,
  CalendarPlus,
  Clock,
  CloudRain,
  DoorClosed,
  HeartPulse,
  IdCard,
  Luggage,
  PlaneTakeoff,
  TrainFront,
};

function CampoModulo({ campo, precompilazione }: { campo: Campo; precompilazione: Precompilazione }) {
  const id = `imprevisto-${campo.nome}`;
  const valore = precompilazione.valori[campo.nome] ?? "";
  const opzioni = campo.opzioni ?? precompilazione.scelte[campo.nome] ?? [];
  const etichetta = (
    <label htmlFor={id}>
      {campo.etichetta}
      {campo.facoltativo === true && <span className="imprevisti__facoltativo"> (facoltativo)</span>}
    </label>
  );
  const aiuto = campo.aiuto === undefined ? null : <span className="imprevisti__aiuto">{campo.aiuto}</span>;
  if (campo.tipo === "casella") {
    return (
      <div className="imprevisti__campo imprevisti__campo--casella">
        <input id={id} name={campo.nome} type="checkbox" />
        {etichetta}
      </div>
    );
  }
  if (campo.tipo === "scelta") {
    return (
      <div className="imprevisti__campo">
        {etichetta}
        <select id={id} name={campo.nome} defaultValue={valore} required={campo.facoltativo !== true} className="ui-campo__controllo">
          {campo.facoltativo === true && <option value="">Nessuna</option>}
          {opzioni.map((o) => (
            <option key={o.valore} value={o.valore}>
              {o.etichetta}
            </option>
          ))}
        </select>
        {aiuto}
      </div>
    );
  }
  const tipo = campo.tipo === "data" ? "date" : campo.tipo === "ora" ? "time" : campo.tipo === "numero" ? "number" : "text";
  return (
    <div className="imprevisti__campo">
      {etichetta}
      <input
        id={id}
        name={campo.nome}
        type={tipo}
        defaultValue={campo.facoltativo === true && campo.tipo !== "numero" && campo.tipo !== "testo" ? "" : valore}
        required={campo.facoltativo !== true}
        className="ui-campo__controllo"
        {...(campo.minimo === undefined ? {} : { min: campo.minimo })}
        {...(campo.massimo === undefined ? {} : { max: campo.massimo })}
      />
      {aiuto}
    </div>
  );
}

export interface ProprietaPaginaImprevisti {
  /** La scheda aperta, con il suo modulo precompilato. */
  aperta: { scheda: Scheda; precompilazione: Precompilazione } | null;
  /** Gli errori del modulo appena inviato, in parole semplici. */
  errori: readonly string[];
  /** L'azione del modulo (server): prepara la proposta e apre la sua pagina. */
  azione: (dati: FormData) => Promise<void>;
  /** Il viaggio confermato su cui si lavora, in breve. */
  viaggio: string;
  /** La chiave del viaggio dell'utente (ST-QA-FIX-018B); assente per il viaggio della presentazione. */
  chiaveViaggio?: string;
}

/**
 * "Ho un imprevisto" (REQ-IMPR-001): la griglia delle schede, una per tipo di imprevisto o richiesta, e il modulo
 * breve della scheda scelta, già precompilato con oggi e l'elemento in corso. Inviare il modulo prepara la proposta:
 * il viaggio cambia solo quando la si accetta (CA-3).
 */
export function PaginaImprevisti({ aperta, errori, azione, viaggio, chiaveViaggio }: ProprietaPaginaImprevisti) {
  return (
    <section className="imprevisti" aria-labelledby="imprevisti-titolo">
      <h1 id="imprevisti-titolo">Ho un imprevisto</h1>
      <p className="imprevisti__sottotitolo">
        {viaggio}. Scegli che cosa è successo: ti preparo una proposta, e il viaggio cambia solo se la accetti.
      </p>
      <ul className="imprevisti__griglia" aria-label="Che cosa è successo">
        {SCHEDE.map((scheda) => {
          const Icona = ICONE[scheda.icona] ?? Clock;
          const attiva = aperta?.scheda.id === scheda.id;
          return (
            <li key={scheda.id}>
              <Link
                href={percorsoScheda(scheda.id, chiaveViaggio)}
                className={`imprevisti__scheda${attiva ? " imprevisti__scheda--attiva" : ""}`}
                aria-current={attiva ? "true" : undefined}
                data-scheda={scheda.id}
              >
                <Icona size={28} aria-hidden="true" />
                <span className="imprevisti__scheda-titolo">{scheda.titolo}</span>
                <span className="imprevisti__scheda-descrizione">{scheda.descrizione}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {aperta !== null && (
        <form action={azione} className="imprevisti__modulo" aria-labelledby="imprevisti-modulo-titolo">
          <h2 id="imprevisti-modulo-titolo">{aperta.scheda.titolo}</h2>
          {aperta.precompilazione.inCorso !== null && <p className="imprevisti__in-corso">Adesso nel programma: {aperta.precompilazione.inCorso}</p>}
          {errori.length > 0 && (
            <Avviso tono="errore" titolo="Controlla il modulo">
              <ul>
                {errori.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </Avviso>
          )}
          <input type="hidden" name="scheda" value={aperta.scheda.id} />
          {chiaveViaggio !== undefined && <input type="hidden" name="viaggio" value={chiaveViaggio} />}
          {aperta.scheda.campi.map((campo) => (
            <CampoModulo key={campo.nome} campo={campo} precompilazione={aperta.precompilazione} />
          ))}
          <div className="imprevisti__azioni">
            <Pulsante type="submit" variante="primario">
              Prepara la proposta
            </Pulsante>
            <Link href={percorsoImprevisti(chiaveViaggio)}>Annulla</Link>
          </div>
        </form>
      )}
    </section>
  );
}
