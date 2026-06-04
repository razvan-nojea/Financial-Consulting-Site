/**
 * Tests for resolveSession (server/auth/auth-middleware.js)
 *
 * Verifies that the middleware correctly resolves identity from:
 *   1. JWT Bearer token (priority)
 *   2. Legacy X-Session-Id header (fallback)
 *   3. No credentials → null
 */
import { describe, it, expect, beforeEach } from "vitest";
import { resolveSession } from "./auth-middleware.js";
import { signAccessToken } from "./jwt.js";
import { createSession, _clearAllSessions } from "./session-store.js";

const DEMO_USER  = { id: "u1", email: "demo@exemplu.ro",  name: "Demo",  role: "user" };
const ADMIN_USER = { id: "u2", email: "admin@exemplu.ro", name: "Admin", role: "admin" };

function req(headers) {
  return { headers };
}

describe("resolveSession", () => {
  beforeEach(() => _clearAllSessions());

  // ── No credentials ─────────────────────────────────────────────────────────

  it("returns null when no auth headers are present", () => {
    expect(resolveSession(req({}))).toBeNull();
  });

  it("returns null when Authorization header is not Bearer", () => {
    expect(resolveSession(req({ authorization: "Basic dXNlcjpwYXNz" }))).toBeNull();
  });

  // ── JWT Bearer ─────────────────────────────────────────────────────────────

  it("resolves identity from a valid Bearer access token", () => {
    const token   = signAccessToken(DEMO_USER);
    const session = resolveSession(req({ authorization: `Bearer ${token}` }));

    expect(session).not.toBeNull();
    expect(session.userId).toBe("u1");
    expect(session.email).toBe("demo@exemplu.ro");
    expect(session.role).toBe("user");
  });

  it("resolves admin identity from a valid Bearer access token", () => {
    const token   = signAccessToken(ADMIN_USER);
    const session = resolveSession(req({ authorization: `Bearer ${token}` }));
    expect(session.role).toBe("admin");
  });

  it("returns null for a malformed Bearer token", () => {
    expect(resolveSession(req({ authorization: "Bearer not.a.valid.jwt" }))).toBeNull();
  });

  it("returns null for Bearer with empty token string", () => {
    expect(resolveSession(req({ authorization: "Bearer " }))).toBeNull();
  });

  // ── X-Session-Id fallback ──────────────────────────────────────────────────

  it("falls back to X-Session-Id when no Authorization header is present", () => {
    const sessionId = createSession(DEMO_USER);
    const session   = resolveSession(req({ "x-session-id": sessionId }));

    expect(session).not.toBeNull();
    expect(session.email).toBe("demo@exemplu.ro");
  });

  it("returns null for an unknown / expired session ID", () => {
    expect(
      resolveSession(req({ "x-session-id": "00000000-0000-0000-0000-000000000000" }))
    ).toBeNull();
  });

  // ── Bearer takes priority over X-Session-Id ────────────────────────────────

  it("JWT Bearer takes priority over a concurrent X-Session-Id", () => {
    const token     = signAccessToken(ADMIN_USER);
    const sessionId = createSession(DEMO_USER); // different user

    const session = resolveSession(req({
      authorization:  `Bearer ${token}`,
      "x-session-id": sessionId,
    }));

    // Should identify as the admin (from the JWT), not the demo user
    expect(session.email).toBe("admin@exemplu.ro");
    expect(session.role).toBe("admin");
  });
});
