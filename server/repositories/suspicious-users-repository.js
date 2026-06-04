/**
 * SuspiciousUsersRepository — Prisma-backed persistence for the admin
 * observation list.  A user appears here when the behaviour-detection
 * middleware accumulates enough suspicious events.
 */
import { PrismaClient } from "@prisma/client";

const defaultPrisma = new PrismaClient();

export class SuspiciousUsersRepository {
  constructor(client = defaultPrisma) {
    this.prisma = client;
  }

  /** Returns all suspicious users (unresolved first), with user details. */
  async findAll() {
    return this.prisma.suspiciousUser.findMany({
      include: { user: { include: { userRoles: { include: { role: true } } } } },
      orderBy: [{ resolvedAt: "asc" }, { detectedAt: "desc" }],
    });
  }

  /** Returns the observation entry for a user id, or null. */
  async findByUserId(userId) {
    return this.prisma.suspiciousUser.findUnique({
      where: { userId },
      include: { user: true },
    });
  }

  /**
   * Creates or updates the observation entry for a user (idempotent).
   * triggeredRules records the set of detection rule IDs that have fired.
   * @param {{userId, reason, score, triggeredRules?, aiAnalysis?}} params
   */
  async upsert({ userId, reason, score, triggeredRules = [], aiAnalysis }) {
    const aiData = aiAnalysis ?? undefined; // keep existing value if not provided
    return this.prisma.suspiciousUser.upsert({
      where:  { userId },
      update: { reason, score, resolvedAt: null, triggeredRules, ...(aiData !== undefined && { aiAnalysis: aiData }) },
      create: { userId, reason, score, triggeredRules, aiAnalysis: aiData ?? null },
    });
  }

  /**
   * Stores the AI-generated analysis for an existing suspicious-user record.
   * Called asynchronously after the LLM responds — never blocks detection.
   * @param {string} userId
   * @param {object} aiAnalysis
   */
  async updateAiAnalysis(userId, aiAnalysis) {
    try {
      await this.prisma.suspiciousUser.update({
        where: { userId },
        data:  { aiAnalysis },
      });
    } catch {
      // Row may have been resolved/deleted between detection and AI response.
    }
  }

  /**
   * Marks a suspicious user as resolved.
   * Returns the updated record or null when the user was not found.
   */
  async resolve(userId) {
    try {
      return await this.prisma.suspiciousUser.update({
        where: { userId },
        data: { resolvedAt: new Date() },
      });
    } catch {
      return null;
    }
  }
}
