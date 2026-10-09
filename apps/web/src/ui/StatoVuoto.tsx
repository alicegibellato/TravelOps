import type { ReactNode } from "react";

/** L'illustrazione dello stato vuoto: una valigia davanti a una mappa con un segnaposto. Colori solo dai token. */
function IllustrazioneValigia() {
  return (
    <svg className="ui-stato-vuoto__illustrazione" viewBox="0 0 160 120" aria-hidden="true" focusable="false">
      <circle className="ui-ill-sole" cx="128" cy="26" r="14" />
      <path className="ui-ill-mappa" d="M14 30 L52 20 L92 30 L130 20 L130 96 L92 106 L52 96 L14 106 Z" />
      <path className="ui-ill-pieghe" d="M52 20 L52 96 M92 30 L92 106" />
      <path className="ui-ill-percorso" d="M28 84 C 44 60, 60 78, 74 58 S 100 40, 112 48" />
      <path className="ui-ill-segnaposto" d="M112 30 a10 10 0 0 1 10 10 c0 8 -10 18 -10 18 s-10 -10 -10 -18 a10 10 0 0 1 10 -10 Z" />
      <circle className="ui-ill-segnaposto-centro" cx="112" cy="40" r="3.5" />
      <rect className="ui-ill-valigia" x="40" y="62" width="52" height="40" rx="8" />
      <path className="ui-ill-maniglia" d="M56 62 v-8 a4 4 0 0 1 4 -4 h12 a4 4 0 0 1 4 4 v8" />
      <path className="ui-ill-cinghie" d="M54 62 v40 M78 62 v40" />
    </svg>
  );
}

interface Proprieta {
  titolo: string;
  descrizione: string;
  /** Cosa fare ora (un pulsante o un link). */
  azione?: ReactNode;
  /** Livello del titolo: 2 di solito, 1 se lo stato vuoto è tutta la pagina. */
  livello?: 1 | 2 | 3;
}

/** Stato vuoto illustrato: dice cosa manca e cosa fare (REQ-UX-001 §6.4). */
export function StatoVuoto({ titolo, descrizione, azione, livello = 2 }: Proprieta) {
  const Titolo = `h${livello}` as const;
  return (
    <div className="ui-stato-vuoto">
      <IllustrazioneValigia />
      <Titolo className="ui-stato-vuoto__titolo">{titolo}</Titolo>
      <p className="ui-stato-vuoto__descrizione">{descrizione}</p>
      {azione !== undefined && <div className="ui-stato-vuoto__azione">{azione}</div>}
    </div>
  );
}
