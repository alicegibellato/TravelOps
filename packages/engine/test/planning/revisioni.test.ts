/**
 * Revisione e conferma della bozza (REQ-PLAN-002): CA-1 (API del motore unica per pulsanti e chat), CA-2 (Annulla),
 * CA-3 (attività bloccate), CA-4 (conferma = versione 1), CA-5 (dopo la conferma solo proposte), CA-6 (almeno 10
 * revisioni consecutive non degradano il risultato). Istantanee: quella di prova (dato di test) e il Garda precaricato.
 */
import { describe, expect, it } from "vitest";
import {
  ALTERNATIVE_SOSTITUZIONE,
  alternativeSostituzione,
  applicaOperazioneBozza,
  applicaProposta,
  attivitaSuggerite,
  avviaBozza,
  CAUSA_BOZZA_INIZIALE,
  confermaBozza,
  confrontaRevisioni,
  OPERAZIONI_BOZZA,
  propostaDopoConferma,
  revisioneCorrente,
  ricostruisciStatoBozza,
  validaItinerario,
  versioneCorrente,
  type BozzaProfilo,
  type ContestoBozza,
  type Elemento,
  type IstantaneaCatalogo,
  type OperazioneBozza,
  type StatoBozza,
  type Viaggio,
} from "../../src/index.js";
import { istantaneaDiProva, istantaneaPrecaricata, leggiIstantanea, profiloDiRiferimento } from "./supporto.js";

type ElementoAttivita = Extract<Elemento, { tipo: "attivita" }>;

const contestoDi = (istantanea: IstantaneaCatalogo): ContestoBozza => ({ istantanea });

/** Le attività (pasti e servizi esclusi) di un giorno. */
function attivitaDi(istantanea: IstantaneaCatalogo, viaggio: Viaggio, data: string): ElementoAttivita[] {
  const giorno = viaggio.giorni.find((g) => g.data === data);
  return (giorno?.elementi ?? []).filter((e): e is ElementoAttivita => {
    if (e.tipo !== "attivita") return false;
    const categoria = istantanea.attivita.find((a) => a.id === e.attivitaId)?.categoria;
    return categoria !== "pasto" && categoria !== "servizio";
  });
}

/** Applica un'operazione che deve riuscire. */
function applica(stato: StatoBozza, contesto: ContestoBozza, operazione: OperazioneBozza): StatoBozza {
  const esito = applicaOperazioneBozza(stato, contesto, operazione);
  if (!esito.ok) throw new Error(`${operazione.tipo}: ${esito.motivo}`);
  return esito.stato;
}

const bloccanti = (stato: StatoBozza): number => revisioneCorrente(stato).problemi.filter((p) => p.gravita === "bloccante").length;

function preparazione() {
  const istantanea = istantaneaDiProva();
  const contesto = contestoDi(istantanea);
  const stato = avviaBozza(profiloDiRiferimento("PR-1"), contesto);
  const viaggio = revisioneCorrente(stato).viaggio;
  const giorno2 = viaggio.giorni[1]!.data;
  const giorno3 = viaggio.giorni[2]!.data;
  return { istantanea, contesto, stato, viaggio, giorno2, giorno3 };
}

