import { describe, expect, it, vi } from "vitest";
import { Broadcaster } from "./broadcaster.js";

function makeWsClient(readyState = 1 /* OPEN */) {
  return { send: vi.fn(), readyState };
}

vi.mock("ws", () => ({
  WebSocketServer: vi.fn().mockImplementation(function () {
    const listeners = {};
    this.clients = [];
    this.on = vi.fn((event, handler) => { listeners[event] = handler; });
    this._emit = (event, ...args) => listeners[event]?.(...args);
  }),
}));

describe("Broadcaster", () => {
  it("starts with no wss", () => {
    const b = new Broadcaster();
    expect(b.wss).toBeNull();
  });

  it("attach creates a WebSocketServer and wires error suppression", async () => {
    const { WebSocketServer } = await import("ws");
    const broadcaster = new Broadcaster();
    const fakeHttpServer = {};

    broadcaster.attach(fakeHttpServer);

    expect(WebSocketServer).toHaveBeenCalledWith({ server: fakeHttpServer });
    expect(broadcaster.wss).not.toBeNull();

    // Simulate a connection and an error event — should not throw
    const ws = { on: vi.fn() };
    broadcaster.wss.on.mock.calls
      .find(([event]) => event === "connection")?.[1]?.(ws);
    expect(ws.on).toHaveBeenCalledWith("error", expect.any(Function));
    const errorHandler = ws.on.mock.calls.find(([e]) => e === "error")?.[1];
    expect(() => errorHandler(new Error("boom"))).not.toThrow();
  });

  it("broadcast does nothing when wss is null", () => {
    const b = new Broadcaster();
    expect(() => b.broadcast({ type: "test" })).not.toThrow();
  });

  it("broadcast sends JSON to all OPEN clients", async () => {
    const { WebSocketServer } = await import("ws");
    const openClient = makeWsClient(1);
    const closingClient = makeWsClient(2);
    WebSocketServer.mockImplementationOnce(function () {
      this.clients = [openClient, closingClient];
      this.on = vi.fn();
    });

    const b = new Broadcaster();
    b.attach({});
    b.broadcast({ type: "new-appointment", data: { id: "x" } });

    expect(openClient.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "new-appointment", data: { id: "x" } })
    );
    expect(closingClient.send).not.toHaveBeenCalled();
  });

  it("onMessage registers a message handler and returns this", () => {
    const b = new Broadcaster();
    const handler = vi.fn();
    const result = b.onMessage(handler);
    expect(result).toBe(b); // chainable
    expect(b._messageHandlers).toContain(handler);
  });

  it("onMessage handlers are called when a client sends a message", async () => {
    const { WebSocketServer } = await import("ws");
    let capturedMsgHandler;

    WebSocketServer.mockImplementationOnce(function () {
      this.clients = [];
      this.on = vi.fn((event, cb) => {
        if (event === "connection") {
          // Simulate a connection immediately: capture the per-ws message handler
          const ws = {
            on: vi.fn((wsEvent, wsHandler) => {
              if (wsEvent === "message") capturedMsgHandler = wsHandler;
            }),
          };
          cb(ws);
        }
      });
    });

    const b = new Broadcaster();
    const handler = vi.fn();
    b.onMessage(handler);
    b.attach({});

    // Simulate a client sending a JSON message
    capturedMsgHandler(Buffer.from(JSON.stringify({ type: "chat:send", text: "Hi" })));
    expect(handler).toHaveBeenCalledWith({ type: "chat:send", text: "Hi" }, expect.anything(), b);
  });

  it("onMessage handler is NOT called for malformed (non-JSON) messages", async () => {
    const { WebSocketServer } = await import("ws");
    let capturedMsgHandler;

    WebSocketServer.mockImplementationOnce(function () {
      this.clients = [];
      this.on = vi.fn((event, cb) => {
        if (event === "connection") {
          const ws = {
            on: vi.fn((wsEvent, wsHandler) => {
              if (wsEvent === "message") capturedMsgHandler = wsHandler;
            }),
          };
          cb(ws);
        }
      });
    });

    const b = new Broadcaster();
    const handler = vi.fn();
    b.onMessage(handler);
    b.attach({});

    // Should not throw, handler should not be called
    expect(() => capturedMsgHandler(Buffer.from("not-json"))).not.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });
});
