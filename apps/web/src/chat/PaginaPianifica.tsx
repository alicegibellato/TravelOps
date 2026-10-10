"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { PercorsoPreferenze } from "../componenti/PercorsoPreferenze";
import type { BozzaProfilo } from "../preferenze/tipi";
import { Avviso } from "../ui/Avviso";
import { Badge } from "../ui/Badge";
import { LayoutViaggio } from "../ui/LayoutViaggio";
import { SchedaPreferenze } from "../ui/SchedeChat";
import type { BozzaDalVivo } from "./bozza-dal-vivo";
import { ChatConSorgente } from "./ChatViaggio";
import { creaSorgenteServer } from "./sorgente-server";
import type { Benvenuto } from "./tipi";

export const BENVENUTO_PIANIFICA: Benvenuto = {
  testo: "Ciao! Raccontami il viaggio che hai in mente: dove, quando, con chi e cosa vi piace. Preparo io la prima bozza.",
  suggerimenti: [
    "4 giorni sul Lago di Garda a giugno in coppia, natura e buon vino",
    "Un weekend lungo a Roma con due bambini",
    "Sorprendimi: 5 giorni in montagna ad agosto",
  ],
};

function indirizzo(conversazione: number | null, viaggio: string | null): string {
  const parametri = new URLSearchParams();
  if (conversazione !== null) parametri.set("conversazione", String(conversazione));
  if (viaggio !== null) parametri.set("viaggio", viaggio);
  const query = parametri.toString();
  return query === "" ? "/pianifica" : `/pianifica?${query}`;
}

