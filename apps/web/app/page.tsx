import { PaginaHome } from "../src/componenti/PaginaHome";
import { VIAGGI } from "../src/dati/viaggi";
import { vistaHome } from "../src/viste/home";

/** Home: "I miei viaggi" (REQ-UX-001). */
export default function Home() {
  return <PaginaHome viaggi={vistaHome(VIAGGI)} />;
}
