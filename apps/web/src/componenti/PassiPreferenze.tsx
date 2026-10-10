"use client";

import { Check, Search } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { ATTESA_RICERCA_MS, LUNGHEZZA_MINIMA_RICERCA, type PropostaSorprendimi, type ServizioDestinazioni, type Suggerimento } from "../destinazioni/tipi";
import {
  alterna,
  conAdulti,
  conDatePrecise,
  conEtaBambino,
  conMese,
  conModoDate,
  conNumeroBambini,
  MASSIMO_ADULTI,
  MASSIMO_BAMBINI,
  modoDelleDate,
  type ModoDate,
} from "../preferenze/percorso";
import type { BozzaProfilo, DestinazionePrecaricata, OpzioneScelta, OpzioniPercorso } from "../preferenze/tipi";
import { Pulsante } from "../ui/Pulsante";
import { ChipSelezionabile, GruppoChip } from "../ui/Chip";
import { Contatore } from "../ui/Contatore";
import { IllustrazioneLuogo } from "../ui/IllustrazioneLuogo";
import { Cursore } from "../ui/Slider";
import { STILI_VIAGGIO, TESTI_STILI } from "../ui/stili";
import type { StileViaggio } from "../testi";
import { Sorprendimi, type OpzioneMese, type SceltePerSorprendimi } from "./Sorprendimi";

export interface ProprietaPasso {
  bozza: BozzaProfilo;
  /** Applica una modifica alla bozza. */
  cambia: (modifica: (bozza: BozzaProfilo) => BozzaProfilo) => void;
  opzioni: OpzioniPercorso;
}

