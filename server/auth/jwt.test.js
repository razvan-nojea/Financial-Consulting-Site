/**
 * Tests for the JWT utility module (server/auth/jwt.js)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./jwt.js";

const DEMO_USER = {
  id:    "u1",
  email: "demo@exemplu.ro",
  name:  "Demo",
  role:  "user",
};

const ADMIN_USER = {
  id:    "u2",
  email: "admin@exemplu.ro",
  name:  "Admin",
  role:  "admin",
};

describe("JWT utilities", () => {

  // ── signAccessToken / verifyAccessToken ────────────────────────────────────

  it("signs and verifies an access token", () => {
    const token   = signAccessToken(DEMO_USER);
    const payload = verifyAccessToken(token);

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // three JWT segments

    expect(payload).not.toBeNull();
    expect(payload.userId).toBe("u1");
    expect(payload.email).toBe("demo@exemplu.ro");
    expect(payload.name).toBe("Demo");
    expect(payload.role).toBe("user");
  });

  it("access token carries admin role correctly", () => {
    const payload = verifyAccessToken(signAccessToken(ADMIN_USER));
    expect(payload.role).toBe("admin");
  });

  it("verifyAccessToken returns null for a tampered token", () => {
    const token    = signAccessToken(DEMO_USER);
    const tampered = token.slice(0, -5) + "XXXXX";
    expect(verifyAccessToken(tampered)).toBeNull();
  });

  it("verifyAccessToken returns null for a random string", () => {
    expect(verifyAccessToken("not-a-token")).toBeNull();
  });

  it("verifyAccessToken returns null for an empty string", () => {
    expect(verifyAccessToken("")).toBeNull();
  });

  it("access tokens signed with different secrets are mutually incompatible", () => {
    const original = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "secret-A";
    const tokenA = signAccessToken(DEMO_USER);

    process.env.JWT_SECRET = "secret-B";
    expect(verifyAccessToken(tokenA)).toBeNull();

    process.env.JWT_SECRET = original ?? "";
  });

  // ── signRefreshToken / verifyRefreshToken ──────────────────────────────────

  it("signs and verifies a refresh token", () => {
    const token   = signRefreshToken(DEMO_USER);
    const payload = verifyRefreshToken(token);

    expect(typeof token).toBe("string");
    expect(payload).not.toBeNull();
    expect(payload.userId).toBe("u1");
  });

  it("refresh token does not contain email or role (minimal payload)", () => {
    const payload = verifyRefreshToken(signRefreshToken(DEMO_USER));
    expect(payload.email).toBeUndefined();
    expect(payload.role).toBeUndefined();
  });

  it("verifyRefreshToken returns null for a tampered token", () => {
    const token    = signRefreshToken(DEMO_USER);
    const tampered = token.slice(0, -5) + "YYYYY";
    expect(verifyRefreshToken(tampered)).toBeNull();
  });

  it("verifyRefreshToken returns null for a random string", () => {
    expect(verifyRefreshToken("garbage")).toBeNull();
  });

  it("access token cannot be verified as a refresh token", () => {
    const accessToken = signAccessToken(DEMO_USER);
    // Refresh token uses a different secret → should return null
    expect(verifyRefreshToken(accessToken)).toBeNull();
  });

  it("refresh token cannot be verified as an access token", () => {
    const refreshToken = signRefreshToken(DEMO_USER);
    expect(verifyAccessToken(refreshToken)).toBeNull();
  });
});
