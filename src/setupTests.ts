import "@testing-library/jest-dom";
import { vi } from "vitest";

if (typeof window !== "undefined") {
  global.IntersectionObserver = class IntersectionObserver {
    constructor(_cb: IntersectionObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: ReadonlyArray<number> = [];
    takeRecords(): IntersectionObserverEntry[] { return []; }
  };

  global.ResizeObserver = class ResizeObserver {
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb;
    }
    cb: ResizeObserverCallback;
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query.includes("dark"),
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }),
  });

  window.scrollTo = vi.fn();

  // Stub WebSocket so contexts that open a WS connection don't throw in jsdom
  global.WebSocket = class FakeWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    readyState = FakeWebSocket.OPEN;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;
    onclose: ((ev: CloseEvent) => void) | null = null;
    onopen: ((ev: Event) => void) | null = null;
    constructor(_url: string) {}
    send(_data: unknown) {}
    close() { this.readyState = FakeWebSocket.CLOSED; }
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return false; }
  } as unknown as typeof WebSocket;
}