describe("revisioni della bozza (§7.5)", () => {
  it("la bozza nasce con B1 «Bozza iniziale», senza revisione precedente e uguale al generatore", () => {
    const { stato } = preparazione();
    expect(stato.revisioni).toHaveLength(1);
    const b1 = revisioneCorrente(stato);
    expect([b1.numero, b1.causa, b1.precedente, stato.confermata]).toEqual([1, CAUSA_BOZZA_INIZIALE, null, null]);
    expect(b1.problemi.filter((p) => p.gravita === "bloccante")).toEqual([]);
  });

  it("ogni operazione aggiunge una revisione numerata con la causa in parole semplici, senza toccare lo stato ricevuto", () => {
    const { istantanea, contesto, stato, viaggio, giorno2 } = preparazione();
    const prima = structuredClone(stato);
    const [x] = attivitaDi(istantanea, viaggio, giorno2);
    const esito = applicaOperazioneBozza(stato, contesto, { tipo: "rimuovi", elementoId: x!.id });
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    expect(stato).toEqual(prima);
    expect(esito.stato.revisioni.map((r) => r.numero)).toEqual([1, 2]);
    expect(esito.revisione.causa).toMatch(/^Tolto ".+" dal \d{4}-\d{2}-\d{2}$/);
    expect(esito.revisione.causa).not.toMatch(/\b(D\d+-E\d+|N\d+)\b/);
    expect(esito.stato.revisioni[0]).toEqual(stato.revisioni[0]);
  });

  it("le operazioni non possibili non creano revisioni e spiegano perché", () => {
    const { contesto, stato } = preparazione();
    for (const operazione of [
      { tipo: "annulla" },
      { tipo: "rimuovi", elementoId: "NON-ESISTE" },
      { tipo: "rigenera_giorno", data: "2030-01-01" },
      { tipo: "torna_alla_revisione", numero: 9 },
    ] satisfies OperazioneBozza[]) {
      const esito = applicaOperazioneBozza(stato, contesto, operazione);
      expect(esito.ok).toBe(false);
      if (!esito.ok) expect(esito.motivo.length).toBeGreaterThan(10);
    }
  });

  it("Sostituisci propone le 3 migliori alternative per punteggio che entrano nella giornata, e una si può scegliere", () => {
    const { istantanea, contesto, stato, viaggio, giorno2 } = preparazione();
    const [x] = attivitaDi(istantanea, viaggio, giorno2);
    const alternative = alternativeSostituzione(stato, contesto, x!.id);
    expect(alternative).toHaveLength(ALTERNATIVE_SOSTITUZIONE);
    const usate = new Set(viaggio.giorni.flatMap((g) => g.elementi.flatMap((e) => (e.tipo === "attivita" ? [e.attivitaId] : []))));
    for (const a of alternative) expect(usate.has(a.attivitaId)).toBe(false);
    const punteggi = alternative.map((a) => a.punteggio);
    expect(punteggi).toEqual([...punteggi].sort((a, b) => b - a));
    const scelta = alternative[1]!;
    const dopo = applica(stato, contesto, { tipo: "sostituisci", elementoId: x!.id, attivitaId: scelta.attivitaId });
    const giorno = attivitaDi(istantanea, revisioneCorrente(dopo).viaggio, giorno2).map((e) => e.attivitaId);
    expect(giorno).toContain(scelta.attivitaId);
    expect(giorno).not.toContain(x!.attivitaId);
    expect(revisioneCorrente(dopo).causa).toContain(scelta.nome);
  });

  it("Aggiungi (dalle attività suggerite), Sposta e Scambia due giorni creano revisioni valide", () => {
    const { istantanea, contesto, stato, viaggio, giorno2, giorno3 } = preparazione();
    const [suggerita] = attivitaSuggerite(stato, contesto);
    let s = applica(stato, contesto, { tipo: "aggiungi", attivitaId: suggerita!.attivitaId, data: giorno3 });
    expect(attivitaDi(istantanea, revisioneCorrente(s).viaggio, giorno3).map((e) => e.attivitaId)).toContain(suggerita!.attivitaId);
    const [x] = attivitaDi(istantanea, viaggio, giorno2);
    s = applica(s, contesto, { tipo: "sposta", elementoId: x!.id, data: giorno2, inizio: "18:00" });
    const prima = { a: attivitaDi(istantanea, revisioneCorrente(s).viaggio, giorno2), b: attivitaDi(istantanea, revisioneCorrente(s).viaggio, giorno3) };
    s = applica(s, contesto, { tipo: "scambia_giorni", data: giorno2, conData: giorno3 });
    const dopo = revisioneCorrente(s).viaggio;
    expect(attivitaDi(istantanea, dopo, giorno3).map((e) => e.attivitaId).sort()).toEqual(prima.a.map((e) => e.attivitaId).sort());
    expect(attivitaDi(istantanea, dopo, giorno2).map((e) => e.attivitaId).sort()).toEqual(prima.b.map((e) => e.attivitaId).sort());
    for (const r of s.revisioni) expect(validaItinerario(r.viaggio, istantanea)).toEqual([]);
  });

  it("un problema bloccante non ferma l'operazione: è segnalato con un'azione suggerita, senza codici", () => {
    const { istantanea, contesto, stato, viaggio, giorno2 } = preparazione();
    // Spostata sopra un'altra attività dello stesso giorno: le due si sovrappongono.
    const [x, y] = attivitaDi(istantanea, viaggio, giorno2);
    const esito = applicaOperazioneBozza(stato, contesto, { tipo: "sposta", elementoId: x!.id, data: giorno2, inizio: y!.inizio });
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    const bloccantiDopo = esito.revisione.problemi.filter((p) => p.gravita === "bloccante");
    expect(bloccantiDopo.length).toBeGreaterThan(0);
    expect(esito.revisione.suggerimenti).toHaveLength(bloccantiDopo.length);
    for (const s of esito.revisione.suggerimenti) {
      expect(s.testo).toMatch(/^(Sposta|Rigenera)/);
      expect(s.testo).not.toMatch(/\b[A-Z]{3,}_[A-Z_]+\b|\bD\d+-E\d+\b/);
    }
  });

  it("Giornata più leggera toglie l'attività col punteggio più basso non bloccata; più piena aggiunge la migliore che entra", () => {
    const { istantanea, contesto, stato, giorno2 } = preparazione();
    const prima = attivitaDi(istantanea, revisioneCorrente(stato).viaggio, giorno2);
    const piena = applica(stato, contesto, { tipo: "giornata_piu_piena", data: giorno2 });
    expect(attivitaDi(istantanea, revisioneCorrente(piena).viaggio, giorno2)).toHaveLength(prima.length + 1);
    const tutteBloccate = prima.reduce((s, e) => applica(s, contesto, { tipo: "blocca", elementoId: e.id }), stato);
    const leggera = applica(tutteBloccate, contesto, { tipo: "giornata_piu_piena", data: giorno2 });
    const dopo = applica(leggera, contesto, { tipo: "giornata_piu_leggera", data: giorno2 });
    const rimaste = attivitaDi(istantanea, revisioneCorrente(dopo).viaggio, giorno2).map((e) => e.attivitaId);
    // Tolta l'unica non bloccata: le bloccate restano tutte.
    expect(rimaste.sort()).toEqual(prima.map((e) => e.attivitaId).sort());
    expect(applicaOperazioneBozza(dopo, contesto, { tipo: "giornata_piu_leggera", data: giorno2 }).ok).toBe(false);
  });

  it("Confronta usa il confronto delle versioni (REQ-ITIN-002) tra due revisioni qualsiasi", () => {
    const { istantanea, contesto, stato, viaggio, giorno2 } = preparazione();
    const [x] = attivitaDi(istantanea, viaggio, giorno2);
    const dopo = applica(stato, contesto, { tipo: "rimuovi", elementoId: x!.id });
    const differenza = confrontaRevisioni(dopo, 1, 2);
    expect(differenza?.rimossi.map((v) => v.elemento.id)).toContain(x!.id);
    expect(confrontaRevisioni(dopo, 1, 7)).toBeNull();
  });

  it("CA-1 le operazioni sono una sola API del motore, con dati semplici: le stesse per pulsanti e chat", () => {
    const { istantanea, contesto, stato, giorno2 } = preparazione();
    expect([...OPERAZIONI_BOZZA].sort()).toEqual(
      [
        "aggiungi",
        "alternativa",
        "annulla",
        "blocca",
        "cambia_preferenze",
        "giornata_piu_leggera",
        "giornata_piu_piena",
        "rigenera_giorno",
        "rimuovi",
        "scambia_giorni",
        "sblocca",
        "sostituisci",
        "sposta",
        "torna_alla_revisione",
      ].sort(),
    );
    // Un'operazione arrivata come JSON (per esempio da uno strumento della chat) dà lo stesso risultato del pulsante.
    const [x] = attivitaDi(istantanea, revisioneCorrente(stato).viaggio, giorno2);
    const daPulsante = applicaOperazioneBozza(stato, contesto, { tipo: "blocca", elementoId: x!.id });
    const daChat = applicaOperazioneBozza(stato, contesto, JSON.parse(JSON.stringify({ tipo: "blocca", elementoId: x!.id })) as OperazioneBozza);
    expect(daChat).toEqual(daPulsante);
    // Lo stato si salva e si ricostruisce (base dati): stesse revisioni.
    if (!daPulsante.ok) return;
    const salvate = daPulsante.stato.revisioni.map(({ numero, causa, viaggio, profilo, precedente }) => ({ numero, causa, viaggio, profilo, precedente }));
    expect(ricostruisciStatoBozza(contesto, JSON.parse(JSON.stringify(salvate)) as typeof salvate)).toEqual(daPulsante.stato);
  });
});

