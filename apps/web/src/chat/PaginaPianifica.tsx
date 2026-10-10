"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { PercorsoPreferenze } from "../componenti/PercorsoPreferenze";
import { percorsoBozza, percorsoViaggio } from "../percorsi";
import type { BozzaProfilo } from "../preferenze/tipi";
import { Badge } from "../ui/Badge";
import { IllustrazioneLuogo } from "../ui/IllustrazioneLuogo";
import { LayoutViaggio } from "../ui/LayoutViaggio";
import { classiPulsante } from "../ui/Pulsante";
import { Scheletro } from "../ui/Scheletro";
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

/**
 * La bozza accanto ai filtri: si aggiorna a ogni azione e accende le parti cambiate. Con `conPreferenze` mostra anche il
 * riepilogo delle preferenze (quando i filtri non sono sulla pagina); in preparazione mostra lo scheletro.
 */
export function VistaBozzaDalVivo({
  bozza,
  ultimaAzione,
  inPreparazione = false,
  conPreferenze = true,
}: {
  bozza: BozzaDalVivo | null;
  ultimaAzione: string | null;
  inPreparazione?: boolean;
  conPreferenze?: boolean;
}) {
  if (bozza === null) {
    return (
      <section className="pianifica-bozza" aria-labelledby="pianifica-bozza-titolo" aria-busy={inPreparazione}>
        <h2 id="pianifica-bozza-titolo">La tua bozza</h2>
        {inPreparazione ? (
          <Scheletro righe={4} testo="Preparo la bozza…" />
        ) : (
          <div className="pianifica-bozza__vuota">
            <IllustrazioneLuogo nome="La tua bozza" tipo="generico" forma="larga" />
            <p>
              <Sparkles size={18} aria-hidden="true" /> Qui comparirà l'itinerario, giorno per giorno, appena me lo racconti in chat.
            </p>
          </div>
        )}
      </section>
    );
  }
  return (
    <section className="pianifica-bozza" aria-labelledby="pianifica-bozza-titolo" aria-busy={inPreparazione} tabIndex={0}>
      <IllustrazioneLuogo nome={bozza.destinazione ?? bozza.titolo} seme={bozza.viaggioId} forma="larga" />
      <h2 id="pianifica-bozza-titolo">
        {bozza.titolo} <Badge tono={bozza.confermato ? "successo" : "neutro"}>{bozza.etichetta}</Badge>
      </h2>
      {/* REQ-UX-003 CA-1: la vista qui è un'anteprima; si modifica e si conferma nella pagina della bozza. */}
      <p className="pianifica-bozza__apri">
        <Link
          href={bozza.confermato ? percorsoViaggio(bozza.viaggioId) : percorsoBozza(bozza.viaggioId)}
          className={classiPulsante({ variante: "primario" })}
          data-azione="apri-bozza"
        >
          {bozza.confermato ? "Apri il viaggio" : "Apri la bozza"}
        </Link>
        {!bozza.confermato && <span className="pianifica-bozza__apri-nota">Lì la modifichi e la confermi.</span>}
      </p>
      {ultimaAzione !== null && (
        <p className="pianifica-bozza__aggiornata" role="status">
          {ultimaAzione}
          {bozza.cambiate > 0 ? `: ${bozza.cambiate === 1 ? "1 attività cambiata" : `${bozza.cambiate} attività cambiate`}, evidenziate qui sotto.` : "."}
        </p>
      )}
      {conPreferenze && bozza.preferenze.length > 0 && <SchedaPreferenze titolo="Le tue preferenze" voci={bozza.preferenze} />}
      {inPreparazione ? (
        <Scheletro righe={3} conImmagine={false} testo="Aggiorno la bozza…" />
      ) : bozza.giorni.length === 0 ? (
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
  /** Vero da quando i filtri chiedono la bozza agli agenti fino alla loro risposta: la bozza mostra lo scheletro. */
  const [inPreparazione, setInPreparazione] = useState(false);
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
  const onSalvato = useCallback(() => {
    setInPreparazione(true);
    setInvio((prima) => ({ testo: MESSAGGIO_CREA_BOZZA, n: (prima?.n ?? 0) + 1 }));
  }, []);
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
      setInPreparazione(false);
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
      <div className="pianifica__testata">
        <h1>Pianifica un viaggio</h1>
        <p>
          {conversazione === null
            ? "Scegli con i filtri o raccontalo in chat: preparo la bozza qui accanto."
            : "Cambia i filtri o continua in chat: la bozza qui accanto si aggiorna."}
        </p>
      </div>
      <LayoutViaggio
        itinerario={
          <div className="pianifica-colonne">
            {percorso !== undefined && (
              <section className="pianifica-percorso" aria-labelledby="pianifica-percorso-titolo">
                <h2 id="pianifica-percorso-titolo">Le tue preferenze</h2>
                <PercorsoPreferenze {...percorso} onCambio={onCambio} onSalvato={onSalvato} />
              </section>
            )}
            <VistaBozzaDalVivo bozza={bozza} ultimaAzione={ultimaAzione} inPreparazione={inPreparazione} conPreferenze={percorso === undefined} />
          </div>
        }
        mappa={null}
        chat={<ChatConSorgente sorgente={sorgente} titolo="Pianifica con TravelOps" onAzione={onAzione} invioEsterno={invio} />}
      />
    </div>
  );
}
