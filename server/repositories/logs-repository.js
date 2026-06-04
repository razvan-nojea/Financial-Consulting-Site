/**
 * LogsRepository — Prisma-backed persistence for the action audit trail.
 */
import { PrismaClient } from "@prisma/client";

const defaultPrisma = new PrismaClient();

export class LogsRepository {
  constructor(client = defaultPrisma) {
    this.prisma = client;
  }

  /**
   * Persists one log entry.
   * @param {{id,userId,userEmail,groupId,action,details?,ipAddress?,sessionId?}} entry
   */
  async create({ id, userId, userEmail, groupId, action, details = {}, ipAddress = "", sessionId = null }) {
    return this.prisma.log.create({
      data: { id, userId, userEmail, groupId, action, details, ipAddress, sessionId },
    });
  }

  /**
   * Returns the most recent log entries, optionally filtered.
   * @param {{limit?,offset?}} options
   */
  async findAll({ limit = 100, offset = 0 } = {}) {
    return this.prisma.log.findMany({
      orderBy: { timestamp: "desc" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Returns log entries filtered by optional criteria.
   * @param {{userId?,action?,startDate?,endDate?,limit?,offset?}} options
   */
  async findAllFiltered({ userId, action, startDate, endDate, limit = 100, offset = 0 } = {}) {
    const where = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }
    return this.prisma.log.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Returns log entries for a specific user.
   * @param {string} userId
   * @param {{limit?}} options
   */
  async findByUserId(userId, { limit = 50 } = {}) {
    return this.prisma.log.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
  }

  /**
   * Counts how many times a user performed a specific action within a time window.
   * Used by the malicious-behaviour detector for per-user thresholds.
   * @param {string} userId
   * @param {string} action
   * @param {number} windowMs  milliseconds to look back
   * @returns {Promise<number>}
   */
  async countRecentByUserAndAction(userId, action, windowMs) {
    const since = new Date(Date.now() - windowMs);
    return this.prisma.log.count({
      where: { userId, action, timestamp: { gte: since } },
    });
  }

  /**
   * Counts how many times a specific action was performed from a given IP
   * within a time window. Used for IP-based brute-force detection.
   * @param {string} ipAddress
   * @param {string} action
   * @param {number} windowMs  milliseconds to look back
   * @returns {Promise<number>}
   */
  async countRecentByIpAndAction(ipAddress, action, windowMs) {
    const since = new Date(Date.now() - windowMs);
    return this.prisma.log.count({
      where: { ipAddress, action, timestamp: { gte: since } },
    });
  }

  /**
   * Returns aggregate statistics about the audit log.
   * @param {{windowMs?}} options  windowMs defaults to last 24 hours
   * @returns {Promise<{total:number, recentCount:number, windowMs:number}>}
   */
  async getStats({ windowMs = 24 * 60 * 60_000 } = {}) {
    const since = new Date(Date.now() - windowMs);
    const [total, recentCount] = await Promise.all([
      this.prisma.log.count(),
      this.prisma.log.count({ where: { timestamp: { gte: since } } }),
    ]);
    return { total, recentCount, windowMs };
  }
}
