import { beforeEach, describe, expect, it, vi } from "vitest";
import { SuspiciousUsersRepository } from "./suspicious-users-repository.js";

const USER_ROW = { id: "u1", email: "bad@test.com", name: "Bad Actor", userRoles: [] };

const SUSP_ROW = {
  userId: "u1",
  user: USER_ROW,
  reason: "Too many deletes",
  score: 30,
  triggeredRules: ["appointment:delete"],
  detectedAt: new Date("2026-05-01"),
  updatedAt: new Date("2026-05-01"),
  resolvedAt: null,
};

function makePrisma(overrides = {}) {
  return {
    suspiciousUser: {
      findMany: vi.fn().mockResolvedValue([SUSP_ROW]),
      findUnique: vi.fn().mockResolvedValue(SUSP_ROW),
      upsert: vi.fn().mockResolvedValue(SUSP_ROW),
      update: vi.fn().mockResolvedValue({ ...SUSP_ROW, resolvedAt: new Date() }),
      ...overrides.suspiciousUser,
    },
  };
}

describe("SuspiciousUsersRepository", () => {
  let prisma;
  let repo;

  beforeEach(() => {
    prisma = makePrisma();
    repo = new SuspiciousUsersRepository(prisma);
  });

  // ── findAll ───────────────────────────────────────────────────────────

  it("findAll returns all suspicious users with user details", async () => {
    const rows = await repo.findAll();
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe("u1");
    expect(rows[0].user.email).toBe("bad@test.com");
  });

  // ── findByUserId ──────────────────────────────────────────────────────

  it("findByUserId returns the entry for a user", async () => {
    const row = await repo.findByUserId("u1");
    expect(row).not.toBeNull();
    expect(row.score).toBe(30);
  });

  it("findByUserId returns null when user is not on the list", async () => {
    prisma.suspiciousUser.findUnique.mockResolvedValue(null);
    expect(await repo.findByUserId("clean-user")).toBeNull();
  });

  // ── upsert ────────────────────────────────────────────────────────────

  it("upsert creates or updates the observation entry", async () => {
    await repo.upsert({ userId: "u1", reason: "Deleted too much", score: 60 });
    expect(prisma.suspiciousUser.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1" },
        create: expect.objectContaining({ score: 60 }),
        update: expect.objectContaining({ score: 60 }),
      })
    );
  });

  it("upsert resets resolvedAt to null on update", async () => {
    await repo.upsert({ userId: "u1", reason: "Again", score: 50 });
    expect(prisma.suspiciousUser.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ resolvedAt: null }) })
    );
  });

  it("upsert stores triggeredRules when provided", async () => {
    await repo.upsert({ userId: "u1", reason: "Bad", score: 40, triggeredRules: ["appointment:delete", "auth:login_failed"] });
    expect(prisma.suspiciousUser.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ triggeredRules: ["appointment:delete", "auth:login_failed"] }),
        update: expect.objectContaining({ triggeredRules: ["appointment:delete", "auth:login_failed"] }),
      })
    );
  });

  it("upsert defaults triggeredRules to [] when not provided", async () => {
    await repo.upsert({ userId: "u1", reason: "Bad", score: 40 });
    expect(prisma.suspiciousUser.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ triggeredRules: [] }),
        update: expect.objectContaining({ triggeredRules: [] }),
      })
    );
  });

  // ── resolve ───────────────────────────────────────────────────────────

  it("resolve sets resolvedAt on the record", async () => {
    const result = await repo.resolve("u1");
    expect(prisma.suspiciousUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } })
    );
    expect(result.resolvedAt).toBeTruthy();
  });

  it("resolve returns null when the user is not on the list", async () => {
    prisma.suspiciousUser.update.mockRejectedValue(new Error("Not found"));
    expect(await repo.resolve("unknown")).toBeNull();
  });
});
