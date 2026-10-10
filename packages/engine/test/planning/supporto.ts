/**
 * Supporto ai test del generatore della bozza (ST-PLAN-001, REQ-PLAN-001).
 *
 * `dati/istantanea-prova-planning.json` è un DATO DI TEST: il "Borgo di Prova" di `@travelops/sources`
 * (`packages/sources/test/dati/prova-dato-di-test.json`) ampliato con 4 luoghi e 8 attività, così che anche il
 * ritmo intenso di PR-2 abbia abbastanza attività. Rispetta i minimi della §8.1 (verificato in
 * `istantanea-prova.test.ts`), ma non è una delle 3 destinazioni precaricate e non sta in `packages/sources/snapshots/`.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  validaProfilo,
  type AttivitaCatalogoEstesa,
  type BozzaProfilo,
  type Elemento,
  type IstantaneaCatalogo,
  type LuogoEsteso,
  type ProfiloPreferenze,
  type TempoPercorrenza,
  type Viaggio,
} from "../../src/index.js";
import { profiliDiRiferimento } from "../preferences/supporto.js";

export const FILE_ISTANTANEA_DI_PROVA = fileURLToPath(new URL("./dati/istantanea-prova-planning.json", import.meta.url));

/** Cartella delle istantanee precaricate del repository (le riempie ST-CAT-002). */
export const CARTELLA_ISTANTANEE_PRECARICATE = fileURLToPath(new URL("../../../sources/snapshots/", import.meta.url));

/** Legge un'istantanea dal file: una copia nuova a ogni chiamata. */
export const leggiIstantanea = (file: string): IstantaneaCatalogo =>
  JSON.parse(readFileSync(file, "utf8")) as IstantaneaCatalogo;

export const istantaneaDiProva = (): IstantaneaCatalogo => leggiIstantanea(FILE_ISTANTANEA_DI_PROVA);

/** Valida una bozza di profilo che deve essere valida. */
export function profilo(bozza: BozzaProfilo): ProfiloPreferenze {
  const esito = validaProfilo(bozza);
  if (!esito.ok) throw new Error(esito.problemi.map((p) => p.testo).join(" "));
  return esito.profilo;
}

export type IdProfilo = "PR-1" | "PR-2" | "PR-3" | "PR-4" | "PR-5";

/** Il profilo di riferimento della §8.2, validato; con `modifica` si cambia la bozza prima della validazione. */
export function profiloDiRiferimento(id: IdProfilo, modifica?: (bozza: BozzaProfilo) => void): ProfiloPreferenze {
  const voce = profiliDiRiferimento().find((p) => p.id === id);
  if (!voce) throw new Error(`profilo ${id} assente`);
  modifica?.(voce.profilo);
  return profilo(voce.profilo);
}

// --- Casi per CA-1 e CA-6 --------------------------------------------------------------------------

/** Un profilo di riferimento da provare su un'istantanea. */
export interface CasoIstantanea {
  profilo: IdProfilo;
  /** Percorso assoluto del file dell'istantanea. */
  file: string;
  /** `true` per l'istantanea di prova: CA-1 e CA-6 vanno poi completati sulle istantanee vere. */
  datoDiTest: boolean;
}

/** Il file di un'istantanea precaricata, per `id` (`packages/sources/snapshots/<id>.json`). */
export const istantaneaPrecaricata = (id: string): string => `${CARTELLA_ISTANTANEE_PRECARICATE}${id}.json`;

/**
 * Casi di CA-1 (nessun problema bloccante) e CA-6 (bozza di PR-1 salvata come riferimento).
 *
 * Oggi solo l'istantanea di prova. Quando ST-CAT-002 avrà salvato le 3 istantanee in `packages/sources/snapshots/`,
 * basta aggiungere qui una riga per profilo, con l'`id` del file:
 *
 *   { profilo: "PR-1", file: istantaneaPrecaricata("<id dell'istantanea del Garda>"), datoDiTest: false },
 *   { profilo: "PR-2", file: istantaneaPrecaricata("<id dell'istantanea delle Dolomiti>"), datoDiTest: false },
 *   { profilo: "PR-3", file: istantaneaPrecaricata("<id dell'istantanea di Roma>"), datoDiTest: false },
 *   { profilo: "PR-4", file: istantaneaPrecaricata("<id della prima destinazione proposta da «sorprendimi»>"), datoDiTest: false },
 *
 * Al primo `npx vitest run -u` (in `packages/engine`) nasce il file di riferimento della bozza di PR-1 sul Garda in
 * `test/planning/riferimento/`, da rileggere e mettere nella pull request.
 */
