/**
 * InMemoryUsersRepository — zero-dependency users store for dev / offline mode.
 *
 * Seeded with the same demo accounts as the Prisma seed script:
 *   demo@exemplu.ro  / demo123  → role "user"
 *   admin@exemplu.ro / admin123 → role "admin"
 *
 * New accounts registered via /api/auth/signup are held in-process (lost on restart).
 */
import { hashPassword } from "../auth/password.js";

const ROLE_IDS = { user: 2, admin: 1 };
const ID_TO_ROLE = { 1: "admin", 2: "user" };

const USER_PERMISSIONS = [
  "appointments:read",
  "appointments:write",
  "appointments:delete",
];
const ADMIN_PERMISSIONS = [
  ...USER_PERMISSIONS,
  "admin:users",
  "admin:logs",
  "admin:suspicious",
  "appointments:all",
];
const PERMISSIONS_BY_ROLE = { user: USER_PERMISSIONS, admin: ADMIN_PERMISSIONS };

export class InMemoryUsersRepository {
  constructor() {
    this._users = [];
    this._ready = this._seed();
  }

  async _seed() {
    const [demoHash, adminHash] = await Promise.all([
      hashPassword("demo123"),
      hashPassword("admin123"),
    ]);
    this._users = [
      {
        id: "user-demo",
        email: "demo@exemplu.ro",
        passwordHash: demoHash,
        name: "Cont Demo",
        role: "user",
        createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      },
      {
        id: "user-admin",
        email: "admin@exemplu.ro",
        passwordHash: adminHash,
        name: "Administrator",
        role: "admin",
        createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      },
    ];
  }

  async _wait() {
    await this._ready;
  }

  async findByEmail(email) {
    await this._wait();
    return this._users.find((u) => u.email === email.toLowerCase()) ?? null;
  }

  async findById(id) {
    await this._wait();
    return this._users.find((u) => u.id === id) ?? null;
  }

  async findAll() {
    await this._wait();
    return [...this._users].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * @param {{id, email, passwordHash, name, roleId}} params
   */
  async create({ id, email, passwordHash, name, roleId }) {
    await this._wait();
    const role = ID_TO_ROLE[roleId] ?? "user";
    const user = {
      id,
      email: email.toLowerCase(),
      passwordHash,
      name,
      role,
      createdAt: new Date().toISOString(),
    };
    this._users.push(user);
    return user;
  }

  async getRoleByName(name) {
    const id = ROLE_IDS[name];
    return id != null ? { id, name } : null;
  }

  async getPermissionsForRole(roleName) {
    return PERMISSIONS_BY_ROLE[roleName] ?? [];
  }
}
