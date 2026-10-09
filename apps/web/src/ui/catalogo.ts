/**
 * I componenti minimi del design system (REQ-UX-001 §6.2), nell'ordine della pagina /stile. Ogni voce ha una sezione
 * con `data-componente="<id>"` in tutti e due i temi (verificato dal test di CA-3).
 */
export const COMPONENTI_DESIGN_SYSTEM = [
  { id: "pulsanti", nome: "Pulsanti", nota: "Primario, secondario e testo; almeno 44×44 px." },
  { id: "chip", nome: "Chip selezionabili", nota: "Un colore e un'icona per ogni stile di viaggio." },
  { id: "slider", nome: "Slider", nota: "Frecce, Pagina su e giù, Inizio e Fine." },
  { id: "date", nome: "Selettore di date e periodi", nota: "Date precise oppure mese e durata." },
  { id: "contatori", nome: "Contatori", nota: "Pulsanti − e + con il valore annunciato." },
  { id: "schede-attivita", nome: "Schede attività", nota: "Illustrazione, orario, durata, stile, costo, all'aperto o al coperto." },
  { id: "linea-tempo", nome: "Linea del tempo del giorno", nota: "Attività come schede, spostamenti come connettori." },
  { id: "mappa", nome: "Mappa", nota: "Indicatori numerati e linee degli spostamenti, tessere di OpenStreetMap." },
  { id: "chat", nome: "Pannello chat", nota: "Bolle, risposte rapide e messaggio quando la chat non è disponibile." },
  { id: "proposta", nome: "Scheda proposta", nota: "Livello, cambi prima → dopo, avviso, alternative, Accetta e Rifiuta." },
  { id: "badge", nome: "Badge di stato", nota: "Bozza, Confermato, In corso, Concluso e i toni del sistema." },
  { id: "avvisi", nome: "Avvisi", nota: "Informazione, conferma, attenzione, errore con cosa fare." },
  { id: "finestre", nome: "Finestre modali e pannelli laterali", nota: "Il focus resta dentro; Esc chiude." },
  { id: "notifiche", nome: "Notifiche brevi", nota: "Riscontro di un'azione, con Annulla." },
  { id: "scheletro", nome: "Caricamento a scheletro", nota: "La forma del contenuto mentre arriva." },
  { id: "stato-vuoto", nome: "Stato vuoto illustrato", nota: "Cosa manca e cosa fare." },
] as const;

export type IdComponente = (typeof COMPONENTI_DESIGN_SYSTEM)[number]["id"];