/** Una scelta tra più voci, con le voci come pulsanti di scelta nativi (frecce e Tab). */
function SceltaUnica<T extends string>({
  legenda,
  nome,
  voci,
  valore,
  onScegli,
}: {
  legenda: string;
  nome: string;
  voci: readonly OpzioneScelta<T>[];
  valore: T | undefined;
  onScegli: (valore: T) => void;
}) {
  return (
    <fieldset className="percorso__scelta">
      <legend className="ui-campo__etichetta">{legenda}</legend>
      <div className="ui-segmenti">
        {voci.map((voce) => (
          <label key={voce.valore} className="ui-segmenti__voce">
            <input type="radio" name={nome} value={voce.valore} checked={valore === voce.valore} onChange={() => onScegli(voce.valore)} />
            <span>{voce.descrizione === undefined ? voce.etichetta : `${voce.etichetta}: ${voce.descrizione}`}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ChipDi<T extends string>({
  legenda,
  voci,
  scelti,
  onCambia,
}: {
  legenda: string;
  voci: readonly OpzioneScelta<T>[];
  scelti: readonly T[];
  onCambia: (scelti: T[]) => void;
}) {
  return (
    <div className="percorso__gruppo">
      <p className="ui-campo__etichetta">{legenda}</p>
      <GruppoChip etichetta={legenda}>
        {voci.map((voce) => (
          <ChipSelezionabile
            key={voce.valore}
            etichetta={voce.etichetta}
            selezionato={scelti.includes(voce.valore)}
            onCambia={(attivo) => onCambia(alterna(scelti, voce.valore, attivo))}
          />
        ))}
      </GruppoChip>
    </div>
  );
}

const VOCI_STILI: readonly OpzioneScelta<StileViaggio>[] = STILI_VIAGGIO.map((valore) => ({ valore, etichetta: TESTI_STILI[valore] }));

function ChipStili({ legenda, scelti, onCambia }: { legenda: string; scelti: readonly StileViaggio[]; onCambia: (s: StileViaggio[]) => void }) {
  return (
    <div className="percorso__gruppo">
      <p className="ui-campo__etichetta">{legenda}</p>
      <GruppoChip etichetta={legenda}>
        {VOCI_STILI.map((voce) => (
          <ChipSelezionabile
            key={voce.valore}
            etichetta={voce.etichetta}
            stile={voce.valore}
            selezionato={scelti.includes(voce.valore)}
            onCambia={(attivo) => onCambia(alterna(scelti, voce.valore, attivo))}
          />
        ))}
      </GruppoChip>
    </div>
  );
}

/**
 * La proposta di Sorprendimi scelta, con le scelte fatte lì (REQ-CHAT-003 CA-5): la destinazione, gli stili, le cose da
 * evitare e il mese entrano nel profilo, così i passi 2, 4 e 5 li mostrano già compilati. Solo aggiunte: gli stili
 * vuoti non tolgono quelli già scelti, le cose da evitare si sommano, il mese non sostituisce date già indicate.
 */
export function conSceltaSorprendimi(bozza: BozzaProfilo, proposta: Pick<PropostaSorprendimi, "id" | "nome">, scelte: SceltePerSorprendimi): BozzaProfilo {
  let nuova: BozzaProfilo = { ...bozza, destinazione: { tipo: "luogo", nome: proposta.nome, riferimento: proposta.id } };
  if (scelte.stili.length > 0) nuova = { ...nuova, stili: [...scelte.stili] };
  if (scelte.daEvitare.length > 0) {
    const gia = bozza.daEvitare?.stili ?? [];
    nuova = { ...nuova, daEvitare: { ...bozza.daEvitare, stili: [...gia, ...scelte.daEvitare.filter((s) => !gia.includes(s))] } };
  }
  if (scelte.mese !== "" && bozza.date === undefined) nuova = conMese(nuova, scelte.mese);
  return nuova;
}

// --- Passo 1: Dove ------------------------------------------------------------------------------------

interface ProprietaDove extends ProprietaPasso {
  servizio: Pick<ServizioDestinazioni, "cerca" | "sorprendimi">;
  mesi: readonly OpzioneMese[];
  precaricate: readonly DestinazionePrecaricata[];
}

export function PassoDove({ bozza, cambia, servizio, mesi, precaricate }: ProprietaDove) {
  const id = useId();
  const [testo, setTesto] = useState("");
  const [suggerimenti, setSuggerimenti] = useState<Suggerimento[]>([]);
  const [stato, setStato] = useState<"ferma" | "attesa" | "cerco" | "fatta">("ferma");
  const scelta = bozza.destinazione;

  useEffect(() => {
    const cercato = testo.trim();
    if (cercato.length < LUNGHEZZA_MINIMA_RICERCA) {
      setSuggerimenti([]);
      setStato("ferma");
      return;
    }
    let attuale = true;
    setStato("attesa");
    const timer = setTimeout(() => {
      setStato("cerco");
      servizio.cerca(cercato).then(
        (trovati) => {
          if (!attuale) return;
          setSuggerimenti(trovati);
          setStato("fatta");
        },
        () => {
          if (!attuale) return;
          setSuggerimenti([]);
          setStato("fatta");
        },
      );
    }, ATTESA_RICERCA_MS);
    return () => {
      attuale = false;
      clearTimeout(timer);
    };
  }, [testo, servizio]);

  const scegli = (nome: string, riferimento: string) => cambia((b) => ({ ...b, destinazione: { tipo: "luogo", nome, riferimento } }));

  return (
    <div className="percorso__corpo">
      <p role="status" className="percorso__scelta-fatta" data-scelta={scelta === undefined ? "nessuna" : scelta.tipo}>
        {scelta === undefined && "Non hai ancora scelto la destinazione."}
        {scelta?.tipo === "luogo" && `Hai scelto: ${scelta.nome}.`}
        {scelta?.tipo === "sorprendimi" && "Sceglierai più tardi: ti proporrò io le idee."}
      </p>

      <section aria-labelledby={`${id}-cerca`} className="percorso__sezione">
        <h3 id={`${id}-cerca`}>Cerca una destinazione</h3>
        <label className="ui-campo scelta-destinazione__campo">
          <span className="ui-campo__etichetta">Scrivi il nome di una città o di una zona</span>
          <input
            className="ui-campo__controllo"
            type="search"
            name="destinazione"
            autoComplete="off"
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            aria-describedby={`${id}-stato`}
          />
        </label>
        <p id={`${id}-stato`} className="scelta-destinazione__stato" role="status" aria-live="polite">
          {stato === "cerco" && "Cerco…"}
          {stato === "fatta" && suggerimenti.length > 0 && `Ho trovato ${suggerimenti.length === 1 ? "1 destinazione" : `${suggerimenti.length} destinazioni`}.`}
          {stato === "fatta" && suggerimenti.length === 0 && "Non trovo destinazioni con questo nome. Controlla come l'hai scritto o prova con una città vicina."}
        </p>
        {suggerimenti.length > 0 && (
          <ul className="scelta-destinazione__suggerimenti" aria-label="Destinazioni trovate">
            {suggerimenti.map((s) => (
              <li key={s.id}>
                <Pulsante variante="secondario" icona={<Search size={18} />} onClick={() => scegli(s.nome, s.id)}>
                  {s.nome}
                </Pulsante>
                <span className="scelta-destinazione__descrizione">{s.descrizione}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {precaricate.length > 0 && (
        <section aria-labelledby={`${id}-pronte`} className="percorso__sezione">
          <h3 id={`${id}-pronte`}>Destinazioni pronte</h3>
          <ul className="percorso__schede" aria-label="Destinazioni pronte">
            {precaricate.map((d) => {
              const attiva = scelta?.tipo === "luogo" && scelta.riferimento === d.id;
              return (
                <li key={d.id}>
                  <button type="button" className="percorso__scheda" aria-pressed={attiva} onClick={() => scegli(d.nome, d.id)}>
                    <IllustrazioneLuogo nome={d.nome} forma="ampia" />
                    <span className="percorso__scheda-nome">{d.nome}</span>
                    {attiva && <Check className="percorso__scheda-spunta" size={18} aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Sorprendimi servizio={servizio} mesi={mesi} livello={3} onScegli={(proposta, scelte) => cambia((b) => conSceltaSorprendimi(b, proposta, scelte))} />

      <div>
        <Pulsante variante="testo" onClick={() => cambia((b) => ({ ...b, destinazione: { tipo: "sorprendimi" } }))}>
          Scelgo più tardi: sorprendimi
        </Pulsante>
      </div>
    </div>
  );
}

// --- Passo 2: Quando e quanto -------------------------------------------------------------------------

export function PassoQuando({ bozza, cambia, opzioni, mesi, oggi }: ProprietaPasso & { mesi: readonly OpzioneMese[]; oggi?: string | undefined }) {
  const [modo, setModo] = useState<ModoDate>(modoDelleDate(bozza));
  const date = bozza.date;
  const modi: readonly OpzioneScelta<ModoDate>[] = [
    { valore: "precise", etichetta: "Date precise" },
    { valore: "mese", etichetta: "Mese e durata" },
  ];
  return (
    <div className="percorso__corpo">
      <SceltaUnica legenda="Come vuoi indicare le date" nome="modo-date" voci={modi} valore={modo} onScegli={(m) => {
          setModo(m);
          cambia((b) => conModoDate(b, m));
        }} />
      {modo === "precise" ? (
        <div className="ui-selettore-date__campi">
          <label className="ui-campo">
            <span className="ui-campo__etichetta">Dal</span>
            <input
              className="ui-campo__controllo"
              type="date"
              name="dal"
              min={oggi}
              value={date?.tipo === "precise" ? date.inizio : ""}
              onChange={(e) => cambia((b) => conDatePrecise(b, e.target.value, b.date?.tipo === "precise" ? b.date.fine : ""))}
            />
          </label>
          <label className="ui-campo">
            <span className="ui-campo__etichetta">Al</span>
            <input
              className="ui-campo__controllo"
              type="date"
              name="al"
              value={date?.tipo === "precise" ? date.fine : ""}
              onChange={(e) => cambia((b) => conDatePrecise(b, b.date?.tipo === "precise" ? b.date.inizio : "", e.target.value))}
            />
          </label>
        </div>
      ) : (
        <div className="ui-selettore-date__campi">
          <label className="ui-campo">
            <span className="ui-campo__etichetta">In che mese parti?</span>
            <select className="ui-campo__controllo" name="mese" value={date?.tipo === "mese" ? date.mese : ""} onChange={(e) => cambia((b) => conMese(b, e.target.value))}>
              <option value="">Scegli il mese</option>
              {mesi.map((m) => (
                <option key={m.valore} value={m.valore}>
                  {m.etichetta}
                </option>
              ))}
            </select>
          </label>
          <Cursore
            etichetta="Quanti giorni"
            min={opzioni.durataMinima}
            max={opzioni.durataMassima}
            predefinito={bozza.durata ?? opzioni.durataMinima}
            unita={{ singolare: "giorno", plurale: "giorni" }}
            onCambia={(durata) => cambia((b) => ({ ...b, durata }))}
          />
        </div>
      )}
    </div>
  );
}

// --- Passo 3: Chi -------------------------------------------------------------------------------------

export function PassoChi({ bozza, cambia, opzioni }: ProprietaPasso) {
  const adulti = bozza.viaggiatori?.adulti ?? opzioni.predefiniti.adulti;
  const bambini = bozza.viaggiatori?.bambini ?? [];
  const etaPossibili = Array.from({ length: opzioni.etaMassimaBambino + 1 }, (_, eta) => eta);
  return (
    <div className="percorso__corpo">
      <div className="percorso__contatori">
        <Contatore
          etichetta="Adulti"
          min={1}
          max={MASSIMO_ADULTI}
          predefinito={adulti}
          unita={{ singolare: "adulto", plurale: "adulti" }}
          onCambia={(n) => cambia((b) => conAdulti(b, n))}
        />
        <Contatore
          etichetta="Bambini"
          min={0}
          max={MASSIMO_BAMBINI}
          predefinito={bambini.length}
          unita={{ singolare: "bambino", plurale: "bambini" }}
          onCambia={(n) => cambia((b) => conNumeroBambini(b, n, b.viaggiatori?.adulti ?? opzioni.predefiniti.adulti))}
        />
      </div>
      {bambini.length > 0 && (
        <div className="percorso__eta">
          {bambini.map((eta, indice) => (
            <label key={indice} className="ui-campo">
              <span className="ui-campo__etichetta">Età del bambino {indice + 1}</span>
              <select
                className="ui-campo__controllo"
                name={`eta-${indice + 1}`}
                value={eta}
                onChange={(e) => cambia((b) => conEtaBambino(b, indice, Number(e.target.value), b.viaggiatori?.adulti ?? opzioni.predefiniti.adulti))}
              >
                {etaPossibili.map((anni) => (
                  <option key={anni} value={anni}>
                    {anni === 0 ? "Meno di un anno" : anni === 1 ? "1 anno" : `${anni} anni`}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      <SceltaUnica
        legenda="Con chi viaggi?"
        nome="tipo-gruppo"
        voci={opzioni.tipiGruppo}
        valore={bozza.tipoGruppo}
        onScegli={(tipoGruppo) => cambia((b) => ({ ...b, tipoGruppo }))}
      />
      {bozza.tipoGruppo === undefined && <p className="percorso__nota">Se non scegli, lo ricavo da chi parte.</p>}
    </div>
  );
}

// --- Passo 4: Che viaggio -----------------------------------------------------------------------------

export function PassoViaggio({ bozza, cambia, opzioni }: ProprietaPasso) {
  const p = opzioni.predefiniti;
  return (
    <div className="percorso__corpo">
      <ChipStili legenda="Che stile di viaggio ti piace?" scelti={(bozza.stili ?? p.stili) as StileViaggio[]} onCambia={(stili) => cambia((b) => ({ ...b, stili }))} />
      <SceltaUnica legenda="Che ritmo preferisci?" nome="ritmo" voci={opzioni.ritmi} valore={bozza.ritmo ?? p.ritmo} onScegli={(ritmo) => cambia((b) => ({ ...b, ritmo }))} />
      <SceltaUnica
        legenda="Che forma fisica hai?"
        nome="forma-fisica"
        voci={opzioni.formeFisiche}
        valore={bozza.formaFisica ?? p.formaFisica}
        onScegli={(formaFisica) => cambia((b) => ({ ...b, formaFisica }))}
      />
      <SceltaUnica legenda="Quanto vuoi spendere?" nome="budget" voci={opzioni.budget} valore={bozza.budget ?? p.budget} onScegli={(budget) => cambia((b) => ({ ...b, budget }))} />
    </div>
  );
}

// --- Passo 5: Dettagli facoltativi --------------------------------------------------------------------

export function PassoDettagli({ bozza, cambia, opzioni }: ProprietaPasso): ReactNode {
  const p = opzioni.predefiniti;
  const pasti = { ...p.pasti, ...bozza.pasti };
  const voci: OpzioneScelta<"pranzo" | "cena">[] = [
    { valore: "pranzo", etichetta: "Pranzo" },
    { valore: "cena", etichetta: "Cena" },
  ];
  const sceltiPasti = voci.filter((v) => pasti[v.valore]).map((v) => v.valore);
  return (
    <div className="percorso__corpo">
      <SceltaUnica legenda="A che ora ti muovi?" nome="orari" voci={opzioni.orari} valore={bozza.orari ?? p.orari} onScegli={(orari) => cambia((b) => ({ ...b, orari }))} />
      <ChipDi
        legenda="Pasti nel programma"
        voci={voci}
        scelti={sceltiPasti}
        onCambia={(nuovi) => cambia((b) => ({ ...b, pasti: { pranzo: nuovi.includes("pranzo"), cena: nuovi.includes("cena") } }))}
      />
      <ChipDi legenda="Come ti sposti" voci={opzioni.mezzi} scelti={bozza.mezzi ?? p.mezzi} onCambia={(mezzi) => cambia((b) => ({ ...b, mezzi }))} />
      <ChipStili
        legenda="Cosa non vuoi perdere"
        scelti={bozza.irrinunciabili?.stili ?? []}
        onCambia={(stili) => cambia((b) => ({ ...b, irrinunciabili: { ...b.irrinunciabili, stili } }))}
      />
      <ChipStili legenda="Cosa vuoi evitare" scelti={bozza.daEvitare?.stili ?? []} onCambia={(stili) => cambia((b) => ({ ...b, daEvitare: { ...b.daEvitare, stili } }))} />
      <ChipDi legenda="Esigenze particolari" voci={opzioni.esigenze} scelti={bozza.esigenze ?? []} onCambia={(esigenze) => cambia((b) => ({ ...b, esigenze }))} />
    </div>
  );
}
