import { Scheletro } from "../src/ui/Scheletro";

/** Mentre una pagina si prepara: uno scheletro con la forma del contenuto, annunciato come «Caricamento…». */
export default function Caricamento() {
  return (
    <section className="pagina-vuota" aria-label="Caricamento">
      <Scheletro righe={4} />
    </section>
  );
}
