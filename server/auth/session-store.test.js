import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createSession,
  getSession,
  destroySession,
  getSessionFromRequest,
  sessionCount,
  _clearAllSessions,
} from "./session-store.js";

const DEMO_USER = { id: "u1", email: "demo@exemplu.ro", name: "Demo", role: "user" };
const ADMIN_USER = { id: "u2", email: "admin@exemplu.ro", name: "Admin", role: "admin" };

describe("session-store", () => {
  beforeEach(() => _clearAllSessions());

  it("createSession returns a non-empty string ID", () => {
    const id = createSession(DEMO_USER);
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("getSession returns the correct session data", () => {
    const id = createSession(DEMO_USER);
    const session = getSession(id);
    expect(session).toMatchObject({
      userId: DEMO_USER.id,
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      role: DEMO_USER.role,
    });
  });

  it("getSession returns null for unknown ID", () => {
    expect(getSession("nonexistent")).toBeNull();
  });

  it("getSession returns null for undefined", () => {
    expect(getSession(undefined)).toBeNull();
  });

  it("destroySession removes the session", () => {
    const id = createSession(DEMO_USER);
    destroySession(id);
    expect(getSession(id)).toBeNull();
  });

  it("each createSession call returns a unique ID", () => {
    const id1 = createSession(DEMO_USER);
    const id2 = createSession(DEMO_USER);
    expect(id1).not.toBe(id2);
  });

  it("sessionCount reflects the number of active sessions", () => {
    expect(sessionCount()).toBe(0);
    createSession(DEMO_USER);
    createSession(ADMIN_USER);
    expect(sessionCount()).toBe(2);
    _clearAllSessions();
    expect(sessionCount()).toBe(0);
  });

  it("getSessionFromRequest reads X-Session-Id header", () => {
    const sessionId = createSession(DEMO_USER);
    const fakeRequest = { headers: { "x-session-id": sessionId } };
    const session = getSessionFromRequest(fakeRequest);
    expect(session).not.toBeNull();
    expect(session.email).toBe(DEMO_USER.email);
  });

  it("getSessionFromRequest handles array headers", () => {
    const sessionId = createSession(DEMO_USER);
    const fakeRequest = { headers: { "x-session-id": [sessionId] } };
    const session = getSessionFromRequest(fakeRequest);
    expect(session).not.toBeNull();
  });

  it("getSessionFromRequest returns null when header is absent", () => {
    const fakeRequest = { headers: {} };
    expect(getSessionFromRequest(fakeRequest)).toBeNull();
  });

  it("expired sessions are removed and return null", () => {
    vi.useFakeTimers();
    const id = createSession(DEMO_USER);
    // Advance time by 25 hours (past the 24-hour TTL)
    vi.advanceTimersByTime(25 * 60 * 60 * 1000);
    expect(getSession(id)).toBeNull();
    vi.useRealTimers();
  });

  it("role defaults to 'user' when not provided", () => {
    const id = createSession({ id: "x", email: "a@b.com", name: "A" });
    expect(getSession(id).role).toBe("user");
  });
});
