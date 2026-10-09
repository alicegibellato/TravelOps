/**
 * Testi dell'interfaccia che non dipendono dal motore: i componenti che girano nel browser (badge, scheda proposta,
 * chat) li importano da qui, così il motore non entra nel codice del browser. `testi.ts` li riesporta.
 */

/** Gli stati del viaggio (`modello-dominio-estensioni.md` §7.1). */
export type StatoViaggio = "bozza" | "confermato" | "in_corso" | "concluso";

export const TESTI_STATO_VIAGGIO: Readonly<Record<StatoViaggio, string>> = {
  bozza: "Bozza",
  confermato: "Confermato",
  in_corso: "In corso",
  concluso: "Concluso",
};

/** I livelli di ripianificazione di una proposta (`modello-dominio-estensioni.md` §7.6). */
export type LivelloRipianificazione = "minimo" | "giornata" | "resto";

export const TESTI_LIVELLI: Readonly<Record<LivelloRipianificazione, string>> = {
  minimo: "Cambia solo il necessario",
  giornata: "Rifà la giornata",
  resto: "Rivede il resto del viaggio",
};
