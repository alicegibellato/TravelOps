/**
 * Avvio della web app (Next.js chiama `register` una volta, quando parte il server): prepara la base dati
 * (REQ-DATA-001). Al primo avvio su un clone pulito la crea in `.data/travelops.db` con i viaggi demo (CA-1);
 * dalle volte successive applica solo le migrazioni mancanti (CA-4). Durante `next build` non si crea nulla.
 * Se la base dati non si può preparare, l'avvio continua: le pagine mostrano il motivo. Poi parte il controllo periodico
 * dei viaggi confermati (REQ-MONITOR-001, `MONITOR_ATTIVO=false` lo disattiva).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { cartellaDati, preparaBaseDati } = await import("./src/stato/archivio");
  try {
    preparaBaseDati(cartellaDati());
  } catch (errore) {
    console.error(`TravelOps: la base dati non si può preparare (${(errore as Error).message})`);
    return;
  }
  // Controllo periodico dei viaggi confermati (REQ-MONITOR-001): un solo pianificatore, spento alla chiusura del server.
  const { avviaMonitoraggio } = await import("./src/monitoraggio/avvio");
  avviaMonitoraggio();
}
