import { PaginaHome } from "../src/componenti/PaginaHome";
import { schedeHome } from "../src/dati/viaggi-salvati";
import { cartellaDati } from "../src/stato/archivio";

/** I viaggi si leggono dalla base dati a ogni richiesta: i nuovi viaggi compaiono subito (REQ-UX-003, CA-2). */
export const dynamic = "force-dynamic";

/** Home: "I miei viaggi" (REQ-UX-001), con i viaggi demo e quelli creati dalla chat o dai filtri (REQ-UX-003). */
export default function Home() {
  return <PaginaHome viaggi={schedeHome(cartellaDati())} />;
}
