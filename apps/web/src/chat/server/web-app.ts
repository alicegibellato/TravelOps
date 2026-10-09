/**
 * I gestori della chat con le dipendenze vere della web app: la base dati in `.data`, l'assistente dall'ambiente del
 * server (`OPENAI_API_KEY`, solo sul server) e la rigenerazione delle pagine dopo una decisione su una proposta.
 */
import { revalidatePath } from "next/cache";
import { cartellaDati } from "../../stato/archivio";
import { assistenteDaAmbiente } from "./assistente";
import { creaGestoriChat } from "./gestori";

export const gestoriChat = creaGestoriChat({
  cartella: cartellaDati,
  assistente: () => assistenteDaAmbiente(),
  dopoDecisione: () => revalidatePath("/", "layout"),
});
