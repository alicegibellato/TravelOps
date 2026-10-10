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
  /** Per le conferme decise sul server: non si annullano dalla chat (la versione resta nello storico). */
  definitiva?: boolean | undefined;
}

const TESTO_ANNULLATO = "Ho annullato la modifica: il programma è tornato com'era.";
const TESTO_ERRORE = "Qualcosa non ha funzionato. Riprova tra un attimo.";

export interface ProprietaChatConSorgente {
  sorgente: SorgenteRisposte;
  titolo?: string | undefined;
  /** Un'azione fatta sul viaggio dalla chat (con gli agenti): chi usa la chat aggiorna la vista a lato. */
  onAzione?: ((testo: string, viaggio: string | null) => void) | undefined;
  /** Un messaggio da inviare da fuori (per esempio «Crea la mia bozza» del percorso guidato): parte a ogni nuovo `n`. */
  invioEsterno?: { testo: string; n: number } | undefined;
}

/**
 * La chat di un viaggio (REQ-CHAT-001): tiene la conversazione nel browser e chiede le risposte alla sorgente.
 * Con la sorgente finta proposta, rifiuto e annullamento sono solo messaggi della conversazione. Con la sorgente del
 * server (ST-CHAT-001C) la risposta arriva man mano, le azioni degli agenti aggiornano la vista a lato (`onAzione`)
 * e Accetta e Rifiuta decidono la proposta salvata sul server.
 */
export function ChatConSorgente({ sorgente, titolo, onAzione, invioEsterno }: ProprietaChatConSorgente) {
  const [voci, setVoci] = useState<Voce[]>([]);
  const [benvenuto, setBenvenuto] = useState<BenvenutoChat | undefined>(undefined);
  const [caricamento, setCaricamento] = useState(true);
  const [inScrittura, setInScrittura] = useState(false);
  const [disponibile, setDisponibile] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [rapide, setRapide] = useState<readonly string[]>([]);
  const [inCorso, setInCorso] = useState<{ testo: string; passo: string | null } | undefined>(undefined);
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
    Promise.all([sorgente.benvenuto(), sorgente.conversazioneSalvata?.() ?? Promise.resolve([])]).then(
      ([risposta, salvati]) => {
        if (!corrente) return;
        setBenvenuto({ testo: risposta.testo, suggerimenti: risposta.suggerimenti });
        // La conversazione ripresa (pagina ricaricata): i messaggi salvati sul server. Una proposta già decisa, se la si
        // decide di nuovo, risponde con l'esito del motore (per esempio "proposta superata").
        storia.current = [...salvati];
        setVoci(storia.current);
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
      setInCorso(undefined);
      try {
        const risposta: RispostaChat = await sorgente.rispondi(
          testo,
          storia.current.map(({ autore, testo: t }) => ({ autore, testo: t })),
          {
            testo: (scritto) => attiva.current && setInCorso((prima) => ({ testo: scritto, passo: prima?.passo ?? null })),
            passo: (passo) => attiva.current && setInCorso((prima) => ({ testo: prima?.testo ?? "", passo })),
            azione: (fatto, viaggio) => onAzione?.(fatto, viaggio),
          },
        );
        if (!attiva.current) return;
        aggiungi({ autore: "travelops", testo: risposta.testo, scheda: risposta.scheda });
        setRapide(risposta.risposteRapide ?? []);
      } catch (causa) {
        fallita(causa);
      } finally {
        if (attiva.current) {
          setInScrittura(false);
          setInCorso(undefined);
        }
      }
    },
    [sorgente, aggiungi, fallita, onAzione],
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

  /** Accetta o Rifiuta di una proposta salvata sul server: decide il motore, la chat mostra l'esito. */
  const decidiSulServer = async (posizione: number, propostaId: number, decisione: "accetta" | "rifiuta") => {
    if (sorgente.decidi === undefined) return;
    setErrore(null);
    setInScrittura(true);
    try {
      const esito = await sorgente.decidi(propostaId, decisione);
      if (!attiva.current) return;
      modifica(posizione, { esito: decisione === "accetta" ? "accettata" : "rifiutata" });
      aggiungi({ autore: "travelops", testo: esito.scheda === undefined ? esito.testo : "", scheda: esito.scheda, proposta: posizione, definitiva: true });
      if (esito.cambiato) onAzione?.(esito.testo, null);
    } catch (causa) {
      fallita(causa);
    } finally {
      if (attiva.current) setInScrittura(false);
    }
  };

  // Il messaggio mandato da fuori parte una volta sola per ogni `n`.
  const inviati = useRef(0);
  useEffect(() => {
    if (invioEsterno === undefined || invioEsterno.n === inviati.current) return;
    inviati.current = invioEsterno.n;
    invia(invioEsterno.testo);
  }, [invioEsterno, invia]);

  const accetta = (posizione: number) => {
    const scheda = storia.current[posizione]?.scheda;
    if (scheda?.tipo !== "proposta") return;
    if (scheda.propostaId !== undefined && sorgente.decidi !== undefined) {
      void decidiSulServer(posizione, scheda.propostaId, "accetta");
      return;
    }
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
    if (scheda.propostaId !== undefined && sorgente.decidi !== undefined) {
      void decidiSulServer(posizione, scheda.propostaId, "rifiuta");
      return;
    }
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
      inCorso={inCorso}
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
          onAnnulla={voce.definitiva === true ? undefined : () => azioni.annulla(posizione)}
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
