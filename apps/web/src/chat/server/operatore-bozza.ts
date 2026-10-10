/**
 * Le operazioni sulla bozza per gli strumenti della chat (REQ-PLAN-003, CA-1 e CA-3).
 *
 * Gli strumenti degli agenti (`opera_bozza`, `cambia_preferenze_bozza`, `conferma_viaggio`) chiamano qui il servizio della
 * bozza della pagina (`servizioBozza()`), lo stesso delle azioni dei pulsanti (`app/bozza/azioni.ts`): stesso motore,
 * stessa base dati, stesse revisioni con le stesse cause. Nessuna regola qui: si trova il viaggio della conversazione
 * e si passa l'operazione al servizio.
 */
import type { ArchivioViaggio, EsitoOperatoreBozza, OperatoreBozza } from "@travelops/agents";
import { servizioBozza } from "../../bozza/server";
import type { EsitoBozza } from "../../bozza/tipi";
import { usaBaseDati } from "../../stato/avvio";
import { viaggioDellaConversazione } from "./archivio-viaggio";

const SENZA_VIAGGIO = "Non c'è ancora un viaggio con una bozza: prepara prima la destinazione e genera la bozza.";

const comeEsito = (esito: EsitoBozza): EsitoOperatoreBozza => ({ ok: esito.ok, messaggio: esito.messaggio }) as EsitoOperatoreBozza;

/** L'operatore della bozza per la conversazione: il servizio dei pulsanti sul viaggio nato (o collegato) in chat. */
export function creaOperatoreBozzaWeb(cartella: string, conversazioneId: number, archivio: ArchivioViaggio): OperatoreBozza {
  const conViaggio = async (lavoro: (viaggioId: string) => EsitoBozza): Promise<EsitoOperatoreBozza> => {
    const viaggioId = usaBaseDati(cartella, (db) => viaggioDellaConversazione(db, conversazioneId));
    return viaggioId === null ? { ok: false, messaggio: SENZA_VIAGGIO } : comeEsito(lavoro(viaggioId));
  };

  return {
    opera: (operazione) => conViaggio((id) => servizioBozza(cartella).opera(id, operazione)),

    async cambiaPreferenze(cambio) {
      const esito = await conViaggio((id) => servizioBozza(cartella).cambiaPreferenze(id, {
          ...(cambio.ritmo === undefined ? {} : { ritmo: cambio.ritmo }),
          ...(cambio.stili === undefined ? {} : { stili: [...cambio.stili] }),
        }));
      if (esito.ok) {
        // I viaggi nati in chat usano il profilo condiviso con il percorso guidato: va tenuto allineato al servizio.
        const attuale = (await archivio.leggiProfilo()) ?? {};
        await archivio.salvaProfilo({
          ...attuale,
          ...(cambio.ritmo === undefined ? {} : { ritmo: cambio.ritmo }),
          ...(cambio.stili === undefined || cambio.stili.length === 0 ? {} : { stili: [...cambio.stili] }),
        });
      }
      return esito;
    },

    conferma: () => conViaggio((id) => servizioBozza(cartella).conferma(id)),
  };
}
