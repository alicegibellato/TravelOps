"use client";

import { useId, useState } from "react";
import { Contatore } from "./Contatore";

const MESI = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
];

type Modo = "date" | "periodo";

interface Proprieta {
  etichetta?: string;
  /** Date iniziali, `AAAA-MM-GG`. */
  dal?: string;
  al?: string;
  /** Mese iniziale del periodo, da 1 a 12. */
  mese?: number;
  /** Durata del viaggio in giorni (da 2 a 14, `modello-dominio-estensioni.md` §7.2). */
  durata?: number;
}

/**
 * Selettore di date e periodi: date precise (dal… al…) oppure un mese e una durata. Usa i campi nativi del browser
 * (calendario accessibile da tastiera) e i pulsanti di scelta, raggruppati con la loro legenda.
 */
export function SelettoreDate({ etichetta = "Quando parti?", dal = "", al = "", mese = 6, durata = 3 }: Proprieta) {
  const id = useId();
  const [modo, setModo] = useState<Modo>("date");
  return (
    <fieldset className="ui-selettore-date">
      <legend className="ui-campo__etichetta">{etichetta}</legend>
      <div className="ui-segmenti" role="radiogroup" aria-label="Come vuoi indicare le date">
        {(
          [
            ["date", "Date precise"],
            ["periodo", "Mese e durata"],
          ] as const
        ).map(([valore, testo]) => (
          <label key={valore} className="ui-segmenti__voce">
            <input type="radio" name={`${id}-modo`} value={valore} checked={modo === valore} onChange={() => setModo(valore)} />
            <span>{testo}</span>
          </label>
        ))}
      </div>
      {modo === "date" ? (
        <div className="ui-selettore-date__campi">
          <label className="ui-campo">
            <span className="ui-campo__etichetta">Dal</span>
            <input className="ui-campo__controllo" type="date" name="dal" defaultValue={dal} />
          </label>
          <label className="ui-campo">
            <span className="ui-campo__etichetta">Al</span>
            <input className="ui-campo__controllo" type="date" name="al" defaultValue={al} />
          </label>
        </div>
      ) : (
        <div className="ui-selettore-date__campi">
          <label className="ui-campo">
            <span className="ui-campo__etichetta">Mese</span>
            <select className="ui-campo__controllo" name="mese" defaultValue={String(mese)}>
              {MESI.map((nome, indice) => (
                <option key={nome} value={indice + 1}>
                  {nome}
                </option>
              ))}
            </select>
          </label>
          <Contatore etichetta="Durata" min={2} max={14} predefinito={durata} unita={{ singolare: "giorno", plurale: "giorni" }} />
        </div>
      )}
    </fieldset>
  );
}
