import type { EsitoAzione } from "../stato/stato";
import type { Azione } from "./azioni";

/** Un messaggio per il viaggiatore: esito di un'azione, avviso o errore. */
export function Avviso({ livello, messaggio }: { livello: EsitoAzione["livello"]; messaggio: string }) {
  return (
    <p className={`avviso avviso--${livello}`} role={livello === "successo" ? "status" : "alert"} data-livello={livello}>
      {messaggio}
    </p>
  );
}

/** Lo stato salvato non si può leggere: si mostra il motivo e si offre "Ripristina". */
export function StatoNonValido({ motivo, azione }: { motivo: string; azione: Azione }) {
  return (
    <section className="errori" role="alert">
      <h2>Lo stato salvato non è valido</h2>
      <p>{motivo === "" ? "Il file dello stato non si può usare." : `Motivo: ${motivo}.`}</p>
      <form action={azione}>
        <button type="submit">Ripristina</button>
      </form>
    </section>
  );
}
