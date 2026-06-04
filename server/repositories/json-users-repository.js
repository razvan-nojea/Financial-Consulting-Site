/**
 * JsonUsersRepository — file-backed users store.
 *
 * On first run seeds demo + admin accounts (same credentials as the Prisma seed).
 * Subsequent runs load the persisted file, so registrations survive restarts.
 * Implements the same interface as InMemoryUsersRepository / UsersRepository.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { ensureDir } from "./json-repository-utils.js";
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

export class JsonUsersRepository {
  constructor(filePath = "./data/users.json") {
    this.filePath = filePath;
    // _ready resolves once the file is loaded / seeded (async because of bcrypt)
    this._users = [];
    this._ready = this._load();
  }

  _ensureDir() {
    ensureDir(this.filePath);
  }

  async _load() {
    if (existsSync(this.filePath)) {
      try {
        this._users = JSON.parse(readFileSync(this.filePath, "utf8"));
        return;
      } catch {
        // fall through to seed
      }
    }
    // First run — create and persist the two default accounts
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
    this._persist();
  }

  _persist() {
    this._ensureDir();
    writeFileSync(this.filePath, JSON.stringify(this._users, null, 2), "utf8");
  }

  async findByEmail(email) {
    await this._ready;
    return this._users.find((u) => u.email === email.toLowerCase()) ?? null;
  }

  async findById(id) {
    await this._ready;
    return this._users.find((u) => u.id === id) ?? null;
  }

  async findAll() {
    await this._ready;
    return [...this._users].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async create({ id, email, passwordHash, name, roleId }) {
    await this._ready;
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
    this._persist();
    return user;
  }

  async getRoleByName(name) {
    const id = ROLE_IDS[name];
    return id != null ? { id, name } : null;
  }

  async getPermissionsForRole(roleName) {
    return PERMISSIONS_BY_ROLE[roleName] ?? [];
  }

  async updatePassword(userId, passwordHash) {
    await this._ready;
    const user = this._users.find((u) => u.id === userId);
    if (!user) return;
    user.passwordHash = passwordHash;
    this._persist();
  }
}
