/**
 * Chat REST routes (the real-time path goes through WebSocket).
 *
 *   GET  /api/chat/messages           — fetch the last 100 messages
 *   POST /api/chat/messages           — post a message (HTTP fallback)
 *
 * The primary delivery mechanism is WebSocket: when a client sends a
 * "chat:send" message over the WS connection, the server stores it in the
 * NoSQL document store and broadcasts it to every connected client.
 */
import { getSessionFromRequest } from "../auth/session-store.js";

export async function handleChatRoutes(context) {
  const { request, pathname, body, broadcaster, chatStore } = context;

  if (!pathname.startsWith("/api/chat")) return null;

  // ── GET /api/chat/messages ──────────────────────────────────────────────
  if (pathname === "/api/chat/messages" && request.method === "GET") {
    const messages = chatStore ? await chatStore.findRecent(100) : [];
    return { statusCode: 200, payload: { messages } };
  }

  // ── POST /api/chat/messages ─────────────────────────────────────────────
  if (pathname === "/api/chat/messages" && request.method === "POST") {
    const session = getSessionFromRequest(request);
    if (!session) {
      return { statusCode: 401, payload: { message: "Neautentificat." } };
    }

    const text = (body?.text ?? "").trim();
    if (!text) {
      return { statusCode: 400, payload: { message: "Mesajul nu poate fi gol." } };
    }

    const to = body?.to ?? null;

    const message = chatStore
      ? await chatStore.insert({ from: session.email, fromName: session.name, text, to })
      : { _id: "tmp", from: session.email, fromName: session.name, text, to };

    if (broadcaster) {
      broadcaster.broadcast({ type: "chat:message", data: message });
    }

    return { statusCode: 201, payload: { message } };
  }

  return null;
}
