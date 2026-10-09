/**
 * Indicatore di caricamento a scheletro: blocchi grigi che anticipano la forma del contenuto. È decorativo; ai
 * lettori di schermo arriva solo il testo "Caricamento…". Con `prefers-reduced-motion` il luccichio si ferma.
 */
export function Scheletro({ righe = 3, conImmagine = true, testo = "Caricamento…" }: { righe?: number; conImmagine?: boolean; testo?: string }) {
  return (
    <div className="ui-scheletro" aria-busy="true">
      <p className="ui-solo-lettori" role="status">
        {testo}
      </p>
      <div className="ui-scheletro__forma" aria-hidden="true">
        {conImmagine && <div className="ui-scheletro__blocco ui-scheletro__blocco--immagine" />}
        <div className="ui-scheletro__righe">
          {Array.from({ length: righe }, (_, indice) => (
            <div key={indice} className="ui-scheletro__blocco ui-scheletro__blocco--riga" data-ultima={indice === righe - 1 ? "si" : undefined} />
          ))}
        </div>
      </div>
    </div>
  );
}
