/**
 * Unico modulo dei testi del motore in linguaggio semplice (REQ-UX-001, CA-6).
 *
 * Il motore resta la fonte di dati, regole e messaggi; i suoi testi però contengono codici pensati per chi sviluppa:
 * `id` degli elementi (`D2-E4`, `N1`), codici dei problemi (`FUORI_ORARIO`), degli errori e dello storico
 * (`[PROPOSTA_SUPERATA] …`), `id` del catalogo (`GARDA_NORD`) e date `AAAA-MM-GG`. Qui ci sono:
 * - le traduzioni di tutti i codici del motore (problemi, errori, storico, modifiche), dei tipi di imprevisto, dei
 *   tipi di alternativa, della gravità e degli stati del viaggio;
 * - `inParole`, che riscrive un testo del motore per il viaggiatore senza cambiarne il contenuto: gli `id` diventano
 *   i nomi di attività, spostamenti, luoghi e zone, i codici diventano parole, le date diventano "13 giugno 2026".
 *
 * È l'unico file della web app in cui compaiono i codici del motore (verificato dai test di CA-6 e di WEB-002 CA-9).
 */
import {
  trovaAttivita,
  trovaLuogo,
  trovaZona,
  type Catalogo,
  type CodiceErrore,
  type CodiceErroreModifica,
  type CodiceProblemaFattibilita,
  type CodiceStorico,
  type Elemento,
  type Gravita,
  type Imprevisto,
  type Mezzo,
  type StileViaggio,
  type TipoAlternativa,
  type Viaggio,
} from "@travelops/engine";
import { dataBreve } from "./viste/etichette";

/** Tutti i codici che il motore può mettere in un messaggio. */
export type CodiceMotore = CodiceProblemaFattibilita | CodiceErrore | CodiceStorico | CodiceErroreModifica;

/** Ogni codice del motore in poche parole, da mostrare al posto del codice. */
export const TESTI_CODICI: Readonly<Record<CodiceMotore, string>> = {
  // Problemi di fattibilità (REQ-FEAS-001)
  MANCA_SPOSTAMENTO: "Manca uno spostamento",
  PERCORSO_SCONOSCIUTO: "Non sappiamo come arrivarci",
  SPOSTAMENTO_TROPPO_BREVE: "Non c'è abbastanza tempo per lo spostamento",
  SOVRAPPOSIZIONE: "Due momenti si sovrappongono",
  FUORI_ORARIO: "Fuori dagli orari di apertura",
  DURATA_INSUFFICIENTE: "Troppo poco tempo per goderselo",
  METEO_AVVERSO: "Meteo sfavorevole",
  LUOGO_CHIUSO: "Il luogo è chiuso",
  // Avviso del catalogo esteso (REQ-CAT-001 §7.3)
  ORARI_DA_VERIFICARE: "Ti consiglio di controllare gli orari prima di andare",
  // Errori dei dati del viaggio e del catalogo (REQ-ITIN-001)
  CAMPO_MANCANTE: "Manca un dato",
  ORARIO_NON_VALIDO: "Orario non valido",
  FUORI_GIORNATA: "Fuori dalla giornata",
  ORDINE_NON_VALIDO: "Ordine non valido",
  ID_DUPLICATO: "Elemento ripetuto",
  RIFERIMENTO_INESISTENTE: "Riferimento a qualcosa che non esiste",
  GIORNI_NON_VALIDI: "Giorni non validi",
  VALORE_NON_VALIDO: "Valore non valido",
  // Storico delle versioni (REQ-ITIN-002)
  PROPOSTA_SUPERATA: "Questa proposta non è più aggiornata",
  NESSUNA_MODIFICA: "Nessun cambiamento",
  PROPOSTA_NON_VALIDA: "Proposta non valida",
  ACCETTAZIONE_NON_VALIDA: "Non è stato possibile accettare la proposta",
  VIAGGIO_NON_VALIDO: "Viaggio non valido",
  VERSIONE_INESISTENTE: "Questa versione non esiste",
  STORICO_NON_VALIDO: "Lo storico salvato non è valido",
  // Modifiche richieste (REQ-EDIT-001)
  GIORNO_INESISTENTE: "Il giorno non fa parte del viaggio",
  ATTIVITA_INESISTENTE: "Attività sconosciuta",
  ELEMENTO_INESISTENTE: "Elemento sconosciuto",
  NON_ATTIVITA: "Si può fare solo su un'attività",
  ORARIO_FISSO: "L'orario è fisso",
};

/** I tipi di imprevisto. */
export const TESTI_IMPREVISTI: Readonly<Record<Imprevisto["tipo"], string>> = {
  METEO_AVVERSO: "Maltempo",
  RITARDO: "Ritardo",
  CHIUSURA_LUOGO: "Luogo chiuso",
  CANCELLAZIONE_SPOSTAMENTO: "Spostamento cancellato",
};

