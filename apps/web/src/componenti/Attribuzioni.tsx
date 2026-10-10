import { TESTO_ATTRIBUZIONE_OSM, URL_DIRITTI_OSM } from "../rete";
import type { AttribuzioniAttivita, AttribuzioniDestinazione } from "../destinazioni/tipi";

/** "© OpenStreetMap contributors" con il link ai diritti: va sotto la mappa e accanto ai dati che ne vengono. */
export function AttribuzioneOsm() {
  return (
    <a className="attribuzione-osm" href={URL_DIRITTI_OSM} target="_blank" rel="noopener noreferrer">
      {TESTO_ATTRIBUZIONE_OSM}
    </a>
  );
}

/**
 * Le attribuzioni di un'attività nel suo dettaglio: OpenStreetMap, autore e licenza dell'immagine, fonte della
 * descrizione. Non mostra nulla se i dati non ne registrano.
 */
export function AttribuzioniDettaglio({ attribuzioni }: { attribuzioni: AttribuzioniAttivita | undefined }) {
  if (attribuzioni === undefined) return null;
  return (
    <section className="attribuzioni" aria-label="Fonti e attribuzioni">
      <h3>Fonti e attribuzioni</h3>
      <ul>
        {attribuzioni.osm && (
          <li data-attribuzione="osm">
            Luogo e posizione: <AttribuzioneOsm />
          </li>
        )}
        {attribuzioni.fonteDescrizione !== null && <li data-attribuzione="descrizione">Descrizione: {attribuzioni.fonteDescrizione}</li>}
        {attribuzioni.immagine !== null && <li data-attribuzione="immagine">Immagine: {attribuzioni.immagine}</li>}
      </ul>
    </section>
  );
}

/** Le attribuzioni di una destinazione costruita: mappa, fonti, immagini (autore e licenza) e descrizioni. */
export function AttribuzioniDiDestinazione({ attribuzioni }: { attribuzioni: AttribuzioniDestinazione }) {
  return (
    <section className="attribuzioni" aria-label="Fonti e attribuzioni" data-attribuzioni="destinazione">
      <h3>Fonti e attribuzioni</h3>
      <ul>
        <li data-attribuzione="osm">
          Mappa e luoghi: <AttribuzioneOsm />
        </li>
        {attribuzioni.fonti.map((fonte) => (
          <li key={fonte.nome} data-attribuzione="fonte">
            {fonte.nome}: {fonte.attribuzione}
          </li>
        ))}
        {attribuzioni.descrizioni.map((voce) => (
          <li key={voce.luogo} data-attribuzione="descrizione">
            Descrizione di {voce.luogo}: {voce.fonte}
          </li>
        ))}
        {attribuzioni.immagini.map((voce) => (
          <li key={voce.attivita} data-attribuzione="immagine">
            Immagine di {voce.attivita}: {voce.autore}, licenza {voce.licenza}
          </li>
        ))}
      </ul>
    </section>
  );
}
