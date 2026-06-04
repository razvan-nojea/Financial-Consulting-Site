import React from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatProvider, useChat, type ChatMessage } from "./chat-context";

// ── Mock setup using vi.hoisted so vars are available in the factory ─────────

const mockAuth = vi.hoisted(() => ({
  isAuthenticated: true,
  user: { email: "a@b.com", name: "A" } as { email: string; name: string } | null,
}));

vi.mock("./auth-context", () => ({
  useAuth: () => mockAuth,
}));

const mockGetSessionId = vi.hoisted(() => vi.fn().mockReturnValue("test-session"));

vi.mock("../api/auth-api", () => ({
  getSessionId: mockGetSessionId,
  SESSION_STORAGE_KEY: "sessionId",
  SESSION_ROLE_KEY: "sessionRole",
}));

// ── WebSocket mock ─────────────────────────────────────────────────────────────

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  readyState = 0; // CONNECTING
  url: string;
  send = vi.fn();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close() {
    this.readyState = 3; // CLOSED
    this.onclose?.({ type: "close" } as CloseEvent);
  }

  triggerOpen() {
    this.readyState = 1; // OPEN
    this.onopen?.({ type: "open" } as Event);
  }

  triggerMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  triggerMalformedMessage() {
    this.onmessage?.({ data: "{not-json" } as MessageEvent);
  }

  triggerError() {
    this.onerror?.({ type: "error" } as Event);
  }
}

// ── Sample data ────────────────────────────────────────────────────────────────

const SAMPLE_MSG: ChatMessage = {
  _id: "m1",
  from: "a@b.com",
  fromName: "A",
  text: "Hello",
  _createdAt: "2026-05-14T10:00:00.000Z",
};

