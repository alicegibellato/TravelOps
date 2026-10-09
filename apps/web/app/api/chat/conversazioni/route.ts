/** `POST /api/chat/conversazioni`: crea una conversazione (REQ-CHAT-001, ST-CHAT-001A). */
import { gestoriChat } from "../../../../src/chat/server/web-app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(richiesta: Request): Promise<Response> {
  return gestoriChat.creaConversazione(richiesta);
}
