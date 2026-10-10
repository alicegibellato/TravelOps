import type { Metadata } from "next";
import { leggiBozzaDalVivo } from "../../src/chat/bozza-dal-vivo";
import { PaginaPianifica } from "../../src/chat/PaginaPianifica";
import { numeroDaParametro } from "../../src/percorsi";
import { opzioniPercorso } from "../../src/preferenze/opzioni";
import { destinazioniPrecaricate } from "../../src/preferenze/precaricate";
import { iniziaNuovoViaggio, leggiProfilo } from "../../src/preferenze/profilo";
import { cartellaDati, leggiStato } from "../../src/stato/archivio";
import { usaBaseDati } from "../../src/stato/avvio";
import { OROLOGIO_PREDEFINITO } from "../../src/stato/stato";
import { opzioniMesi } from "../../src/viste/etichette";
import { cercaDestinazioniAzione, sorprendimiAzione } from "../destinazione/azioni";
import { assistenteDaAmbienteConFinto } from "../../src/chat/server/assistente";
import { creaBozzaAzione, salvaPreferenzeAzione, validaPreferenzeAzione } from "../preferenze/azioni";
import { salvaBozzaInCorsoAzione } from "./azioni";

/** Profilo e bozza si rileggono dalla base dati a ogni richiesta: cambiano mentre si parla in chat. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Pianifica un viaggio" };

interface Parametri {
  searchParams: Promise<{ conversazione?: string | string[]; viaggio?: string | string[] }>;
}

const preferenze = { valida: validaPreferenzeAzione, salva: salvaPreferenzeAzione };
/** ST-QA-FIX-001: senza assistente della chat «Crea la mia bozza» crea la bozza con il motore, come la pagina Preferenze. */
const preferenzeSenzaChat = { ...preferenze, creaBozza: creaBozzaAzione };
const destinazioni = { cerca: cercaDestinazioniAzione, sorprendimi: sorprendimiAzione };

/**
 * Pianifica un viaggio (REQ-CHAT-001, REQ-PREF-001): percorso guidato e chat con gli agenti sullo stesso schermo e
 * sullo stesso profilo, con la bozza dal vivo che si aggiorna mentre si parla.
 */
export default async function Pianifica({ searchParams }: Parametri) {
  const parametri = await searchParams;
  const conversazione = numeroDaParametro(parametri.conversazione);
  const viaggio = typeof parametri.viaggio === "string" && parametri.viaggio !== "" ? parametri.viaggio : null;
  const cartella = cartellaDati();
  const bozza = viaggio === null ? null : leggiBozzaDalVivo(cartella, viaggio);
  // REQ-CHAT-003: Pianifica aperta da zero è un viaggio nuovo; restano solo ritmo, forma fisica e pasti.
  const profilo = usaBaseDati(cartella, (db) => {
    if (conversazione === null && viaggio === null) iniziaNuovoViaggio(db);
    return leggiProfilo(db);
  });
  const letto = leggiStato(cartella);
  const oggi = letto.ok ? letto.stato.orologio.data : OROLOGIO_PREDEFINITO.data;
  const chatDisponibile = assistenteDaAmbienteConFinto().disponibile;
  return (
    <PaginaPianifica
      chatDisponibile={chatDisponibile}
      conversazione={conversazione}
      viaggio={viaggio}
      bozza={bozza}
      percorso={{
        preferenze: chatDisponibile ? preferenze : preferenzeSenzaChat,
        destinazioni,
        opzioni: opzioniPercorso(),
        mesi: opzioniMesi(oggi),
        precaricate: destinazioniPrecaricate(cartella),
        profiloIniziale: profilo,
        salvaInCorso: salvaBozzaInCorsoAzione,
      }}
    />
  );
}