describe("CA-2 Annulla riporta esattamente alla revisione precedente", () => {
  it("dopo ogni tipo di operazione, Annulla crea una revisione identica (itinerario e profilo) a quella di prima", () => {
    const { istantanea, contesto, stato, viaggio, giorno2, giorno3 } = preparazione();
    const [x, y] = attivitaDi(istantanea, viaggio, giorno2);
    const [suggerita] = attivitaSuggerite(stato, contesto);
    const operazioni: OperazioneBozza[] = [
      { tipo: "sostituisci", elementoId: x!.id, attivitaId: alternativeSostituzione(stato, contesto, x!.id)[0]!.attivitaId },
      { tipo: "rimuovi", elementoId: y!.id },
      { tipo: "sposta", elementoId: x!.id, data: giorno3, inizio: "17:00" },
      { tipo: "aggiungi", attivitaId: suggerita!.attivitaId, data: giorno3 },
      { tipo: "blocca", elementoId: x!.id },
      { tipo: "giornata_piu_leggera", data: giorno2 },
      { tipo: "giornata_piu_piena", data: giorno3 },
      { tipo: "rigenera_giorno", data: giorno2 },
      { tipo: "scambia_giorni", data: giorno2, conData: giorno3 },
      { tipo: "cambia_preferenze", profilo: profiloDiRiferimento("PR-1", (b) => void (b.ritmo = "intenso")) },
      { tipo: "alternativa" },
    ];
    for (const operazione of operazioni) {
      const dopo = applica(stato, contesto, operazione);
      expect(revisioneCorrente(dopo).viaggio, operazione.tipo).not.toEqual(revisioneCorrente(stato).viaggio);
      const annullata = applica(dopo, contesto, { tipo: "annulla" });
      const b3 = revisioneCorrente(annullata);
      expect(b3.numero).toBe(3);
      expect(b3.causa).toMatch(/^Annullata la modifica ".+": tornato alla revisione B1$/);
      expect(b3.viaggio, operazione.tipo).toEqual(stato.revisioni[0]!.viaggio);
      expect(b3.profilo).toEqual(stato.revisioni[0]!.profilo);
      expect(b3.problemi).toEqual(stato.revisioni[0]!.problemi);
      // Le revisioni restano consultabili: B2 è ancora quella annullata.
      expect(annullata.revisioni[1]).toEqual(dopo.revisioni[1]);
    }
  });

  it("annullare più volte risale la catena delle modifiche; «torna alla revisione Bn» porta a una revisione qualsiasi", () => {
    const { istantanea, contesto, stato, viaggio, giorno2, giorno3 } = preparazione();
    const [x] = attivitaDi(istantanea, viaggio, giorno2);
    const b2 = applica(stato, contesto, { tipo: "blocca", elementoId: x!.id });
    const b3 = applica(b2, contesto, { tipo: "rigenera_giorno", data: giorno3 });
    const b4 = applica(b3, contesto, { tipo: "annulla" });
    expect(revisioneCorrente(b4).viaggio).toEqual(b2.revisioni[1]!.viaggio);
    const b5 = applica(b4, contesto, { tipo: "annulla" });
    expect(revisioneCorrente(b5).viaggio).toEqual(stato.revisioni[0]!.viaggio);
    expect(applicaOperazioneBozza(b5, contesto, { tipo: "annulla" }).ok).toBe(false);
    const b6 = applica(b5, contesto, { tipo: "torna_alla_revisione", numero: 3 });
    expect(revisioneCorrente(b6).viaggio).toEqual(b3.revisioni[2]!.viaggio);
    const b7 = applica(b6, contesto, { tipo: "annulla" });
    expect(revisioneCorrente(b7).viaggio).toEqual(b5.revisioni[4]!.viaggio);
  });
});

