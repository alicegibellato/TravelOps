"use server";
/**
 * Azioni lato server della pagina Pianifica (REQ-CHAT-001, ST-CHAT-001C): il percorso guidato salva la bozza delle
 * preferenze a ogni cambio nel profilo condiviso con la chat (REQ-PREF-001 CA-6), anche quando è ancora incompleta.
 */
import { salvaProfilo } from "../../src/preferenze/profilo";
import type { BozzaProfilo } from "../../src/preferenze/tipi";
import { cartellaDati } from "../../src/stato/archivio";
import { usaBaseDati } from "../../src/stato/avvio";

export async function salvaBozzaInCorsoAzione(bozza: BozzaProfilo): Promise<void> {
  if (typeof bozza !== "object" || bozza === null || Array.isArray(bozza)) return;
  usaBaseDati(cartellaDati(), (db) => salvaProfilo(db, bozza));
}
