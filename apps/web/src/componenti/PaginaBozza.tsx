"use client";

import {
  ArrowLeftRight,
  CalendarCheck,
  GitCompare,
  Lock,
  LockOpen,
  Minus,
  MoveRight,
  PartyPopper,
  Plus,
  RefreshCw,
  Replace,
  Shuffle,
  SlidersHorizontal,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import type {
  AlternativaVista,
  AttivitaBozzaVista,
  AzioniBozza,
  CambioPreferenze,
  ConfrontoBozzaVista,
  EsitoBozza,
  GiornoBozzaVista,
  OperazioneBozza,
  VistaBozza,
} from "../bozza/tipi";
import { Avviso } from "../ui/Avviso";
import { Badge, BadgeStato } from "../ui/Badge";
import { Pulsante } from "../ui/Pulsante";
import { SchedaAttivita } from "../ui/SchedaAttivita";
import { STILI_VIAGGIO, TESTI_STILI } from "../ui/stili";

interface Proprieta {
  vista: VistaBozza;
  azioni: AzioniBozza;
}

type Messaggio = { tono: "successo" | "errore"; testo: string } | null;

/** Le operazioni dei pulsanti, con lo stato condiviso della pagina. */
interface Comandi {
  confermato: boolean;
  attesa: boolean;
  date: VistaBozza["date"];
  opera: (operazione: OperazioneBozza) => Promise<void>;
  alternative: (elementoId: string) => Promise<AlternativaVista[]>;
}

const OPZIONI_RITMO: readonly { valore: NonNullable<CambioPreferenze["ritmo"]>; etichetta: string }[] = [
  { valore: "lento", etichetta: "Lento (2 attività al giorno)" },
  { valore: "bilanciato", etichetta: "Bilanciato (3 attività al giorno)" },
  { valore: "intenso", etichetta: "Intenso (4 attività al giorno)" },
];

/** Coriandoli decorativi della festa: solo forma e colore dei token, nessun testo. */
const CORIANDOLI = ["primario", "accento", "successo", "secondario", "attenzione", "info", "primario", "accento", "successo", "secondario", "attenzione", "info"];

/**
 * La pagina della bozza (REQ-PLAN-002): ogni attività e ogni giorno hanno i loro pulsanti; Annulla, Confronta, Cambia
 * preferenze, Mostrami un'alternativa e Conferma l'itinerario sono in alto. Ogni pulsante chiama un'azione lato
 * server, che usa il motore: qui nessuna regola. Dopo la conferma gli stessi pulsanti preparano proposte da accettare.
 */
export function PaginaBozza({ vista: iniziale, azioni }: Proprieta) {
  const [vista, setVista] = useState(iniziale);
  const [messaggio, setMessaggio] = useState<Messaggio>(null);
  const [attesa, setAttesa] = useState(false);
  const [festa, setFesta] = useState(false);
  const [coriandoli, setCoriandoli] = useState(true);
  const confermato = vista.stato === "confermato";

  const esegui = async (chiamata: () => Promise<EsitoBozza>): Promise<boolean> => {
    setAttesa(true);
    const esito = await chiamata().catch((): EsitoBozza => ({ ok: false, messaggio: "Al momento non riesco a modificare la bozza. Riprova tra un attimo." }));
    setAttesa(false);
    if (esito.ok) {
      setVista(esito.vista);
      setMessaggio(esito.messaggio === null ? null : { tono: "successo", testo: esito.messaggio });
    } else setMessaggio({ tono: "errore", testo: esito.messaggio });
    return esito.ok;
  };

  const comandi: Comandi = {
    confermato,
    attesa,
    date: vista.date,
    opera: async (operazione) => {
      await esegui(() => azioni.opera(operazione));
    },
    alternative: (elementoId) => azioni.alternative(elementoId).catch(() => []),
  };

  const conferma = async () => {
    if (await esegui(() => azioni.conferma())) setFesta(true);
  };

  return (
    <section className="bozza" aria-labelledby="bozza-titolo" data-stato={vista.stato}>
      <header className="bozza__testa">
        <h1 id="bozza-titolo">{vista.titolo}</h1>
        <div className="bozza__etichette">
          <BadgeStato stato={vista.stato} />
          {confermato ? (
            <Badge tono="primario">Versione {vista.versione}</Badge>
          ) : (
            <Badge tono="accento">Revisione B{vista.revisione}</Badge>
          )}
        </div>
      </header>

      {festa && (
        <div className="bozza__festa" role="status" data-coriandoli={coriandoli ? "si" : "no"}>
          {coriandoli && (
            <div className="bozza__coriandoli" aria-hidden="true">
              {CORIANDOLI.map((tono, i) => (
                <span key={i} data-tono={tono} />
              ))}
            </div>
          )}
          <PartyPopper size={28} aria-hidden="true" />
          <p className="bozza__festa-titolo">Buon viaggio!</p>
          <p>L&apos;itinerario è confermato: è la versione 1. Da adesso ogni modifica diventa una proposta da accettare.</p>
          <div className="bozza__azioni">
            {coriandoli && (
              <Pulsante variante="testo" onClick={() => setCoriandoli(false)}>
                Togli i coriandoli
              </Pulsante>
            )}
            <Pulsante variante="secondario" icona={<X size={18} />} onClick={() => setFesta(false)}>
              Chiudi
            </Pulsante>
          </div>
        </div>
      )}

      {messaggio !== null && (
        <Avviso tono={messaggio.tono === "errore" ? "errore" : "successo"}>
          <span data-messaggio="bozza">{messaggio.testo}</span>
        </Avviso>
      )}

      {!confermato && (
        <div className="bozza__barra" role="toolbar" aria-label="Azioni sulla bozza">
          <Pulsante variante="secondario" icona={<Undo2 size={18} />} disabled={attesa || !vista.annullabile} onClick={() => void comandi.opera({ tipo: "annulla" })}>
            Annulla
          </Pulsante>
          <Pulsante variante="secondario" icona={<Shuffle size={18} />} disabled={attesa} onClick={() => void comandi.opera({ tipo: "alternativa" })}>
            Mostrami un&apos;alternativa
          </Pulsante>
          <Pulsante variante="primario" dimensione="grande" icona={<CalendarCheck size={20} />} disabled={attesa} onClick={() => void conferma()}>
            Conferma l&apos;itinerario
          </Pulsante>
        </div>
      )}

      {vista.avvisi.length > 0 && (
        <Avviso tono="info" titolo="Da sapere">
          <ul className="bozza__elenco">
            {vista.avvisi.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Avviso>
      )}

      {confermato && <Proposte vista={vista} attesa={attesa} accetta={(id) => void esegui(() => azioni.accetta(id))} rifiuta={(id) => void esegui(() => azioni.rifiuta(id))} />}

      {vista.giorni.map((giorno) => (
        <Giorno key={giorno.data} giorno={giorno} comandi={comandi} suggerite={vista.suggerite} />
      ))}

      {!confermato && <CambiaPreferenze attuali={vista.preferenze} attesa={attesa} cambia={(cambio) => void esegui(() => azioni.cambiaPreferenze(cambio))} />}

      <Revisioni vista={vista} comandi={comandi} confronta={azioni.confronta} />
    </section>
  );
}

function Giorno({ giorno, comandi, suggerite }: { giorno: GiornoBozzaVista; comandi: Comandi; suggerite: VistaBozza["suggerite"] }) {
  const id = useId();
  const altri = comandi.date.filter((d) => d.valore !== giorno.data);
  const [conData, setConData] = useState(altri[0]?.valore ?? "");
  const [daAggiungere, setDaAggiungere] = useState(suggerite[0]?.attivitaId ?? "");
  const { attesa, confermato, opera } = comandi;
  return (
    <section className="bozza__giorno" aria-labelledby={`${id}-titolo`} data-data={giorno.data}>
      <h2 id={`${id}-titolo`} className="bozza__giorno-titolo">
        {giorno.titolo}
      </h2>
      <div className="bozza__azioni" role="group" aria-label={`Azioni per ${giorno.titolo}`}>
        <Pulsante variante="secondario" icona={<Minus size={18} />} disabled={attesa} onClick={() => void opera({ tipo: "giornata_piu_leggera", data: giorno.data })}>
          Giornata più leggera
        </Pulsante>
        <Pulsante variante="secondario" icona={<Plus size={18} />} disabled={attesa} onClick={() => void opera({ tipo: "giornata_piu_piena", data: giorno.data })}>
          Giornata più piena
        </Pulsante>
        <Pulsante variante="secondario" icona={<RefreshCw size={18} />} disabled={attesa} onClick={() => void opera({ tipo: "rigenera_giorno", data: giorno.data })}>
          Rigenera questo giorno
        </Pulsante>
      </div>
      {!confermato && (
        <div className="bozza__moduli">
          {altri.length > 0 && (
            <div className="bozza__modulo">
              <label htmlFor={`${id}-scambia`}>Scambia con</label>
              <select id={`${id}-scambia`} value={conData} onChange={(e) => setConData(e.target.value)}>
                {altri.map((d) => (
                  <option key={d.valore} value={d.valore}>
                    {d.etichetta}
                  </option>
                ))}
              </select>
              <Pulsante variante="testo" icona={<ArrowLeftRight size={18} />} disabled={attesa || conData === ""} onClick={() => void opera({ tipo: "scambia_giorni", data: giorno.data, conData })}>
                Scambia i due giorni
              </Pulsante>
            </div>
          )}
          {suggerite.length > 0 && (
            <div className="bozza__modulo">
              <label htmlFor={`${id}-aggiungi`}>Aggiungi un&apos;attività</label>
              <select id={`${id}-aggiungi`} value={daAggiungere} onChange={(e) => setDaAggiungere(e.target.value)}>
                {suggerite.map((s) => (
                  <option key={s.attivitaId} value={s.attivitaId}>
                    {s.nome}
                  </option>
                ))}
              </select>
              <Pulsante variante="testo" icona={<Plus size={18} />} disabled={attesa || daAggiungere === ""} onClick={() => void opera({ tipo: "aggiungi", attivitaId: daAggiungere, data: giorno.data })}>
                Aggiungi
              </Pulsante>
            </div>
          )}
        </div>
      )}
      {giorno.suggerimenti.map((s) => (
        <Avviso key={s} tono="attenzione" titolo="Da sistemare">
          {s}
        </Avviso>
      ))}
      <ol className="bozza__voci">
        {giorno.voci.map((voce) =>
          voce.tipo === "attivita" ? (
            <li key={voce.id} data-elemento={voce.id}>
              <SchedaAttivita
                nome={voce.nome}
                orario={voce.orario}
                durata={voce.durata ?? undefined}
                stile={voce.stile ?? undefined}
                costo={voce.costo ?? undefined}
                allAperto={voce.allAperto ?? undefined}
                descrizione={voce.descrizione ?? undefined}
              >
                <AzioniAttivita attivita={voce} data={giorno.data} comandi={comandi} />
              </SchedaAttivita>
            </li>
          ) : (
            <li key={voce.id} data-elemento={voce.id} className="bozza__spostamento">
              <MoveRight size={16} aria-hidden="true" />
              <span>
                {voce.orario} · {voce.testo}
              </span>
            </li>
          ),
        )}
      </ol>
    </section>
  );
}

function AzioniAttivita({ attivita, data, comandi }: { attivita: AttivitaBozzaVista; data: string; comandi: Comandi }) {
  const id = useId();
  const [alternative, setAlternative] = useState<AlternativaVista[] | null>(null);
  const [sposta, setSposta] = useState(false);
  const [giorno, setGiorno] = useState(data);
  const [ora, setOra] = useState(attivita.orario.slice(0, 5));
  const { attesa, confermato, opera } = comandi;
  const scegliAlternativa = async () => setAlternative(await comandi.alternative(attivita.id));
  return (
    <div className="bozza__scheda-azioni">
      {attivita.bloccata && (
        <Badge tono="primario" icona={<Lock size={14} />}>
          Bloccata
        </Badge>
      )}
      {attivita.suggerimenti.map((s) => (
        <Avviso key={s} tono="attenzione" titolo="Da sistemare">
          {s}
        </Avviso>
      ))}
      <div className="bozza__azioni" role="group" aria-label={`Azioni per «${attivita.nome}»`}>
        {!attivita.pasto && !confermato && (
          <Pulsante variante="testo" icona={<Replace size={18} />} disabled={attesa} onClick={() => void scegliAlternativa()}>
            Sostituisci
          </Pulsante>
        )}
        <Pulsante variante="testo" icona={<Trash2 size={18} />} disabled={attesa} onClick={() => void opera({ tipo: "rimuovi", elementoId: attivita.id })}>
          Rimuovi
        </Pulsante>
        <Pulsante variante="testo" icona={<MoveRight size={18} />} disabled={attesa} aria-expanded={sposta} onClick={() => setSposta(!sposta)}>
          Sposta
        </Pulsante>
        {!attivita.pasto && (
          <Pulsante
            variante="testo"
            icona={attivita.bloccata ? <LockOpen size={18} /> : <Lock size={18} />}
            disabled={attesa}
            aria-pressed={attivita.bloccata}
            onClick={() => void opera({ tipo: attivita.bloccata ? "sblocca" : "blocca", elementoId: attivita.id })}
          >
            {attivita.bloccata ? "Sblocca" : "Blocca"}
          </Pulsante>
        )}
      </div>
      {sposta && (
        <div className="bozza__modulo">
          <label htmlFor={`${id}-giorno`}>Giorno</label>
          <select id={`${id}-giorno`} value={giorno} onChange={(e) => setGiorno(e.target.value)}>
            {comandi.date.map((d) => (
              <option key={d.valore} value={d.valore}>
                {d.etichetta}
              </option>
            ))}
          </select>
          <label htmlFor={`${id}-ora`}>Ora di inizio</label>
          <input id={`${id}-ora`} type="time" value={ora} onChange={(e) => setOra(e.target.value)} />
          <Pulsante variante="secondario" disabled={attesa || ora === ""} onClick={() => void opera({ tipo: "sposta", elementoId: attivita.id, data: giorno, inizio: ora })}>
            Sposta qui
          </Pulsante>
        </div>
      )}
      {alternative !== null && (
        <div className="bozza__alternative" role="group" aria-label={`Alternative a «${attivita.nome}»`}>
          {alternative.length === 0 ? (
            <p>Non trovo alternative adatte a te che entrino in questa giornata.</p>
          ) : (
            <>
              <p>Scegli con cosa sostituirla:</p>
              {alternative.map((a) => (
                <Pulsante
                  key={a.attivitaId}
                  variante="secondario"
                  disabled={attesa}
                  onClick={() => void opera({ tipo: "sostituisci", elementoId: attivita.id, attivitaId: a.attivitaId }).then(() => setAlternative(null))}
                >
                  {a.nome}
                </Pulsante>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CambiaPreferenze({ attuali, attesa, cambia }: { attuali: VistaBozza["preferenze"]; attesa: boolean; cambia: (cambio: CambioPreferenze) => void }) {
  const id = useId();
  const [ritmo, setRitmo] = useState(attuali.ritmo);
  const [stili, setStili] = useState<string[]>(attuali.stili);
  return (
    <section className="bozza__sezione" aria-labelledby={`${id}-titolo`}>
      <h2 id={`${id}-titolo`}>Cambia preferenze</h2>
      <p>Rigenero tutto il viaggio con le nuove preferenze; le attività bloccate restano dove sono.</p>
      <div className="bozza__modulo">
        <label htmlFor={`${id}-ritmo`}>Ritmo</label>
        <select id={`${id}-ritmo`} name="ritmo-bozza" value={ritmo} onChange={(e) => setRitmo(e.target.value as typeof ritmo)}>
          {OPZIONI_RITMO.map((r) => (
            <option key={r.valore} value={r.valore}>
              {r.etichetta}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="bozza__stili">
        <legend>Stili di viaggio</legend>
        {STILI_VIAGGIO.map((s) => (
          <label key={s}>
            <input type="checkbox" checked={stili.includes(s)} onChange={(e) => setStili(e.target.checked ? [...stili, s] : stili.filter((x) => x !== s))} />
            {TESTI_STILI[s]}
          </label>
        ))}
      </fieldset>
      <Pulsante
        variante="secondario"
        icona={<SlidersHorizontal size={18} />}
        disabled={attesa}
        onClick={() => cambia({ ritmo, ...(stili.length > 0 ? { stili: STILI_VIAGGIO.filter((s) => stili.includes(s)) } : {}) })}
      >
        Rigenera con queste preferenze
      </Pulsante>
    </section>
  );
}

function Revisioni({ vista, comandi, confronta }: { vista: VistaBozza; comandi: Comandi; confronta: AzioniBozza["confronta"] }) {
  const id = useId();
  const numeri = vista.revisioni.map((r) => r.numero);
  // Finché il viaggiatore non sceglie, si confrontano le ultime due revisioni.
  const [daScelta, setDa] = useState<number | null>(null);
  const [aScelta, setA] = useState<number | null>(null);
  const da = daScelta ?? numeri.at(-2) ?? 1;
  const a = aScelta ?? numeri.at(-1) ?? 1;
  const [confronto, setConfronto] = useState<ConfrontoBozzaVista | null>(null);
  const scelta = (etichetta: string, valore: number, cambia: (n: number) => void, chiave: string): ReactNode => (
    <>
      <label htmlFor={`${id}-${chiave}`}>{etichetta}</label>
      <select id={`${id}-${chiave}`} value={valore} onChange={(e) => cambia(Number(e.target.value))}>
        {vista.revisioni.map((r) => (
          <option key={r.numero} value={r.numero}>
            B{r.numero}
          </option>
        ))}
      </select>
    </>
  );
  return (
    <section className="bozza__sezione" aria-labelledby={`${id}-titolo`}>
      <h2 id={`${id}-titolo`}>Revisioni della bozza</h2>
      <ol className="bozza__revisioni">
        {vista.revisioni.map((r) => (
          <li key={r.numero} data-revisione={r.numero}>
            <strong>B{r.numero}</strong> {r.causa}
            {!comandi.confermato && r.numero !== vista.revisione && (
              <Pulsante variante="testo" disabled={comandi.attesa} onClick={() => void comandi.opera({ tipo: "torna_alla_revisione", numero: r.numero })}>
                Torna a B{r.numero}
              </Pulsante>
            )}
          </li>
        ))}
      </ol>
      {vista.revisioni.length > 1 && (
        <div className="bozza__modulo">
          {scelta("Confronta", da, setDa, "da")}
          {scelta("con", a, setA, "a")}
          <Pulsante variante="secondario" icona={<GitCompare size={18} />} onClick={() => void confronta(da, a).then(setConfronto, () => setConfronto(null))}>
            Confronta
          </Pulsante>
        </div>
      )}
      {confronto !== null && (
        <div className="bozza__confronto" role="status">
          <p>
            Da B{confronto.da} a B{confronto.a}:
          </p>
          {confronto.cambi.length === 0 ? (
            <p>Nessuna differenza.</p>
          ) : (
            <ul className="bozza__elenco">
              {confronto.cambi.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function Proposte({ vista, attesa, accetta, rifiuta }: { vista: VistaBozza; attesa: boolean; accetta: (id: number) => void; rifiuta: (id: number) => void }) {
  const id = useId();
  return (
    <section className="bozza__sezione" aria-labelledby={`${id}-titolo`}>
      <h2 id={`${id}-titolo`}>Proposte di modifica</h2>
      {vista.proposte.length === 0 ? (
        <p>Nessuna proposta: usa i pulsanti delle attività e dei giorni per chiedere una modifica.</p>
      ) : (
        <ul className="bozza__proposte">
          {vista.proposte.map((p) => (
            <li key={p.id} data-proposta={p.id} data-decisione={p.decisione}>
              <p className="bozza__proposta-titolo">{p.titolo}</p>
              {!p.fattibile && <Badge tono="attenzione">Ha ancora problemi da risolvere</Badge>}
              <details>
                <summary>Perché questa proposta</summary>
                <p className="bozza__spiegazione">{p.spiegazione}</p>
              </details>
              {p.decisione === "in_attesa" ? (
                <div className="bozza__azioni">
                  <Pulsante variante="primario" disabled={attesa} onClick={() => accetta(p.id)}>
                    Accetta
                  </Pulsante>
                  <Pulsante variante="secondario" disabled={attesa} onClick={() => rifiuta(p.id)}>
                    Rifiuta
                  </Pulsante>
                </div>
              ) : (
                <Badge tono={p.decisione === "accettata" ? "successo" : "neutro"}>{p.decisione === "accettata" ? "Accettata" : "Rifiutata"}</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