describe("CA-3 le attività bloccate sopravvivono a «Rigenera questo giorno» e a «Cambia preferenze»", () => {
  for (const [nome, leggi] of [
    ["istantanea di prova", istantaneaDiProva],
    ["Garda precaricato", () => leggiIstantanea(istantaneaPrecaricata("garda-2026-10-09"))],
  ] as const) {
    it(`${nome}: restano nel loro giorno, bloccate, anche rigenerando più volte`, () => {
      const istantanea = leggi();
      const contesto = contestoDi(istantanea);
      let stato = avviaBozza(profiloDiRiferimento("PR-1"), contesto);
      const viaggio = revisioneCorrente(stato).viaggio;
      const bloccate = viaggio.giorni.slice(1, 3).map((g) => ({ data: g.data, elemento: attivitaDi(istantanea, viaggio, g.data)[0]! }));
      for (const b of bloccate) stato = applica(stato, contesto, { tipo: "blocca", elementoId: b.elemento.id });

      const presenti = (s: StatoBozza): void => {
        const r = revisioneCorrente(s);
        for (const b of bloccate) {
          const trovata = attivitaDi(istantanea, r.viaggio, b.data).find((e) => e.attivitaId === b.elemento.attivitaId);
          expect(trovata, `${r.causa}: ${b.elemento.attivitaId}`).toBeDefined();
          expect(trovata?.priorita).toBe("irrinunciabile");
          expect(r.bloccate).toContain(trovata?.id);
        }
      };
      for (const b of bloccate) {
        const altre = attivitaDi(istantanea, revisioneCorrente(stato).viaggio, b.data).filter((e) => e.priorita !== "irrinunciabile");
        stato = applica(stato, contesto, { tipo: "rigenera_giorno", data: b.data });
        presenti(stato);
        const dopo = attivitaDi(istantanea, revisioneCorrente(stato).viaggio, b.data).map((e) => e.attivitaId);
        // La giornata cambia davvero intorno alle bloccate.
        if (altre.length > 0) expect(altre.every((e) => dopo.includes(e.attivitaId))).toBe(false);
      }
      for (const modifica of [
        (b: BozzaProfilo) => void (b.ritmo = "intenso"),
        (b: BozzaProfilo) => void (b.stili = ["gastronomia"]),
        (b: BozzaProfilo) => void (b.ritmo = "lento"),
      ]) {
        stato = applica(stato, contesto, { tipo: "cambia_preferenze", profilo: profiloDiRiferimento("PR-1", modifica) });
        presenti(stato);
      }
      stato = applica(stato, contesto, { tipo: "alternativa" });
      presenti(stato);
      // Sbloccata, un'attività torna a poter essere tolta dalle rigenerazioni.
      const prima = bloccate[0]!;
      const elemento = attivitaDi(istantanea, revisioneCorrente(stato).viaggio, prima.data).find((e) => e.attivitaId === prima.elemento.attivitaId)!;
      stato = applica(stato, contesto, { tipo: "sblocca", elementoId: elemento.id });
      expect(revisioneCorrente(stato).bloccate).not.toContain(elemento.id);
    });
  }
});