/** I tipi di alternativa proposti dal motore. */
export const TESTI_ALTERNATIVE: Readonly<Record<TipoAlternativa, string>> = {
  gestione_prenotazione: "Gestisci la prenotazione",
  ricerca_voli: "Cerca un altro volo",
  ricerca_treni: "Cerca un altro treno",
};

/** La gravità di un problema. */
export const TESTI_GRAVITA: Readonly<Record<Gravita, string>> = {
  bloccante: "Da risolvere",
  avviso: "Da tenere d'occhio",
};

/** Gli stati del viaggio (`modello-dominio-estensioni.md` §7.1). */
export type StatoViaggio = "bozza" | "confermato" | "in_corso" | "concluso";

export const TESTI_STATO_VIAGGIO: Readonly<Record<StatoViaggio, string>> = {
  bozza: "Bozza",
  confermato: "Confermato",
  in_corso: "In corso",
  concluso: "Concluso",
};

/** Gli stili di viaggio sono del motore (REQ-CAT-001, §7.2): ognuno ha il suo colore nei token. */
export type { StileViaggio };

// I nomi degli stili stanno con le loro icone, in un modulo che i componenti del browser possono caricare.
export { TESTI_STILI } from "./ui/stili";

/** I livelli di ripianificazione di una proposta (`modello-dominio-estensioni.md` §7.6). */
export type LivelloRipianificazione = "minimo" | "giornata" | "resto";

export const TESTI_LIVELLI: Readonly<Record<LivelloRipianificazione, string>> = {
  minimo: "Cambia solo il necessario",
  giornata: "Rifà la giornata",
  resto: "Rivede il resto del viaggio",
};

/** Come si viaggia, in una frase: "in auto", "a piedi"… */
const MEZZI_IN_FRASE: Readonly<Record<Mezzo, string>> = {
  piedi: "a piedi",
  mezzi_pubblici: "con i mezzi pubblici",
  treno: "in treno",
  auto: "in auto",
  volo: "in aereo",
};

/** Ciò che serve per riscrivere un testo: il catalogo e gli elementi che il testo può citare. */
export interface ContestoTesti {
  catalogo: Catalogo;
  elementi: ReadonlyMap<string, Elemento>;
}

/**
 * Il contesto per i testi di uno o più itinerari. Se lo stesso `id` compare in più itinerari vale il primo: per una
 * proposta si passa prima la versione di partenza, così un elemento modificato si chiama come lo conosce il viaggiatore.
 */
export function contestoTesti(catalogo: Catalogo, viaggi: readonly Viaggio[] = [], altri: readonly Elemento[] = []): ContestoTesti {
  const elementi = new Map<string, Elemento>();
  const aggiungi = (elemento: Elemento): void => {
    if (!elementi.has(elemento.id)) elementi.set(elemento.id, elemento);
  };
  for (const viaggio of viaggi) for (const giorno of viaggio.giorni) giorno.elementi.forEach(aggiungi);
  altri.forEach(aggiungi);
  return { catalogo, elementi };
}

function nomeLuogo(catalogo: Catalogo, id: string): string {
  return trovaLuogo(catalogo, id)?.nome ?? id;
}

/** La tratta di uno spostamento: "in auto da «Hotel» a «Castello»". */
function tratta(elemento: Extract<Elemento, { tipo: "spostamento" }>, catalogo: Catalogo): string {
  return `${MEZZI_IN_FRASE[elemento.mezzo]} da «${nomeLuogo(catalogo, elemento.da)}» a «${nomeLuogo(catalogo, elemento.a)}»`;
}

/** Il nome di un elemento in una frase: «Visita al MAG», "lo spostamento a piedi da «…» a «…»", "il volo da «…» a «…»". */
export function nomeElemento(elemento: Elemento, catalogo: Catalogo): string {
  if (elemento.tipo === "attivita") return `«${trovaAttivita(catalogo, elemento.attivitaId)?.nome ?? "attività"}»`;
  if (elemento.mezzo === "volo") return `il volo da «${nomeLuogo(catalogo, elemento.da)}» a «${nomeLuogo(catalogo, elemento.a)}»`;
  return `lo spostamento ${tratta(elemento, catalogo)}`;
}

const ID_ELEMENTO = String.raw`\b(?:D\d+-E\d+|N\d+)\b`;
const CODICE_TRA_PARENTESI = /\[([A-Z][A-Z_]+)\]\s*/g;
const IDENTIFICATIVO = /\b[A-Z][A-Z0-9]*(?:[-_][A-Z0-9]+)*\b/g;
const DATA_ISO = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
const INDIRIZZO = /(https?:\/\/\S+)/;
const CITAZIONE = /(«[^»]*»|"[^"]*")/;

function eCodice(parola: string): parola is CodiceMotore {
  return Object.hasOwn(TESTI_CODICI, parola);
}

