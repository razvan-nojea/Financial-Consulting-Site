/**
 * InMemoryLogsRepository — zero-dependency audit-log store for dev / offline mode.
 *
 * All entries are kept in a JavaScript array (lost on server restart).
 * Implements the same interface as the Prisma-backed LogsRepository so the
 * rest of the codebase (logger, behavior-detection, admin routes) is unaware
 * of which implementation is active.
 */
import { randomUUID } from "node:crypto";

export class InMemoryLogsRepository {
  constructor() {
    /** @type {Array<object>} */
    this._logs = [];
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
    return entry;
  }

  async findAll({ limit = 100, offset = 0 } = {}) {
    return [...this._logs]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(offset, offset + limit);
  }

  async findAllFiltered({ userId, action, startDate, endDate, limit = 100, offset = 0 } = {}) {
    let result = [...this._logs];
    if (userId) result = result.filter((l) => l.userId === userId);
    if (action) result = result.filter((l) => l.action === action);
    if (startDate) result = result.filter((l) => l.timestamp >= new Date(startDate));
    if (endDate) result = result.filter((l) => l.timestamp <= new Date(endDate));
    return result
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(offset, offset + limit);
  }

  async findByUserId(userId, { limit = 50 } = {}) {
    return [...this._logs]
      .filter((l) => l.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
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
