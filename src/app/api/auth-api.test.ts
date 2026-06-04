import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loginToServer,
  signupOnServer,
  logoutFromServer,
  getMeFromServer,
  getCachedRole,
  getSessionId,
  clearSession,
  SESSION_STORAGE_KEY,
  SESSION_ROLE_KEY,
} from "./auth-api";

const storage: Record<string, string> = {};
const sessionStorageMock = {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete storage[key]; }),
  clear: vi.fn(() => { Object.keys(storage).forEach((k) => delete storage[k]); }),
};
Object.defineProperty(window, "sessionStorage", { value: sessionStorageMock });

function makeResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("auth-api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorageMock.clear();
  });

  // ── loginToServer ──────────────────────────────────────────────────────────

  it("stores session ID and role after successful login", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeResponse({ sessionId: "s1", user: { id: "u1", email: "a@b.com", name: "A", role: "user" }, permissions: [] })
    );

    const result = await loginToServer("a@b.com", "pass");

    expect(result?.sessionId).toBe("s1");
    expect(storage[SESSION_STORAGE_KEY]).toBe("s1");
    expect(storage[SESSION_ROLE_KEY]).toBe("user");
  });

  it("stores admin role after admin login", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeResponse({ sessionId: "s2", user: { id: "u2", email: "admin@b.com", name: "Admin", role: "admin" }, permissions: [] })
    );

    const result = await loginToServer("admin@b.com", "pass");

    expect(result?.sessionId).toBe("s2");
    expect(storage[SESSION_ROLE_KEY]).toBe("admin");
  });

  it("returns null when login request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));

    const result = await loginToServer("a@b.com", "pass");

    expect(result).toBeNull();
  });

  it("does not store session ID when response has no sessionId", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeResponse({ error: "Bad credentials" }, 401));

    const result = await loginToServer("a@b.com", "wrong");

    expect(result?.sessionId).toBeUndefined();
    expect(storage[SESSION_STORAGE_KEY]).toBeUndefined();
  });

  // ── signupOnServer ────────────────────────────────────────────────────────

  it("stores session ID after successful signup", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeResponse({ sessionId: "s3", user: { id: "u3", email: "new@b.com", name: "New", role: "user" } })
    );

    const result = await signupOnServer("New", "new@b.com", "pass");

    expect(result?.sessionId).toBe("s3");
    expect(storage[SESSION_STORAGE_KEY]).toBe("s3");
  });

  it("falls back to 'user' role when signup response has no user role", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeResponse({ sessionId: "s4", user: { id: "u4", email: "x@b.com", name: "X" } })
    );

    await signupOnServer("X", "x@b.com", "pass");

    expect(storage[SESSION_ROLE_KEY]).toBe("user");
  });

  it("returns null when signup request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));

    const result = await signupOnServer("A", "a@b.com", "pass");

    expect(result).toBeNull();
  });

  // ── logoutFromServer ──────────────────────────────────────────────────────

  it("clears session keys after logout", async () => {
    storage[SESSION_STORAGE_KEY] = "some-session";
    storage[SESSION_ROLE_KEY] = "admin";
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeResponse({}, 200));

    await logoutFromServer();

    expect(storage[SESSION_STORAGE_KEY]).toBeUndefined();
    expect(storage[SESSION_ROLE_KEY]).toBeUndefined();
  });

  it("clears session keys even when logout request fails", async () => {
    storage[SESSION_STORAGE_KEY] = "some-session";
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));

    await logoutFromServer();

    expect(storage[SESSION_STORAGE_KEY]).toBeUndefined();
  });

  // ── getMeFromServer ────────────────────────────────────────────────────────

  it("returns user and permissions from /api/auth/me", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeResponse({
        user: { id: "u1", email: "a@b.com", name: "A", role: "user" },
        permissions: ["appointments:read"],
      })
    );

    const result = await getMeFromServer();

    expect(result?.user.email).toBe("a@b.com");
    expect(result?.permissions).toContain("appointments:read");
  });

  it("returns null when getMeFromServer request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));

    const result = await getMeFromServer();

    expect(result).toBeNull();
  });

  // ── getCachedRole / getSessionId ──────────────────────────────────────────

  it("getCachedRole returns stored role", () => {
    storage[SESSION_ROLE_KEY] = "admin";
    expect(getCachedRole()).toBe("admin");
  });

  it("getCachedRole defaults to 'user' when no role stored", () => {
    expect(getCachedRole()).toBe("user");
  });

  it("getSessionId returns stored session ID", () => {
    storage[SESSION_STORAGE_KEY] = "my-session";
    expect(getSessionId()).toBe("my-session");
  });

  it("getSessionId returns null when no session stored", () => {
    expect(getSessionId()).toBeNull();
  });

  // ── clearSession ──────────────────────────────────────────────────────────

  it("clearSession removes session ID and role from sessionStorage", () => {
    storage[SESSION_STORAGE_KEY] = "some-session";
    storage[SESSION_ROLE_KEY] = "admin";

    clearSession();

    expect(storage[SESSION_STORAGE_KEY]).toBeUndefined();
    expect(storage[SESSION_ROLE_KEY]).toBeUndefined();
  });

  // ── authRequest sends X-Session-Id header when session exists ────────────

  it("includes X-Session-Id header when session is stored", async () => {
    storage[SESSION_STORAGE_KEY] = "active-session";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeResponse({ user: null, permissions: [] }));

    await getMeFromServer();

    const [, init] = fetchSpy.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers["X-Session-Id"]).toBe("active-session");
  });

  it("handles empty response body gracefully (returns empty object)", async () => {
    // Cover the `text ? JSON.parse(text) : {}` false branch in authRequest
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", { status: 200 })
    );

    const result = await logoutFromServer();
    // logoutFromServer always returns void; key check is that it doesn't throw
    expect(result).toBeUndefined();
  });
});
