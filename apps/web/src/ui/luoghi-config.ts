/**
 * Configurazione delle illustrazioni dei luoghi (ST-UX-003B, CB-4): i tipi di luogo, le parole che li riconoscono nel
 * nome e le immagini locali eventuali. È l'unico posto da cambiare per aggiungere un tipo, una parola o una fotografia:
 * il disegno (`luogo-forme.ts`) e il componente (`IllustrazioneLuogo.tsx`) non contengono elenchi di luoghi.
 */

export const TIPI_LUOGO = ["lago", "montagna", "mare", "citta", "borgo", "parco", "generico"] as const;
export type TipoLuogo = (typeof TIPI_LUOGO)[number];

/** Il nome di ogni tipo, per i testi che lo descrivono. */
export const NOMI_TIPI_LUOGO: Readonly<Record<TipoLuogo, string>> = {
  lago: "Lago",
  montagna: "Montagna",
  mare: "Mare",
  citta: "Città d'arte",
  borgo: "Borgo",
  parco: "Parco",
  generico: "Luogo",
};

/**
 * Le parole (in minuscolo, senza accenti) che, trovate nel nome, indicano il tipo. Si prova nell'ordine dei tipi: il
 * primo che corrisponde vince. Una parola vale se compare intera nel nome (anche più parole, come «centro storico»).
 */
export const PAROLE_TIPO_LUOGO: Readonly<Record<Exclude<TipoLuogo, "generico">, readonly string[]>> = {
  lago: ["lago", "laghi", "garda", "como", "maggiore", "iseo", "lungolago", "sirmione", "riva"],
  montagna: ["monte", "monti", "montagna", "montagne", "dolomiti", "alpi", "alpe", "val", "valle", "rifugio", "sentiero", "vetta", "passo", "cima", "trekking", "escursione"],
  mare: ["mare", "marina", "costa", "spiaggia", "riviera", "porto", "isola", "golfo", "baia", "lido", "cinque terre", "amalfi"],
  parco: ["parco", "parchi", "giardino", "giardini", "riserva", "bosco", "foresta", "oasi"],
  borgo: ["borgo", "castello", "rocca", "paese", "abbazia", "pieve", "torre"],
  citta: [
    "citta",
    "centro storico",
    "museo",
    "muse",
    "duomo",
    "cattedrale",
    "basilica",
    "piazza",
    "palazzo",
    "teatro",
    "galleria",
    "roma",
    "firenze",
    "venezia",
    "milano",
    "torino",
    "napoli",
    "bologna",
    "verona",
    "trento",
    "genova",
    "pisa",
    "siena",
    "lisbona",
  ],
};

/** Le stagioni delle illustrazioni (ST-UX-004B, CB-3): cambiano la luce e i colori del disegno, non le forme. */
export const STAGIONI = ["primavera", "estate", "autunno", "inverno"] as const;
export type Stagione = (typeof STAGIONI)[number];

/** La stagione di ogni mese, da gennaio (indice 0) a dicembre. */
export const STAGIONE_PER_MESE: readonly Stagione[] = [
  "inverno",
  "inverno",
  "primavera",
  "primavera",
  "primavera",
  "estate",
  "estate",
  "estate",
  "autunno",
  "autunno",
  "autunno",
  "inverno",
];

/** La stagione di una data `AAAA-MM-GG` (o `AAAA-MM`); `undefined` se la data non è valida. */
export function stagioneDellaData(data: string): Stagione | undefined {
  const mese = /^\d{4}-(\d{2})/.exec(data)?.[1];
  return mese === undefined ? undefined : STAGIONE_PER_MESE[Number(mese) - 1];
}

/** Il tipo di luogo di ripiego per uno stile di viaggio, quando il nome non dice nulla (per esempio «Pranzo: Ristorante La Scarpetta»). */
export const TIPO_PER_STILE: Readonly<Record<string, TipoLuogo>> = {
  relax: "lago",
  cultura: "citta",
  natura: "parco",
  avventura: "montagna",
  gastronomia: "borgo",
  romantico: "lago",
  famiglia: "parco",
};

/** Immagini locali (cartella `public/`) per i luoghi che ne hanno una: nome normalizzato → percorso. Vuoto finché non ce ne sono. */
export const IMMAGINI_LUOGHI: Readonly<Record<string, string>> = {};

/** Minuscolo, senza accenti né segni: la forma con cui si confrontano i nomi. */
export function normalizzaNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Il tipo di luogo che il nome suggerisce (una parola intera della lista); se nessuna corrisponde, quello dello stile di
 * viaggio (se indicato) e infine `generico`.
 */
export function tipoDelLuogo(nome: string, stile?: string): TipoLuogo {
  const parole = ` ${normalizzaNome(nome)} `;
  for (const tipo of ["lago", "montagna", "mare", "parco", "borgo", "citta"] as const) {
    if (PAROLE_TIPO_LUOGO[tipo].some((parola) => parole.includes(` ${parola.trim()} `))) return tipo;
  }
  return (stile === undefined ? undefined : TIPO_PER_STILE[stile]) ?? "generico";
}

/** L'immagine locale del luogo, se c'è. */
export function immagineDelLuogo(nome: string): string | null {
  return IMMAGINI_LUOGHI[normalizzaNome(nome)] ?? null;
}
