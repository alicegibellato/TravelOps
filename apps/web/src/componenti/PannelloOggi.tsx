import { CalendarClock, Clock, Footprints, Hourglass, MapPin, Trees } from "lucide-react";
import { attesaInParole, minutiTra } from "../oggi/tempo";
import { etichettaRitardo, RITARDI_RAPIDI } from "../oggi/ritardi";
import type { Adesso, Dopo, VistaOggi } from "../oggi/vista";
import { PERCORSO_DEMO } from "../percorsi";
import { classiPulsante, PulsanteLink } from "../ui/Pulsante";
import { IllustrazioneLuogo } from "../ui/IllustrazioneLuogo";
import { TESTI_STILI } from "../ui/stili";
import type { RigaElemento } from "../viste/giorno";
import type { Azione } from "./azioni";

export interface AzioniOggi {
  /** "Sono in ritardo di N minuti": campi `viaggio` e `minuti`. */
  segnalaRitardo: Azione;
}

interface Proprieta {
  chiave: string;
  vista: VistaOggi;
  azioni: AzioniOggi;
  /** Livello del titolo "Oggi": 1 se il pannello è tutta la pagina. */
  livello?: 1 | 2;
  /** Prefisso degli `id` dei titoli (se la pagina mostra più pannelli). */
  idBase?: string;
}

/** I dati di un momento (orario, durata, all'aperto): una riga di voci con la loro icona. */
function DatiMomento({ riga }: { riga: RigaElemento }) {
  return (
    <ul className="oggi__dati">
      <li>
        <Clock size={16} aria-hidden="true" />
        <span>{riga.orario}</span>
      </li>
      {riga.durata !== null && (
        <li>
          <Hourglass size={16} aria-hidden="true" />
          <span>{riga.durata}</span>
        </li>
      )}
      {riga.attivita !== null && riga.attivita.allAperto && (
        <li>
          <Trees size={16} aria-hidden="true" />
          <span>All'aperto</span>
        </li>
      )}
      {riga.attivita !== null && (
        <li>
          <span className="ui-badge ui-badge--stile" data-stile={riga.attivita.stile}>
            {TESTI_STILI[riga.attivita.stile]}
          </span>
        </li>
      )}
    </ul>
  );
}

/** Il nome di un momento: l'attività, oppure lo spostamento con la sua icona. */
function NomeMomento({ riga, classe }: { riga: RigaElemento; classe: string }) {
  return (
    <p className={classe}>
      {riga.tipo === "spostamento" && <Footprints size={20} aria-hidden="true" />}
      <span>{riga.descrizione}</span>
    </p>
  );
}

/** Quanto è andato avanti il momento in corso, da 0 a 1. */
function avanzamento(riga: RigaElemento, ora: string): number {
  const totale = minutiTra(riga.inizio, riga.fine);
  return totale <= 0 ? 1 : Math.min(1, Math.max(0, minutiTra(riga.inizio, ora) / totale));
}

/**
 * «Adesso» in evidenza (ST-UX-003B, CB-6): l'immagine del luogo, il momento in corso con il tempo che manca e una barra
 * di avanzamento; se non c'è niente in programma, quanto tempo libero resta.
 */
function SchedaAdesso({ adesso, ora }: { adesso: Adesso; ora: string }) {
  const { elemento, fino, minutiRimanenti, posizione } = adesso;
  const rimanente = minutiRimanenti === null ? null : attesaInParole(minutiRimanenti);
  const nomeLuogo = elemento?.tipo === "attivita" ? elemento.descrizione : posizione.luogo.nome;
  return (
    <>
      <IllustrazioneLuogo nome={nomeLuogo} stile={elemento?.attivita?.stile} seme={posizione.luogo.id} forma="larga" />
      <div className="oggi__hero-corpo">
        {elemento !== null ? (
          <>
            <NomeMomento riga={elemento} classe="oggi__hero-nome" />
            <DatiMomento riga={elemento} />
            <progress className="oggi__avanzamento" value={Math.round(avanzamento(elemento, ora) * 100)} max={100} aria-label="Quanto è andato avanti" />
            <p className="oggi__tempo" data-rimanente={minutiRimanenti ?? undefined}>
              {`Finisce alle ${elemento.fine}: mancano ${rimanente ?? ""}.`}
            </p>
          </>
        ) : (
          <p className="oggi__libero oggi__hero-nome" data-rimanente={minutiRimanenti ?? undefined}>
            {fino === null ? "Per oggi non c'è altro in programma." : `Niente in programma fino alle ${fino}: hai ${rimanente ?? ""} liberi.`}
          </p>
        )}
        <p className="oggi__posizione" data-luogo={posizione.luogo.id}>
          <MapPin size={16} aria-hidden="true" />{" "}
          {posizione.inViaggio ? `Posizione prevista: in viaggio verso ${posizione.luogo.nome}.` : `Posizione prevista: ${posizione.luogo.nome}.`}
        </p>
      </div>
    </>
  );
}

function SchedaDopo({ dopo }: { dopo: Dopo | null }) {
  if (dopo === null) return <p className="oggi__libero">Per oggi è tutto: goditi il resto della giornata.</p>;
  const attesa = attesaInParole(dopo.minutiAllaPartenza);
  const quando =
    dopo.partenza === null
      ? `Sei già in viaggio${dopo.mezzo === null ? "" : ` (${dopo.mezzo.toLowerCase()})`}: arrivi alle ${dopo.elemento.inizio}, tra ${attesa}.`
      : dopo.partenza === dopo.elemento.inizio
        ? `Inizia alle ${dopo.partenza}, tra ${attesa}.`
        : `Parti alle ${dopo.partenza}${dopo.mezzo === null ? "" : ` (${dopo.mezzo.toLowerCase()})`}, tra ${attesa}.`;
  return (
    <div className="oggi__dopo">
      <IllustrazioneLuogo nome={dopo.elemento.descrizione} stile={dopo.elemento.attivita?.stile} seme={dopo.elemento.id} forma="quadrata" />
      <div className="oggi__dopo-corpo">
        <NomeMomento riga={dopo.elemento} classe="oggi__dopo-nome" />
        <DatiMomento riga={dopo.elemento} />
        <p className="oggi__tempo" data-partenza={dopo.partenza ?? undefined}>
          <CalendarClock size={16} aria-hidden="true" /> {quando}
        </p>
      </div>
    </div>
  );
}

