import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogsRepository } from "./logs-repository.js";

const LOG_ROW = {
  id: "log-1",
  userId: "u1",
  userEmail: "demo@exemplu.ro",
  groupId: "USER",
  action: "appointment:create",
  details: {},
  ipAddress: "127.0.0.1",
  sessionId: null,
  timestamp: new Date("2026-05-01T10:00:00Z"),
};

function makePrisma(overrides = {}) {
  return {
    log: {
      create: vi.fn().mockResolvedValue(LOG_ROW),
      findMany: vi.fn().mockResolvedValue([LOG_ROW]),
      count: vi.fn().mockResolvedValue(3),
      ...overrides.log,
    },
  };
}

describe("LogsRepository", () => {
  let prisma;
  let repo;

  beforeEach(() => {
    prisma = makePrisma();
    repo = new LogsRepository(prisma);
  });

  // ── create ────────────────────────────────────────────────────────────

  it("create persists a log entry", async () => {
    const result = await repo.create({
      id: "log-1",
      userId: "u1",
      userEmail: "demo@exemplu.ro",
      groupId: "USER",
      action: "appointment:create",
    });
    expect(prisma.log.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "appointment:create",
          groupId: "USER",
        }),
      })
    );
    expect(result).toEqual(LOG_ROW);
  });

  it("create defaults details to {} and ipAddress to ''", async () => {
    await repo.create({ id: "log-2", userId: "u1", userEmail: "a@b.com", groupId: "USER", action: "x" });
    expect(prisma.log.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ details: {}, ipAddress: "" }),
      })
    );
  });

  it("create defaults sessionId to null", async () => {
    await repo.create({ id: "log-3", userId: "u1", userEmail: "a@b.com", groupId: "USER", action: "x" });
    expect(prisma.log.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sessionId: null }),
      })
    );
  });

  it("create passes sessionId when provided", async () => {
    await repo.create({
      id: "log-4", userId: "u1", userEmail: "a@b.com", groupId: "USER", action: "x",
      sessionId: "sess-abc",
    });
    expect(prisma.log.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sessionId: "sess-abc" }),
      })
    );
  });

  // ── findAll ───────────────────────────────────────────────────────────

  it("findAll returns entries ordered by timestamp desc", async () => {
    const logs = await repo.findAll();
    expect(prisma.log.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { timestamp: "desc" } })
    );
    expect(logs).toHaveLength(1);
  });

  it("findAll respects limit and offset", async () => {
    await repo.findAll({ limit: 50, offset: 10 });
    expect(prisma.log.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50, skip: 10 })
    );
  });

  // ── findAllFiltered ───────────────────────────────────────────────────

  it("findAllFiltered with no filters returns all entries", async () => {
    await repo.findAllFiltered();
    expect(prisma.log.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, orderBy: { timestamp: "desc" } })
    );
  });

  it("findAllFiltered filters by userId", async () => {
    await repo.findAllFiltered({ userId: "u1" });
    expect(prisma.log.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "u1" }) })
    );
  });

  it("findAllFiltered filters by action", async () => {
    await repo.findAllFiltered({ action: "appointment:delete" });
    expect(prisma.log.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ action: "appointment:delete" }) })
    );
  });

  it("findAllFiltered filters by date range", async () => {
    await repo.findAllFiltered({ startDate: "2026-05-01", endDate: "2026-05-31" });
    expect(prisma.log.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          timestamp: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
        }),
      })
    );
  });

  it("findAllFiltered respects limit and offset", async () => {
    await repo.findAllFiltered({ limit: 25, offset: 5 });
    expect(prisma.log.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 25, skip: 5 })
    );
  });

  // ── findByUserId ──────────────────────────────────────────────────────

  it("findByUserId filters by userId", async () => {
    await repo.findByUserId("u1");
    expect(prisma.log.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } })
    );
  });

  it("findByUserId respects limit", async () => {
    await repo.findByUserId("u1", { limit: 10 });
    expect(prisma.log.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });

  // ── countRecentByUserAndAction ────────────────────────────────────────

  it("countRecentByUserAndAction counts matching logs since a date", async () => {
    const count = await repo.countRecentByUserAndAction("u1", "appointment:delete", 60_000);
    expect(prisma.log.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "u1",
          action: "appointment:delete",
        }),
      })
    );
    expect(count).toBe(3);
  });

  // ── countRecentByIpAndAction ──────────────────────────────────────────

  it("countRecentByIpAndAction counts logs from a given IP", async () => {
    const count = await repo.countRecentByIpAndAction("192.168.1.1", "auth:login_failed", 600_000);
    expect(prisma.log.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ipAddress: "192.168.1.1",
          action: "auth:login_failed",
        }),
      })
    );
    expect(count).toBe(3);
  });

  it("countRecentByIpAndAction uses a timestamp filter", async () => {
    await repo.countRecentByIpAndAction("10.0.0.1", "auth:login_failed", 300_000);
    expect(prisma.log.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          timestamp: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      })
    );
  });

  // ── getStats ──────────────────────────────────────────────────────────

  it("getStats returns total and recentCount", async () => {
    const stats = await repo.getStats();
    expect(stats).toEqual({ total: 3, recentCount: 3, windowMs: 24 * 60 * 60_000 });
  });

  it("getStats respects custom windowMs", async () => {
    await repo.getStats({ windowMs: 60_000 });
    // Second count call uses the timestamp filter
    const calls = prisma.log.count.mock.calls;
    const filteredCall = calls.find((args) => args[0]?.where?.timestamp);
    expect(filteredCall).toBeDefined();
  });
});
