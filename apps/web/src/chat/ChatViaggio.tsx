"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Badge } from "../ui/Badge";
import { PannelloChat, type BenvenutoChat, type ErroreChat, type MessaggioChat } from "../ui/PannelloChat";
import { Pulsante } from "../ui/Pulsante";
import { SchedaProposta } from "../ui/SchedaProposta";
import { SchedaBozza, SchedaConferma, SchedaPreferenze } from "../ui/SchedeChat";
import { creaSorgenteFinta, ErroreSorgente, type Copione, type SorgenteRisposte } from "./sorgente";
import type { RispostaChat, SchedaChat } from "./tipi";

type Esito = "accettata" | "rifiutata" | "annullata";

interface Voce {
  autore: "viaggiatore" | "travelops";
  testo: string;
  scheda?: SchedaChat | undefined;
  /** Per le proposte e le conferme: che fine ha fatto la decisione del viaggiatore. */
  esito?: Esito | undefined;
  /** Per le conferme: la posizione della proposta a cui si riferiscono. */
  proposta?: number | undefined;
}

const TESTO_ANNULLATO = "Ho annullato la modifica: il programma è tornato com'era.";
const TESTO_ERRORE = "Qualcosa non ha funzionato. Riprova tra un attimo.";

/**
 * La chat di un viaggio (REQ-CHAT-001): tiene la conversazione nel browser e chiede le risposte alla sorgente.
 * Proposta, rifiuto e annullamento sono qui solo messaggi della conversazione: la nuova versione dell'itinerario
 * arriva con ST-CHAT-001C. La conversazione non viene salvata.
 */
export function ChatConSorgente({ sorgente, titolo }: { sorgente: SorgenteRisposte; titolo?: string | undefined }) {
  const [voci, setVoci] = useState<Voce[]>([]);
  const [benvenuto, setBenvenuto] = useState<BenvenutoChat | undefined>(undefined);
  const [caricamento, setCaricamento] = useState(true);
  const [inScrittura, setInScrittura] = useState(false);
  const [disponibile, setDisponibile] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [rapide, setRapide] = useState<readonly string[]>([]);
  const ultimo = useRef<string | null>(null);
  const storia = useRef<Voce[]>([]);
  const attiva = useRef(true);

  useEffect(() => {
    attiva.current = true;
    return () => {
      attiva.current = false;
    };
  }, []);

  const fallita = useCallback((causa: unknown) => {
    if (!attiva.current) return;
    if (causa instanceof ErroreSorgente && causa.codice === "non-disponibile") setDisponibile(false);
    else setErrore(TESTO_ERRORE);
  }, []);

  useEffect(() => {
    let corrente = true;
    sorgente.benvenuto().then(
      (risposta) => {
        if (!corrente) return;
        setBenvenuto({ testo: risposta.testo, suggerimenti: risposta.suggerimenti });
        setCaricamento(false);
      },
      (causa: unknown) => {
        if (!corrente) return;
        setCaricamento(false);
        fallita(causa);
      },
    );
    return () => {
      corrente = false;
    };
  }, [sorgente, fallita]);

  const aggiungi = useCallback((voce: Voce) => {
    storia.current = [...storia.current, voce];
    setVoci(storia.current);
  }, []);

  const modifica = useCallback((posizione: number, cambi: Partial<Voce>) => {
    storia.current = storia.current.map((voce, indice) => (indice === posizione ? { ...voce, ...cambi } : voce));
    setVoci(storia.current);
  }, []);

  const chiedi = useCallback(
    async (testo: string) => {
      setErrore(null);
      setRapide([]);
      setInScrittura(true);
      try {
        const risposta: RispostaChat = await sorgente.rispondi(
          testo,
          storia.current.map(({ autore, testo: t }) => ({ autore, testo: t })),
        );
        if (!attiva.current) return;
        aggiungi({ autore: "travelops", testo: risposta.testo, scheda: risposta.scheda });
        setRapide(risposta.risposteRapide ?? []);
      } catch (causa) {
        fallita(causa);
      } finally {
        if (attiva.current) setInScrittura(false);
      }
    },
    [sorgente, aggiungi, fallita],
  );

  const invia = useCallback(
    (testo: string) => {
      if (inScrittura) return;
      ultimo.current = testo;
      aggiungi({ autore: "viaggiatore", testo });
      void chiedi(testo);
    },
    [inScrittura, aggiungi, chiedi],
  );

  const accetta = (posizione: number) => {
    const scheda = storia.current[posizione]?.scheda;
    if (scheda?.tipo !== "proposta") return;
    modifica(posizione, { esito: "accettata" });
    aggiungi({
      autore: "travelops",
      testo: "Fatto.",
      scheda: { tipo: "conferma", titolo: scheda.conferma.titolo, testo: scheda.conferma.testo },
      proposta: posizione,
    });
  };

  const rifiuta = (posizione: number) => {
    const scheda = storia.current[posizione]?.scheda;
    if (scheda?.tipo !== "proposta") return;
    modifica(posizione, { esito: "rifiutata" });
    aggiungi({ autore: "travelops", testo: scheda.rifiuto });
  };

  const annulla = (posizione: number) => {
    const proposta = storia.current[posizione]?.proposta;
    modifica(posizione, { esito: "annullata" });
    if (proposta !== undefined) modifica(proposta, { esito: "annullata" });
    aggiungi({ autore: "travelops", testo: TESTO_ANNULLATO });
  };

  const messaggi: MessaggioChat[] = voci.map((voce, posizione) => ({
    autore: voce.autore,
    testo: voce.testo,
    scheda: voce.scheda === undefined ? undefined : vistaScheda(voce, posizione, { accetta, rifiuta, annulla }),
  }));

  const erroreChat: ErroreChat | undefined =
    errore === null
      ? undefined
      : {
          testo: errore,
          onRiprova: ultimo.current === null ? undefined : () => void chiedi(ultimo.current ?? ""),
        };

  return (
    <PannelloChat
      titolo={titolo}
      messaggi={messaggi}
      benvenuto={benvenuto}
      risposteRapide={rapide}
      caricamento={caricamento}
      inScrittura={inScrittura}
      disponibile={disponibile}
      errore={erroreChat}
      onInvia={invia}
    />
  );
}

