/**
 * Le azioni dei moduli della Demo, passate ai componenti dalle pagine (sono le azioni lato server di
 * `app/demo/azioni.ts`). Così i componenti si disegnano anche nei test, senza Next.js.
 */
export type Azione = (dati: FormData) => void | Promise<void>;

export interface AzioniDemo {
  avviaScenario: Azione;
  impostaOrologio: Azione;
  ripristina: Azione;
}

export interface AzioniProposta {
  accetta: Azione;
  rifiuta: Azione;
}

/** Messaggi per gli errori che le azioni segnalano nell'indirizzo (`?errore=<codice>`). */
export const MESSAGGI_ERRORE: Readonly<Record<string, string>> = {
  orologio: "Orologio non impostato: indica la data come AAAA-MM-GG e l'ora come HH:mm.",
  scenario: "Scenario sconosciuto.",
  proposta: "La proposta non è più disponibile: avvia di nuovo lo scenario.",
  stato: 'Lo stato salvato non è valido: usa "Ripristina".',
};

export function messaggioErrore(codice: string | string[] | undefined): string | null {
  const chiave = Array.isArray(codice) ? codice[0] : codice;
  return chiave === undefined ? null : (MESSAGGI_ERRORE[chiave] ?? null);
}