export const CASI_ISTANTANEE: readonly CasoIstantanea[] = [
  { profilo: "PR-1", file: FILE_ISTANTANEA_DI_PROVA, datoDiTest: true },
  { profilo: "PR-2", file: FILE_ISTANTANEA_DI_PROVA, datoDiTest: true },
  { profilo: "PR-3", file: FILE_ISTANTANEA_DI_PROVA, datoDiTest: true },
  { profilo: "PR-4", file: FILE_ISTANTANEA_DI_PROVA, datoDiTest: true },
  // Istantanee precaricate di ST-CAT-002 (PR #21). PR-4 ("sorprendimi") resta sull'istantanea di prova finché
  // ST-CAT-002C non pubblica l'elenco dei candidati e la prima destinazione proposta.
  { profilo: "PR-1", file: istantaneaPrecaricata("garda-2026-10-09"), datoDiTest: false },
  { profilo: "PR-2", file: istantaneaPrecaricata("dolomiti-val-di-fassa-2026-10-09"), datoDiTest: false },
  { profilo: "PR-3", file: istantaneaPrecaricata("roma-2026-10-09"), datoDiTest: false },
];

export const esisteFile = (file: string): boolean => existsSync(file);

// --- Lettura della bozza -----------------------------------------------------------------------------

export const attivitaDelViaggio = (viaggio: Viaggio): Extract<Elemento, { tipo: "attivita" }>[] =>
  viaggio.giorni.flatMap((g) => g.elementi.filter((e): e is Extract<Elemento, { tipo: "attivita" }> => e.tipo === "attivita"));

/** Le attività non pasto (né servizio) di un giorno, con i dati del catalogo. */
export function attivitaDelGiorno(
  istantanea: IstantaneaCatalogo,
  elementi: readonly Elemento[],
): { elemento: Extract<Elemento, { tipo: "attivita" }>; attivita: AttivitaCatalogoEstesa }[] {
  const perId = new Map(istantanea.attivita.map((a) => [a.id, a]));
  return elementi.flatMap((e) => {
    if (e.tipo !== "attivita") return [];
    const attivita = perId.get(e.attivitaId);
    if (!attivita || attivita.categoria === "pasto" || attivita.categoria === "servizio") return [];
    return [{ elemento: e, attivita }];
  });
}

export const minuti = (orario: string): number => Number(orario.slice(0, 2)) * 60 + Number(orario.slice(3, 5));

// --- Istantanee sintetiche -------------------------------------------------------------------------

const SETTIMANA = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"] as const;

function luogo(id: string, tipo: LuogoEsteso["tipo"], extra: Partial<LuogoEsteso> = {}): LuogoEsteso {
  return { id, nome: `Luogo ${id} (dato di test)`, zonaId: "Z", tipo, apertura: { sempre: true }, ...extra };
}

const ristorante = (id: string, opzioni: LuogoEsteso["opzioniAlimentari"] = ["vegetariano"]): LuogoEsteso =>
  luogo(id, "ristorante", {
    costoIndicativo: "€€",
    opzioniAlimentari: opzioni ?? [],
    apertura: {
      settimana: Object.fromEntries(
        SETTIMANA.map((g) => [g, [{ apertura: "12:00", chiusura: "15:00" }, { apertura: "19:00", chiusura: "23:00" }]]),
      ) as Record<(typeof SETTIMANA)[number], { apertura: string; chiusura: string }[]>,
    },
  });

function attivita(id: string, luogoId: string, extra: Partial<AttivitaCatalogoEstesa> = {}): AttivitaCatalogoEstesa {
  return {
    id,
    nome: `Attività ${id} (dato di test)`,
    luogoId,
    categoria: "natura",
    allAperto: false,
    durataTipica: 60,
    stili: ["natura"],
    intensita: "facile",
    costo: "gratis",
    adattaAiBambini: true,
    accessibile: true,
    ...extra,
  };
}

