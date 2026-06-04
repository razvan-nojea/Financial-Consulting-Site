import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleChatRoutes } from "./chat-routes.js";
import { createSession, _clearAllSessions } from "../auth/session-store.js";

const USER = { id: "u1", email: "demo@exemplu.ro", name: "Demo", role: "user" };

const CHAT_MSG = {
  _id: "msg-1",
  from: "demo@exemplu.ro",
  fromName: "Demo",
  text: "Hello world",
  _createdAt: "2026-05-14T10:00:00.000Z",
};

function makeChatStore(overrides = {}) {
  return {
    findRecent: vi.fn().mockResolvedValue([CHAT_MSG]),
    insert: vi.fn().mockResolvedValue(CHAT_MSG),
    ...overrides,
  };
}

function makeContext(method, pathname, body, headers = {}, extras = {}) {
  return {
    request: { method, headers, socket: {} },
    pathname,
    body,
    broadcaster: { broadcast: vi.fn() },
    chatStore: makeChatStore(),
    ...extras,
  };
}

describe("handleChatRoutes", () => {
  let sessionId;

  beforeEach(() => {
    _clearAllSessions();
    sessionId = createSession(USER);
  });

  it("returns null for non-chat paths", async () => {
    const ctx = makeContext("GET", "/api/appointments", null);
    expect(await handleChatRoutes(ctx)).toBeNull();
  });

  // ── GET /api/chat/messages ───────────────────────────────────────────

  it("returns recent messages", async () => {
    const ctx = makeContext("GET", "/api/chat/messages", null);
    const result = await handleChatRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.messages).toHaveLength(1);
    expect(result.payload.messages[0].text).toBe("Hello world");
  });

  it("returns empty array when chatStore is null", async () => {
    const ctx = makeContext("GET", "/api/chat/messages", null, {}, { chatStore: null });
    const result = await handleChatRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.messages).toEqual([]);
  });

  // ── POST /api/chat/messages ──────────────────────────────────────────

  it("returns 401 when not authenticated", async () => {
    const ctx = makeContext("POST", "/api/chat/messages", { text: "hi" }, {});
    const result = await handleChatRoutes(ctx);
    expect(result.statusCode).toBe(401);
  });

  it("posts a message and broadcasts it", async () => {
    const ctx = makeContext("POST", "/api/chat/messages", { text: "Hello" }, {
      "x-session-id": sessionId,
    });
    const result = await handleChatRoutes(ctx);
    expect(result.statusCode).toBe(201);
    expect(ctx.chatStore.insert).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Hello", from: USER.email, to: null })
    );
    expect(ctx.broadcaster.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "chat:message" })
    );
  });

  it("stores the 'to' field when a DM recipient is provided", async () => {
    const ctx = makeContext("POST", "/api/chat/messages", { text: "Hey", to: "other@exemplu.ro" }, {
      "x-session-id": sessionId,
    });
    const result = await handleChatRoutes(ctx);
    expect(result.statusCode).toBe(201);
    expect(ctx.chatStore.insert).toHaveBeenCalledWith(
      expect.objectContaining({ to: "other@exemplu.ro" })
    );
  });

  it("returns 400 when message text is empty", async () => {
    const ctx = makeContext("POST", "/api/chat/messages", { text: "   " }, {
      "x-session-id": sessionId,
    });
    const result = await handleChatRoutes(ctx);
    expect(result.statusCode).toBe(400);
  });

  it("returns 400 when body is null", async () => {
    const ctx = makeContext("POST", "/api/chat/messages", null, { "x-session-id": sessionId });
    const result = await handleChatRoutes(ctx);
    expect(result.statusCode).toBe(400);
  });

  it("still posts successfully when broadcaster is null (no WS broadcast)", async () => {
    const ctx = makeContext("POST", "/api/chat/messages", { text: "Hi" }, {
      "x-session-id": sessionId,
    }, { broadcaster: null });
    const result = await handleChatRoutes(ctx);
    expect(result.statusCode).toBe(201);
  });

  it("posts successfully when chatStore is null (returns temp message object)", async () => {
    const ctx = makeContext("POST", "/api/chat/messages", { text: "Hi" }, {
      "x-session-id": sessionId,
    }, { chatStore: null });
    const result = await handleChatRoutes(ctx);
    expect(result.statusCode).toBe(201);
    expect(result.payload.message._id).toBe("tmp");
    expect(result.payload.message.to).toBeNull();
  });

  it("returns null for unrecognised chat paths (fallthrough)", async () => {
    const ctx = makeContext("DELETE", "/api/chat/messages", null, { "x-session-id": sessionId });
    expect(await handleChatRoutes(ctx)).toBeNull();
  });
});
