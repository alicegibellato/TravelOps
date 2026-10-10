/**
 * Supporto ai test degli strumenti del motore (ST-ORCH-001B): la sorgente registrata con le 3 istantanee precaricate
 * di `packages/sources/snapshots/` e le ricerche registrate, l'archivio in memoria e un modo breve di chiamare uno
 * strumento come fa il ciclo. Nessuna rete: la sorgente registrata legge solo file del repository.
 */
import { fileURLToPath } from "node:url";
import { creaSorgenteRegistrata, leggiCartellaIstantanee, leggiFileRegistrazioni, type IstantaneaDestinazione, type SorgenteDestinazioni } from "@travelops/sources";
import { cartellaIstantaneeDelPacchetto } from "@travelops/sources/pacchetto";
import { creaArchivioInMemoria, creaStrumentiMotore, type ArchivioInMemoria, type ArchivioViaggio, type Strumento } from "../../src/index.js";

const FILE_REGISTRAZIONI = fileURLToPath(new URL("../../../sources/registrazioni/precaricate.json", import.meta.url));

let istantanee: readonly IstantaneaDestinazione[] | undefined;

/** Le istantanee precaricate del repository, lette e validate una volta sola. */
export function istantaneePrecaricate(): readonly IstantaneaDestinazione[] {
  istantanee ??= leggiCartellaIstantanee(cartellaIstantaneeDelPacchetto()).map((v) => v.istantanea);
  return istantanee;
}

export function istantanea(id: string): IstantaneaDestinazione {
  const trovata = istantaneePrecaricate().find((i) => i.id === id);
  if (trovata === undefined) throw new Error(`istantanea ${id} assente`);
  return trovata;
}

/** La sorgente registrata (senza rete) con le istantanee precaricate e le ricerche registrate. */
export function sorgenteRegistrata(): SorgenteDestinazioni {
  return creaSorgenteRegistrata({ istantanee: istantaneePrecaricate(), ricerche: leggiFileRegistrazioni(FILE_REGISTRAZIONI).ricerche });
}

export const GARDA = "garda-2026-10-09";
export const AREA_GARDA = "osm:relation/46276";

/** Profilo del viaggio di prova sul Garda: 3 giorni, natura e gastronomia. */
export const ARGOMENTI_PROFILO_GARDA = {
  destinazione: { tipo: "luogo", nome: "Lago di Garda" },
  date: { tipo: "precise", inizio: "2026-10-20", fine: "2026-10-22", mese: null },
  durata: null,
  adulti: 2,
  bambini: [],
  tipoGruppo: null,
  stili: ["natura", "gastronomia"],
  ritmo: "bilanciato",
  formaFisica: null,
  budget: null,
  orari: null,
  pranzo: null,
  cena: null,
  mezzi: null,
  irrinunciabiliAttivita: null,
  irrinunciabiliStili: null,
  daEvitareAttivita: null,
  daEvitareCategorie: null,
  daEvitareStili: null,
  esigenze: null,
} as const;

export interface Banco {
  archivio: ArchivioInMemoria;
  strumenti: readonly Strumento[];
  /** Esegue lo strumento come il ciclo: argomenti già analizzati, contesto con la chiamata. */
  esegui(nome: string, argomenti: unknown): Promise<any>;
}

/** Strumenti, archivio in memoria e sorgente registrata, pronti per un test. */
export function banco(opzioni: { archivio?: ArchivioInMemoria; sorgente?: SorgenteDestinazioni } = {}): Banco {
  const archivio = opzioni.archivio ?? creaArchivioInMemoria();
  const strumenti = creaStrumentiMotore({ archivio: archivio as ArchivioViaggio, sorgente: opzioni.sorgente ?? sorgenteRegistrata() });
  return {
    archivio,
    strumenti,
    async esegui(nome, argomenti) {
      const strumento = strumenti.find((s) => s.definizione.nome === nome);
      if (strumento === undefined) throw new Error(`strumento ${nome} assente`);
      return strumento.esegui(argomenti, { chiamata: { id: "call_test", nome, argomenti: JSON.stringify(argomenti) } });
    },
  };
}

/** Un banco con il viaggio sul Garda già portato fino alla bozza (profilo, destinazione, bozza B1). */
export async function bancoConBozza(): Promise<Banco> {
  const b = banco();
  await b.esegui("aggiorna_profilo", ARGOMENTI_PROFILO_GARDA);
  await b.esegui("prepara_destinazione", { areaId: AREA_GARDA, testo: "Riva del Garda" });
  await b.esegui("genera_bozza", {});
  return b;
}

/** Un banco con il viaggio sul Garda confermato (versione 1). */
export async function bancoConfermato(): Promise<Banco> {
  const b = await bancoConBozza();
  await b.esegui("conferma_viaggio", {});
  return b;
}
