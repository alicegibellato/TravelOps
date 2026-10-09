import type { Mezzo } from "@travelops/engine";
import type { ReactNode } from "react";
import { SchedaAttivita, type DatiSchedaAttivita } from "./SchedaAttivita";
import { ICONE_MEZZI } from "./stili";

interface DatiVoce {
  chiave: string;
  inizio: string;
  /** Riconosce la voce quando si evidenzia insieme a un'altra parte della pagina (per esempio la mappa). */
  elementoId?: string | undefined;
  /** Classi in più sulla voce, per le segnalazioni. */
  classe?: string | undefined;
  /** Altro contenuto in fondo alla scheda o al connettore (azioni, segnalazioni). */
  extra?: ReactNode;
}

export type VoceLineaTempo =
  | ({ tipo: "attivita" } & DatiVoce & DatiSchedaAttivita)
  | ({ tipo: "spostamento"; mezzo: Mezzo; mezzoEtichetta?: string | undefined; descrizione: string; orario?: string | undefined; durata?: string | undefined } & DatiVoce);

interface Proprieta {
  voci: readonly VoceLineaTempo[];
  etichetta: string;
  /** La voce evidenziata (`elementoId`) e come cambiarla al passaggio del mouse, al focus o al tocco. */
  evidenziato?: string | null | undefined;
  onEvidenzia?: ((elementoId: string | null) => void) | undefined;
}

/**
 * Linea del tempo del giorno: le attività come schede, gli spostamenti come connettori sottili con l'icona del mezzo
 * e la durata (REQ-UX-001 §6.2, usata dalla vista giorno di REQ-WEB-003).
 */
export function LineaTempo({ voci, etichetta, evidenziato = null, onEvidenzia }: Proprieta) {
  return (
    <ol className="ui-linea-tempo" aria-label={etichetta}>
      {voci.map((voce) => {
        const acceso = voce.elementoId !== undefined && voce.elementoId === evidenziato;
        const gestori =
          onEvidenzia === undefined || voce.elementoId === undefined
            ? {}
            : {
                onMouseEnter: () => onEvidenzia(voce.elementoId ?? null),
                onMouseLeave: () => onEvidenzia(null),
                onFocus: () => onEvidenzia(voce.elementoId ?? null),
                onBlur: () => onEvidenzia(null),
                onClick: () => onEvidenzia(voce.elementoId ?? null),
              };
        const comuni = {
          "data-elemento": voce.elementoId,
          "data-evidenziata": acceso ? "si" : undefined,
          ...gestori,
        };
        if (voce.tipo === "spostamento") {
          const Icona = ICONE_MEZZI[voce.mezzo];
          return (
            <li key={voce.chiave} className={["ui-linea-tempo__voce", "ui-linea-tempo__voce--spostamento", voce.classe ?? ""].join(" ").trim()} {...comuni}>
              <time className="ui-linea-tempo__ora">{voce.inizio}</time>
              <div className="ui-linea-tempo__connettore">
                <Icona size={16} aria-hidden="true" />
                <span>
                  {voce.mezzoEtichetta !== undefined && <span className="ui-solo-lettori">{voce.mezzoEtichetta}: </span>}
                  {voce.descrizione}
                  {voce.orario !== undefined && ` · ${voce.orario}`}
                  {voce.durata !== undefined && ` · ${voce.durata}`}
                </span>
                {voce.extra}
              </div>
            </li>
          );
        }
        const { tipo: _tipo, chiave: _chiave, inizio, elementoId: _elementoId, classe, extra, ...scheda } = voce;
        return (
          <li key={voce.chiave} className={["ui-linea-tempo__voce", "ui-linea-tempo__voce--attivita", classe ?? ""].join(" ").trim()} data-stile={voce.stile} {...comuni}>
            <time className="ui-linea-tempo__ora">{inizio}</time>
            <SchedaAttivita {...scheda} evidenziata={acceso}>
              {extra}
            </SchedaAttivita>
          </li>
        );
      })}
    </ol>
  );
}
