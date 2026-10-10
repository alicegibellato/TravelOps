"use client";

import { ArrowLeftRight, CalendarCheck, Ellipsis, GitCompare, Lock, LockOpen, Minus, MoveRight, Plus, RefreshCw, Replace, Route, Shuffle, SlidersHorizontal, Sun, Trash2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { SOGLIA_SPOSTAMENTO_BREVE_MINUTI } from "../bozza/configurazione";
import type {
  AlternativaVista,
  AttivitaBozzaVista,
  AzioniBozza,
  CambioPreferenze,
  ConfrontoBozzaVista,
  EsitoBozza,
  GiornoBozzaVista,
  OperazioneBozza,
  SpostamentoBozzaVista,
  VistaBozza,
} from "../bozza/tipi";
import { Avviso } from "../ui/Avviso";
import { Badge, BadgeStato } from "../ui/Badge";
import { classiPulsante, Pulsante } from "../ui/Pulsante";
import { SchedaAttivita } from "../ui/SchedaAttivita";
import { STILI_VIAGGIO, TESTI_STILI } from "../ui/stili";
import { FestaConferma } from "./BozzaFesta";
import { MenuAzioni, SeparatoreMenu, SottoMenu, VoceMenu } from "./BozzaMenu";
import { SelettoreAttivita } from "./BozzaSelettore";

interface Proprieta {
  vista: VistaBozza;
  azioni: AzioniBozza;
  /** Gli spostamenti fino a questi minuti sono un connettore compatto (predefinito: `bozza/configurazione`). */
  sogliaSpostamentoBreve?: number;
}

type Messaggio = { tono: "successo" | "errore"; testo: string } | null;

/** Le operazioni dei pulsanti, con lo stato condiviso della pagina. */
interface Comandi {
  confermato: boolean;
  attesa: boolean;
  date: VistaBozza["date"];
  opera: (operazione: OperazioneBozza) => Promise<void>;
  alternative: (elementoId: string) => Promise<AlternativaVista[]>;
  sogliaBreve: number;
}

const OPZIONI_RITMO: readonly { valore: NonNullable<CambioPreferenze["ritmo"]>; etichetta: string }[] = [
  { valore: "lento", etichetta: "Lento (2 attività al giorno)" },
  { valore: "bilanciato", etichetta: "Bilanciato (3 attività al giorno)" },
  { valore: "intenso", etichetta: "Intenso (4 attività al giorno)" },
];

/**
 * La pagina della bozza (REQ-PLAN-002): ogni attività e ogni giorno hanno i loro pulsanti; Annulla, Confronta, Cambia
 * preferenze, Mostrami un'alternativa e Conferma l'itinerario sono in alto. Ogni pulsante chiama un'azione lato
 * server, che usa il motore: qui nessuna regola. Dopo la conferma gli stessi pulsanti preparano proposte da accettare.
 */
export function PaginaBozza({ vista: iniziale, azioni, sogliaSpostamentoBreve = SOGLIA_SPOSTAMENTO_BREVE_MINUTI }: Proprieta) {
  const [vista, setVista] = useState(iniziale);
  const [messaggio, setMessaggio] = useState<Messaggio>(null);
  const [attesa, setAttesa] = useState(false);
  const [festa, setFesta] = useState(false);
  const titolo = useRef<HTMLHeadingElement>(null);
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
    sogliaBreve: sogliaSpostamentoBreve,
  };

  const chiudiFesta = useCallback(() => {
    setFesta(false);
    titolo.current?.focus();
  }, []);

  const conferma = async () => {
    if (await esegui(() => azioni.conferma())) {
      // La festa dice già «Buon viaggio!»: il messaggio del motore sarebbe una ripetizione.
      setMessaggio(null);
      setFesta(true);
    }
  };

  return (
    <section className="bozza" aria-labelledby="bozza-titolo" aria-busy={attesa} data-stato={vista.stato} data-attesa={attesa ? "si" : undefined}>
      <header className="bozza__testa">
        <h1 id="bozza-titolo" ref={titolo} tabIndex={-1}>{vista.titolo}</h1>
        <div className="bozza__etichette">
          <BadgeStato stato={vista.stato} />
          {confermato ? (
            <Badge tono="primario">Versione {vista.versione}</Badge>
          ) : (
            <Badge tono="accento">Ultima modifica: {vista.etichettaRevisione}</Badge>
          )}
        </div>
      </header>

      {festa && <FestaConferma versione={vista.versione ?? 1} alChiudi={chiudiFesta} />}

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

      {attesa && (
        <p className="bozza__attesa" role="status">
          <RefreshCw size={16} aria-hidden="true" />
          Aggiorno la bozza…
        </p>
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
  const [selettore, setSelettore] = useState(false);
  const attivatore = useRef<HTMLButtonElement>(null);
  const daAprire = useRef(false);
  const { attesa, confermato, opera } = comandi;
  const puoAggiungere = !confermato && suggerite.length > 0;
  const aggiungi = (attivitaId: string) => {
    setSelettore(false);
    void opera({ tipo: "aggiungi", attivitaId, data: giorno.data });
  };
  // Il selettore si apre solo a menu chiuso, così il focus non torna all'attivatore mentre entra nella finestra.
  const dopoMenu = (evento: Event) => {
    if (!daAprire.current) return;
    daAprire.current = false;
    evento.preventDefault();
    setSelettore(true);
  };
  return (
    <section className="bozza__giorno" aria-labelledby={`${id}-titolo`} data-data={giorno.data} data-vuoto={giorno.voci.length === 0 ? "si" : undefined}>
      <header className="bozza__giorno-testa">
        <h2 id={`${id}-titolo`} className="bozza__giorno-titolo">
          {giorno.titolo}
        </h2>
        <MenuAzioni
          alChiusura={dopoMenu}
          attivatore={
            <button ref={attivatore} type="button" className={classiPulsante({ variante: "secondario" }, "bozza__giorno-menu")} disabled={attesa}>
              <span className="ui-pulsante__icona" aria-hidden="true">
                <Ellipsis size={18} />
              </span>
              <span>
                Modifica giorno<span className="ui-solo-lettori"> {giorno.titolo}</span>
              </span>
            </button>
          }
        >
          <VoceMenu icona={<Minus size={18} />} alScelta={() => void opera({ tipo: "giornata_piu_leggera", data: giorno.data })}>
            Giornata più leggera
          </VoceMenu>
          <VoceMenu icona={<Plus size={18} />} alScelta={() => void opera({ tipo: "giornata_piu_piena", data: giorno.data })}>
            Giornata più piena
          </VoceMenu>
          <VoceMenu icona={<RefreshCw size={18} />} alScelta={() => void opera({ tipo: "rigenera_giorno", data: giorno.data })}>
            Rigenera questo giorno
          </VoceMenu>
          {!confermato && (altri.length > 0 || puoAggiungere) && <SeparatoreMenu />}
          {!confermato && altri.length > 0 && (
            <SottoMenu icona={<ArrowLeftRight size={18} />} etichetta="Scambia con…">
              {altri.map((d) => (
                <VoceMenu key={d.valore} alScelta={() => void opera({ tipo: "scambia_giorni", data: giorno.data, conData: d.valore })}>
                  {d.etichetta}
                </VoceMenu>
              ))}
            </SottoMenu>
          )}
          {puoAggiungere && (
            <VoceMenu icona={<Plus size={18} />} alScelta={() => (daAprire.current = true)}>
              Aggiungi un&apos;attività…
            </VoceMenu>
          )}
        </MenuAzioni>
      </header>
      {giorno.suggerimenti.map((s) => (
        <Avviso key={s} tono="attenzione" titolo="Da sistemare">
          {s}
        </Avviso>
      ))}
      {giorno.voci.length === 0 ? (
        <div className="bozza__giorno-vuoto">
          <Sun size={24} aria-hidden="true" />
          <p>Giornata libera: nessuna attività in programma.</p>
          {puoAggiungere && (
            <Pulsante variante="secondario" icona={<Plus size={18} />} disabled={attesa} onClick={() => setSelettore(true)}>
              Aggiungi un&apos;attività
            </Pulsante>
          )}
        </div>
      ) : (
        <ol className="bozza__voci">
          {giorno.voci.map((voce) =>
            voce.tipo === "attivita" ? (
              <li key={voce.id} className="bozza__voce" data-elemento={voce.id} data-tipo="attivita" data-pasto={voce.pasto ? "si" : undefined}>
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
              <Spostamento key={voce.id} voce={voce} soglia={comandi.sogliaBreve} />
            ),
          )}
        </ol>
      )}
      <SelettoreAttivita
        aperto={selettore}
        alCambio={setSelettore}
        titolo={`Aggiungi un'attività a ${giorno.titolo}`}
        suggerite={suggerite}
        attesa={attesa}
        alScelta={aggiungi}
        alChiusura={(evento) => {
          evento.preventDefault();
          attivatore.current?.focus();
        }}
      />
    </section>
  );
}

/**
 * Lo spostamento tra due attività: se breve (fino alla soglia) è un connettore compatto con icona e minuti, altrimenti
 * una riga con il percorso per esteso. Il testo completo resta per i lettori di schermo in entrambi i casi.
 */
function Spostamento({ voce, soglia }: { voce: SpostamentoBozzaVista; soglia: number }) {
  const breve = voce.minuti <= soglia;
  return (
    <li className={breve ? "bozza__connettore" : "bozza__connettore bozza__connettore--lungo"} data-elemento={voce.id} data-tipo="spostamento" data-breve={breve ? "si" : "no"}>
      <span className="bozza__connettore-pillola" title={breve ? voce.testo : undefined}>
        <Route size={14} aria-hidden="true" />
        {breve ? (
          <>
            <span aria-hidden="true">{voce.minuti} min</span>
            <span className="ui-solo-lettori">
              {voce.orario} · {voce.testo} ({voce.minuti} minuti)
            </span>
          </>
        ) : (
          <span>
            {voce.orario} · {voce.testo} ({voce.minuti} min)
          </span>
        )}
      </span>
    </li>
  );
}

function AzioniAttivita({ attivita, data, comandi }: { attivita: AttivitaBozzaVista; data: string; comandi: Comandi }) {
  const id = useId();
  const [alternative, setAlternative] = useState<AlternativaVista[] | null>(null);
  const [sposta, setSposta] = useState(false);
  const [giorno, setGiorno] = useState(data);
  const [ora, setOra] = useState(attivita.orario.slice(0, 5));
  const daAprire = useRef<"sposta" | "alternative" | null>(null);
  const pannelloSposta = useRef<HTMLDivElement>(null);
  const pannelloAlternative = useRef<HTMLDivElement>(null);
  const { attesa, confermato, opera } = comandi;

  // Il pannello si apre a menu chiuso e prende lui il focus (invece dell'attivatore).
  const dopoMenu = (evento: Event) => {
    const richiesta = daAprire.current;
    if (richiesta === null) return;
    daAprire.current = null;
    evento.preventDefault();
    if (richiesta === "sposta") setSposta(true);
    else void comandi.alternative(attivita.id).then(setAlternative);
  };
  useEffect(() => {
    if (sposta) pannelloSposta.current?.querySelector("select")?.focus();
  }, [sposta]);
  useEffect(() => {
    if (alternative !== null) (pannelloAlternative.current?.querySelector("button") ?? pannelloAlternative.current)?.focus();
  }, [alternative]);

  return (
    <div className="bozza__scheda-azioni">
      <div className="bozza__voce-menu">
        <MenuAzioni
          alChiusura={dopoMenu}
          attivatore={
            <button type="button" className="ui-pulsante ui-pulsante--testo ui-pulsante--icona" aria-label={`Azioni per «${attivita.nome}»`} disabled={attesa}>
              <Ellipsis size={20} aria-hidden="true" />
            </button>
          }
        >
          {!attivita.pasto && !confermato && (
            <VoceMenu icona={<Replace size={18} />} alScelta={() => (daAprire.current = "alternative")}>
              Sostituisci
            </VoceMenu>
          )}
          <VoceMenu icona={<MoveRight size={18} />} alScelta={() => (daAprire.current = "sposta")}>
            Sposta
          </VoceMenu>
          {!attivita.pasto && (
            <VoceMenu
              icona={attivita.bloccata ? <LockOpen size={18} /> : <Lock size={18} />}
              alScelta={() => void opera({ tipo: attivita.bloccata ? "sblocca" : "blocca", elementoId: attivita.id })}
            >
              {attivita.bloccata ? "Sblocca" : "Blocca"}
            </VoceMenu>
          )}
          <SeparatoreMenu />
          <VoceMenu pericolosa icona={<Trash2 size={18} />} alScelta={() => void opera({ tipo: "rimuovi", elementoId: attivita.id })}>
            Rimuovi
          </VoceMenu>
        </MenuAzioni>
      </div>
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
      {sposta && (
        <div ref={pannelloSposta} className="bozza__modulo bozza__pannello">
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
          <Pulsante variante="secondario" disabled={attesa || ora === ""} onClick={() => void opera({ tipo: "sposta", elementoId: attivita.id, data: giorno, inizio: ora }).then(() => setSposta(false))}>
            Sposta qui
          </Pulsante>
          <Pulsante variante="testo" onClick={() => setSposta(false)}>
            Non spostare
          </Pulsante>
        </div>
      )}
      {alternative !== null && (
        <div ref={pannelloAlternative} className="bozza__alternative bozza__pannello" role="group" aria-label={`Alternative a «${attivita.nome}»`} tabIndex={-1}>
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
          <Pulsante variante="testo" onClick={() => setAlternative(null)}>
            Non sostituire
          </Pulsante>
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
  const etichettaDi = (numero: number): string => vista.revisioni.find((r) => r.numero === numero)?.etichetta ?? `n. ${numero}`;
  const scelta = (etichetta: string, valore: number, cambia: (n: number) => void, chiave: string): ReactNode => (
    <>
      <label htmlFor={`${id}-${chiave}`}>{etichetta}</label>
      <select id={`${id}-${chiave}`} value={valore} onChange={(e) => cambia(Number(e.target.value))}>
        {vista.revisioni.map((r) => (
          <option key={r.numero} value={r.numero}>
            {r.numero}. {r.etichetta}
          </option>
        ))}
      </select>
    </>
  );
  return (
    <section className="bozza__sezione" aria-labelledby={`${id}-titolo`}>
      <h2 id={`${id}-titolo`}>Cronologia della bozza</h2>
      <ol className="bozza__revisioni">
        {vista.revisioni.map((r) => (
          <li key={r.numero} data-revisione={r.numero}>
            <strong>{r.etichetta}</strong>
            {r.causa !== r.etichetta && <span className="bozza__revisione-dettaglio"> · {r.causa}</span>}
            {!comandi.confermato && r.numero !== vista.revisione && (
              <Pulsante variante="testo" disabled={comandi.attesa} onClick={() => void comandi.opera({ tipo: "torna_alla_revisione", numero: r.numero })}>
                Torna a «{r.etichetta}»
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
            Da «{etichettaDi(confronto.da)}» a «{etichettaDi(confronto.a)}»:
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
