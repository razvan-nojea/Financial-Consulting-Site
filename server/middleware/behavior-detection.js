/**
 * Malicious-behaviour detection middleware.
 *
 * After a log entry is written, this module inspects the user's recent action
 * history and flags them as suspicious when predefined thresholds are exceeded.
 * Flagged users are placed on the admin observation list (suspicious_users table)
 * and the admin is notified in real time via WebSocket.
 *
 * Per-user detection rules:
 *   appointment:delete — > 5 deletions within 60 seconds
 *   appointment:create — > 10 creations within 5 minutes
 *   appointment:update — > 15 updates within 5 minutes
 *   generator:start   — > 5 generator starts within 2 minutes
 *   chat:send         — > 30 messages within 1 minute
 *   auth:login_failed — > 5 failed logins within 10 minutes (per user)
 *
 * IP-based rule (requires ipAddress on session):
 *   auth:login_failed — > 10 failures from the same IP within 10 minutes
 *
 * Composite escalation:
 *   When accumulated score ≥ 75, the reason is overridden with a high-risk
 *   composite label regardless of which individual rule triggered.
 *
 * The score accumulates on repeated violations (capped at 100).
 * Detection failures are always swallowed — they must never affect the response.
 */

import { analyzeUserBehavior } from "../ai/ollama-analyzer.js";

/** @type {Record<string, {maxCount:number, windowMs:number, score:number, reason:string}>} */
export const RULES = {
  "appointment:delete": {
    maxCount: 5,
    windowMs: 60_000,            // 1 minute
    score: 30,
    reason: "Prea multe ștergeri de programări într-un interval scurt",
  },
  "appointment:create": {
    maxCount: 10,
    windowMs: 5 * 60_000,        // 5 minutes
    score: 25,
    reason: "Prea multe programări create într-un interval scurt",
  },
  "appointment:update": {
    maxCount: 15,
    windowMs: 5 * 60_000,        // 5 minutes
    score: 20,
    reason: "Prea multe modificări de programări într-un interval scurt",
  },
  "generator:start": {
    maxCount: 5,
    windowMs: 2 * 60_000,        // 2 minutes
    score: 15,
    reason: "Generator de date pornit în mod excesiv",
  },
  "chat:send": {
    maxCount: 30,
    windowMs: 60_000,            // 1 minute
    score: 10,
    reason: "Mesaje chat trimise în rafală (posibil spam)",
  },
  "auth:login_failed": {
    maxCount: 5,
    windowMs: 10 * 60_000,       // 10 minutes
    score: 50,
    reason: "Prea multe încercări eșuate de autentificare",
  },
};

/** IP-based brute-force rule — keyed separately since it uses ipAddress. */
export const IP_BRUTE_FORCE_RULE = {
  ruleId: "ip:brute_force",
  maxCount: 10,
  windowMs: 10 * 60_000,         // 10 minutes
  score: 40,
  reason: "Atac prin forță brută detectat de la adresa IP",
};

/** Score threshold above which the reason is escalated to a composite label. */
const COMPOSITE_THRESHOLD = 75;
const COMPOSITE_REASON = "Comportament multiplu suspect — risc înalt";

/**
 * Internal helper: persists a suspicion record and broadcasts an alert.
 * @param {object} suspRepo
 * @param {string} userId
 * @param {string} reason
 * @param {number} addScore    score increment (will be added to existing)
 * @param {string} ruleId      identifier for the rule that fired
 * @param {object|null} broadcaster
 */
async function flagUser(suspRepo, userId, reason, addScore, ruleId, broadcaster, logsRepository) {
  const existing = await suspRepo.findByUserId(userId);
  const existingScore = existing?.score ?? 0;
  const newScore = Math.min(existingScore + addScore, 100);

  // Append ruleId to the existing triggered-rules list (avoid duplicates).
  const existingRules = Array.isArray(existing?.triggeredRules) ? existing.triggeredRules : [];
  const newRules = ruleId && !existingRules.includes(ruleId)
    ? [...existingRules, ruleId]
    : existingRules;

  // Escalate reason when accumulated score crosses the composite threshold.
  const finalReason = newScore >= COMPOSITE_THRESHOLD ? COMPOSITE_REASON : reason;

  await suspRepo.upsert({ userId, reason: finalReason, score: newScore, triggeredRules: newRules });

  // Notify connected admin clients in real time.
  broadcaster?.broadcast({
    type: "admin:suspicious-flagged",
    data: { userId, reason: finalReason, score: newScore },
  });

  // ── Fire-and-forget AI analysis ───────────────────────────────────────────
  // Runs asynchronously AFTER the record is saved and the WS alert is sent.
  // If Ollama is not running or takes too long, the call returns null and
  // nothing changes — the rule-based detection record stands on its own.
  if (logsRepository && suspRepo.updateAiAnalysis) {
    const recentActionsPromise = logsRepository
      .findByUserId?.(userId, { limit: 20 })
      .catch(() => []);

    recentActionsPromise.then(async (recentActions) => {
      try {
        const analysis = await analyzeUserBehavior({
          userId,
          recentActions: recentActions ?? [],
          triggeredRule: ruleId ?? reason,
          currentScore:  newScore,
        });

        if (analysis) {
          await suspRepo.updateAiAnalysis(userId, analysis);

          // Broadcast the AI result so the admin panel updates in real time.
          broadcaster?.broadcast({
            type: "admin:ai-analysis",
            data: { userId, analysis },
          });
        }
      } catch {
        // AI failures are always swallowed.
      }
    }).catch(() => {});
  }
}

/**
 * Checks whether the recent behaviour of a user crosses a suspicion threshold.
 * Upserts a suspicious_users record when it does.
 *
 * @param {import("../repositories/logs-repository.js").LogsRepository|undefined} logsRepository
 * @param {import("../repositories/suspicious-users-repository.js").SuspiciousUsersRepository|undefined} suspRepo
 * @param {{userId:string, ipAddress?:string}|null} session
 * @param {string} action
 * @param {object|null} [broadcaster]
 */
export async function detectMaliciousBehavior(logsRepository, suspRepo, session, action, broadcaster = null) {
  if (!logsRepository || !suspRepo || !session) return;

  const rule   = RULES[action];
  const ipRule = action === "auth:login_failed" && session.ipAddress ? IP_BRUTE_FORCE_RULE : null;

  // Run both count queries concurrently — they are independent reads.
  // The outer try/catch swallows any errors (including missing methods on test mocks)
  // so detection failures never affect the response.
  let userCount = 0;
  let ipCount   = 0;
  try {
    [userCount, ipCount] = await Promise.all([
      rule   ? logsRepository.countRecentByUserAndAction(session.userId, action, rule.windowMs)   : 0,
      ipRule ? logsRepository.countRecentByIpAndAction(session.ipAddress, action, ipRule.windowMs) : 0,
    ]);
  } catch {
    return; // Detection failures must never affect the response.
  }

  if (rule && userCount >= rule.maxCount) {
    try {
      await flagUser(suspRepo, session.userId, rule.reason, rule.score, action, broadcaster, logsRepository);
    } catch {
      // Swallowed.
    }
  }

  if (ipRule && ipCount >= ipRule.maxCount) {
    try {
      await flagUser(
        suspRepo,
        session.userId,
        `${ipRule.reason} (${session.ipAddress})`,
        ipRule.score,
        ipRule.ruleId,
        broadcaster,
        logsRepository
      );
    } catch {
      // Swallowed.
    }
  }
}