const SAMPLE_DM: ChatMessage = {
  _id: "m2",
  from: "a@b.com",
  fromName: "A",
  to: "b@c.com",
  text: "DM only",
  _createdAt: "2026-05-14T10:01:00.000Z",
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <ChatProvider>{children}</ChatProvider>;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("chat-context", () => {
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    MockWebSocket.instances = [];
    originalWebSocket = globalThis.WebSocket;
    // @ts-expect-error — replacing with mock
    globalThis.WebSocket = MockWebSocket;
    vi.restoreAllMocks();
    mockGetSessionId.mockReturnValue("test-session");
    mockAuth.isAuthenticated = true;
    mockAuth.user = { email: "a@b.com", name: "A" };
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
  });

  it("throws when useChat is used outside ChatProvider", () => {
    expect(() => renderHook(() => useChat())).toThrow("useChat must be used within a ChatProvider");
  });

  it("loads recent messages from REST on mount and opens WebSocket", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [SAMPLE_MSG] }), { status: 200 })
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    // WebSocket should have been created
    expect(MockWebSocket.instances.length).toBeGreaterThan(0);

    // Simulate WS open
    await act(async () => {
      MockWebSocket.instances[0].triggerOpen();
    });

    // Wait for REST fetch to complete
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].text).toBe("Hello");
    expect(result.current.connected).toBe(true);
  });

  it("appends incoming chat:message events from WebSocket", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [] }), { status: 200 })
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    // Let the initial REST fetch resolve before triggering WS messages
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      MockWebSocket.instances[0].triggerOpen();
    });

    await act(async () => {
      MockWebSocket.instances[0].triggerMessage({ type: "chat:message", data: SAMPLE_MSG });
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]._id).toBe("m1");
  });

  it("ignores non-chat-message WebSocket events", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [] }), { status: 200 })
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      MockWebSocket.instances[0].triggerOpen();
      MockWebSocket.instances[0].triggerMessage({ type: "other", data: SAMPLE_MSG });
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it("silently ignores malformed WebSocket frames", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [] }), { status: 200 })
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      MockWebSocket.instances[0].triggerOpen();
      MockWebSocket.instances[0].triggerMalformedMessage();
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it("schedules reconnect when WebSocket closes", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ messages: [] }), { status: 200 })
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      MockWebSocket.instances[0].triggerOpen();
    });

    expect(result.current.connected).toBe(true);

    await act(async () => {
      MockWebSocket.instances[0].close();
    });

    expect(result.current.connected).toBe(false);

    // Advance time to trigger reconnect
    await act(async () => {
      vi.advanceTimersByTime(3500);
      await Promise.resolve();
    });

    // A new WebSocket should have been created
    expect(MockWebSocket.instances.length).toBe(2);

    vi.useRealTimers();
  });

  it("closes WebSocket on onerror", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [] }), { status: 200 })
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      MockWebSocket.instances[0].triggerError();
    });

    expect(MockWebSocket.instances[0].readyState).toBe(WebSocket.CLOSED);
    expect(result.current.connected).toBe(false);
  });

  it("sendMessage sends via WebSocket when connection is open", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [] }), { status: 200 })
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      MockWebSocket.instances[0].triggerOpen();
    });

    await act(async () => {
      result.current.sendMessage("Hello world");
      await new Promise((r) => setTimeout(r, 0));
    });

    const ws = MockWebSocket.instances[0];
    expect(ws.send).toHaveBeenCalled();
    const payload = JSON.parse(ws.send.mock.calls[0][0]);
    expect(payload.type).toBe("chat:send");
    expect(payload.text).toBe("Hello world");
    expect(payload.from).toBe("a@b.com");
    expect(payload.fromName).toBe("A");
  });

  it("sendMessage ignores blank text", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [] }), { status: 200 })
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    // Wait for initial load
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    // Clear calls so we can count only post-init calls
    fetchSpy.mockClear();

    await act(async () => {
      result.current.sendMessage("   ");
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sendMessage does nothing when not authenticated", async () => {
    mockAuth.isAuthenticated = false;
    mockAuth.user = null;

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [] }), { status: 200 })
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    fetchSpy.mockClear();

    await act(async () => {
      result.current.sendMessage("Should not send");
    });

    const postCalls = fetchSpy.mock.calls.filter(
      ([, init]) => (init as RequestInit)?.method === "POST"
    );
    expect(postCalls).toHaveLength(0);
  });

  it("handles REST fetch error gracefully on mount", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Should not throw, messages remain empty
    expect(result.current.messages).toHaveLength(0);
  });

  it("ignores REST response that has no messages field", async () => {
    // Covers the `if (data.messages)` false branch in the REST load effect
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ok" }), { status: 200 })
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it("sendMessage includes from/fromName from user in WebSocket payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [] }), { status: 200 })
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      MockWebSocket.instances[0].triggerOpen();
    });

    await act(async () => {
      result.current.sendMessage("test message");
      await new Promise((r) => setTimeout(r, 0));
    });

    const ws = MockWebSocket.instances[0];
    expect(ws.send).toHaveBeenCalled();
    const payload = JSON.parse(ws.send.mock.calls[0][0]);
    expect(payload.from).toBe("a@b.com");
    expect(payload.fromName).toBe("A");
  });

  it("sendMessage includes 'to' in WebSocket payload when a recipient is specified", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [] }), { status: 200 })
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      MockWebSocket.instances[0].triggerOpen();
    });

    await act(async () => {
      result.current.sendMessage("DM only", "b@c.com");
      await new Promise((r) => setTimeout(r, 0));
    });

    const ws = MockWebSocket.instances[0];
    expect(ws.send).toHaveBeenCalled();
    const payload = JSON.parse(ws.send.mock.calls[0][0]);
    expect(payload.to).toBe("b@c.com");
    expect(payload.text).toBe("DM only");
  });

  it("sendMessage omits 'to' from WebSocket payload when no recipient is given", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [] }), { status: 200 })
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      MockWebSocket.instances[0].triggerOpen();
    });

    await act(async () => {
      result.current.sendMessage("Hello");
      await new Promise((r) => setTimeout(r, 0));
    });

    const ws = MockWebSocket.instances[0];
    expect(ws.send).toHaveBeenCalled();
    const payload = JSON.parse(ws.send.mock.calls[0][0]);
    expect(payload.to).toBeUndefined();
  });

  it("lastMessage is null initially", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [] }), { status: 200 })
    );

    const { result } = renderHook(() => useChat(), { wrapper });
    expect(result.current.lastMessage).toBeNull();
  });

  it("lastMessage is set to any received WebSocket message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [] }), { status: 200 })
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      MockWebSocket.instances[0].triggerOpen();
      MockWebSocket.instances[0].triggerMessage({ type: "chat:message", data: SAMPLE_MSG });
    });

    expect(result.current.lastMessage).toEqual({ type: "chat:message", data: SAMPLE_MSG });
  });

  it("lastMessage is set for admin:ai-analysis WebSocket events", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [] }), { status: 200 })
    );

    const aiPayload = {
      userId: "u1",
      analysis: { suspicious: true, confidence: 0.9, reason: "Test", model: "llama3.2", analyzedAt: "2026-01-01T00:00:00.000Z" },
    };

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      MockWebSocket.instances[0].triggerOpen();
      MockWebSocket.instances[0].triggerMessage({ type: "admin:ai-analysis", data: aiPayload });
    });

    expect(result.current.lastMessage?.type).toBe("admin:ai-analysis");
    expect(result.current.lastMessage?.data).toEqual(aiPayload);
    // Should not affect messages list
    expect(result.current.messages).toHaveLength(0);
  });

  it("lastMessage updates to admin:suspicious-flagged and adds to adminAlerts", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [] }), { status: 200 })
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      MockWebSocket.instances[0].triggerOpen();
      MockWebSocket.instances[0].triggerMessage({
        type: "admin:suspicious-flagged",
        data: { userId: "u2", reason: "Too many deletes", score: 30 },
      });
    });

    expect(result.current.lastMessage?.type).toBe("admin:suspicious-flagged");
    expect(result.current.adminAlerts).toHaveLength(1);
    expect(result.current.adminAlerts[0].userId).toBe("u2");
  });

  it("does not reconnect after unmount", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ messages: [] }), { status: 200 })
    );

    const { unmount } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      MockWebSocket.instances[0].triggerOpen();
    });

    const countBefore = MockWebSocket.instances.length;
    unmount();

    // Advance well past reconnect delay — should NOT create another instance
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(MockWebSocket.instances.length).toBe(countBefore);

    vi.useRealTimers();
  });
});
