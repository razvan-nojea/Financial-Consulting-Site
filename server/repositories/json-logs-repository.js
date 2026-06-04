/**
 * JsonLogsRepository — file-backed audit-log store.
 *
 * Keeps the log array in memory for fast reads and writes every mutation
 * to a JSON file so the audit trail survives server restarts.
 * Implements the same interface as InMemoryLogsRepository / LogsRepository.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { ensureDir } from "./json-repository-utils.js";
import { randomUUID } from "node:crypto";

export class JsonLogsRepository {
  constructor(filePath = "./data/logs.json") {
    this.filePath = filePath;
    this._logs = this._load();
  }

  _ensureDir() {
    ensureDir(this.filePath);
  }

  _load() {
    if (!existsSync(this.filePath)) return [];
    try {
      const raw = JSON.parse(readFileSync(this.filePath, "utf8"));
      // Re-hydrate timestamp strings to Date objects
      return raw.map((l) => ({ ...l, timestamp: new Date(l.timestamp) }));
    } catch {
      return [];
    }
  }

  _persist() {
    this._ensureDir();
    writeFileSync(this.filePath, JSON.stringify(this._logs, null, 2), "utf8");
  }

  async create({ id, userId, userEmail, groupId, action, details = {}, ipAddress = "", sessionId = null }) {
    const entry = {
      id: id ?? randomUUID(),
      userId,
      userEmail,
      groupId,
      action,
      details,
      ipAddress,
      sessionId,
      timestamp: new Date(),
    };
    this._logs.push(entry);
    this._persist();
    return entry;
  }

  /** Sort `arr` newest-first and apply pagination. */
  _sortedSlice(arr, offset = 0, limit = 100) {
    return arr
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(offset, offset + limit);
  }

  async findAll({ limit = 100, offset = 0 } = {}) {
    return this._sortedSlice([...this._logs], offset, limit);
  }

  async findAllFiltered({ userId, action, startDate, endDate, limit = 100, offset = 0 } = {}) {
    let result = this._logs;
    if (userId)    result = result.filter((l) => l.userId === userId);
    if (action)    result = result.filter((l) => l.action === action);
    if (startDate) result = result.filter((l) => l.timestamp >= new Date(startDate));
    if (endDate)   result = result.filter((l) => l.timestamp <= new Date(endDate));
    return this._sortedSlice([...result], offset, limit);
  }

  async findByUserId(userId, { limit = 50 } = {}) {
    return this._sortedSlice(
      this._logs.filter((l) => l.userId === userId),
      0,
      limit
    );
  }

  async countRecentByUserAndAction(userId, action, windowMs) {
    const since = new Date(Date.now() - windowMs);
    return this._logs.filter(
      (l) => l.userId === userId && l.action === action && l.timestamp >= since
    ).length;
  }

  async countRecentByIpAndAction(ipAddress, action, windowMs) {
    const since = new Date(Date.now() - windowMs);
    return this._logs.filter(
      (l) => l.ipAddress === ipAddress && l.action === action && l.timestamp >= since
    ).length;
  }

  async getStats({ windowMs = 24 * 60 * 60_000 } = {}) {
    const since = new Date(Date.now() - windowMs);
    return {
      total: this._logs.length,
      recentCount: this._logs.filter((l) => l.timestamp >= since).length,
      windowMs,
    };
  }
}
