/** `GET /api/chat/conversazioni/:id`: la conversazione salvata (REQ-CHAT-001, ST-CHAT-001A). */
import { gestoriChat } from "../../../../../src/chat/server/web-app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(richiesta: Request, contesto: { params: Promise<{ id: string }> }): Promise<Response> {
  return gestoriChat.leggiConversazione(richiesta, contesto);
}