interface Azioni {
  accetta: (posizione: number) => void;
  rifiuta: (posizione: number) => void;
  annulla: (posizione: number) => void;
}

const TESTO_ESITO: Readonly<Record<Esito, string>> = {
  accettata: "Accettata",
  rifiutata: "Rifiutata",
  annullata: "Annullata",
};

/** La scheda ricca di un messaggio, con i pulsanti collegati alla conversazione. */
function vistaScheda(voce: Voce, posizione: number, azioni: Azioni): ReactNode {
  const { scheda } = voce;
  switch (scheda?.tipo) {
    case "preferenze":
      return <SchedaPreferenze titolo={scheda.titolo} voci={scheda.voci} />;
    case "bozza":
      return <SchedaBozza titolo={scheda.titolo} giorni={scheda.giorni} />;
    case "conferma":
      return (
        <SchedaConferma
          titolo={scheda.titolo}
          testo={scheda.testo}
          annullata={voce.esito === "annullata"}
          onAnnulla={() => azioni.annulla(posizione)}
        />
      );
    case "proposta":
      return (
        <SchedaProposta
          titolo={scheda.titolo}
          livello={scheda.livello}
          cambi={scheda.cambi}
          avviso={scheda.avviso}
          azioni={
            voce.esito === undefined ? (
              <>
                <Pulsante variante="primario" onClick={() => azioni.accetta(posizione)}>
                  Accetta
                </Pulsante>
                <Pulsante variante="secondario" onClick={() => azioni.rifiuta(posizione)}>
                  Rifiuta
                </Pulsante>
              </>
            ) : (
              <Badge tono={voce.esito === "accettata" ? "successo" : "neutro"}>{TESTO_ESITO[voce.esito]}</Badge>
            )
          }
        />
      );
    default:
      return null;
  }
}

/** La chat con le risposte finte del copione (nessuna AI, nessuna rete). */
export function ChatViaggio({ copione, ritardoMs }: { copione: Copione; ritardoMs?: number | undefined }) {
  const sorgente = useMemo(() => creaSorgenteFinta(ritardoMs === undefined ? { copione } : { copione, ritardoMs }), [copione, ritardoMs]);
  return <ChatConSorgente sorgente={sorgente} />;
}
