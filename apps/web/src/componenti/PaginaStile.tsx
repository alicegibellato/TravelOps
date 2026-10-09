/**
 * Pagina interna /stile (REQ-UX-001, CA-3): fondamenta e componenti del design system, tutti, in tema chiaro e in
 * tema scuro uno sotto l'altro. Non è collegata dal menu. I dati di esempio sono quelli del viaggio di riferimento.
 */
import { Plus, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { caricaViaggioScelto } from "../dati/viaggi";
import { TESTI_STILI, type StatoViaggio } from "../testi";
import { Avviso } from "../ui/Avviso";
import { Badge, BadgeStato } from "../ui/Badge";
import { COMPONENTI_DESIGN_SYSTEM, type IdComponente } from "../ui/catalogo";
import { ChipSelezionabile, GruppoChip } from "../ui/Chip";
import { Contatore } from "../ui/Contatore";
import { ChiudiFinestra, FinestraModale, PannelloLaterale } from "../ui/Finestra";
import { LineaTempo, type VoceLineaTempo } from "../ui/LineaTempo";
import { EsempioNotifica } from "../ui/Notifica";
import { PannelloChat } from "../ui/PannelloChat";
import { Pulsante } from "../ui/Pulsante";
import { SchedaAttivita } from "../ui/SchedaAttivita";
import { SchedaProposta } from "../ui/SchedaProposta";
import { SchedaBozza, SchedaConferma, SchedaPreferenze } from "../ui/SchedeChat";
import { Scheletro } from "../ui/Scheletro";
import { SelettoreDate } from "../ui/SelettoreDate";
import { Cursore } from "../ui/Slider";
import { StatoVuoto } from "../ui/StatoVuoto";
import { ICONE_STILI, STILI_VIAGGIO } from "../ui/stili";
import { datiMappa } from "../viste/mappa";
import { SezioneMappa } from "./SezioneMappa";

type Tema = "chiaro" | "scuro";

const COLORI: readonly { variabile: string; nome: string }[] = [
  { variabile: "--colore-primario", nome: "Lago (primario)" },
  { variabile: "--colore-secondario", nome: "Tramonto (secondario)" },
  { variabile: "--colore-accento", nome: "Sole (accento)" },
  { variabile: "--colore-sfondo", nome: "Sfondo" },
  { variabile: "--colore-superficie", nome: "Superficie" },
  { variabile: "--colore-superficie-2", nome: "Superficie tenue" },
  { variabile: "--colore-testo", nome: "Testo" },
  { variabile: "--colore-testo-tenue", nome: "Testo tenue" },
  { variabile: "--colore-successo", nome: "Successo" },
  { variabile: "--colore-attenzione", nome: "Attenzione" },
  { variabile: "--colore-errore", nome: "Errore" },
];

const LINEA_TEMPO: readonly VoceLineaTempo[] = [
  { tipo: "spostamento", chiave: "s1", inizio: "09:50", mezzo: "piedi", descrizione: "Dall'hotel al MAG", durata: "10 min" },
  { tipo: "attivita", chiave: "a1", inizio: "10:00", nome: "Visita al MAG", orario: "10:00–12:00", durata: "2 h", stile: "cultura", costo: "€", allAperto: false },
  { tipo: "spostamento", chiave: "s2", inizio: "12:00", mezzo: "piedi", descrizione: "Dal MAG al ristorante", durata: "5 min" },
  { tipo: "attivita", chiave: "a2", inizio: "13:20", nome: "Pranzo sul lago", orario: "13:20–14:30", durata: "1 h 10 min", stile: "gastronomia", costo: "€€", allAperto: true },
];

function Sezione({ id, tema, children }: { id: IdComponente; tema: Tema; children: ReactNode }) {
  const voce = COMPONENTI_DESIGN_SYSTEM.find((c) => c.id === id);
  return (
    <section className="stile__sezione" data-componente={id} aria-labelledby={`stile-${tema}-${id} stile-${tema}`}>
      <h3 id={`stile-${tema}-${id}`}>{voce?.nome ?? id}</h3>
      {voce !== undefined && <p className="stile__nota">{voce.nota}</p>}
      <div className="stile__esempio">{children}</div>
    </section>
  );
}

function Fondamenta({ tema }: { tema: Tema }) {
  return (
    <section className="stile__sezione" aria-labelledby={`stile-${tema}-fondamenta stile-${tema}`}>
      <h3 id={`stile-${tema}-fondamenta`}>Fondamenta</h3>
      <ul className="stile__colori" aria-label="Colori">
        {COLORI.map(({ variabile, nome }) => (
          <li key={variabile}>
            <span className="stile__campione" data-colore={variabile} aria-hidden="true" />
            <span>
              {nome}
              <br />
              <code>{variabile}</code>
            </span>
          </li>
        ))}
      </ul>
      <ul className="stile__colori" aria-label="Colori degli stili di viaggio">
        {STILI_VIAGGIO.map((stile) => {
          const Icona = ICONE_STILI[stile];
          return (
            <li key={stile}>
              <span className="stile__campione stile__campione--stile" data-stile={stile} aria-hidden="true">
                <Icona size={18} />
              </span>
              <span>{TESTI_STILI[stile]}</span>
            </li>
          );
        })}
      </ul>
      <div className="stile__tipografia">
        <p className="stile__titolo-esempio">Plus Jakarta Sans per i titoli</p>
        <p>Inter per il testo: frasi brevi, seconda persona, tono amichevole.</p>
        <p className="stile__piccolo">Testo piccolo per note e didascalie.</p>
      </div>
      <ul className="stile__forme" aria-label="Spaziature, raggi e ombre">
        <li className="stile__forma" data-forma="1">Raggio 8 px · ombra 1</li>
        <li className="stile__forma" data-forma="2">Raggio 12 px · ombra 2</li>
        <li className="stile__forma" data-forma="3">Raggio 16 px · ombra 3</li>
      </ul>
    </section>
  );
}

function Componenti({ tema }: { tema: Tema }) {
  const esito = caricaViaggioScelto("versione-1");
  const mappa = esito?.ok === true ? datiMappa(esito.viaggio, esito.catalogo, "2026-06-14") : null;
  const stati: readonly StatoViaggio[] = ["bozza", "confermato", "in_corso", "concluso"];
  return (
    <>
      <Sezione id="pulsanti" tema={tema}>
        <div className="stile__riga">
          <Pulsante variante="primario" icona={<Sparkles size={18} />}>
            Pianifica un viaggio
          </Pulsante>
          <Pulsante variante="secondario">Mostrami un&apos;alternativa</Pulsante>
          <Pulsante variante="testo">Annulla</Pulsante>
          <Pulsante variante="primario" disabled>
            Non disponibile
          </Pulsante>
        </div>
      </Sezione>
      <Sezione id="chip" tema={tema}>
        <GruppoChip etichetta="Stili di viaggio">
          {STILI_VIAGGIO.map((stile, indice) => (
            <ChipSelezionabile key={stile} etichetta={TESTI_STILI[stile]} stile={stile} predefinito={indice < 2} />
          ))}
        </GruppoChip>
      </Sezione>
      <Sezione id="slider" tema={tema}>
        <Cursore
          etichetta="Ritmo"
          min={2}
          max={4}
          predefinito={3}
          unita={{ singolare: "attività al giorno", plurale: "attività al giorno" }}
        />
      </Sezione>
      <Sezione id="date" tema={tema}>
        <SelettoreDate dal="2026-06-12" al="2026-06-14" />
      </Sezione>
      <Sezione id="contatori" tema={tema}>
        <div className="stile__riga">
          <Contatore etichetta="Adulti" min={1} max={10} predefinito={2} unita={{ singolare: "adulto", plurale: "adulti" }} />
          <Contatore etichetta="Bambini" min={0} max={10} predefinito={0} unita={{ singolare: "bambino", plurale: "bambini" }} />
        </div>
      </Sezione>
      <Sezione id="schede-attivita" tema={tema}>
        <div className="stile__griglia">
          <SchedaAttivita nome="Visita al Castello del Buonconsiglio" orario="10:00–12:00" durata="2 h" stile="cultura" costo="€" allAperto={false} />
          <SchedaAttivita
            nome="Trekking sul Sentiero del Ponale"
            orario="09:00–13:00"
            durata="4 h"
            stile="natura"
            costo="Gratis"
            allAperto
            descrizione="Il sentiero a sbalzo sul lago, con vista su Riva del Garda."
          />
        </div>
      </Sezione>
      <Sezione id="linea-tempo" tema={tema}>
        <LineaTempo voci={LINEA_TEMPO} etichetta="Sabato 13 giugno, esempio" />
      </Sezione>
      <Sezione id="mappa" tema={tema}>
        {mappa === null ? <p>Mappa non disponibile.</p> : <SezioneMappa dati={mappa} idTitolo={`stile-${tema}-mappa-titolo`} titolo={`Domenica 14 giugno, tema ${tema}`} />}
      </Sezione>
      <Sezione id="chat" tema={tema}>
        <div className="stile__griglia">
          <PannelloChat
            messaggi={[
              { autore: "viaggiatore", testo: "Sabato piove: cosa possiamo fare al posto del trekking?" },
              { autore: "travelops", testo: "Ti propongo la visita al MAG: è al coperto e a dieci minuti dall'hotel." },
            ]}
            risposteRapide={["Va bene", "Mostrami un'alternativa", "Giornata più leggera"]}
            titolo={`Chat con TravelOps, tema ${tema}`}
          />
          <PannelloChat messaggi={[{ autore: "travelops", testo: "Ciao! Raccontami il viaggio che hai in mente." }]} risposteRapide={["Un weekend al lago"]} disponibile={false} titolo={`Chat non disponibile, tema ${tema}`} />
        </div>
      </Sezione>
      <Sezione id="proposta" tema={tema}>
        <SchedaProposta
          titolo="Pioggia sabato mattina: ti propongo il MAG al posto del trekking"
          livello="minimo"
          cambi={[
            { tipo: "rimosso", testo: "Trekking sul Sentiero del Ponale" },
            { tipo: "aggiunto", testo: "Visita al MAG, 10:00–12:00" },
            { tipo: "spostato", testo: "Dall'hotel al MAG, a piedi", prima: "08:40–09:00", dopo: "09:50–10:00" },
          ]}
          avviso="Il volo di domenica è a rischio: controlla la prenotazione."
          alternative={[{ etichetta: "Gestisci la prenotazione", indirizzo: "#prenotazione" }]}
        />
      </Sezione>
      <Sezione id="badge" tema={tema}>
        <div className="stile__riga">
          {stati.map((stato) => (
            <BadgeStato key={stato} stato={stato} />
          ))}
        </div>
        <div className="stile__riga">
          <Badge tono="successo">Aggiunto</Badge>
          <Badge tono="attenzione">Spostato</Badge>
          <Badge tono="errore">A rischio</Badge>
          <Badge tono="accento">Orario fisso</Badge>
        </div>
      </Sezione>
      <Sezione id="avvisi" tema={tema}>
        <Avviso tono="info">La proposta diventa una nuova versione solo se la accetti.</Avviso>
        <Avviso tono="successo" titolo="Fatto">
          Ho sostituito il trekking con la visita al MAG.
        </Avviso>
        <Avviso tono="attenzione" titolo="Il castello chiude alle 13 la domenica">
          Con il ritardo non ci stiamo dentro: vuoi rinunciare a qualcosa?
        </Avviso>
        <Avviso tono="errore" titolo="Non riesco a caricare il viaggio" azione={<Pulsante variante="secondario">Riprova</Pulsante>}>
          Controlla la connessione e riprova tra poco.
        </Avviso>
      </Sezione>
      <Sezione id="finestre" tema={tema}>
        <div className="stile__riga">
          <FinestraModale
            titolo="Vuoi togliere la visita al MUSE?"
            descrizione="Puoi sempre annullare dalla cronologia delle versioni."
            attivatore={<Pulsante variante="secondario">Apri una finestra</Pulsante>}
            azioni={
              <>
                <ChiudiFinestra>
                  <Pulsante variante="testo">Annulla</Pulsante>
                </ChiudiFinestra>
                <ChiudiFinestra>
                  <Pulsante variante="primario">Togli</Pulsante>
                </ChiudiFinestra>
              </>
            }
          />
          <PannelloLaterale
            titolo="Visita al MAG"
            descrizione="Museo Alto Garda, Riva del Garda."
            attivatore={<Pulsante variante="secondario">Apri un pannello</Pulsante>}
          >
            <SchedaAttivita nome="Visita al MAG" orario="10:00–12:00" durata="2 h" stile="cultura" costo="€" allAperto={false} />
          </PannelloLaterale>
        </div>
      </Sezione>
      <Sezione id="notifiche" tema={tema}>
        <EsempioNotifica etichetta={`Notifiche, tema ${tema}`} />
      </Sezione>
      <Sezione id="scheletro" tema={tema}>
        <Scheletro testo="Sto caricando il programma del giorno…" />
      </Sezione>
      <Sezione id="stato-vuoto" tema={tema}>
        <StatoVuoto
          livello={3}
          titolo="Non hai ancora viaggi"
          descrizione="Raccontami dove vuoi andare: preparo io la prima bozza."
          azione={
            <Pulsante variante="primario" icona={<Plus size={18} />}>
              Pianifica un viaggio
            </Pulsante>
          }
        />
      </Sezione>
      <Sezione id="schede-chat" tema={tema}>
        <div className="stile__griglia">
          <SchedaPreferenze
            titolo="Le tue preferenze"
            voci={[
              { etichetta: "Quando", valore: "12–14 giugno 2026" },
              { etichetta: "Chi viaggia", valore: "2 viaggiatori" },
              { etichetta: "Stili", valore: "Cultura e gastronomia" },
            ]}
          />
          <SchedaBozza
            titolo="Weekend sul Garda"
            giorni={[
              { titolo: "venerdì 12 giugno", attivita: ["Passeggiata sul lungolago"], href: "#bozza-venerdi" },
              { titolo: "sabato 13 giugno", attivita: ["Trekking sul Sentiero del Ponale", "Pranzo sul lago"], href: "#bozza-sabato" },
            ]}
          />
          <SchedaConferma titolo="Fatto: ho aggiornato il programma" testo="Ho sostituito il trekking con la visita al MAG. Se cambi idea puoi annullare." />
          <SchedaConferma titolo="Fatto" testo="" annullata />
        </div>
      </Sezione>
      <Sezione id="stati-chat" tema={tema}>
        <div className="stile__griglia">
          <PannelloChat
            messaggi={[]}
            benvenuto={{ testo: "Ciao! Sono TravelOps. Da dove cominciamo?", suggerimenti: ["Voglio un weekend sul lago", "Sabato piove: cosa cambio?", "Mostrami le mie preferenze"] }}
            titolo={`Chat vuota con benvenuto, tema ${tema}`}
          />
          <PannelloChat
            messaggi={[{ autore: "viaggiatore", testo: "Sabato piove: cosa cambio?" }]}
            inScrittura
            titolo={`Chat con sta scrivendo, tema ${tema}`}
          />
          <PannelloChat messaggi={[]} caricamento titolo={`Chat in caricamento, tema ${tema}`} />
          <PannelloChat
            messaggi={[{ autore: "viaggiatore", testo: "Mostrami le mie preferenze" }]}
            errore={{ testo: "Qualcosa non ha funzionato. Riprova tra un attimo." }}
            titolo={`Chat con errore, tema ${tema}`}
          />
          <PannelloChat messaggi={[]} disponibile={false} titolo={`Chat con AI non disponibile, tema ${tema}`} />
        </div>
      </Sezione>
    </>
  );
}

function Pannello({ tema }: { tema: Tema }) {
  const titolo = tema === "chiaro" ? "Tema chiaro" : "Tema scuro";
  return (
    <section className="stile__tema" data-tema={tema} aria-labelledby={`stile-${tema}`}>
      <h2 id={`stile-${tema}`}>{titolo}</h2>
      <Fondamenta tema={tema} />
      <Componenti tema={tema} />
    </section>
  );
}

export function PaginaStile() {
  return (
    <div className="stile">
      <h1>Stile di TravelOps</h1>
      <p className="sottotitolo">
        I colori, i caratteri e i componenti dell&apos;app, in tema chiaro e scuro. Ogni elemento si usa da tastiera e ha il
        focus visibile.
      </p>
      <nav className="stile__indice" aria-label="Componenti">
        <ul>
          {COMPONENTI_DESIGN_SYSTEM.map(({ id, nome }) => (
            <li key={id}>
              <a href={`#stile-chiaro-${id}`}>{nome}</a>
            </li>
          ))}
        </ul>
      </nav>
      <Pannello tema="chiaro" />
      <Pannello tema="scuro" />
    </div>
  );
}
