/** Lettura semplice dei CSS della web app per i test di REQ-UX-001: dichiarazioni, regole @media, token. */

export interface Dichiarazione {
  proprieta: string;
  valore: string;
}

export function senzaCommentiCss(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Tutte le dichiarazioni `proprietà: valore;` di un file CSS (anche le variabili). */
export function dichiarazioni(css: string): Dichiarazione[] {
  return [...senzaCommentiCss(css).matchAll(/(?:^|[{;\s])(--[\w-]+|[a-z-]+)\s*:\s*([^;{}]+?)\s*(?:;|(?=\}))/g)].map((t) => ({
    proprieta: t[1] ?? "",
    valore: (t[2] ?? "").replace(/\s+/g, " ").trim(),
  }));
}

/** Il contenuto di un blocco `{ … }` che inizia alla posizione indicata (la graffa aperta), graffe annidate comprese. */
export function bloccoDa(css: string, inizio: number): string {
  let profondita = 0;
  for (let i = inizio; i < css.length; i += 1) {
    if (css[i] === "{") profondita += 1;
    if (css[i] === "}") {
      profondita -= 1;
      if (profondita === 0) return css.slice(inizio + 1, i);
    }
  }
  throw new Error("blocco CSS non chiuso");
}

/** I blocchi delle regole che iniziano con questo prelude (per esempio `@media (prefers-reduced-motion: reduce)`). */
export function blocchi(css: string, prelude: string): string[] {
  const pulito = senzaCommentiCss(css);
  const trovati: string[] = [];
  let da = 0;
  for (;;) {
    const posizione = pulito.indexOf(prelude, da);
    if (posizione < 0) return trovati;
    const graffa = pulito.indexOf("{", posizione);
    trovati.push(bloccoDa(pulito, graffa));
    da = graffa + 1;
  }
}

/** I colori con nome di CSS (CSS Color 4): scritti in un componente sarebbero colori fuori dai token. */
export const COLORI_CON_NOME = `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood
cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey
darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey
darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite
gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon
lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue
lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid
mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin
navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff
peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver
skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow
yellowgreen`.split(/\s+/);

/** Un valore di colore scritto direttamente: esadecimale, funzione di colore o colore con nome. */
export function coloreLetterale(valore: string): string | null {
  const esadecimale = /#[0-9a-fA-F]{3,8}\b/.exec(valore);
  if (esadecimale !== null) return esadecimale[0];
  const funzione = /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(/i.exec(valore);
  if (funzione !== null) return funzione[0];
  // I nomi dentro var(--…) sono nomi di variabili, non colori.
  const senzaVariabili = valore.replace(/var\(--[\w-]+/g, "var(");
  for (const parola of senzaVariabili.toLowerCase().match(/[a-z]+/g) ?? []) {
    if (COLORI_CON_NOME.includes(parola)) return parola;
  }
  return null;
}

/** I token di un tema: i valori di `light-dark(chiaro, scuro)` risolti anche attraverso `var(--…)`. */
export function tokenDelTema(tokenCss: string, tema: "chiaro" | "scuro"): Map<string, string> {
  const radice = blocchi(tokenCss, ":root,\n[data-tema]")[0];
  if (radice === undefined) throw new Error("blocco dei token non trovato");
  const grezzi = new Map(
    dichiarazioni(radice)
      .filter((d) => d.proprieta.startsWith("--"))
      .map((d) => [d.proprieta, d.valore] as const),
  );
  const risolvi = (nome: string, visti: string[] = []): string => {
    if (visti.includes(nome)) throw new Error(`token circolare: ${[...visti, nome].join(" → ")}`);
    const valore = grezzi.get(nome);
    if (valore === undefined) throw new Error(`token inesistente: ${nome}`);
    const coppia = /^light-dark\((.+),\s*(.+)\)$/.exec(valore);
    const scelto = coppia === null ? valore : (tema === "chiaro" ? coppia[1] : coppia[2]) ?? "";
    const riferimento = /^var\((--[\w-]+)\)$/.exec(scelto.trim());
    return riferimento === null ? scelto.trim() : risolvi(riferimento[1] ?? "", [...visti, nome]);
  };
  return new Map([...grezzi.keys()].map((nome) => [nome, risolvi(nome)]));
}
