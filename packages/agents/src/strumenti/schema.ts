/**
 * Validazione degli argomenti degli strumenti con il loro schema JSON (ST-ORCH-001B), senza dipendenze esterne.
 *
 * Lo schema è uno solo: lo stesso oggetto va al modello (`DefinizioneStrumento.parametri`, modalità rigorosa di
 * OpenAI) e controlla qui gli argomenti ricevuti. Si interpreta solo il sottoinsieme di JSON Schema che gli
 * strumenti usano: `type` (anche come elenco, per esempio `["string", "null"]`), `enum`, `properties`, `required`,
 * `additionalProperties: false`, `items`, `minItems`, `maxItems`, `minimum`, `maximum`, `pattern`.
 *
 * In modalità rigorosa il modello manda sempre tutte le proprietà, con `null` per quelle che non vuole indicare.
 * Per essere tolleranti con un modello non rigoroso, una proprietà assente il cui tipo ammette `null` vale `null`.
 */
import { ErroreStrumento } from "../ciclo.js";
import type { SchemaJson } from "../modello.js";

type TipoJson = "object" | "array" | "string" | "integer" | "number" | "boolean" | "null";

/** Schema JSON di un valore, nel sottoinsieme usato dagli strumenti. */
export interface SchemaValore {
  readonly type: TipoJson | readonly TipoJson[];
  readonly description?: string;
  readonly enum?: readonly (string | number | boolean | null)[];
  readonly properties?: { readonly [nome: string]: SchemaValore };
  readonly required?: readonly string[];
  readonly additionalProperties?: false;
  readonly items?: SchemaValore;
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly pattern?: string;
}

/** Schema della radice degli argomenti: un oggetto con tutte le proprietà in `required` (modalità rigorosa). */
export interface SchemaArgomenti extends SchemaValore {
  readonly type: "object";
  readonly properties: { readonly [nome: string]: SchemaValore };
  readonly required: readonly string[];
  readonly additionalProperties: false;
}

/** Costruisce lo schema della radice mettendo tutte le proprietà in `required`, come chiede la modalità rigorosa. */
export function schemaOggetto(properties: { readonly [nome: string]: SchemaValore }, description?: string): SchemaArgomenti {
  return {
    type: "object",
    ...(description === undefined ? {} : { description }),
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

/** Lo schema come lo vuole `DefinizioneStrumento`. */
export const comeSchemaJson = (schema: SchemaArgomenti): SchemaJson => schema as unknown as SchemaJson;

/** Controlla `valore` con lo schema e restituisce i problemi (vuoto se è valido), in italiano, per il modello. */
export function problemiArgomenti(schema: SchemaValore, valore: unknown): string[] {
  const problemi: string[] = [];
  controlla(schema, valore, "argomenti", problemi);
  return problemi;
}

/**
 * Valida gli argomenti e li restituisce normalizzati (le proprietà assenti che ammettono `null` valgono `null`).
 * @throws ErroreStrumento con l'elenco dei problemi, così il modello si può correggere.
 */
export function validaArgomenti<T>(schema: SchemaArgomenti, valore: unknown): T {
  const normalizzato = completaNulli(schema, valore);
  const problemi = problemiArgomenti(schema, normalizzato);
  if (problemi.length > 0) throw new ErroreStrumento(`Argomenti non validi: ${problemi.join("; ")}.`);
  return normalizzato as T;
}

function tipi(schema: SchemaValore): readonly TipoJson[] {
  return typeof schema.type === "string" ? [schema.type] : schema.type;
}

function ammetteNull(schema: SchemaValore): boolean {
  return tipi(schema).includes("null");
}

function oggetto(valore: unknown): valore is Record<string, unknown> {
  return typeof valore === "object" && valore !== null && !Array.isArray(valore);
}

function completaNulli(schema: SchemaValore, valore: unknown): unknown {
  if (Array.isArray(valore) && schema.items !== undefined) {
    const items = schema.items;
    return valore.map((v) => completaNulli(items, v));
  }
  if (!oggetto(valore) || schema.properties === undefined) return valore;
  const copia: Record<string, unknown> = { ...valore };
  for (const [nome, figlio] of Object.entries(schema.properties)) {
    if (!(nome in copia) && ammetteNull(figlio)) copia[nome] = null;
    else if (nome in copia) copia[nome] = completaNulli(figlio, copia[nome]);
  }
  return copia;
}

function tipoDi(valore: unknown): TipoJson | "altro" {
  if (valore === null) return "null";
  if (Array.isArray(valore)) return "array";
  if (typeof valore === "number") return Number.isInteger(valore) ? "integer" : "number";
  if (typeof valore === "string" || typeof valore === "boolean") return typeof valore as "string" | "boolean";
  return oggetto(valore) ? "object" : "altro";
}

const NOMI_TIPO: Record<TipoJson, string> = {
  object: "un oggetto",
  array: "un elenco",
  string: "un testo",
  integer: "un numero intero",
  number: "un numero",
  boolean: "vero o falso",
  null: "null",
};

function controlla(schema: SchemaValore, valore: unknown, dove: string, problemi: string[]): void {
  const ammessi = tipi(schema);
  const tipo = tipoDi(valore);
  const tipoOk = ammessi.some((t) => t === tipo || (t === "number" && tipo === "integer"));
  if (!tipoOk) {
    problemi.push(`${dove} deve essere ${ammessi.map((t) => NOMI_TIPO[t]).join(" oppure ")}`);
    return;
  }
  if (valore === null) return;
  if (schema.enum !== undefined && !schema.enum.includes(valore as string)) {
    problemi.push(`${dove} deve essere uno di: ${schema.enum.filter((v) => v !== null).map((v) => JSON.stringify(v)).join(", ")}`);
    return;
  }
  if (typeof valore === "string" && schema.pattern !== undefined && !new RegExp(schema.pattern, "u").test(valore)) {
    problemi.push(`${dove} non ha il formato atteso (${schema.description ?? schema.pattern})`);
  }
  if (typeof valore === "number") {
    if (schema.minimum !== undefined && valore < schema.minimum) problemi.push(`${dove} deve essere almeno ${schema.minimum}`);
    if (schema.maximum !== undefined && valore > schema.maximum) problemi.push(`${dove} deve essere al massimo ${schema.maximum}`);
  }
  if (Array.isArray(valore)) {
    if (schema.minItems !== undefined && valore.length < schema.minItems) problemi.push(`${dove} deve avere almeno ${schema.minItems} elementi`);
    if (schema.maxItems !== undefined && valore.length > schema.maxItems) problemi.push(`${dove} deve avere al massimo ${schema.maxItems} elementi`);
    if (schema.items !== undefined) {
      const items = schema.items;
      valore.forEach((v, i) => controlla(items, v, `${dove}[${i}]`, problemi));
    }
  }
  if (oggetto(valore) && schema.properties !== undefined) {
    for (const nome of schema.required ?? []) {
      if (!(nome in valore)) problemi.push(`manca ${dove}.${nome}`);
    }
    if (schema.additionalProperties === false) {
      for (const nome of Object.keys(valore)) {
        if (!(nome in schema.properties)) problemi.push(`${dove}.${nome} non è previsto`);
      }
    }
    for (const [nome, figlio] of Object.entries(schema.properties)) {
      if (nome in valore) controlla(figlio, valore[nome], `${dove}.${nome}`, problemi);
    }
  }
}
