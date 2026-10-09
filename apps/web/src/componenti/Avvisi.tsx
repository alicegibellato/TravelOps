import type { EsitoAzione } from "../stato/stato";
import { inParole } from "../testi";
import { Avviso as AvvisoUi, type TonoAvviso } from "../ui/Avviso";
import { classiPulsante } from "../ui/Pulsante";
import type { Azione } from "./azioni";

const TONI: Record<EsitoAzione["livello"], TonoAvviso> = {
  successo: "successo",
  avviso: "attenzione",
  errore: "errore",
};

/** Un messaggio per il viaggiatore: esito di un'azione, avviso o errore, sempre in parole (REQ-UX-001, CA-6). */
export function Avviso({ livello, messaggio }: { livello: EsitoAzione["livello"]; messaggio: string }) {
  return (
    <AvvisoUi tono={TONI[livello]} dati={{ "data-livello": livello }}>
      {inParole(messaggio)}
    </AvvisoUi>
  );
}

/** Lo stato salvato non si può leggere: si mostra il motivo e si offre "Ripristina". */
export function StatoNonValido({ motivo, azione }: { motivo: string; azione: Azione }) {
  return (
    <section className="errori" role="alert">
      <h2>Lo stato salvato non è valido</h2>
      <p>{motivo === "" ? "Il file dello stato non si può usare." : `Motivo: ${inParole(motivo)}.`}</p>
      <p>Con &quot;Ripristina&quot; riparti dall&apos;itinerario di riferimento.</p>
      <form action={azione}>
        <button type="submit" className={classiPulsante({ variante: "primario" })}>Ripristina</button>
      </form>
    </section>
  );
}
