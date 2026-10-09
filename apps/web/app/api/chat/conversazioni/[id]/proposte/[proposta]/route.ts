/** `POST /api/chat/conversazioni/:id/proposte/:proposta`: accetta o rifiuta dalla chat (REQ-CHAT-001 CA-2, ST-CHAT-001A). */
import { gestoriChat } from "../../../../../../../src/chat/server/web-app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(richiesta: Request, contesto: { params: Promise<{ id: string; proposta: string }> }): Promise<Response> {
  return gestoriChat.decidiProposta(richiesta, contesto);
}