/**
 * Istantanea sintetica (DATO DI TEST) con `n` luoghi di attività su una griglia, 6 ristoranti, 2 alloggi e una
 * stazione, con i tempi a piedi tra tutte le coppie. Serve a CA-7 (14 giorni a ritmo intenso).
 */
export function istantaneaGrande(n = 70): IstantaneaCatalogo {
  const stili = ["relax", "cultura", "natura", "avventura", "gastronomia", "romantico", "famiglia"] as const;
  const intensita = ["facile", "moderata", "impegnativa"] as const;
  const luoghi: LuogoEsteso[] = [
    luogo("H-ECONOMICO", "alloggio", { costoIndicativo: "€" }),
    luogo("H-MEDIO", "alloggio", { costoIndicativo: "€€" }),
    luogo("STAZIONE", "stazione"),
    ...Array.from({ length: 6 }, (_, i) => ristorante(`R${i + 1}`, i % 2 === 0 ? ["vegetariano", "senza_glutine"] : ["vegetariano"])),
  ];
  const elenco: AttivitaCatalogoEstesa[] = luoghi
    .filter((l) => l.tipo === "ristorante")
    .map((l) => attivita(`PASTO-${l.id}`, l.id, { categoria: "pasto", durataTipica: 75, stili: ["gastronomia"], costo: "€€" }));
  for (let i = 1; i <= n; i++) {
    const id = `P${String(i).padStart(2, "0")}`;
    luoghi.push(luogo(id, "altro"));
    elenco.push(
      attivita(`A-${id}`, id, {
        stili: [stili[i % stili.length] ?? "natura", stili[(i * 3) % stili.length] ?? "cultura"].filter((s, k, a) => a.indexOf(s) === k),
        intensita: intensita[i % 3] ?? "facile",
        durataTipica: 60 + (i % 4) * 15,
      }),
    );
  }
  const posizione = (indice: number): [number, number] => [indice % 9, Math.floor(indice / 9)];
  const tempi: TempoPercorrenza[] = [];
  luoghi.forEach((a, i) =>
    luoghi.slice(i + 1).forEach((b, k) => {
      const [x1, y1] = posizione(i);
      const [x2, y2] = posizione(i + 1 + k);
      tempi.push({ da: a.id, a: b.id, mezzo: "piedi", minuti: 3 + 4 * (Math.abs(x1 - x2) + Math.abs(y1 - y2)) });
    }),
  );
  return {
    id: "prova-grande-dato-di-test",
    destinazione: "Città sintetica (DATO DI TEST)",
    dataCreazione: "2026-10-09",
    fonti: [{ nome: "Dati sintetici dei test", attribuzione: "Dati di test di TravelOps" }],
    zone: [{ id: "Z", nome: "Zona di test" }],
    luoghi,
    attivita: elenco,
    tempiPercorrenza: tempi,
  };
}

/**
 * Istantanea minima (DATO DI TEST) con l'alloggio e tre luoghi su una linea (L3 a −15 minuti a piedi, H a 0, L1 a 10,
 * L2 a 25), senza ristoranti né stazione: serve a R-5 (ordine che minimizza gli spostamenti).
 */
export function istantaneaInFila(): IstantaneaCatalogo {
  const posizioni: Record<string, number> = { L3: -15, H: 0, L1: 10, L2: 25 };
  const ids = Object.keys(posizioni);
  const tempi: TempoPercorrenza[] = [];
  ids.forEach((a, i) =>
    ids.slice(i + 1).forEach((b) => tempi.push({ da: a, a: b, mezzo: "piedi", minuti: Math.abs((posizioni[a] ?? 0) - (posizioni[b] ?? 0)) })),
  );
  return {
    id: "prova-in-fila-dato-di-test",
    destinazione: "Fila di prova (DATO DI TEST)",
    dataCreazione: "2026-10-09",
    fonti: [{ nome: "Dati sintetici dei test", attribuzione: "Dati di test di TravelOps" }],
    zone: [{ id: "Z", nome: "Zona di test" }],
    luoghi: [luogo("H", "alloggio", { costoIndicativo: "€€" }), luogo("L1", "altro"), luogo("L2", "altro"), luogo("L3", "altro")],
    // Gli id non seguono la fila, così l'ordine non viene dall'ordine alfabetico.
    attivita: [attivita("A-C", "L1"), attivita("A-A", "L2"), attivita("A-B", "L3")],
    tempiPercorrenza: tempi,
  };
}
