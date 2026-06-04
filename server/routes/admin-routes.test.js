import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleAdminRoutes } from "./admin-routes.js";
import { createSession, _clearAllSessions } from "../auth/session-store.js";

const ADMIN_USER = { id: "u2", email: "admin@exemplu.ro", name: "Admin", role: "admin" };
const NORMAL_USER = { id: "u1", email: "demo@exemplu.ro", name: "Demo", role: "user" };

const LOG_ROW = { id: "l1", userId: "u1", action: "appointment:create", timestamp: new Date() };

function makeRepos(overrides = {}) {
  return {
    usersRepository: {
      findAll: vi.fn().mockResolvedValue([ADMIN_USER, NORMAL_USER]),
      ...overrides.usersRepository,
    },
    logsRepository: {
      findAll: vi.fn().mockResolvedValue([LOG_ROW]),
      findAllFiltered: vi.fn().mockResolvedValue([LOG_ROW]),
      findByUserId: vi.fn().mockResolvedValue([LOG_ROW]),
      getStats: vi.fn().mockResolvedValue({ total: 42, recentCount: 5, windowMs: 86400000 }),
      ...overrides.logsRepository,
    },
    suspiciousUsersRepository: {
      findAll: vi.fn().mockResolvedValue([
        {
          userId: "u1",
          user: { ...NORMAL_USER, userRoles: [{ role: { name: "user" } }] },
          reason: "Too many deletes",
          score: 60,
          triggeredRules: ["appointment:delete"],
          detectedAt: new Date(),
          resolvedAt: null,
        },
      ]),
      resolve: vi.fn().mockResolvedValue({ userId: "u1", resolvedAt: new Date() }),
      ...overrides.suspiciousUsersRepository,
    },
  };
}

function makeContext(method, pathname, headers = {}, repos = makeRepos(), searchParams = new URLSearchParams()) {
  return {
    request: { method, headers, socket: {} },
    pathname,
    body: null,
    searchParams,
    ...repos,
  };
}

