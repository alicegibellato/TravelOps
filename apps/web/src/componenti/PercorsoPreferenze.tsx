"use client";

import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ServizioDestinazioni } from "../destinazioni/tipi";
import { PASSI, passoCompilato, primoPassoMancante, riepilogo, senzaPasso, stesseScelte, ULTIMO_PASSO, type NumeroPasso } from "../preferenze/percorso";
import type { BozzaProfilo, DestinazionePrecaricata, OpzioniPercorso, ProblemaProfilo, ServizioPreferenze } from "../preferenze/tipi";
import { Avviso } from "../ui/Avviso";
import { Pulsante } from "../ui/Pulsante";
import { PassoChi, PassoDettagli, PassoDove, PassoQuando, PassoViaggio } from "./PassiPreferenze";
import { RiepilogoPreferenze } from "./RiepilogoPreferenze";
import type { OpzioneMese } from "./Sorprendimi";

interface Proprieta {
  preferenze: ServizioPreferenze;
  destinazioni: Pick<ServizioDestinazioni, "cerca" | "sorprendimi">;
  opzioni: OpzioniPercorso;
  mesi: readonly OpzioneMese[];
  /** Il giorno di oggi secondo l'orologio dell'app (`AAAA-MM-GG`): «Dal» non offre i giorni passati. */
  oggi?: string | undefined;
  precaricate: readonly DestinazionePrecaricata[];
  /**
   * Il profilo da cui partire (ST-CHAT-001C, pagina Pianifica): quello condiviso con la chat. Quando cambia (la chat ha
   * aggiornato le preferenze) il percorso lo riprende, restando sul passo in cui si trova.
   */
  profiloIniziale?: BozzaProfilo | null | undefined;
  /** Ogni cambio della bozza (ST-CHAT-001C): chi usa il percorso lo salva, così la chat vede le stesse preferenze. */
  onCambio?: ((bozza: BozzaProfilo) => void) | undefined;
  /** Dopo «Crea la mia bozza» con le preferenze salvate (ST-CHAT-001C: la pagina Pianifica chiede la bozza agli agenti). */
  onSalvato?: ((bozza: BozzaProfilo) => void) | undefined;
  /** Dove andare quando la bozza è pronta; predefinito: apre la pagina della bozza. */
  onBozzaCreata?: (indirizzo: string) => void;
}

const apriPagina = (indirizzo: string): void => {
  window.location.assign(indirizzo);
};

/**
 * Il percorso guidato delle preferenze (REQ-PREF-001): 5 passi con barra di avanzamento e riepilogo vivo. Con i soli
 * campi obbligatori (destinazione e date) si arriva a «Crea la mia bozza» in 5 schermate. Validazione e salvataggio
 * passano dal servizio (azioni lato server); il browser non carica il motore. Se il servizio sa creare la bozza
 * (REQ-PLAN-002), «Crea la mia bozza» prepara la revisione B1 e apre la sua pagina.
 */
/** Dove si ricorda il passo del percorso guidato tra un ricaricamento e l'altro (REQ-UX-003 CA-4). */
export const CHIAVE_PASSO_PREFERENZE = "travelops:percorso-preferenze:passo";

function leggiPassoSalvato(): NumeroPasso | null {
  try {
    const valore = Number(window.sessionStorage.getItem(CHIAVE_PASSO_PREFERENZE));
    return Number.isInteger(valore) && valore >= 1 && valore <= ULTIMO_PASSO ? (valore as NumeroPasso) : null;
  } catch {
    return null;
  }
}

function salvaPasso(passo: NumeroPasso): void {
  try {
    window.sessionStorage.setItem(CHIAVE_PASSO_PREFERENZE, String(passo));
  } catch {
    // Memoria non disponibile (navigazione privata o bloccata): il percorso riparte dal primo passo.
  }
}

/** Dove si ricorda la bozza delle scelte nel browser (TB-PREF-002): sopravvive al ricaricamento, il profilo salvato non cambia. */
export const CHIAVE_BOZZA_PREFERENZE = "travelops:percorso-preferenze:bozza";

function leggiBozzaSalvata(): BozzaProfilo | null {
  try {
    const grezzo = window.sessionStorage.getItem(CHIAVE_BOZZA_PREFERENZE);
    if (grezzo === null) return null;
    const valore: unknown = JSON.parse(grezzo);
    return typeof valore === "object" && valore !== null && !Array.isArray(valore) ? (valore as BozzaProfilo) : null;
  } catch {
    return null;
  }
}

function salvaBozza(bozza: BozzaProfilo | null): void {
  try {
    if (bozza === null) window.sessionStorage.removeItem(CHIAVE_BOZZA_PREFERENZE);
    else window.sessionStorage.setItem(CHIAVE_BOZZA_PREFERENZE, JSON.stringify(bozza));
  } catch {
    // Memoria non disponibile: le scelte non sopravvivono al ricaricamento, come il passo.
  }
}

