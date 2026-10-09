import { readFileSync } from "node:fs";
/**
 * Supporto ai test delle preferenze (ST-PREF-001A): profili di riferimento PR-1…PR-5, un profilo di base
 * valido e attività di catalogo sintetiche per provare una regola del punteggio alla volta.
 */
import { validaProfilo, type BozzaProfilo, type ProfiloPreferenze } from "../../src/preferences/index.js";
import type { AttivitaCatalogoEstesa } from "../../src/model/index.js";
import { leggiDati } from "../catalog/supporto.js";

export { catalogoEsteso, leggiDati } from "../catalog/supporto.js";

export interface ProfiloDiRiferimento {
  id: string;
  nome: string;
  profilo: BozzaProfilo;
}

/** I profili PR-1…PR-5 (§8.2) come file di dati: ogni chiamata restituisce una copia nuova. */
export const profiliDiRiferimento = (): ProfiloDiRiferimento[] =>
  JSON.parse(readFileSync(new URL("./dati/profili-riferimento.json", import.meta.url), "utf8")) as ProfiloDiRiferimento[];

/** Valida una bozza che deve essere valida e restituisce il profilo completo. */
export function profilo(bozza: unknown): ProfiloPreferenze {
  const esito = validaProfilo(bozza);
  if (!esito.ok) throw new Error(esito.problemi.map((p) => p.testo).join(" "));
  return esito.profilo;
}

/** Bozza con i soli campi obbligatori. */
export const bozzaMinima = (): BozzaProfilo => ({
  destinazione: { tipo: "luogo", nome: "Roma" },
  date: { tipo: "precise", inizio: "2026-10-02", fine: "2026-10-04" },
});

/**
 * Profilo di base per il punteggio: un solo stile (`cultura`), forma `moderato`, budget `€€`, 2 adulti senza
 * esigenze. Le varianti cambiano un campo alla volta.
 */
export const profiloBase = (variante: BozzaProfilo = {}): ProfiloPreferenze =>
  profilo({ ...bozzaMinima(), stili: ["cultura"], ...variante });

/** Attività sintetica neutra rispetto al profilo di base (nessuno stile in comune, entro ogni limite). */
export const attivita = (variante: Partial<AttivitaCatalogoEstesa> = {}): AttivitaCatalogoEstesa => ({
  id: "A-PROVA",
  nome: "Attività di prova",
  luogoId: "LUOGO-PROVA",
  categoria: "natura",
  allAperto: true,
  durataTipica: 60,
  stili: ["relax"],
  intensita: "facile",
  costo: "€",
  adattaAiBambini: true,
  accessibile: true,
  ...variante,
});

/** Congela in profondità, per verificare che le funzioni non modifichino l'ingresso. */
export function congela<T>(valore: T): T {
  if (typeof valore === "object" && valore !== null) {
    for (const figlio of Object.values(valore)) congela(figlio);
    Object.freeze(valore);
  }
  return valore;
}

/**
 * Un testo per il viaggiatore senza codici tecnici: niente trattini bassi, parentesi quadre, nomi dei campi in
 * stile codice, valori grezzi del JSON; inizia con la maiuscola e finisce con il punto.
 */
export function testoSemplice(testo: string): boolean {
  return (
    !/[_[\]{}<>`]/.test(testo) &&
    !/\b(undefined|null|NaN|true|false|tipoGruppo|formaFisica|daEvitare|attivitaId|mezzi_pubblici)\b/.test(
      testo,
    ) &&
    !/\b[A-Z]+-[A-Z0-9-]+\b/.test(testo) &&
    /^[«A-ZÈÉ0-9]/.test(testo) &&
    testo.endsWith(".")
  );
}