/** Tutti i codici del motore come parole intere (anche quelli di una sola parola, come "SOVRAPPOSIZIONE"). */
const CODICE = new RegExp(String.raw`\b(?:${Object.keys(TESTI_CODICI).join("|")})\b`, "g");

/** "a lo spostamento" → "allo spostamento", "di il volo" → "del volo"… */
function preposizioniArticolate(testo: string): string {
  const unite: Record<string, Record<string, string>> = {
    a: { lo: "allo", il: "al" },
    di: { lo: "dello", il: "del" },
    da: { lo: "dallo", il: "dal" },
    in: { lo: "nello", il: "nel" },
    su: { lo: "sullo", il: "sul" },
  };
  return testo.replace(/\b(a|di|da|in|su) (lo|il) (?=spostamento|volo)/g, (tutto, prep: string, art: string) => {
    const unita = unite[prep]?.[art];
    return unita === undefined ? tutto : `${unita} `;
  });
}

/** Gli `id` del catalogo fuori dalle citazioni («…» e "…"), con il nome che il viaggiatore conosce. */
function identificativiCatalogo(testo: string, catalogo: Catalogo): string {
  return testo
    .split(CITAZIONE)
    .map((parte, indice) => {
      if (indice % 2 === 1) return parte;
      return parte.replace(IDENTIFICATIVO, (id) => {
        const zona = trovaZona(catalogo, id);
        if (zona !== null) return `zona ${zona.nome}`;
        const luogo = trovaLuogo(catalogo, id);
        if (luogo !== null) return `«${luogo.nome}»`;
        const attivita = trovaAttivita(catalogo, id);
        if (attivita !== null) return `«${attivita.nome}»`;
        return id;
      });
    })
    .join("");
}

/** La prima lettera di ogni frase in maiuscolo. */
function maiuscoleDiFrase(testo: string): string {
  return testo.replace(/(^|[.?!]\s+|^-\s+)([a-zàèéìòù])/gm, (_, prima: string, lettera: string) => `${prima}${lettera.toUpperCase()}`);
}

/** Un pezzo di testo senza indirizzi. */
function riscriviParte(testo: string, contesto: ContestoTesti | null): string {
  let t = testo;
  // [CODICE] motivo → "In parole: motivo"
  t = t.replace(CODICE_TRA_PARENTESI, (tutto, codice: string) => (eCodice(codice) ? `${TESTI_CODICI[codice]}: ` : tutto));
  // "D2-E2 «Trekking…»" → "«Trekking…»"
  t = t.replace(new RegExp(`${ID_ELEMENTO}\\s+(?=[«"])`, "g"), "");
  // "D3-E1 (in auto da «A» a «B»)" → "lo spostamento in auto da «A» a «B»"
  t = t.replace(
    new RegExp(`(spostamento\\s+)?${ID_ELEMENTO}\\s+\\(((?:in|a|con)\\s[^()]*?\\bda «[^»]*» a «[^»]*»)\\)`, "g"),
    (_, prima: string | undefined, descrizione: string) => (prima === undefined ? `lo spostamento ${descrizione}` : `${prima}${descrizione}`),
  );
  // Un id da solo: il nome dell'elemento
  t = t.replace(new RegExp(`(spostamento\\s+)?(${ID_ELEMENTO})`, "g"), (_, prima: string | undefined, id: string) => {
    const elemento = contesto?.elementi.get(id);
    if (elemento === undefined) return prima === undefined ? "un elemento del programma" : prima.trimEnd();
    if (prima !== undefined && elemento.tipo === "spostamento") return `${prima}${tratta(elemento, contesto!.catalogo)}`;
    return `${prima ?? ""}${nomeElemento(elemento, contesto!.catalogo)}`;
  });
  // Gravità e codici rimasti
  t = t.replace(/\((bloccante|avviso)\)/g, (_, gravita: Gravita) => `(${TESTI_GRAVITA[gravita].toLowerCase()})`);
  t = t.replace(CODICE, (parola) => (eCodice(parola) ? TESTI_CODICI[parola] : parola));
  if (contesto !== null) t = identificativiCatalogo(t, contesto.catalogo);
  t = t.replace(DATA_ISO, (data) => dataBreve(data));
  return preposizioniArticolate(t);
}

/**
 * Un testo del motore (messaggio, spiegazione, causa, motivo) riscritto per il viaggiatore, senza codici tecnici.
 * Senza contesto si tolgono solo i codici e si riscrivono le date; gli `id` degli elementi diventano "un elemento del
 * programma". Gli indirizzi (link delle alternative) restano come sono.
 */
export function inParole(testo: string, contesto: ContestoTesti | null = null): string {
  const riscritto = testo
    .split(INDIRIZZO)
    .map((parte, indice) => (indice % 2 === 1 ? parte : riscriviParte(parte, contesto)))
    .join("");
  return maiuscoleDiFrase(riscritto.replace(/ {2,}/g, " "));
}