describe("CA-4 dopo la conferma la versione 1 coincide con l'ultima revisione della bozza", () => {
  it("conferma dopo alcune revisioni: versione 1 = ultima revisione; le revisioni restano consultabili", () => {
    const { istantanea, contesto, stato, viaggio, giorno2 } = preparazione();
    const [x] = attivitaDi(istantanea, viaggio, giorno2);
    let s = applica(stato, contesto, { tipo: "blocca", elementoId: x!.id });
    s = applica(s, contesto, { tipo: "giornata_piu_piena", data: giorno2 });
    const esito = confermaBozza(s);
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    expect(esito.storico.versioni).toHaveLength(1);
    expect(versioneCorrente(esito.storico).numero).toBe(1);
    expect(versioneCorrente(esito.storico).viaggio).toEqual(revisioneCorrente(s).viaggio);
    expect(esito.stato.confermata).toBe(3);
    expect(esito.stato.revisioni).toEqual(s.revisioni);
    expect(confermaBozza(esito.stato).ok).toBe(false);
  });
});

describe("CA-5 dopo la conferma le modifiche diventano proposte (REQ-EDIT-002), non modifiche dirette", () => {
  it("la bozza confermata non cambia più; la stessa operazione diventa una proposta da accettare", () => {
    const { istantanea, contesto, stato, viaggio, giorno2, giorno3 } = preparazione();
    const confermata = confermaBozza(stato);
    if (!confermata.ok) throw new Error(confermata.motivo);
    const [x] = attivitaDi(istantanea, viaggio, giorno2);
    const diretta = applicaOperazioneBozza(confermata.stato, contesto, { tipo: "rimuovi", elementoId: x!.id });
    expect(diretta.ok).toBe(false);
    if (!diretta.ok) expect(diretta.motivo).toMatch(/proposta/);

    for (const operazione of [
      { tipo: "rimuovi", elementoId: x!.id },
      { tipo: "sposta", elementoId: x!.id, data: giorno3, inizio: "17:00" },
      { tipo: "blocca", elementoId: x!.id },
      { tipo: "giornata_piu_leggera", data: giorno2 },
      { tipo: "giornata_piu_piena", data: giorno3 },
      { tipo: "rigenera_giorno", data: giorno2 },
    ] satisfies OperazioneBozza[]) {
      const esito = propostaDopoConferma(confermata.storico, contesto, operazione);
      expect(esito.ok, operazione.tipo).toBe(true);
      if (!esito.ok) continue;
      expect(esito.proposta.versioneBase).toBe(1);
      // La proposta non cambia lo storico: lo fa solo l'accettazione, che crea la versione 2.
      expect(confermata.storico.versioni).toHaveLength(1);
      const accettata = applicaProposta(confermata.storico, esito.proposta, "Viaggiatore", { data: "2026-06-01", ora: "10:00" });
      expect(accettata.esito, operazione.tipo).toBe("versione_creata");
      if (accettata.esito === "versione_creata") expect(versioneCorrente(accettata.storico).numero).toBe(2);
    }
    for (const tipo of ["alternativa", "annulla"] as const) {
      expect(propostaDopoConferma(confermata.storico, contesto, { tipo }).ok).toBe(false);
    }
  });
});

