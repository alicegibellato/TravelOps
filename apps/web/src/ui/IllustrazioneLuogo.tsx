import { immagineDelLuogo, tipoDelLuogo, type TipoLuogo } from "./luoghi-config";
import { ALTEZZA_DISEGNO, formeLuogo, LARGHEZZA_DISEGNO } from "./luogo-forme";

interface Proprieta {
  /** Il nome del luogo: da lui vengono il tipo (se non indicato) e il disegno. */
  nome: string;
  /** Il tipo di luogo; senza, lo suggerisce il nome. */
  tipo?: TipoLuogo | undefined;
  /** Lo stile di viaggio, per scegliere il tipo quando il nome non lo dice. */
  stile?: string | undefined;
  /** Cambia il disegno senza cambiare il tipo (per esempio per distinguere due viaggi nello stesso posto). */
  seme?: string | undefined;
  /** Le proporzioni: `ampia` 16:9, `larga` 16:7, `quadrata` 1:1, `libera` riempie il contenitore. */
  forma?: "ampia" | "larga" | "quadrata" | "libera" | undefined;
  /** Un'immagine locale (cartella `public/`) al posto del disegno; senza, si cerca in `IMMAGINI_LUOGHI`. */
  immagine?: string | undefined;
}

/**
 * L'immagine di un luogo (CB-4): una fotografia locale se c'è, altrimenti un'illustrazione generata dal nome e dal tipo
 * (lago, montagna, mare, città d'arte, borgo, parco). Non usa servizi esterni. È decorativa: il nome del luogo è sempre nel
 * testo accanto. Le proporzioni sono fisse (`aspect-ratio`) e il disegno si ritaglia senza deformarsi.
 */
export function IllustrazioneLuogo({ nome, tipo, stile, seme, forma = "ampia", immagine }: Proprieta) {
  const tipoLuogo = tipo ?? tipoDelLuogo(nome, stile);
  const fotografia = immagine ?? immagineDelLuogo(nome);
  if (fotografia !== null) {
    return (
      <div className={`ui-luogo ui-luogo--${forma}`} data-luogo={tipoLuogo} data-fonte="immagine" aria-hidden="true">
        {/* Immagine locale decorativa: il nome sta nel testo accanto. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ui-luogo__immagine" src={fotografia} alt="" loading="lazy" decoding="async" />
      </div>
    );
  }
  const forme = formeLuogo(tipoLuogo, seme ?? nome);
  return (
    <div className={`ui-luogo ui-luogo--${forma}`} data-luogo={tipoLuogo} data-fonte="disegno" aria-hidden="true">
      <svg className="ui-luogo__disegno" viewBox={`0 0 ${LARGHEZZA_DISEGNO} ${ALTEZZA_DISEGNO}`} preserveAspectRatio="xMidYMax slice" focusable="false">
        {forme.map((f, i) => (
          <path key={i} className={`ui-luogo__${f.strato}`} d={f.d} />
        ))}
      </svg>
    </div>
  );
}