describe("handleAdminRoutes", () => {
  let adminSessionId;

  beforeEach(() => {
    _clearAllSessions();
    adminSessionId = createSession(ADMIN_USER);
  });

  it("returns null for non-admin paths", async () => {
    const ctx = makeContext("GET", "/api/appointments", { "x-session-id": adminSessionId });
    expect(await handleAdminRoutes(ctx)).toBeNull();
  });

  it("returns 401 when not authenticated", async () => {
    const ctx = makeContext("GET", "/api/admin/users", {});
    const result = await handleAdminRoutes(ctx);
    expect(result.statusCode).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    const userSessionId = createSession(NORMAL_USER);
    const ctx = makeContext("GET", "/api/admin/users", { "x-session-id": userSessionId });
    const result = await handleAdminRoutes(ctx);
    expect(result.statusCode).toBe(403);
  });

  // ── GET /api/admin/users ─────────────────────────────────────────────

  it("returns the user list for admin", async () => {
    const ctx = makeContext("GET", "/api/admin/users", { "x-session-id": adminSessionId });
    const result = await handleAdminRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.users).toHaveLength(2);
  });

  it("returns empty users array when usersRepository is absent", async () => {
    const ctx = makeContext("GET", "/api/admin/users", { "x-session-id": adminSessionId }, {
      usersRepository: null, logsRepository: null, suspiciousUsersRepository: null,
    });
    const result = await handleAdminRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.users).toEqual([]);
  });

  // ── GET /api/admin/logs ──────────────────────────────────────────────

  it("returns the audit log for admin (uses findAllFiltered)", async () => {
    const ctx = makeContext("GET", "/api/admin/logs", { "x-session-id": adminSessionId });
    const result = await handleAdminRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.logs).toHaveLength(1);
    expect(makeRepos().logsRepository.findAllFiltered).toBeDefined();
  });

  it("passes filter params to findAllFiltered", async () => {
    const repos = makeRepos();
    const sp = new URLSearchParams({ userId: "u1", action: "appointment:delete", limit: "50", offset: "10" });
    const ctx = makeContext("GET", "/api/admin/logs", { "x-session-id": adminSessionId }, repos, sp);
    await handleAdminRoutes(ctx);
    expect(repos.logsRepository.findAllFiltered).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", action: "appointment:delete", limit: 50, offset: 10 })
    );
  });

  it("returns empty logs array when logsRepository is absent", async () => {
    const ctx = makeContext("GET", "/api/admin/logs", { "x-session-id": adminSessionId }, {
      usersRepository: null, logsRepository: null, suspiciousUsersRepository: null,
    });
    const result = await handleAdminRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.logs).toEqual([]);
  });

  // ── GET /api/admin/logs/user/:userId ─────────────────────────────────

  it("returns logs for a specific user", async () => {
    const repos = makeRepos();
    const ctx = makeContext("GET", "/api/admin/logs/user/u1", { "x-session-id": adminSessionId }, repos);
    const result = await handleAdminRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(repos.logsRepository.findByUserId).toHaveBeenCalledWith("u1", expect.any(Object));
  });

  it("returns empty logs when logsRepository is absent for user-logs route", async () => {
    const ctx = makeContext("GET", "/api/admin/logs/user/u1", { "x-session-id": adminSessionId }, {
      usersRepository: null, logsRepository: null, suspiciousUsersRepository: null,
    });
    const result = await handleAdminRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.logs).toEqual([]);
  });

  // ── GET /api/admin/stats ─────────────────────────────────────────────

  it("returns aggregate stats for admin", async () => {
    const ctx = makeContext("GET", "/api/admin/stats", { "x-session-id": adminSessionId });
    const result = await handleAdminRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.stats).toMatchObject({
      totalLogs: 42,
      recentLogs: 5,
      activeSuspicious: 1,
      totalUsers: 2,
    });
  });

  it("returns zeroed stats when all repositories are absent", async () => {
    const ctx = makeContext("GET", "/api/admin/stats", { "x-session-id": adminSessionId }, {
      usersRepository: null, logsRepository: null, suspiciousUsersRepository: null,
    });
    const result = await handleAdminRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.stats).toEqual({ totalLogs: 0, recentLogs: 0, activeSuspicious: 0, totalUsers: 0 });
  });

  it("activeSuspicious counts only unresolved entries", async () => {
    const repos = makeRepos({
      suspiciousUsersRepository: {
        findAll: vi.fn().mockResolvedValue([
          { userId: "u1", user: { ...NORMAL_USER, userRoles: [] }, reason: "x", score: 40, triggeredRules: [], detectedAt: new Date(), resolvedAt: null },
          { userId: "u3", user: { ...NORMAL_USER, userRoles: [] }, reason: "y", score: 30, triggeredRules: [], detectedAt: new Date(), resolvedAt: new Date() },
        ]),
        resolve: vi.fn(),
      },
    });
    const ctx = makeContext("GET", "/api/admin/stats", { "x-session-id": adminSessionId }, repos);
    const result = await handleAdminRoutes(ctx);
    expect(result.payload.stats.activeSuspicious).toBe(1);
  });

  // ── GET /api/admin/suspicious ────────────────────────────────────────

  it("returns the suspicious user list for admin", async () => {
    const ctx = makeContext("GET", "/api/admin/suspicious", { "x-session-id": adminSessionId });
    const result = await handleAdminRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.suspicious[0].score).toBe(60);
  });

  it("includes nested user object in suspicious response", async () => {
    const ctx = makeContext("GET", "/api/admin/suspicious", { "x-session-id": adminSessionId });
    const result = await handleAdminRoutes(ctx);
    expect(result.payload.suspicious[0].user).toEqual({ email: "demo@exemplu.ro", name: "Demo" });
  });

  it("includes triggeredRules in suspicious response", async () => {
    const ctx = makeContext("GET", "/api/admin/suspicious", { "x-session-id": adminSessionId });
    const result = await handleAdminRoutes(ctx);
    expect(result.payload.suspicious[0].triggeredRules).toEqual(["appointment:delete"]);
  });

  it("defaults user role to 'user' when userRoles is empty in suspicious list", async () => {
    const repos = makeRepos({
      suspiciousUsersRepository: {
        findAll: vi.fn().mockResolvedValue([
          {
            userId: "u1",
            user: { ...NORMAL_USER, userRoles: [] }, // empty userRoles → default "user"
            reason: "bad",
            score: 40,
            triggeredRules: [],
            detectedAt: new Date(),
            resolvedAt: null,
          },
        ]),
        resolve: vi.fn(),
      },
    });
    const ctx = makeContext("GET", "/api/admin/suspicious", { "x-session-id": adminSessionId }, repos);
    const result = await handleAdminRoutes(ctx);
    expect(result.payload.suspicious[0].role).toBe("user");
  });

  it("returns empty suspicious array when suspiciousUsersRepository is absent", async () => {
    const ctx = makeContext("GET", "/api/admin/suspicious", { "x-session-id": adminSessionId }, {
      usersRepository: null, logsRepository: null, suspiciousUsersRepository: null,
    });
    const result = await handleAdminRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.suspicious).toEqual([]);
  });

  // ── PATCH /api/admin/suspicious/:userId/resolve ──────────────────────

  it("resolves a suspicious user", async () => {
    const ctx = makeContext("PATCH", "/api/admin/suspicious/u1/resolve", { "x-session-id": adminSessionId });
    const result = await handleAdminRoutes(ctx);
    expect(result.statusCode).toBe(200);
  });

  it("returns 404 when resolving an unknown user", async () => {
    const repos = makeRepos({
      suspiciousUsersRepository: {
        findAll: vi.fn(),
        resolve: vi.fn().mockResolvedValue(null),
      },
    });
    const ctx = makeContext("PATCH", "/api/admin/suspicious/unknown/resolve",
      { "x-session-id": adminSessionId }, repos);
    const result = await handleAdminRoutes(ctx);
    expect(result.statusCode).toBe(404);
  });

  it("returns 404 when resolving and suspiciousUsersRepository is null", async () => {
    const ctx = makeContext("PATCH", "/api/admin/suspicious/u1/resolve",
      { "x-session-id": adminSessionId }, { usersRepository: null, logsRepository: null, suspiciousUsersRepository: null });
    const result = await handleAdminRoutes(ctx);
    expect(result.statusCode).toBe(404);
  });

  it("returns 404 for unrecognised admin paths (fallthrough)", async () => {
    const ctx = makeContext("DELETE", "/api/admin/unknown-endpoint", { "x-session-id": adminSessionId });
    const result = await handleAdminRoutes(ctx);
    expect(result.statusCode).toBe(404);
  });
});
