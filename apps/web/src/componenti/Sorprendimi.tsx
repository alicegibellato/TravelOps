"use client";

import { Dices } from "lucide-react";
import { useId, useState } from "react";
import type { EsitoSorprendimi, PropostaSorprendimi, ServizioDestinazioni } from "../destinazioni/tipi";
import type { StileViaggio } from "../testi";
import { Avviso } from "../ui/Avviso";
import { ChipSelezionabile, GruppoChip } from "../ui/Chip";
import { Pulsante } from "../ui/Pulsante";
import { TESTI_STILI } from "../ui/stili";

const STILI = Object.keys(TESTI_STILI) as StileViaggio[];

/** Cosa ti piace, cosa evitare e il mese scelti in Sorprendimi. */
export interface SceltePerSorprendimi {
  stili: readonly StileViaggio[];
  daEvitare: readonly StileViaggio[];
  /** `AAAA-MM`. */
  mese: string;
}

export interface OpzioneMese {
  /** `AAAA-MM`. */
  valore: string;
  etichetta: string;
}

interface Proprieta {
  servizio: Pick<ServizioDestinazioni, "sorprendimi">;
  mesi: readonly OpzioneMese[];
  /**
   * Il viaggiatore ha scelto una delle proposte. Con la proposta arrivano anche le scelte fatte qui (REQ-CHAT-003
   * CA-5): chi usa Sorprendimi le può tenere nel profilo, così non si chiedono di nuovo.
   */
  onScegli: (proposta: PropostaSorprendimi, scelte: SceltePerSorprendimi) => void;
  /** Livello del titolo (2 nella pagina Destinazione, 3 dentro un passo del percorso). */
  livello?: 2 | 3;
}

function alternaStile(elenco: readonly StileViaggio[], stile: StileViaggio, attivo: boolean): StileViaggio[] {
  return attivo ? [...elenco.filter((s) => s !== stile), stile] : elenco.filter((s) => s !== stile);
}

/**
 * "Sorprendimi" (REQ-PREF-001 CA-7): il viaggiatore dice cosa gli piace, cosa vuole evitare e in che mese parte; il
 * server ordina le destinazioni candidate col punteggio del profilo e ne propone 3, tra cui sceglierne una.
 */
export function Sorprendimi({ servizio, mesi, onScegli, livello = 2 }: Proprieta) {
  const Titolo = `h${livello}` as const;
  const id = useId();
  const [stili, setStili] = useState<StileViaggio[]>([]);
  const [daEvitare, setDaEvitare] = useState<StileViaggio[]>([]);
  const [mese, setMese] = useState(mesi[0]?.valore ?? "");
  const [attesa, setAttesa] = useState(false);
  const [esito, setEsito] = useState<EsitoSorprendimi | null>(null);
  // Dopo la scelta (ST-UX-004B, CB-4) il modulo e le idee si riassumono in una riga; «Scegli un'altra idea» le riapre.
  const [scelta, setScelta] = useState<PropostaSorprendimi | null>(null);

  const proponi = () => {
    setAttesa(true);
    servizio.sorprendimi({ stili, daEvitare, mese }).then(
      (risposta) => {
        setEsito(risposta);
        setAttesa(false);
      },
      () => {
        setEsito({ esito: "errore", messaggio: "Al momento non riesco a proporti delle idee. Riprova tra un attimo." });
        setAttesa(false);
      },
    );
  };

  if (scelta !== null) {
    return (
      <section className="sorprendimi sorprendimi--scelta" aria-labelledby={`${id}-titolo`} data-scelta={scelta.id}>
        <Titolo id={`${id}-titolo`}>Non sai dove andare? Sorprendimi</Titolo>
        <p role="status">
          Hai scelto <strong>{scelta.nome}</strong>. {scelta.descrizione}
        </p>
        <div>
          <Pulsante variante="secondario" onClick={() => setScelta(null)}>
            Scegli un&apos;altra idea
          </Pulsante>
        </div>
      </section>
    );
  }

  return (
    <section className="sorprendimi" aria-labelledby={`${id}-titolo`}>
      <Titolo id={`${id}-titolo`}>Non sai dove andare? Sorprendimi</Titolo>
      <p>Dimmi cosa ti piace e quando parti: ti propongo tre idee, poi scegli tu.</p>
      <p id={`${id}-piace`} className="ui-campo__etichetta">
        Cosa ti piace? Se non scegli nulla, uso cultura e natura.
      </p>
      <GruppoChip etichetta="Cosa ti piace">
        {STILI.map((stile) => (
          <ChipSelezionabile
            key={stile}
            etichetta={TESTI_STILI[stile]}
            stile={stile}
            selezionato={stili.includes(stile)}
            onCambia={(attivo) => setStili((corrente) => alternaStile(corrente, stile, attivo))}
          />
        ))}
      </GruppoChip>
      <p className="ui-campo__etichetta">Cosa preferisci evitare?</p>
      <GruppoChip etichetta="Cosa preferisci evitare">
        {STILI.map((stile) => (
          <ChipSelezionabile
            key={stile}
            etichetta={TESTI_STILI[stile]}
            selezionato={daEvitare.includes(stile)}
            onCambia={(attivo) => setDaEvitare((corrente) => alternaStile(corrente, stile, attivo))}
          />
        ))}
      </GruppoChip>
      <label className="ui-campo">
        <span className="ui-campo__etichetta">In che mese parti?</span>
        <select className="ui-campo__controllo" value={mese} onChange={(e) => setMese(e.target.value)}>
          {mesi.map((opzione) => (
            <option key={opzione.valore} value={opzione.valore}>
              {opzione.etichetta}
            </option>
          ))}
        </select>
      </label>
      <div>
        <Pulsante variante="primario" icona={<Dices size={18} />} disabled={attesa || mese === ""} onClick={proponi}>
          {attesa ? "Cerco idee…" : "Sorprendimi"}
        </Pulsante>
      </div>
      {esito?.esito === "errore" && <Avviso tono="attenzione">{esito.messaggio}</Avviso>}
      {esito?.esito === "proposte" && esito.proposte.length === 0 && (
        <Avviso tono="info">Con queste scelte non ho idee da proporti: prova a evitare meno cose.</Avviso>
      )}
      {esito?.esito === "proposte" && esito.proposte.length > 0 && (
        <ol className="sorprendimi__proposte" aria-label="Le idee per te">
          {esito.proposte.map((proposta) => (
            <li key={proposta.id} className="sorprendimi__proposta" data-proposta={proposta.id}>
              {livello === 2 ? <h3>{proposta.nome}</h3> : <h4>{proposta.nome}</h4>}
              <p>{proposta.descrizione}</p>
              <p className="sorprendimi__dettagli">
                {proposta.stili.map((s) => TESTI_STILI[s]).join(", ")}
                {proposta.meseConsigliato ? " · Un buon mese per andarci" : ""}
              </p>
              <Pulsante
                variante="secondario"
                onClick={() => {
                  setScelta(proposta);
                  onScegli(proposta, { stili, daEvitare, mese });
                }}
              >
                Scegli {proposta.nome}
              </Pulsante>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