describe("CA-6 almeno 10 revisioni consecutive non degradano il risultato", () => {
  for (const [nome, leggi] of [
    ["istantanea di prova", istantaneaDiProva],
    ["Garda precaricato", () => leggiIstantanea(istantaneaPrecaricata("garda-2026-10-09"))],
  ] as const) {
    it(`${nome}: 14 operazioni di fila, ogni revisione valida e fattibile, le bloccate restano, Annulla torna a B1`, () => {
      const istantanea = leggi();
      const contesto = contestoDi(istantanea);
      const iniziale = avviaBozza(profiloDiRiferimento("PR-1"), contesto);
      const b1 = revisioneCorrente(iniziale);
      const giorni = b1.viaggio.giorni.map((g) => g.data);
      const [g1, g2, g3, g4] = [giorni[0]!, giorni[1]!, giorni[2]!, giorni.at(-1)!];
      let stato = iniziale;
      const corrente = () => revisioneCorrente(stato).viaggio;
      const passi: ((s: StatoBozza) => OperazioneBozza | null)[] = [
        () => ({ tipo: "blocca", elementoId: attivitaDi(istantanea, corrente(), g2)[0]!.id }),
        () => ({ tipo: "rigenera_giorno", data: g2 }),
        () => ({ tipo: "giornata_piu_piena", data: g3 }),
        () => ({ tipo: "giornata_piu_leggera", data: g3 }),
        (s) => {
          const x = attivitaDi(istantanea, corrente(), g3)[0];
          const alternativa = x ? alternativeSostituzione(s, contesto, x.id)[0] : undefined;
          return x && alternativa ? { tipo: "sostituisci", elementoId: x.id, attivitaId: alternativa.attivitaId } : null;
        },
        () => ({ tipo: "scambia_giorni", data: g2, conData: g3 }),
        () => ({ tipo: "rigenera_giorno", data: g4 }),
        () => ({ tipo: "blocca", elementoId: attivitaDi(istantanea, corrente(), g1)[0]!.id }),
        () => ({ tipo: "alternativa" }),
        () => ({ tipo: "cambia_preferenze", profilo: profiloDiRiferimento("PR-1", (b) => void (b.ritmo = "intenso")) }),
        () => ({ tipo: "rigenera_giorno", data: g3 }),
        () => ({ tipo: "giornata_piu_leggera", data: g2 }),
        () => ({ tipo: "cambia_preferenze", profilo: profiloDiRiferimento("PR-1") }),
        () => ({ tipo: "rigenera_giorno", data: g1 }),
      ];
      const bloccateAttese: { data: string; attivitaId: string }[] = [];
      for (const passo of passi) {
        const operazione = passo(stato);
        if (operazione === null) continue;
        if (operazione.tipo === "blocca") {
          const e = corrente().giorni.flatMap((g) => g.elementi.map((x) => ({ data: g.data, x }))).find((v) => v.x.id === operazione.elementoId)!;
          if (e.x.tipo === "attivita") bloccateAttese.push({ data: e.data, attivitaId: e.x.attivitaId });
        }
        if (operazione.tipo === "scambia_giorni") {
          for (const b of bloccateAttese) b.data = b.data === g2 ? g3 : b.data === g3 ? g2 : b.data;
        }
        stato = applica(stato, contesto, operazione);
        const r = revisioneCorrente(stato);
        // Ogni revisione: itinerario valido (REQ-ITIN-001), nessun problema bloccante, id unici, nessun giorno vuoto.
        expect(validaItinerario(r.viaggio, istantanea), r.causa).toEqual([]);
        expect(bloccanti(stato), r.causa).toBe(0);
        const ids = r.viaggio.giorni.flatMap((g) => g.elementi.map((e) => e.id));
        expect(new Set(ids).size).toBe(ids.length);
        for (const g of r.viaggio.giorni) expect(attivitaDi(istantanea, r.viaggio, g.data).length, `${r.causa} ${g.data}`).toBeGreaterThan(0);
        for (const b of bloccateAttese) {
          expect(attivitaDi(istantanea, r.viaggio, b.data).some((e) => e.attivitaId === b.attivitaId && e.priorita === "irrinunciabile"), `${r.causa}: ${b.attivitaId}`).toBe(true);
        }
      }
      expect(stato.revisioni.length).toBeGreaterThanOrEqual(11);
      // Il risultato non si è impoverito: tante attività quante nella bozza iniziale (al netto del ritmo tornato bilanciato).
      const conta = (v: Viaggio) => v.giorni.reduce((n, g) => n + attivitaDi(istantanea, v, g.data).length, 0);
      expect(conta(corrente())).toBeGreaterThanOrEqual(conta(b1.viaggio) - 1);
      // Annullando tutto si torna esattamente alla bozza iniziale.
      let annullato = stato;
      while (revisioneCorrente(annullato).precedente !== null) annullato = applica(annullato, contesto, { tipo: "annulla" });
      expect(revisioneCorrente(annullato).viaggio).toEqual(b1.viaggio);
    });
  }
});
