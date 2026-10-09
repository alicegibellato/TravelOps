import type { Metadata } from "next";
import { PaginaStile } from "../../src/componenti/PaginaStile";

export const metadata: Metadata = {
  title: "Stile",
  // Pagina interna del design system: non è nel menu e non va indicizzata.
  robots: { index: false, follow: false },
};

/** Pagina interna /stile (REQ-UX-001, CA-3): tutti i componenti in tema chiaro e scuro. */
export default function Stile() {
  return <PaginaStile />;
}
