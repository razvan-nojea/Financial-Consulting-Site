/**
 * JsonSuspiciousUsersRepository — file-backed observation-list store.
 *
 * Persists suspicious-user entries to a JSON file so the list survives
 * server restarts.  Accepts an optional usersRepository reference so it can
 * embed name/email when returning entries (same as the in-memory version).
 * Implements the same interface as InMemorySuspiciousUsersRepository / SuspiciousUsersRepository.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { ensureDir } from "./json-repository-utils.js";

export class JsonSuspiciousUsersRepository {
  constructor(filePath = "./data/suspicious-users.json", usersRepository = null) {
    this.filePath = filePath;
    this._usersRepo = usersRepository;
    this._entries = this._load(); // Map<userId, entry>
  }

  setUsersRepository(usersRepository) {
    this._usersRepo = usersRepository;
  }

  _ensureDir() {
    ensureDir(this.filePath);
  }

  _load() {
    const map = new Map();
    if (!existsSync(this.filePath)) return map;
    try {
      const raw = JSON.parse(readFileSync(this.filePath, "utf8"));
      for (const entry of raw) {
        map.set(entry.userId, {
          ...entry,
          detectedAt: new Date(entry.detectedAt),
          updatedAt:  new Date(entry.updatedAt),
          resolvedAt: entry.resolvedAt ? new Date(entry.resolvedAt) : null,
        });
      }
    } catch {
      // ignore corrupt file — start fresh
    }
    return map;
  }

  _persist() {
    this._ensureDir();
    writeFileSync(
      this.filePath,
      JSON.stringify([...this._entries.values()], null, 2),
      "utf8"
    );
  }

  async _withUser(entry) {
    let user = { email: entry.userId, name: entry.userId, userRoles: [] };
    if (this._usersRepo) {
      const u = await this._usersRepo.findById(entry.userId);
      if (u) user = { email: u.email, name: u.name, userRoles: [{ role: { name: u.role } }] };
    }
    return { ...entry, user };
  }

  async findAll() {
    const entries = [...this._entries.values()].sort((a, b) => {
      if (!a.resolvedAt && b.resolvedAt) return -1;
      if (a.resolvedAt && !b.resolvedAt) return 1;
      return b.detectedAt - a.detectedAt;
    });
    return Promise.all(entries.map((e) => this._withUser(e)));
  }

  async findByUserId(userId) {
    const entry = this._entries.get(userId);
    if (!entry) return null;
    return this._withUser(entry);
  }

  async upsert({ userId, reason, score, triggeredRules = [], aiAnalysis }) {
    const existing = this._entries.get(userId);
    const entry = {
      userId,
      reason,
      score,
      triggeredRules,
      aiAnalysis: aiAnalysis ?? existing?.aiAnalysis ?? null,
      detectedAt: existing?.detectedAt ?? new Date(),
      updatedAt:  new Date(),
      resolvedAt: null,
    };
    this._entries.set(userId, entry);
    this._persist();
    return entry;
  }

  async updateAiAnalysis(userId, aiAnalysis) {
    const entry = this._entries.get(userId);
    if (!entry) return;
    entry.aiAnalysis = aiAnalysis;
    entry.updatedAt  = new Date();
    this._persist();
  }

  async resolve(userId) {
    const entry = this._entries.get(userId);
    if (!entry) return null;
    entry.resolvedAt = new Date();
    entry.updatedAt  = new Date();
    this._persist();
    return { ...entry };
  }
}
