/**
 * L'unico punto della web app che legge l'orologio di sistema (REQ-UX-003, orologio automatico dei viaggi
 * dell'utente con `TRAVELOPS_OROLOGIO`). Il resto dell'app riceve il momento già pronto: la guardia di REQ-WEB-002
 * CA-9 ammette l'orologio di sistema solo in questo file.
 */
export function adessoDiSistema(): Date {
  return new Date();
}
