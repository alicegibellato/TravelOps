/** `POST /api/chat/conversazioni/:id/messaggi`: la risposta in streaming (REQ-CHAT-001, ST-CHAT-001A). */
import { gestoriChat } from "../../../../../../src/chat/server/web-app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(richiesta: Request, contesto: { params: Promise<{ id: string }> }): Promise<Response> {
  return gestoriChat.inviaMessaggio(richiesta, contesto);
}
