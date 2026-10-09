import type { Mezzo } from "@travelops/engine";
import { SchedaAttivita, type DatiSchedaAttivita } from "./SchedaAttivita";
import { ICONE_MEZZI } from "./stili";

export type VoceLineaTempo =
  | ({ tipo: "attivita"; chiave: string; inizio: string } & DatiSchedaAttivita)
  | { tipo: "spostamento"; chiave: string; inizio: string; mezzo: Mezzo; descrizione: string; durata: string };

/**
 * Linea del tempo del giorno: le attività come schede, gli spostamenti come connettori sottili con l'icona del mezzo
 * e la durata (REQ-UX-001 §6.2, usata dalla vista giorno di REQ-WEB-003).
 */
export function LineaTempo({ voci, etichetta }: { voci: readonly VoceLineaTempo[]; etichetta: string }) {
  return (
    <ol className="ui-linea-tempo" aria-label={etichetta}>
      {voci.map((voce) => {
        if (voce.tipo === "spostamento") {
          const Icona = ICONE_MEZZI[voce.mezzo];
          return (
            <li key={voce.chiave} className="ui-linea-tempo__voce ui-linea-tempo__voce--spostamento">
              <time className="ui-linea-tempo__ora">{voce.inizio}</time>
              <span className="ui-linea-tempo__connettore">
                <Icona size={16} aria-hidden="true" />
                <span>
                  {voce.descrizione} · {voce.durata}
                </span>
              </span>
            </li>
          );
        }
        const { tipo: _tipo, chiave: _chiave, inizio, ...scheda } = voce;
        return (
          <li key={voce.chiave} className="ui-linea-tempo__voce ui-linea-tempo__voce--attivita" data-stile={voce.stile}>
            <time className="ui-linea-tempo__ora">{inizio}</time>
            <SchedaAttivita {...scheda} />
          </li>
        );
      })}
    </ol>
  );
}