/** La bozza accanto alla chat: si aggiorna a ogni azione e accende le parti cambiate. */
export function VistaBozzaDalVivo({ bozza, ultimaAzione }: { bozza: BozzaDalVivo | null; ultimaAzione: string | null }) {
  if (bozza === null) {
    return (
      <section className="pianifica-bozza" aria-labelledby="pianifica-bozza-titolo">
        <h2 id="pianifica-bozza-titolo">La tua bozza</h2>
        <p className="pianifica-bozza__vuota">
          <Sparkles size={18} aria-hidden="true" /> Qui comparirà l'itinerario, giorno per giorno, appena me lo racconti in chat.
        </p>
      </section>
    );
  }
  return (
    <section className="pianifica-bozza" aria-labelledby="pianifica-bozza-titolo">
      <h2 id="pianifica-bozza-titolo">
        {bozza.titolo} <Badge tono={bozza.confermato ? "successo" : "neutro"}>{bozza.etichetta}</Badge>
      </h2>
      {ultimaAzione !== null && (
        <p className="pianifica-bozza__aggiornata" role="status">
          {ultimaAzione}
          {bozza.cambiate > 0 ? `: ${bozza.cambiate === 1 ? "1 attività cambiata" : `${bozza.cambiate} attività cambiate`}, evidenziate qui sotto.` : "."}
        </p>
      )}
      {bozza.preferenze.length > 0 && <SchedaPreferenze titolo="Le tue preferenze" voci={bozza.preferenze} />}
      {bozza.giorni.length === 0 ? (
        <p className="pianifica-bozza__vuota">La bozza non c'è ancora: quando le preferenze sono complete la preparo.</p>
      ) : (
        <ol className="pianifica-bozza__giorni">
          {bozza.giorni.map((giorno) => (
            <li key={giorno.data} id={`giorno-${giorno.data}`} className="pianifica-bozza__giorno">
              <h3>{giorno.titolo}</h3>
              {giorno.perche !== undefined && <p className="pianifica-bozza__perche">{giorno.perche}</p>}
              <ul>
                {giorno.voci.map((voce) => (
                  <li
                    key={voce.id}
                    className={`pianifica-bozza__voce${voce.spostamento ? " pianifica-bozza__voce--spostamento" : ""}${voce.cambiata ? " pianifica-bozza__voce--cambiata" : ""}`}
                    data-cambiata={voce.cambiata || undefined}
                  >
                    <span className="pianifica-bozza__orario">{voce.orario}</span> {voce.testo}
                    {voce.cambiata && <span className="ui-solo-lettori"> (cambiata)</span>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Il percorso guidato sulla pagina: le stesse proprietà della pagina Preferenze, più il salvataggio della bozza in corso. */
export type PercorsoPianifica = Omit<ComponentProps<typeof PercorsoPreferenze>, "onCambio" | "onSalvato"> & {
  salvaInCorso: (bozza: BozzaProfilo) => Promise<void>;
};

export interface ProprietaPaginaPianifica {
  conversazione: number | null;
  viaggio: string | null;
  bozza: BozzaDalVivo | null;
  /** Senza percorso la pagina mostra solo chat e bozza. */
  percorso?: PercorsoPianifica | undefined;
}

/** Il messaggio che «Crea la mia bozza» del percorso guidato manda in chat. */
export const MESSAGGIO_CREA_BOZZA = "Ho compilato le preferenze con i filtri (le trovi già salvate): prepara la destinazione e crea la mia bozza.";

/** Quanto aspettare dopo l'ultimo cambio nei filtri prima di salvare la bozza delle preferenze. */
const ATTESA_SALVATAGGIO_MS = 400;

/**
 * La pagina Pianifica (REQ-CHAT-001, ST-CHAT-001C): il viaggiatore racconta il viaggio in chat, gli agenti
 * raccolgono le preferenze, preparano la destinazione e la bozza; la bozza accanto si aggiorna a ogni azione.
 * La conversazione e il viaggio restano nell'indirizzo, così ricaricando la pagina si ritrova la bozza.
 */
export function PaginaPianifica({ conversazione, viaggio, bozza, percorso }: ProprietaPaginaPianifica) {
  const router = useRouter();
  const stato = useRef({ conversazione, viaggio });
  const [ultimaAzione, setUltimaAzione] = useState<string | null>(null);
  const [invio, setInvio] = useState<{ testo: string; n: number } | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );
  const salvaInCorso = percorso?.salvaInCorso;
  const onCambio = useCallback(
    (bozzaProfilo: BozzaProfilo) => {
      if (salvaInCorso === undefined) return;
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(() => void salvaInCorso(bozzaProfilo).catch(() => undefined), ATTESA_SALVATAGGIO_MS);
    },
    [salvaInCorso],
  );
  const onSalvato = useCallback(() => setInvio((prima) => ({ testo: MESSAGGIO_CREA_BOZZA, n: (prima?.n ?? 0) + 1 })), []);
  const [sorgente] = useState(() =>
    creaSorgenteServer({
      benvenuto: BENVENUTO_PIANIFICA,
      conversazione,
      viaggio,
      conversazioneCreata: (id) => {
        stato.current.conversazione = id;
        router.replace(indirizzo(id, stato.current.viaggio), { scroll: false });
      },
    }),
  );

  const onAzione = useCallback(
    (testo: string, nuovo: string | null) => {
      setUltimaAzione(testo);
      if (nuovo !== null && nuovo !== stato.current.viaggio) {
        stato.current.viaggio = nuovo;
        router.replace(indirizzo(stato.current.conversazione, nuovo), { scroll: false });
      } else {
        router.refresh();
      }
    },
    [router],
  );

  return (
    <div className="pianifica">
      <h1 className="ui-solo-lettori">Pianifica un viaggio</h1>
      {conversazione === null && (
        <Avviso tono="info" titolo="Pianifica parlando">
          Scrivi come lo racconteresti a un amico: io raccolgo le preferenze, scelgo la destinazione e preparo la bozza qui accanto.
        </Avviso>
      )}
      <LayoutViaggio
        itinerario={
          <>
            {percorso !== undefined && (
              <section className="pianifica-percorso" aria-labelledby="pianifica-percorso-titolo">
                <h2 id="pianifica-percorso-titolo">Le tue preferenze, con i filtri o in chat</h2>
                <PercorsoPreferenze {...percorso} onCambio={onCambio} onSalvato={onSalvato} />
              </section>
            )}
            <VistaBozzaDalVivo bozza={bozza} ultimaAzione={ultimaAzione} />
          </>
        }
        mappa={null}
        chat={<ChatConSorgente sorgente={sorgente} titolo="Pianifica con TravelOps" onAzione={onAzione} invioEsterno={invio} />}
      />
    </div>
  );
}
