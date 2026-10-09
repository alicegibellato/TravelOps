/** Ciclo degli strumenti con il client finto e gli strumenti di prova. */
import { describe, expect, it } from "vitest";
import {
  caricaConversazioneRegistrata,
  creaClienteFinto,
  ErroreAiNonDisponibile,
  eseguiCiclo,
  eseguiCicloCompleto,
  type EventoCiclo,
  type Messaggio,
  type TurnoRegistrato,
} from "../src/index.js";
import { strumentiDiProva } from "./supporto.js";

const FILE = new URL("./dati/conversazione-di-prova.json", import.meta.url);
const ISTRUZIONI = "Sei l'assistente di viaggio di prova.";
const DOMANDA: Messaggio = { ruolo: "utente", testo: "Che tempo fa a Lisbona? E quanto fa 2 più 3?" };

const turno = (risposta: TurnoRegistrato["risposta"], atteso: TurnoRegistrato["atteso"] = {}): TurnoRegistrato => ({ atteso, risposta });
const chiama = (id: string, nome: string, argomenti: string) => ({ chiamate: [{ id, nome, argomenti }] });

describe("ciclo degli strumenti", () => {
  it("modello → strumento → risultato al modello → risposta finale, con gli eventi in streaming", async () => {
    const registro = { chiamate: [] as { nome: string; argomenti: unknown }[] };
    const cliente = creaClienteFinto(caricaConversazioneRegistrata(FILE));
    const eventi: EventoCiclo[] = [];
    for await (const e of eseguiCiclo({ cliente, istruzioni: ISTRUZIONI, messaggi: [DOMANDA], strumenti: strumentiDiProva(registro) })) eventi.push(e);

    expect(eventi.map((e) => e.tipo)).toEqual([
      "testo",
      "chiamata_strumento",
      "risultato_strumento",
      "chiamata_strumento",
      "risultato_strumento",
      "testo",
      "testo",
      "testo",
      "fine",
    ]);
    expect(registro.chiamate).toEqual([
      { nome: "meteo_di_prova", argomenti: { citta: "Lisbona" } },
      { nome: "somma_di_prova", argomenti: { a: 2, b: 3 } },
    ]);
    const fine = eventi.at(-1);
    if (fine?.tipo !== "fine") throw new Error("manca la fine");
    expect(fine.esito.motivo).toBe("completata");
    expect(fine.esito.testo).toBe("A Lisbona è sereno, 21 gradi. E 2 più 3 fa 5.");
    expect(fine.esito.iterazioni).toBe(2);
    expect(fine.esito.chiamate.map((c) => c.nome)).toEqual(["meteo_di_prova", "somma_di_prova"]);
    expect(fine.esito.messaggiNuovi.map((m) => m.ruolo)).toEqual(["assistente", "strumento", "strumento", "assistente"]);
    expect(fine.esito.messaggiNuovi.at(-1)).toEqual({ ruolo: "assistente", testo: "A Lisbona è sereno, 21 gradi. E 2 più 3 fa 5." });
    cliente.verificaCompletata();
  });

  it("senza chiamate agli strumenti il ciclo finisce alla prima risposta", async () => {
    const cliente = creaClienteFinto({ versione: 1, turni: [turno({ testo: "Ciao!" }, { messaggi: [DOMANDA] })] });
    const esito = await eseguiCicloCompleto({ cliente, messaggi: [DOMANDA] });
    expect(esito).toEqual({ motivo: "completata", testo: "Ciao!", messaggiNuovi: [{ ruolo: "assistente", testo: "Ciao!" }], chiamate: [], iterazioni: 1 });
    expect(cliente.richieste[0]?.strumenti).toBeUndefined();
  });

  it("strumento sconosciuto, argomenti non JSON ed eccezioni tornano al modello come errore, senza dettagli interni", async () => {
    const cliente = creaClienteFinto({
      versione: 1,
      turni: [
        turno({
          chiamate: [
            { id: "c1", nome: "inesistente", argomenti: "{}" },
            { id: "c2", nome: "somma_di_prova", argomenti: "{a:" },
            { id: "c3", nome: "rotto_di_prova", argomenti: "" },
            { id: "c4", nome: "meteo_di_prova", argomenti: "{}" },
          ],
        }),
        turno(
          { testo: "Non ci sono riuscito." },
          {
            ultimiMessaggi: [
              { ruolo: "strumento", idChiamata: "c1", nome: "inesistente", risultato: "{\"errore\":\"Strumento sconosciuto: \\\"inesistente\\\".\"}" },
              { ruolo: "strumento", idChiamata: "c2", nome: "somma_di_prova", risultato: "{\"errore\":\"Gli argomenti non sono JSON valido.\"}" },
              { ruolo: "strumento", idChiamata: "c3", nome: "rotto_di_prova", risultato: "{\"errore\":\"Lo strumento \\\"rotto_di_prova\\\" non ha funzionato.\"}" },
              { ruolo: "strumento", idChiamata: "c4", nome: "meteo_di_prova", risultato: "{\"errore\":\"Manca la città.\"}" },
            ],
          },
        ),
      ],
    });
    const eventi: EventoCiclo[] = [];
    for await (const e of eseguiCiclo({ cliente, messaggi: [DOMANDA], strumenti: strumentiDiProva() })) eventi.push(e);
    const risultati = eventi.filter((e) => e.tipo === "risultato_strumento");
    expect(risultati.map((r) => r.errore)).toEqual([true, true, true, true]);
    const rotto = risultati[2];
    expect(rotto?.eccezione).toBeInstanceOf(Error);
    expect(JSON.stringify(cliente.richieste)).not.toContain("dettaglio interno");
    expect(eventi.at(-1)).toMatchObject({ tipo: "fine", esito: { motivo: "completata", testo: "Non ci sono riuscito." } });
  });

  it("si ferma dopo maxIterazioni se il modello chiede ancora strumenti, con ogni chiamata già col suo risultato", async () => {
    const cliente = creaClienteFinto({
      versione: 1,
      turni: [turno(chiama("a", "somma_di_prova", "{\"a\":1,\"b\":1}")), turno(chiama("b", "somma_di_prova", "{\"a\":2,\"b\":2}")), turno({ testo: "mai" })],
    });
    const esito = await eseguiCicloCompleto({ cliente, messaggi: [DOMANDA], strumenti: strumentiDiProva(), maxIterazioni: 2 });
    expect(esito.motivo).toBe("limite_iterazioni");
    expect(esito.iterazioni).toBe(2);
    expect(esito.messaggiNuovi.map((m) => m.ruolo)).toEqual(["assistente", "strumento", "assistente", "strumento"]);
    expect(cliente.turniUsati()).toBe(2);
    await expect(eseguiCicloCompleto({ cliente, messaggi: [DOMANDA], maxIterazioni: 0 })).rejects.toThrow(RangeError);
  });

  it("una risposta troncata chiude il ciclo senza eseguire le chiamate", async () => {
    const registro = { chiamate: [] as { nome: string; argomenti: unknown }[] };
    const cliente = creaClienteFinto({ versione: 1, turni: [turno({ testo: "Allora…", ...chiama("a", "somma_di_prova", "{}"), motivo: "troncata" })] });
    const esito = await eseguiCicloCompleto({ cliente, messaggi: [DOMANDA], strumenti: strumentiDiProva(registro) });
    expect(esito).toMatchObject({ motivo: "troncata", testo: "Allora…", chiamate: [], messaggiNuovi: [{ ruolo: "assistente", testo: "Allora…" }] });
    expect(registro.chiamate).toEqual([]);
  });

  it("l'AI non disponibile esce dal ciclo come ErroreAiNonDisponibile", async () => {
    const cliente = creaClienteFinto({ versione: 1, turni: [turno({ errore: "limite" })] });
    await expect(eseguiCicloCompleto({ cliente, messaggi: [DOMANDA] })).rejects.toBeInstanceOf(ErroreAiNonDisponibile);
  });

  it("rifiuta registri con nomi doppi o non validi", async () => {
    const [meteo] = strumentiDiProva();
    if (meteo === undefined) throw new Error("manca lo strumento");
    const cliente = creaClienteFinto({ versione: 1, turni: [] });
    await expect(eseguiCicloCompleto({ cliente, messaggi: [DOMANDA], strumenti: [meteo, meteo] })).rejects.toThrow("registrato due volte");
    await expect(
      eseguiCicloCompleto({ cliente, messaggi: [DOMANDA], strumenti: [{ ...meteo, definizione: { ...meteo.definizione, nome: "con spazio" } }] }),
    ).rejects.toThrow("non valido");
  });
});
