/**
 * Pianificatore del controllo periodico (REQ-MONITOR-001, CA-1), senza processi fuori controllo:
 * - un solo timer alla volta (`setTimeout` a catena, mai `setInterval`): il prossimo giro si programma solo quando il
 *   precedente è finito, quindi due controlli non si sovrappongono;
 * - il timer non tiene vivo il processo (`unref` nel timer predefinito);
 * - `ferma()` annulla il timer e attende il giro in corso: dopo, non resta niente in esecuzione;
 * - un errore del controllo viene riferito a `inErrore` e non ferma i giri successivi.
 * Il timer è iniettabile: i test lo guidano con un orologio finto, senza attese reali.
 */
export interface TimerPianificatore {
  imposta(azione: () => void, millisecondi: number): { annulla(): void };
}

/** Timer predefinito: `setTimeout` che non tiene vivo il processo. */
export const timerDiSistema: TimerPianificatore = {
  imposta(azione, millisecondi) {
    const id = setTimeout(azione, millisecondi);
    id.unref();
    return { annulla: () => clearTimeout(id) };
  },
};

export interface OpzioniPianificatore {
  intervalloMs: number;
  /** Il controllo da eseguire a ogni giro. */
  esegui(): Promise<void>;
  timer?: TimerPianificatore;
  inErrore?(errore: unknown): void;
}

export interface Pianificatore {
  /** Avvia i giri; chiamarlo a pianificatore già avviato non fa niente. */
  avvia(): void;
  /** Annulla il prossimo giro e attende quello in corso. Si può richiamare più volte. */
  ferma(): Promise<void>;
  readonly avviato: boolean;
}

export function creaPianificatore(opzioni: OpzioniPianificatore): Pianificatore {
  if (!Number.isFinite(opzioni.intervalloMs) || opzioni.intervalloMs < 1) throw new Error("L'intervallo del controllo deve essere di almeno 1 millisecondo");
  const timer = opzioni.timer ?? timerDiSistema;
  let attivo = false;
  let prossimo: { annulla(): void } | null = null;
  let incorso: Promise<void> | null = null;

  const programma = (): void => {
    if (!attivo) return;
    prossimo = timer.imposta(() => {
      prossimo = null;
      incorso = giro();
    }, opzioni.intervalloMs);
  };

  const giro = async (): Promise<void> => {
    try {
      await opzioni.esegui();
    } catch (errore) {
      opzioni.inErrore?.(errore);
    } finally {
      incorso = null;
      programma();
    }
  };

  return {
    get avviato() {
      return attivo;
    },
    avvia() {
      if (attivo) return;
      attivo = true;
      programma();
    },
    async ferma() {
      attivo = false;
      prossimo?.annulla();
      prossimo = null;
      if (incorso !== null) await incorso;
    },
  };
}
