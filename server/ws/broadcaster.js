import { WebSocketServer } from "ws";

/**
 * Broadcaster — wraps a WebSocket server and provides two capabilities:
 *
 *   1. broadcast(payload) — push a JSON message to every connected client
 *   2. onMessage(handler) — register a callback for messages received FROM clients
 *
 * The onMessage API enables the real-time chat feature: the server registers
 * a handler that stores incoming "chat:send" events in the NoSQL document
 * store and then broadcasts them to all connected clients.
 */
export class Broadcaster {
  constructor() {
    this.wss = null;
    /** @type {Array<(msg: object, ws: WebSocket, broadcaster: Broadcaster) => void>} */
    this._messageHandlers = [];
  }

  /**
   * Registers a handler for messages received from WebSocket clients.
   * @param {(msg: object, ws: WebSocket, broadcaster: Broadcaster) => void} handler
   * @returns {this}  allows chaining
   */
  onMessage(handler) {
    this._messageHandlers.push(handler);
    return this;
  }

  /** Attach to an existing HTTP server. */
  attach(httpServer) {
    this.wss = new WebSocketServer({ server: httpServer });
    this.wss.on("connection", (ws) => {
      ws.on("error", () => {});
      ws.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());
          for (const handler of this._messageHandlers) {
            handler(msg, ws, this);
          }
        } catch {
          // Ignore malformed / non-JSON frames.
        }
      });
    });
  }

  /** Send a JSON payload to all open connections. */
  broadcast(payload) {
    if (!this.wss) return;
    const message = JSON.stringify(payload);
    for (const client of this.wss.clients) {
      if (client.readyState === 1 /* OPEN */) {
        client.send(message);
      }
    }
  }
}
