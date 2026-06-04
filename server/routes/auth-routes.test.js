import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleAuthRoutes, _clearResetTokens } from "./auth-routes.js";
import { _clearAllSessions } from "../auth/session-store.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const HASHED_DEMO  = "salt:hash"; // placeholder — we mock verifyPassword

// Mock password module so tests don't require actual scrypt computation.
vi.mock("../auth/password.js", () => ({
  hashPassword: vi.fn().mockResolvedValue("salt:newhash"),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

const USER_RECORD = {
  id: "u1",
  email: "demo@exemplu.ro",
  passwordHash: HASHED_DEMO,
  name: "Demo",
  role: "user",
};

function makeUsersRepo(overrides = {}) {
  return {
    findByEmail:           vi.fn().mockResolvedValue(USER_RECORD),
    findById:              vi.fn().mockResolvedValue(USER_RECORD),
    getRoleByName:         vi.fn().mockResolvedValue({ id: 1, name: "user" }),
    getPermissionsForRole: vi.fn().mockResolvedValue(["appointments:read"]),
    create:                vi.fn().mockResolvedValue({ ...USER_RECORD, id: "u2" }),
    updatePassword:        vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeContext(method, pathname, body, headers = {}, extras = {}) {
  return {
    request: { method, headers, socket: {} },
    pathname,
    body,
    usersRepository: makeUsersRepo(),
    logsRepository: null,
    suspiciousUsersRepository: null,
    ...extras,
  };
}

describe("handleAuthRoutes", () => {
  beforeEach(() => { _clearAllSessions(); _clearResetTokens(); });

  it("returns null for non-auth paths", async () => {
    const ctx = makeContext("GET", "/api/appointments", null);
    expect(await handleAuthRoutes(ctx)).toBeNull();
  });

  // ── POST /api/auth/login ─────────────────────────────────────────────

  it("login succeeds with valid credentials", async () => {
    const ctx = makeContext("POST", "/api/auth/login", { email: "demo@exemplu.ro", password: "demo123" });
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.sessionId).toBeTruthy();
    expect(result.payload.user.role).toBe("user");
  });

  it("login returns 400 when email or password is missing", async () => {
    const ctx = makeContext("POST", "/api/auth/login", { email: "a@b.com" });
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(400);
  });

  it("login returns 400 when body is null", async () => {
    const ctx = makeContext("POST", "/api/auth/login", null);
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(400);
  });

  it("login returns 401 when user is not found", async () => {
    const ctx = makeContext("POST", "/api/auth/login", { email: "x@x.com", password: "pw" });
    ctx.usersRepository.findByEmail.mockResolvedValue(null);
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(401);
  });

  it("login returns 401 when password is wrong", async () => {
    const { verifyPassword } = await import("../auth/password.js");
    verifyPassword.mockResolvedValueOnce(false);
    const ctx = makeContext("POST", "/api/auth/login", { email: "demo@exemplu.ro", password: "wrong" });
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(401);
  });

  // ── POST /api/auth/signup ────────────────────────────────────────────

  it("signup creates a new user and returns sessionId", async () => {
    const ctx = makeContext("POST", "/api/auth/signup", {
      name: "Alice", email: "alice@test.com", password: "password1",
    });
    ctx.usersRepository.findByEmail.mockResolvedValue(null);
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(201);
    expect(result.payload.sessionId).toBeTruthy();
  });

  it("signup returns 400 when password is too short", async () => {
    const ctx = makeContext("POST", "/api/auth/signup", {
      name: "A", email: "a@b.com", password: "short",
    });
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(400);
  });

  it("signup returns 409 when email already exists", async () => {
    const ctx = makeContext("POST", "/api/auth/signup", {
      name: "Dup", email: "demo@exemplu.ro", password: "password1",
    });
    // findByEmail already returns USER_RECORD (existing user)
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(409);
  });

  it("signup returns 400 when fields are missing", async () => {
    const ctx = makeContext("POST", "/api/auth/signup", { name: "X" });
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(400);
  });

  it("login returns 200 in dev mode (no usersRepository)", async () => {
    const ctx = makeContext("POST", "/api/auth/login", { email: "demo@exemplu.ro", password: "demo123" });
    ctx.usersRepository = null;
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.user.role).toBe("user");
    expect(result.payload.sessionId).toBeTruthy();
  });

  it("login returns admin role for admin@exemplu.ro in dev mode", async () => {
    const ctx = makeContext("POST", "/api/auth/login", { email: "admin@exemplu.ro", password: "x" });
    ctx.usersRepository = null;
    const result = await handleAuthRoutes(ctx);
    expect(result.payload.user.role).toBe("admin");
  });

  it("signup returns 201 in dev mode (no usersRepository)", async () => {
    const ctx = makeContext("POST", "/api/auth/signup", {
      name: "Dev", email: "dev@test.com", password: "password1",
    });
    ctx.usersRepository = null;
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(201);
  });

  it("signup returns 500 when role 'user' is not found in DB", async () => {
    const ctx = makeContext("POST", "/api/auth/signup", {
      name: "A", email: "a@b.com", password: "password1",
    });
    ctx.usersRepository.findByEmail.mockResolvedValue(null);
    ctx.usersRepository.getRoleByName.mockResolvedValue(null);
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(500);
  });

  it("failed login logs the attempt when logsRepository is available", async () => {
    const { verifyPassword } = await import("../auth/password.js");
    verifyPassword.mockResolvedValueOnce(false);
    const logsRepo = { create: vi.fn().mockResolvedValue({}) };
    const suspRepo = { findByUserId: vi.fn().mockResolvedValue(null), upsert: vi.fn().mockResolvedValue({}) };
    const ctx = makeContext("POST", "/api/auth/login", { email: "demo@exemplu.ro", password: "wrong" });
    ctx.logsRepository = logsRepo;
    ctx.suspiciousUsersRepository = suspRepo;
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(401);
    expect(logsRepo.create).toHaveBeenCalled();
  });

  it("successful login logs the event when logsRepository is available", async () => {
    const logsRepo = { create: vi.fn().mockResolvedValue({}) };
    const ctx = makeContext("POST", "/api/auth/login", { email: "demo@exemplu.ro", password: "demo123" });
    ctx.logsRepository = logsRepo;
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(logsRepo.create).toHaveBeenCalled();
  });

  it("signup logs auth:signup when logsRepository is available", async () => {
    const logsRepo = { create: vi.fn().mockResolvedValue({}) };
    const ctx = makeContext("POST", "/api/auth/signup", {
      name: "Alice", email: "alice@test.com", password: "password1",
    });
    ctx.usersRepository.findByEmail.mockResolvedValue(null);
    ctx.logsRepository = logsRepo;
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(201);
    expect(logsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth:signup" })
    );
  });

  it("logout logs auth:logout when logsRepository is available and session exists", async () => {
    // First log in to establish a session
    const loginCtx = makeContext("POST", "/api/auth/login", { email: "demo@exemplu.ro", password: "demo123" });
    const { payload: { sessionId } } = await handleAuthRoutes(loginCtx);

    const logsRepo = { create: vi.fn().mockResolvedValue({}) };
    const ctx = makeContext("POST", "/api/auth/logout", null, { "x-session-id": sessionId });
    ctx.logsRepository = logsRepo;
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(logsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth:logout" })
    );
  });

  it("logout does not throw when logsRepository is null", async () => {
    const loginCtx = makeContext("POST", "/api/auth/login", { email: "demo@exemplu.ro", password: "demo123" });
    const { payload: { sessionId } } = await handleAuthRoutes(loginCtx);
    const ctx = makeContext("POST", "/api/auth/logout", null, { "x-session-id": sessionId });
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(200);
  });

  it("returns null for unrecognised auth paths (fallthrough)", async () => {
    const ctx = makeContext("GET", "/api/auth/unknown-endpoint", null);
    expect(await handleAuthRoutes(ctx)).toBeNull();
  });

  // ── JWT fields in login / signup responses ───────────────────────────────

  it("login response includes accessToken and refreshToken", async () => {
    const ctx = makeContext("POST", "/api/auth/login", { email: "demo@exemplu.ro", password: "demo123" });
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.accessToken).toBeTruthy();
    expect(result.payload.refreshToken).toBeTruthy();
  });

  it("signup response includes accessToken and refreshToken", async () => {
    const ctx = makeContext("POST", "/api/auth/signup", {
      name: "Alice", email: "alice@test.com", password: "password1",
    });
    ctx.usersRepository.findByEmail.mockResolvedValue(null);
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(201);
    expect(result.payload.accessToken).toBeTruthy();
    expect(result.payload.refreshToken).toBeTruthy();
  });

  it("dev-mode login includes accessToken and refreshToken", async () => {
    const ctx = makeContext("POST", "/api/auth/login", { email: "admin@exemplu.ro", password: "x" });
    ctx.usersRepository = null;
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.accessToken).toBeTruthy();
    expect(result.payload.refreshToken).toBeTruthy();
  });

  // ── POST /api/auth/refresh ───────────────────────────────────────────────

  it("refresh returns new accessToken with valid refreshToken", async () => {
    const { signRefreshToken } = await import("../auth/jwt.js");
    const token = signRefreshToken(USER_RECORD);
    const ctx = makeContext("POST", "/api/auth/refresh", { refreshToken: token });
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.accessToken).toBeTruthy();
    expect(result.payload.refreshToken).toBeTruthy();
  });

  it("refresh returns 401 for invalid refreshToken", async () => {
    const ctx = makeContext("POST", "/api/auth/refresh", { refreshToken: "not-a-valid-token" });
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(401);
  });

  it("refresh returns 400 when refreshToken is missing from body", async () => {
    const ctx = makeContext("POST", "/api/auth/refresh", {});
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(400);
  });

  it("refresh returns 503 when usersRepository is absent", async () => {
    const { signRefreshToken } = await import("../auth/jwt.js");
    const token = signRefreshToken(USER_RECORD);
    const ctx = makeContext("POST", "/api/auth/refresh", { refreshToken: token });
    ctx.usersRepository = null;
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(503);
  });

  it("refresh returns 401 when user no longer exists in DB", async () => {
    const { signRefreshToken } = await import("../auth/jwt.js");
    const token = signRefreshToken(USER_RECORD);
    const ctx = makeContext("POST", "/api/auth/refresh", { refreshToken: token });
    ctx.usersRepository.findById.mockResolvedValue(null);
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(401);
  });

  // ── POST /api/auth/forgot-password ───────────────────────────────────────

  it("forgot-password returns 200 for existing email and includes resetToken (demo)", async () => {
    const ctx = makeContext("POST", "/api/auth/forgot-password", { email: "demo@exemplu.ro" });
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.resetToken).toBeTruthy();
  });

  it("forgot-password returns 200 even for non-existing email (privacy)", async () => {
    const ctx = makeContext("POST", "/api/auth/forgot-password", { email: "nobody@test.com" });
    ctx.usersRepository.findByEmail.mockResolvedValue(null);
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.resetToken).toBeUndefined();
  });

  it("forgot-password returns 400 when email is missing", async () => {
    const ctx = makeContext("POST", "/api/auth/forgot-password", {});
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(400);
  });

  it("forgot-password returns 200 when usersRepository is absent", async () => {
    const ctx = makeContext("POST", "/api/auth/forgot-password", { email: "demo@exemplu.ro" });
    ctx.usersRepository = null;
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(200);
  });

  // ── POST /api/auth/reset-password ────────────────────────────────────────

  it("reset-password succeeds with valid token", async () => {
    _clearResetTokens();

    // Obtain a real reset token
    const forgotCtx = makeContext("POST", "/api/auth/forgot-password", { email: "demo@exemplu.ro" });
    const forgotResult = await handleAuthRoutes(forgotCtx);
    const { resetToken } = forgotResult.payload;

    const ctx = makeContext("POST", "/api/auth/reset-password", {
      resetToken,
      newPassword: "NewPassword1",
    });
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(ctx.usersRepository.updatePassword).toHaveBeenCalledWith("u1", expect.any(String));
  });

  it("reset-password returns 400 for invalid/unknown token", async () => {
    const ctx = makeContext("POST", "/api/auth/reset-password", {
      resetToken: "00000000-0000-0000-0000-000000000000",
      newPassword: "NewPassword1",
    });
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(400);
  });

  it("reset-password returns 400 when password is too short", async () => {
    const ctx = makeContext("POST", "/api/auth/reset-password", {
      resetToken: "some-token",
      newPassword: "short",
    });
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(400);
  });

  it("reset-password returns 400 when fields are missing", async () => {
    const ctx = makeContext("POST", "/api/auth/reset-password", { newPassword: "ValidPass1" });
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(400);
  });

  it("me returns permissions=[] when usersRepository is absent", async () => {
    const loginCtx = makeContext("POST", "/api/auth/login", {
      email: "demo@exemplu.ro", password: "demo123",
    });
    const loginResult = await handleAuthRoutes(loginCtx);
    const { sessionId } = loginResult.payload;

    const meCtx = makeContext("GET", "/api/auth/me", null, { "x-session-id": sessionId });
    meCtx.usersRepository = null;
    const result = await handleAuthRoutes(meCtx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.permissions).toEqual([]);
  });

  it("signup returns 400 when body is null", async () => {
    const ctx = makeContext("POST", "/api/auth/signup", null);
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(400);
  });

  // ── POST /api/auth/logout ────────────────────────────────────────────

  it("logout returns 200", async () => {
    const ctx = makeContext("POST", "/api/auth/logout", null);
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(200);
  });

  it("logout handles array X-Session-Id header", async () => {
    const loginCtx = makeContext("POST", "/api/auth/login", { email: "demo@exemplu.ro", password: "demo123" });
    const { payload: { sessionId } } = await handleAuthRoutes(loginCtx);
    const ctx = makeContext("POST", "/api/auth/logout", null, { "x-session-id": [sessionId] });
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(200);
  });

  // ── GET /api/auth/me ─────────────────────────────────────────────────

  it("me returns 401 when not authenticated", async () => {
    const ctx = makeContext("GET", "/api/auth/me", null, {});
    const result = await handleAuthRoutes(ctx);
    expect(result.statusCode).toBe(401);
  });

  it("me returns current user when session is valid", async () => {
    // First log in to get a session
    const loginCtx = makeContext("POST", "/api/auth/login", {
      email: "demo@exemplu.ro", password: "demo123",
    });
    const loginResult = await handleAuthRoutes(loginCtx);
    const { sessionId } = loginResult.payload;

    const meCtx = makeContext("GET", "/api/auth/me", null, { "x-session-id": sessionId });
    const result = await handleAuthRoutes(meCtx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.user.email).toBe("demo@exemplu.ro");
  });
});
