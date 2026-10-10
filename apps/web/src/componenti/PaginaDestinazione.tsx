import type { ServizioDestinazioni } from "../destinazioni/tipi";
import { SceltaDestinazione } from "./SceltaDestinazione";
import type { OpzioneMese } from "./Sorprendimi";

/** Pagina «Scegli la destinazione» (REQ-CAT-002): ricerca con suggerimenti, avanzamento, attribuzioni e Sorprendimi. */
export function PaginaDestinazione({ servizio, mesi }: { servizio: ServizioDestinazioni; mesi: readonly OpzioneMese[] }) {
  return (
    <section className="pagina-destinazione" aria-labelledby="destinazione-titolo">
      <h1 id="destinazione-titolo">Scegli la destinazione</h1>
      <SceltaDestinazione servizio={servizio} mesi={mesi} />
    </section>
  );
}
