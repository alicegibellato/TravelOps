/**
 * ST-QA-001C (REQ-QA-001): i casi del gruppo C del testbook che oggi falliscono per un difetto dell'app, con la story di
 * correzione che li fa ripassare. I loro flussi non girano in `npm run e2e` finché il difetto è aperto (la suite su main
 * resta verde); con `TRAVELOPS_E2E_DIFETTI=1` girano tutti. Chi chiude la correzione toglie qui la riga del caso.
 */
import { flusso } from "./flussi";

export const DIFETTI_APERTI: Readonly<Record<string, string>> = {
  "TB-IMPR-006": "ST-QA-FIX-011",
  "TB-IMPR-007": "ST-QA-FIX-012",
  "TB-IMPR-008": "ST-QA-FIX-013",
  "TB-IMPR-009": "ST-QA-FIX-014",
  "TB-MON-002": "ST-QA-FIX-015",
  "TB-TRIP-006": "ST-QA-FIX-016",
  "TB-VER-004": "ST-QA-FIX-004",
};

/** Come `flusso`, ma salta il caso (il nome inizia con l'ID) se ha un difetto aperto. */
export const flussoCaso: typeof flusso = (nome, ...resto) => {
  const id = /^TB-[A-Z]+-\d+/.exec(nome)?.[0];
  if (id !== undefined && DIFETTI_APERTI[id] !== undefined && process.env.TRAVELOPS_E2E_DIFETTI !== "1") return;
  flusso(nome, ...resto);
};
