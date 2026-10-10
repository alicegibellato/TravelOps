"use client";

import { Search, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useId, useMemo, useRef, useState } from "react";
import { ATTIVITA_CONSIGLIATE_NEL_SELETTORE } from "../bozza/configurazione";
import type { VistaBozza } from "../bozza/tipi";

const normalizza = (testo: string): string =>
  testo
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

interface Proprieta {
  aperto: boolean;
  alCambio: (aperto: boolean) => void;
  titolo: string;
  suggerite: VistaBozza["suggerite"];
  attesa: boolean;
  alScelta: (attivitaId: string) => void;
  /** Dove va il focus alla chiusura (l'attivatore del menu che ha aperto il selettore). */
  alChiusura?: (evento: Event) => void;
}

/**
 * Selettore ricercabile delle attività da aggiungere a un giorno: una finestra con il campo «Cerca» e l'elenco in due
 * gruppi (le più adatte a te, poi le altre). Il focus entra nel campo, Esc chiude.
 */
export function SelettoreAttivita({ aperto, alCambio, titolo, suggerite, attesa, alScelta, alChiusura }: Proprieta) {
  const id = useId();
  const [domanda, setDomanda] = useState("");
  const campo = useRef<HTMLInputElement>(null);
  const chiave = normalizza(domanda);
  const trovate = useMemo(() => suggerite.map((s, indice) => ({ ...s, indice })).filter((s) => chiave === "" || normalizza(s.nome).includes(chiave)), [suggerite, chiave]);
  const consigliate = trovate.filter((s) => s.indice < ATTIVITA_CONSIGLIATE_NEL_SELETTORE);
  const altre = trovate.filter((s) => s.indice >= ATTIVITA_CONSIGLIATE_NEL_SELETTORE);
  const gruppo = (nome: string, voci: typeof trovate) =>
    voci.length === 0 ? null : (
      <section className="bozza__selettore-gruppo" aria-labelledby={`${id}-${nome}`}>
        <h3 id={`${id}-${nome}`}>{nome === "consigliate" ? "Consigliate per te" : "Altre idee"}</h3>
        <ul>
          {voci.map((s) => (
            <li key={s.attivitaId}>
              <button type="button" className="bozza__selettore-voce" disabled={attesa} onClick={() => alScelta(s.attivitaId)}>
                {s.nome}
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  return (
    <Dialog.Root
      open={aperto}
      onOpenChange={(valore) => {
        if (!valore) setDomanda("");
        alCambio(valore);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="ui-velo" />
        <Dialog.Content className="ui-finestra bozza__selettore" aria-describedby={`${id}-stato`}
          onOpenAutoFocus={(evento) => {
            evento.preventDefault();
            campo.current?.focus();
          }}
          {...(alChiusura === undefined ? {} : { onCloseAutoFocus: alChiusura })}>
          <div className="ui-finestra__testa">
            <Dialog.Title className="ui-finestra__titolo">{titolo}</Dialog.Title>
            <Dialog.Close className="ui-pulsante ui-pulsante--testo ui-pulsante--icona" aria-label="Chiudi">
              <X size={20} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="bozza__selettore-ricerca">
            <Search size={18} aria-hidden="true" />
            <label className="ui-solo-lettori" htmlFor={`${id}-cerca`}>
              Cerca un&apos;attività
            </label>
            <input ref={campo} id={`${id}-cerca`} type="search" placeholder="Cerca un'attività" autoComplete="off" value={domanda} onChange={(e) => setDomanda(e.target.value)} />
          </div>
          <p id={`${id}-stato`} className="bozza__selettore-stato" role="status">
            {trovate.length === 0 ? `Nessuna attività corrisponde a «${domanda.trim()}».` : trovate.length === 1 ? "1 attività" : `${trovate.length} attività`}
          </p>
          <div className="bozza__selettore-elenco">
            {gruppo("consigliate", consigliate)}
            {gruppo("altre", altre)}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