/** I momenti che seguono «Dopo», in fila lungo una linea del tempo; gli spostamenti sono righe discrete. */
function ProssimiMomenti({ righe }: { righe: readonly RigaElemento[] }) {
  if (righe.length === 0) return null;
  return (
    <ol className="oggi__timeline" aria-label="Più tardi">
      {righe.map((riga) => (
        <li key={riga.id} className="oggi__timeline-voce" data-tipo={riga.tipo} data-elemento={riga.id}>
          <span className="oggi__timeline-ora">{riga.inizio}</span>
          <span className="oggi__timeline-nome">{riga.descrizione}</span>
        </li>
      ))}
    </ol>
  );
}

function PulsantiRapidi({ chiave, azioni, idBase, Sezione }: { chiave: string; azioni: AzioniOggi; idBase: string; Sezione: "h2" | "h3" }) {
  return (
    <section className="oggi__rapidi" aria-labelledby={`${idBase}-rapidi`}>
      <Sezione id={`${idBase}-rapidi`}>Qualcosa è cambiato?</Sezione>
      <ul className="oggi__rapidi-elenco">
        {RITARDI_RAPIDI.map((minuti) => (
          <li key={minuti}>
            <form action={azioni.segnalaRitardo}>
              <input type="hidden" name="viaggio" value={chiave} />
              <input type="hidden" name="minuti" value={minuti} />
              <button type="submit" className={classiPulsante({ variante: "secondario" })} data-ritardo={minuti}>
                {etichettaRitardo(minuti)}
              </button>
            </form>
          </li>
        ))}
        <li>
          <PulsanteLink href={PERCORSO_DEMO} variante="testo">
            Ho un imprevisto
          </PulsanteLink>
        </li>
        <li>
          <PulsanteLink href={PERCORSO_DEMO} variante="testo">
            Oggi sono stanco
          </PulsanteLink>
        </li>
      </ul>
      <p className="oggi__nota">TravelOps ti propone come cambiare il programma: decidi tu se accettare.</p>
    </section>
  );
}

/**
 * La vista Oggi (REQ-TODAY-001): durante il viaggio le schede "Adesso" e "Dopo", la posizione prevista e i pulsanti
 * rapidi; prima della partenza quanto manca, dopo il ritorno il riepilogo del viaggio.
 */
export function PannelloOggi({ chiave, vista, azioni, livello = 2, idBase = "oggi" }: Proprieta) {
  const Titolo = `h${livello}` as const;
  // Le sezioni stanno un livello sotto il titolo (nessun livello saltato).
  const Sezione = livello === 1 ? "h2" : "h3";
  // I momenti dopo quello di «Dopo»: la linea del tempo del resto della giornata.
  const piuTardi = vista.fase === "in_corso" && vista.dopo !== null ? vista.giorno.elementi.filter((riga) => riga.inizio >= (vista.dopo?.elemento.fine ?? "24:00")) : [];
  return (
    <section className="oggi" aria-labelledby={`${idBase}-titolo`} data-fase={vista.fase}>
      <Titolo id={`${idBase}-titolo`}>Oggi</Titolo>
      <p className="sottotitolo" data-momento={`${vista.momento.data} ${vista.momento.ora}`}>
        {vista.momentoEsteso}
      </p>
      {vista.fase === "prima" && (
        <p className="oggi__fuori" data-giorni={vista.giorniAllaPartenza}>
          {vista.giorniAllaPartenza === 1 ? "Manca 1 giorno" : `Mancano ${vista.giorniAllaPartenza} giorni`} alla partenza, il{" "}
          <time dateTime={vista.dataInizio}>{vista.dataInizioEstesa}</time>.
        </p>
      )}
      {vista.fase === "concluso" && (
        <p className="oggi__fuori">
          Il viaggio è finito il <time dateTime={vista.dataFine}>{vista.dataFineEstesa}</time>: {vista.numeroGiorni}{" "}
          {vista.numeroGiorni === 1 ? "giorno" : "giorni"} e {vista.numeroAttivita} attività.
        </p>
      )}
      {vista.fase === "in_corso" && (
        <>
          <div className="oggi__schede">
            <section className="oggi__scheda oggi__hero" data-scheda="adesso" data-elemento={vista.adesso.elemento?.id} aria-labelledby={`${idBase}-adesso`}>
              <Sezione id={`${idBase}-adesso`}>Adesso</Sezione>
              <SchedaAdesso adesso={vista.adesso} ora={vista.momento.ora} />
            </section>
            <section className="oggi__scheda oggi__prossimi" data-scheda="dopo" data-elemento={vista.dopo?.elemento.id} aria-labelledby={`${idBase}-dopo`}>
              <Sezione id={`${idBase}-dopo`}>Dopo</Sezione>
              <SchedaDopo dopo={vista.dopo} />
              <ProssimiMomenti righe={piuTardi} />
            </section>
          </div>
          <PulsantiRapidi chiave={chiave} azioni={azioni} idBase={idBase} Sezione={Sezione} />
        </>
      )}
    </section>
  );
}