export function PercorsoPreferenze({ preferenze, destinazioni, opzioni, mesi, oggi, precaricate, profiloIniziale, onCambio, onSalvato, onBozzaCreata = apriPagina }: Proprieta) {
  const [bozza, setBozza] = useState<BozzaProfilo>(profiloIniziale ?? {});
  const ripreso = useRef(profiloIniziale);

  const corrente = useRef(bozza);
  corrente.current = bozza;
  const [passo, setPasso] = useState<NumeroPasso>(1);

  // Il profilo arrivato da fuori (la chat ha cambiato le preferenze) sostituisce la bozza del percorso. REQ-CHAT-003
  // CA-4: se porta scelte nuove, il percorso si apre sul primo passo che manca (i passi compilati restano segnati).
  useEffect(() => {
    if (profiloIniziale === undefined || profiloIniziale === null || profiloIniziale === ripreso.current) return;
    ripreso.current = profiloIniziale;
    if (stesseScelte(profiloIniziale, corrente.current)) return;
    setBozza(profiloIniziale);
    setPasso(primoPassoMancante(profiloIniziale));
  }, [profiloIniziale]);

  // Ogni cambio della bozza va a chi usa il percorso (non la bozza iniziale, che viene già da lì).
  const avvisa = useRef(onCambio);
  avvisa.current = onCambio;
  const bozzaIniziale = useRef(bozza);
  useEffect(() => {
    if (bozza !== bozzaIniziale.current) avvisa.current?.(bozza);
  }, [bozza]);
  // REQ-UX-003 CA-4: il passo corrente sopravvive al ricaricamento della pagina (stessa scheda del browser).
  // TB-PREF-002: con il passo tornano anche le scelte. Se la pagina parte da un profilo salvato (Pianifica, che lo
  // aggiorna a ogni cambio) vale quello; altrimenti si riprende la bozza tenuta nel browser.
  const parteDaProfilo = useRef(profiloIniziale !== undefined && profiloIniziale !== null);
  useEffect(() => {
    const salvato = leggiPassoSalvato();
    if (salvato !== null) setPasso(salvato);
    if (parteDaProfilo.current) return;
    const scelte = leggiBozzaSalvata();
    if (scelte !== null) setBozza(scelte);
  }, []);
  useEffect(() => {
    if (bozza !== bozzaIniziale.current) salvaBozza(bozza);
  }, [bozza]);
  useEffect(() => {
    salvaPasso(passo);
  }, [passo]);
  const [problemi, setProblemi] = useState<ProblemaProfilo[]>([]);
  const [bloccati, setBloccati] = useState<ProblemaProfilo[]>([]);
  const [esito, setEsito] = useState<{ tipo: "salvato" } | { tipo: "incompleto"; problemi: ProblemaProfilo[] } | { tipo: "errore"; messaggio: string } | null>(null);
  const [attesa, setAttesa] = useState(false);
  const titolo = useRef<HTMLHeadingElement>(null);
  const primoDisegno = useRef(true);
  const [focusSuCrea, setFocusSuCrea] = useState(0);

  // Il riepilogo e «cosa manca» seguono la bozza: conta solo l'ultima risposta.
  useEffect(() => {
    let attuale = true;
    preferenze.valida(bozza).then(
      (trovati) => {
        if (attuale) setProblemi(trovati);
      },
      () => undefined,
    );
    return () => {
      attuale = false;
    };
  }, [bozza, preferenze]);

  // A ogni cambio di passo il focus va al titolo del passo (non al primo disegno).
  useEffect(() => {
    if (primoDisegno.current) {
      primoDisegno.current = false;
      return;
    }
    titolo.current?.focus();
  }, [passo]);

  useEffect(() => {
    if (focusSuCrea > 0) document.getElementById("percorso-crea")?.focus();
  }, [focusSuCrea]);

  const cambia = (modifica: (corrente: BozzaProfilo) => BozzaProfilo) => {
    setBozza(modifica);
    setEsito(null);
  };

  const vai = (numero: NumeroPasso) => {
    setBloccati([]);
    setPasso(numero);
  };

  const avanti = async () => {
    const attuali = await preferenze.valida(bozza).catch(() => [] as ProblemaProfilo[]);
    const qui = attuali.filter((p) => p.passo === passo);
    if (qui.length > 0) {
      setBloccati(qui);
      return;
    }
    vai((passo + 1) as NumeroPasso);
  };

  const salta = () => {
    setBozza((corrente) => senzaPasso(corrente, passo));
    setEsito(null);
    if (passo < ULTIMO_PASSO) vai((passo + 1) as NumeroPasso);
    else setFocusSuCrea((n) => n + 1);
  };

  const crea = async () => {
    setAttesa(true);
    const risposta = await preferenze.salva(bozza).catch(() => ({ esito: "errore" as const, messaggio: "Al momento non riesco a salvare le preferenze. Riprova tra un attimo." }));
    if (risposta.esito === "salvato") salvaBozza(null);
    if (risposta.esito === "salvato" && preferenze.creaBozza !== undefined) {
      // REQ-PLAN-002: con le preferenze salvate nasce la prima revisione della bozza, e si apre la sua pagina.
      onSalvato?.(bozza);
      const creata = await preferenze.creaBozza(bozza).catch(() => ({ esito: "errore" as const, messaggio: "Al momento non riesco a preparare la bozza. Riprova tra un attimo." }));
      setAttesa(false);
      if (creata.esito === "creata") onBozzaCreata(creata.indirizzo);
      else setEsito({ tipo: "errore", messaggio: creata.messaggio });
      return;
    }
    setAttesa(false);
    if (risposta.esito === "salvato") {
      setEsito({ tipo: "salvato" });
      onSalvato?.(bozza);
    }
    else if (risposta.esito === "incompleto") setEsito({ tipo: "incompleto", problemi: risposta.problemi });
    else setEsito({ tipo: "errore", messaggio: risposta.messaggio });
  };

  const voci = useMemo(() => riepilogo(bozza, opzioni, mesi), [bozza, opzioni, mesi]);
  const definizione = PASSI[passo - 1];
  if (definizione === undefined) return null;
  const propPasso = { bozza, cambia, opzioni };

  return (
    <div className="percorso">
      <RiepilogoPreferenze voci={voci} problemi={problemi} onVai={vai} />
      <section className="percorso__passo" aria-labelledby="percorso-titolo">
        <div className="percorso__avanzamento">
          <p className="percorso__conteggio">
            Passo {passo} di {PASSI.length}
          </p>
          <progress className="percorso__barra" value={passo} max={PASSI.length} aria-label={`Passo ${passo} di ${PASSI.length}`} />
          <ol className="percorso__passi" aria-label="Passi del percorso">
            {PASSI.map((p) => {
              const compilato = passoCompilato(bozza, p.numero);
              return (
                <li key={p.numero} data-passo={p.numero} data-stato={compilato ? "compilato" : "da-compilare"} aria-current={p.numero === passo ? "step" : undefined}>
                  <button
                    type="button"
                    className="percorso__segno"
                    aria-label={`Passo ${p.numero}, ${p.titolo}: ${compilato ? "compilato" : "da compilare"}`}
                    onClick={() => vai(p.numero)}
                  >
                    {compilato ? <Check size={14} aria-hidden="true" /> : p.numero}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <h2 id="percorso-titolo" ref={titolo} tabIndex={-1} className="percorso__titolo">
          {definizione.titolo}
        </h2>

        {passo === 1 && <PassoDove {...propPasso} servizio={destinazioni} mesi={mesi} precaricate={precaricate} />}
        {passo === 2 && <PassoQuando {...propPasso} mesi={mesi} oggi={oggi} />}
        {passo === 3 && <PassoChi {...propPasso} />}
        {passo === 4 && <PassoViaggio {...propPasso} />}
        {passo === 5 && <PassoDettagli {...propPasso} />}

        {bloccati.length > 0 && (
          <Avviso tono="attenzione" titolo="Prima di andare avanti">
            <ul className="riepilogo__mancano">
              {bloccati.map((p) => (
                <li key={`${p.campo}-${p.testo}`}>{p.testo}</li>
              ))}
            </ul>
          </Avviso>
        )}

        {esito?.tipo === "salvato" && <Avviso tono="successo" titolo="Preferenze salvate">Ho salvato le tue preferenze: puoi sempre tornare a cambiarle.</Avviso>}
        {esito?.tipo === "errore" && <Avviso tono="errore">{esito.messaggio}</Avviso>}
        {esito?.tipo === "incompleto" && (
          <Avviso tono="attenzione" titolo="Mancano ancora delle informazioni">
            <ul className="riepilogo__mancano">
              {esito.problemi.map((p) => (
                <li key={`${p.campo}-${p.testo}`}>
                  {p.testo}{" "}
                  <Pulsante variante="testo" onClick={() => vai(p.passo)}>
                    Vai a «{PASSI[p.passo - 1]?.titolo}»
                  </Pulsante>
                </li>
              ))}
            </ul>
          </Avviso>
        )}

        <div className="percorso__azioni">
          {passo > 1 && (
            <Pulsante variante="secondario" icona={<ArrowLeft size={18} />} onClick={() => vai((passo - 1) as NumeroPasso)}>
              Indietro
            </Pulsante>
          )}
          {definizione.saltabile && (
            <Pulsante variante="testo" onClick={salta}>
              Salta
            </Pulsante>
          )}
          {passo < ULTIMO_PASSO ? (
            <Pulsante variante="primario" icona={<ArrowRight size={18} />} onClick={() => void avanti()}>
              Avanti
            </Pulsante>
          ) : (
            <Pulsante id="percorso-crea" variante="primario" dimensione="grande" icona={<Sparkles size={20} />} disabled={attesa} aria-busy={attesa} onClick={() => void crea()}>
              {attesa ? "Preparo la bozza…" : "Crea la mia bozza"}
            </Pulsante>
          )}
        </div>
      </section>
    </div>
  );
}
