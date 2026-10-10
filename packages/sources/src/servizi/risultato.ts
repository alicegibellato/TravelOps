/**
 * Risultato comune dei servizi esterni (REQ-INTEG-001, CA-3): ogni porta risponde con un `RisultatoServizio`, mai con
 * un'eccezione. Un errore di rete, un tempo scaduto o una risposta inattesa diventano un risultato **non disponibile**,
 * con un messaggio per il viaggiatore: l'app continua a funzionare senza quel dato.
 */

/** Con quale realizzazione è stato ottenuto (o tentato) il risultato. */
export type ModalitaServizio = "finto" | "reale";

export const MODALITA_SERVIZIO: readonly ModalitaServizio[] = ["finto", "reale"];

/** Perché un servizio non ha dato risposta. */
export type MotivoNonDisponibile =
  | "rete"
  | "timeout"
  | "annullato"
  | "risposta_non_valida"
  | "richiesta_rifiutata"
  | "non_configurato";

export interface RisultatoDisponibile<T> {
  disponibile: true;
  dati: T;
  origine: ModalitaServizio;
  /** Vero se la risposta viene dalla cache in memoria e non da una nuova chiamata. */
  dallaCache: boolean;
}

export interface RisultatoNonDisponibile {
  disponibile: false;
  origine: ModalitaServizio;
  motivo: MotivoNonDisponibile;
  /** Frase per il viaggiatore, per esempio "Meteo non disponibile: il servizio non risponde". */
  messaggio: string;
}

export type RisultatoServizio<T> = RisultatoDisponibile<T> | RisultatoNonDisponibile;

export const disponibile = <T>(dati: T, origine: ModalitaServizio, dallaCache = false): RisultatoDisponibile<T> => ({
  disponibile: true,
  dati,
  origine,
  dallaCache,
});

export const nonDisponibile = (origine: ModalitaServizio, motivo: MotivoNonDisponibile, messaggio: string): RisultatoNonDisponibile => ({
  disponibile: false,
  origine,
  motivo,
  messaggio,
});

/** Un errore "atteso" di un adattatore: diventa direttamente un risultato non disponibile. */
export class ErroreServizio extends Error {
  override readonly name = "ErroreServizio";
  constructor(
    readonly motivo: MotivoNonDisponibile,
    messaggio: string,
  ) {
    super(messaggio);
  }
}

/**
 * Esegue `chiamata` con un tempo massimo e trasforma ogni fallimento in un risultato non disponibile.
 * `soggetto` è la parola del messaggio ("Meteo", "Percorsi"…).
 */
export async function conLimiteDiTempo<T>(
  opzioni: { origine: ModalitaServizio; soggetto: string; timeoutMs: number; segnale?: AbortSignal | undefined },
  chiamata: (segnale: AbortSignal) => Promise<T>,
): Promise<RisultatoServizio<T>> {
  const { origine, soggetto, timeoutMs, segnale } = opzioni;
  if (segnale?.aborted) return nonDisponibile(origine, "annullato", `${soggetto} non disponibile: richiesta annullata`);
  const limite = AbortSignal.timeout(timeoutMs);
  const insieme = AbortSignal.any(segnale === undefined ? [limite] : [limite, segnale]);
  try {
    // La gara con il segnale fa scadere anche un adattatore che ignora l'AbortSignal.
    const scaduto = new Promise<never>((_ok, ko) => insieme.addEventListener("abort", () => ko(insieme.reason), { once: true }));
    return disponibile(await Promise.race([chiamata(insieme), scaduto]), origine);
  } catch (errore) {
    if (errore instanceof ErroreServizio) return nonDisponibile(origine, errore.motivo, `${soggetto} non disponibile: ${errore.message}`);
    if (limite.aborted) return nonDisponibile(origine, "timeout", `${soggetto} non disponibile: il servizio non risponde in tempo`);
    if (segnale?.aborted) return nonDisponibile(origine, "annullato", `${soggetto} non disponibile: richiesta annullata`);
    return nonDisponibile(origine, "rete", `${soggetto} non disponibile: il servizio non è raggiungibile`);
  }
}
