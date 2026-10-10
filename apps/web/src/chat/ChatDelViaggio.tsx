"use client";

import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useCallback, useContext, useState } from "react";
import { ChatConSorgente } from "./ChatViaggio";
import { creaSorgenteServer } from "./sorgente-server";
import type { Benvenuto } from "./tipi";

export const BENVENUTO_VIAGGIO: Benvenuto = {
  testo: "Ciao! Dimmi cosa vuoi cambiare in questo viaggio: un'attività, un orario o un giorno. Ti propongo io la modifica.",
  suggerimenti: ["Sabato piove: cosa cambio?", "Sposta un'attività a un altro giorno", "Mostrami le mie preferenze"],
};

export interface ProprietaChatDelViaggio {
  /** Il viaggio della pagina: una conversazione nuova nasce collegata a lui. */
  viaggio: string;
  /** L'ultima conversazione del viaggio, se c'è: la chat la riprende. */
  conversazione?: number | null | undefined;
  /** Per i test: la `fetch` da usare. */
  fetch?: typeof fetch | undefined;
}

/**
 * La chat delle pagine del viaggio (REQ-CHAT-003, CA-3): parla con gli agenti sul server (`/api/chat/conversazioni`),
 * sulla conversazione del viaggio, come la pagina Pianifica. Dopo un'azione degli agenti la pagina si rigenera.
 */
export function ChatDelViaggio({ viaggio, conversazione = null, fetch }: ProprietaChatDelViaggio) {
  const [sorgente] = useState(() => creaSorgenteServer({ benvenuto: BENVENUTO_VIAGGIO, viaggio, conversazione, fetch }));
  // Il router di Next.js, se c'è (fuori dall'app, per esempio nei test che disegnano la pagina, manca).
  const router = useContext(AppRouterContext);
  const onAzione = useCallback(() => router?.refresh(), [router]);
  return <ChatConSorgente sorgente={sorgente} onAzione={onAzione} />;
}
