import { beforeEach, describe, expect, it, vi } from "vitest";
import { UsersRepository } from "./users-repository.js";

// ── Mock PrismaClient ─────────────────────────────────────────────────────────

const ROLE_ROW = { id: 1, name: "user" };
const ADMIN_ROLE_ROW = { id: 2, name: "admin" };

const USER_DB = {
  id: "u1",
  email: "demo@exemplu.ro",
  passwordHash: "salt:hash",
  name: "Demo User",
  createdAt: new Date("2026-01-01"),
  userRoles: [{ role: ROLE_ROW }],
};

const ADMIN_DB = {
  id: "u2",
  email: "admin@exemplu.ro",
  passwordHash: "salt:hash",
  name: "Admin",
  createdAt: new Date("2026-01-01"),
  userRoles: [{ role: ADMIN_ROLE_ROW }],
};

function makePrisma(overrides = {}) {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(USER_DB),
      findMany: vi.fn().mockResolvedValue([USER_DB, ADMIN_DB]),
      create: vi.fn().mockResolvedValue(USER_DB),
      ...overrides.user,
    },
    role: {
      findUnique: vi.fn().mockImplementation(({ where }) => {
        if (where.name === "user")  return Promise.resolve({ ...ROLE_ROW, rolePermissions: [{ permission: { name: "appointments:read" } }] });
        if (where.name === "admin") return Promise.resolve({ ...ADMIN_ROLE_ROW, rolePermissions: [{ permission: { name: "admin:logs" } }] });
        return Promise.resolve(null);
      }),
      ...overrides.role,
    },
  };
}

describe("UsersRepository", () => {
  let prisma;
  let repo;

  beforeEach(() => {
    prisma = makePrisma();
    repo = new UsersRepository(prisma);
  });

  // ── findByEmail ────────────────────────────────────────────────────────

  it("findByEmail calls findUnique with lowercased email", async () => {
    await repo.findByEmail("Demo@Exemplu.RO");
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "demo@exemplu.ro" } })
    );
  });

  it("findByEmail returns the mapped user with role", async () => {
    const user = await repo.findByEmail("demo@exemplu.ro");
    expect(user.role).toBe("user");
    expect(user.email).toBe("demo@exemplu.ro");
    expect(user.id).toBe("u1");
  });

  it("findByEmail returns null when user is not found", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const user = await repo.findByEmail("missing@exemplu.ro");
    expect(user).toBeNull();
  });

  // ── findById ───────────────────────────────────────────────────────────

  it("findById returns the mapped user", async () => {
    const user = await repo.findById("u1");
    expect(user.id).toBe("u1");
  });

  it("findById returns null when not found", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    expect(await repo.findById("missing")).toBeNull();
  });

  // ── findAll ────────────────────────────────────────────────────────────

  it("findAll returns all users mapped to domain shape", async () => {
    const users = await repo.findAll();
    expect(users).toHaveLength(2);
    expect(users[0].role).toBe("user");
    expect(users[1].role).toBe("admin");
  });

  // ── create ─────────────────────────────────────────────────────────────

  it("create calls prisma.user.create with correct data", async () => {
    await repo.create({ id: "u3", email: "New@Test.com", passwordHash: "h", name: "New", roleId: 1 });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "new@test.com" }),
      })
    );
  });

  it("create returns the mapped user", async () => {
    const user = await repo.create({ id: "u3", email: "n@t.com", passwordHash: "h", name: "N", roleId: 1 });
    expect(user.id).toBe("u1"); // mock returns USER_DB
  });

  it("mapUser defaults role to 'user' when userRoles is empty", async () => {
    prisma.user.findUnique.mockResolvedValue({ ...USER_DB, userRoles: [] });
    const user = await repo.findById("u1");
    expect(user.role).toBe("user");
  });

  it("mapUser accepts createdAt as a pre-formatted string (non-Date)", async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...USER_DB,
      createdAt: "2026-01-01T00:00:00.000Z", // already a string
    });
    const user = await repo.findById("u1");
    expect(user.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  // ── getRoleByName ──────────────────────────────────────────────────────

  it("getRoleByName returns the role record", async () => {
    const role = await repo.getRoleByName("user");
    expect(role.name).toBe("user");
  });

  it("getRoleByName returns null when role not found", async () => {
    prisma.role.findUnique.mockResolvedValue(null);
    expect(await repo.getRoleByName("superadmin")).toBeNull();
  });

  // ── getPermissionsForRole ──────────────────────────────────────────────

  it("getPermissionsForRole returns permission names for a valid role", async () => {
    const perms = await repo.getPermissionsForRole("user");
    expect(perms).toContain("appointments:read");
  });

  it("getPermissionsForRole returns empty array for unknown role", async () => {
    prisma.role.findUnique.mockResolvedValue(null);
    const perms = await repo.getPermissionsForRole("ghost");
    expect(perms).toEqual([]);
  });
});
