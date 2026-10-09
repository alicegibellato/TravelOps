import Link from "next/link";
import { percorsoElementoDa, percorsoGiornoDa, percorsoViaggio } from "../percorsi";
import { Badge } from "../ui/Badge";
import type { VoceLineaTempo } from "../ui/LineaTempo";
import type { DettaglioElemento } from "../viste/elemento";
import type { RigaElemento, VistaGiorno as DatiVistaGiorno } from "../viste/giorno";
import { ETICHETTE_CAMBIO, type SegnaliElemento, type SegnaliGiorno } from "../viste/segnalazioni";
import { ApriDettaglio } from "./ApriDettaglio";
import { ContenutoPannello } from "./ContenutoPannello";
import { RiepilogoPrenotazione } from "./GestisciPrenotazione";
import { LineaTempoGiorno } from "./LineaTempoGiorno";
import { ProblemaInRiga } from "./TabellaElementi";

interface Proprieta {
  chiave: string;
  vista: DatiVistaGiorno;
  /** Indirizzo della vista viaggio; se manca è quello del viaggio di riferimento con questa chiave. */
  radice?: string;
  /** Problemi di fattibilità del giorno (REQ-WEB-002), da mostrare accanto agli elementi coinvolti. */
  segnali?: SegnaliGiorno;
  /** Il dettaglio di ogni elemento (per id): si apre in un pannello dal pulsante "Dettagli". */
  dettagli?: Readonly<Record<string, DettaglioElemento>>;
}

function classeVoce(segnali: SegnaliElemento | undefined): string {
  const classi: string[] = [];
  if (segnali?.aRischio) classi.push("elemento--a-rischio");
  if (segnali !== undefined && segnali.problemi.length > 0) classi.push("elemento--con-problemi");
  if (segnali?.cambio) classi.push(`elemento--${segnali.cambio}`);
  return classi.join(" ");
}

function ExtraVoce({ riga, segnali, radice, dettaglio }: { riga: RigaElemento; segnali: SegnaliElemento | undefined; radice: string; dettaglio: DettaglioElemento | undefined }) {
  const href = percorsoElementoDa(radice, riga.id);
  const giaSegnalato = segnali !== undefined && (segnali.aRischio || segnali.cambio !== null || segnali.problemi.length > 0);
  return (
    <div className="voce-extra">
      {(riga.orarioFisso || giaSegnalato) && (
        <div className="voce-extra__etichette">
          {riga.orarioFisso && <Badge tono="attenzione">Orario fisso</Badge>}
          {segnali?.aRischio && <Badge tono="errore">A rischio</Badge>}
          {segnali?.cambio && <Badge tono="primario">{ETICHETTE_CAMBIO[segnali.cambio]}</Badge>}
        </div>
      )}
      {segnali?.problemi.map((problema, indice) => (
        <ProblemaInRiga key={`${problema.codice}-${indice}`} problema={problema} />
      ))}
      <RiepilogoPrenotazione prenotazione={riga.prenotazione} />
      {dettaglio === undefined ? (
        <Link href={href} className="ui-pulsante ui-pulsante--testo dettagli-apri" aria-label={`Dettagli: ${riga.descrizione}`}>
          Dettagli
        </Link>
      ) : (
        <ApriDettaglio href={href} titolo={dettaglio.titolo} descrizione={`${dettaglio.dataEstesa}, ${dettaglio.orario}`}>
          <ContenutoPannello dettaglio={dettaglio} />
        </ApriDettaglio>
      )}
    </div>
  );
}

/** Le voci della linea del tempo: attività come schede, spostamenti come connettori. */
function vociGiorno(vista: DatiVistaGiorno, radice: string, segnali: SegnaliGiorno | undefined, dettagli: Readonly<Record<string, DettaglioElemento>>): VoceLineaTempo[] {
  return vista.elementi.map((riga): VoceLineaTempo => {
    const segnaliRiga = segnali?.perElemento[riga.id];
    const comuni = {
      chiave: riga.id,
      elementoId: riga.id,
      inizio: riga.inizio,
      classe: classeVoce(segnaliRiga),
      extra: <ExtraVoce riga={riga} segnali={segnaliRiga} radice={radice} dettaglio={dettagli[riga.id]} />,
    };
    if (riga.tipo === "spostamento" && riga.mezzoId !== null) {
      return { ...comuni, tipo: "spostamento", mezzo: riga.mezzoId, mezzoEtichetta: riga.mezzo ?? undefined, descrizione: riga.descrizione, orario: riga.orario, durata: riga.durata ?? undefined };
    }
    return {
      ...comuni,
      tipo: "attivita",
      nome: riga.descrizione,
      orario: riga.orario,
      durata: riga.durata ?? undefined,
      stile: riga.attivita?.stile,
      costo: riga.attivita?.costo ?? undefined,
      allAperto: riga.attivita?.allAperto,
    };
  });
}

/**
 * Vista giorno come linea del tempo: le attività sono schede (illustrazione, nome, orario, durata, stile, costo,
 * all'aperto o al coperto), gli spostamenti connettori con l'icona del mezzo e la durata. Orario fisso, prenotazione
 * (codice e "Gestisci prenotazione") e, se indicati, i problemi di fattibilità stanno accanto agli elementi.
 */
export function VistaGiorno({ chiave, vista, radice = percorsoViaggio(chiave), segnali, dettagli = {} }: Proprieta) {
  return (
    <section className="vista-giorno" aria-labelledby="giorno-titolo">
      <nav className="navigazione-giorni" aria-label="Giorni">
        <Link href={radice}>Tutto il viaggio</Link>
        {vista.dataPrecedente !== null && (
          <Link href={percorsoGiornoDa(radice, vista.dataPrecedente)} rel="prev">
            ← Giorno precedente
          </Link>
        )}
        {vista.dataSuccessiva !== null && (
          <Link href={percorsoGiornoDa(radice, vista.dataSuccessiva)} rel="next">
            Giorno successivo →
          </Link>
        )}
      </nav>
      <h1 id="giorno-titolo">
        Giorno {vista.numero}: <time dateTime={vista.data}>{vista.dataEstesa}</time>
      </h1>
      <p className="sottotitolo">
        Partenza da {vista.luogoPartenza.nome}
        <span className="separatore" aria-hidden="true">
          ·
        </span>
        {vista.alloggio === null ? "Nessun alloggio: ultimo giorno del viaggio" : `Alloggio: ${vista.alloggio.nome}`}
      </p>
      {segnali !== undefined && (
        <p className={segnali.problemi.length === 0 ? "esito-giorno esito-giorno--ok" : "esito-giorno esito-giorno--problemi"} data-problemi-giorno={segnali.problemi.length}>
          {segnali.problemi.length === 0
            ? "Nessun problema di fattibilità in questo giorno."
            : segnali.problemi.length === 1
              ? "Un problema di fattibilità in questo giorno, segnalato accanto agli elementi coinvolti."
              : `${segnali.problemi.length} problemi di fattibilità in questo giorno, segnalati accanto agli elementi coinvolti.`}
        </p>
      )}
      {vista.elementi.length === 0 ? (
        <p>Nessun elemento in programma.</p>
      ) : (
        <>
          <h2 className="ui-solo-lettori">Programma del giorno</h2>
          <LineaTempoGiorno voci={vociGiorno(vista, radice, segnali, dettagli)} etichetta="Programma del giorno" />
        </>
      )}
    </section>
  );
}
