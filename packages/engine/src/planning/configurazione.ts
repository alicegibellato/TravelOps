/**
 * Configurazione del generatore della bozza (ST-UX-004A): soglie di varietà e testi delle note raggruppate.
 * Valori sostituibili da chi chiama (`OpzioniBozza.varieta`) senza toccare le regole.
 */

/** Soglie che evitano giornate monotone e tragitti lunghi tra attività simili. */
export interface ConfigurazioneVarieta {
  /** Quante attività della stessa categoria possono stare di fila nella stessa giornata. */
  maxAttivitaStessoTipo: number;
  /** Tragitto massimo (minuti) tra due attività vicine di valore simile. */
  tragittoMassimoMinuti: number;
  /** Due attività hanno "valore simile" quando i punteggi (§7.7) differiscono al massimo di tanto. */
  differenzaValoreSimile: number;
}

export const VARIETA_PREDEFINITA: Readonly<ConfigurazioneVarieta> = {
  maxAttivitaStessoTipo: 2,
  tragittoMassimoMinuti: 45,
  differenzaValoreSimile: 3,
};

/** Le soglie in uso: i valori dati sostituiscono i predefiniti; quelli non validi sono ignorati. */
export function varietaEffettiva(personalizzata: Partial<ConfigurazioneVarieta> | undefined): ConfigurazioneVarieta {
  const valido = (v: number | undefined): v is number => v !== undefined && Number.isFinite(v) && v >= 0;
  return {
    maxAttivitaStessoTipo:
      personalizzata?.maxAttivitaStessoTipo !== undefined && valido(personalizzata.maxAttivitaStessoTipo) && personalizzata.maxAttivitaStessoTipo >= 1
        ? Math.floor(personalizzata.maxAttivitaStessoTipo)
        : VARIETA_PREDEFINITA.maxAttivitaStessoTipo,
    tragittoMassimoMinuti: valido(personalizzata?.tragittoMassimoMinuti)
      ? personalizzata.tragittoMassimoMinuti
      : VARIETA_PREDEFINITA.tragittoMassimoMinuti,
    differenzaValoreSimile: valido(personalizzata?.differenzaValoreSimile)
      ? personalizzata.differenzaValoreSimile
      : VARIETA_PREDEFINITA.differenzaValoreSimile,
  };
}

/** Testi delle note raggruppate della sezione "Da sapere". */
export const TESTI_NOTE = {
  orariNonVerificati: (luoghi: string): string =>
    `Gli orari di apertura non sono verificati, controllali prima di andare: ${luoghi}.`,
} as const;
