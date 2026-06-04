import { describe, it, expect, vi } from "vitest";
import { detectMaliciousBehavior, RULES, IP_BRUTE_FORCE_RULE } from "./behavior-detection.js";

const SESSION = { userId: "u1", email: "bad@test.com", role: "user" };
const SESSION_WITH_IP = { ...SESSION, ipAddress: "203.0.113.1" };

function makeRepos({ count = 0, ipCount = 0, existing = null } = {}) {
  return {
    logs: {
      countRecentByUserAndAction: vi.fn().mockResolvedValue(count),
      countRecentByIpAndAction: vi.fn().mockResolvedValue(ipCount),
    },
    susp: {
      findByUserId: vi.fn().mockResolvedValue(existing),
      upsert: vi.fn().mockResolvedValue({}),
    },
  };
}

describe("detectMaliciousBehavior", () => {
  // ── null-guard tests ───────────────────────────────────────────────────

  it("does nothing when logsRepository is null", async () => {
    const { susp } = makeRepos();
    await detectMaliciousBehavior(null, susp, SESSION, "appointment:delete");
    expect(susp.upsert).not.toHaveBeenCalled();
  });

  it("does nothing when suspRepo is null", async () => {
    const { logs } = makeRepos({ count: 10 });
    await expect(detectMaliciousBehavior(logs, null, SESSION, "appointment:delete")).resolves.toBeUndefined();
  });

  it("does nothing when session is null", async () => {
    const { logs, susp } = makeRepos({ count: 10 });
    await detectMaliciousBehavior(logs, susp, null, "appointment:delete");
    expect(susp.upsert).not.toHaveBeenCalled();
  });

  it("does nothing for unknown actions", async () => {
    const { logs, susp } = makeRepos({ count: 999 });
    await detectMaliciousBehavior(logs, susp, SESSION, "unknown:action");
    expect(susp.upsert).not.toHaveBeenCalled();
  });

  it("does not flag user when count is below threshold", async () => {
    const { logs, susp } = makeRepos({ count: 3 }); // threshold is 5
    await detectMaliciousBehavior(logs, susp, SESSION, "appointment:delete");
    expect(susp.upsert).not.toHaveBeenCalled();
  });

  // ── per-user rule: appointment:delete ────────────────────────────────

  it("flags user when delete count reaches threshold", async () => {
    const { logs, susp } = makeRepos({ count: 5 });
    await detectMaliciousBehavior(logs, susp, SESSION, "appointment:delete");
    expect(susp.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: SESSION.userId, score: 30 })
    );
  });

  it("accumulates score on repeated violations (existing score)", async () => {
    const { logs, susp } = makeRepos({ count: 5, existing: { score: 40 } });
    await detectMaliciousBehavior(logs, susp, SESSION, "appointment:delete");
    // 40 + 30 = 70
    expect(susp.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ score: 70 })
    );
  });

  it("caps score at 100", async () => {
    const { logs, susp } = makeRepos({ count: 10, existing: { score: 80 } });
    await detectMaliciousBehavior(logs, susp, SESSION, "appointment:delete");
    // 80 + 30 = 110 → capped at 100
    expect(susp.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ score: 100 })
    );
  });

  it("swallows errors from the repository", async () => {
    const logs = { countRecentByUserAndAction: vi.fn().mockRejectedValue(new Error("DB err")) };
    const susp = { findByUserId: vi.fn(), upsert: vi.fn() };
    await expect(detectMaliciousBehavior(logs, susp, SESSION, "appointment:delete")).resolves.toBeUndefined();
  });

  // ── per-user rule: auth:login_failed ─────────────────────────────────

  it("flags user when failed login count reaches threshold", async () => {
    const { logs, susp } = makeRepos({ count: 5 });
    await detectMaliciousBehavior(logs, susp, SESSION, "auth:login_failed");
    expect(susp.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ score: 50 })
    );
  });

  // ── per-user rules: new actions ───────────────────────────────────────

  it("flags user when appointment:create count reaches threshold (10)", async () => {
    const { logs, susp } = makeRepos({ count: RULES["appointment:create"].maxCount });
    await detectMaliciousBehavior(logs, susp, SESSION, "appointment:create");
    expect(susp.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ score: RULES["appointment:create"].score })
    );
  });

  it("flags user when appointment:update count reaches threshold (15)", async () => {
    const { logs, susp } = makeRepos({ count: RULES["appointment:update"].maxCount });
    await detectMaliciousBehavior(logs, susp, SESSION, "appointment:update");
    expect(susp.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ score: RULES["appointment:update"].score })
    );
  });

  it("flags user when generator:start count reaches threshold (5)", async () => {
    const { logs, susp } = makeRepos({ count: RULES["generator:start"].maxCount });
    await detectMaliciousBehavior(logs, susp, SESSION, "generator:start");
    expect(susp.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ score: RULES["generator:start"].score })
    );
  });

  it("flags user when chat:send count reaches threshold (30)", async () => {
    const { logs, susp } = makeRepos({ count: RULES["chat:send"].maxCount });
    await detectMaliciousBehavior(logs, susp, SESSION, "chat:send");
    expect(susp.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ score: RULES["chat:send"].score })
    );
  });

  // ── triggered rules tracking ──────────────────────────────────────────

  it("stores ruleId in triggeredRules on first violation", async () => {
    const { logs, susp } = makeRepos({ count: 5 });
    await detectMaliciousBehavior(logs, susp, SESSION, "appointment:delete");
    expect(susp.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ triggeredRules: ["appointment:delete"] })
    );
  });

  it("appends ruleId to existing triggeredRules without duplicates", async () => {
    const { logs, susp } = makeRepos({
      count: 5,
      existing: { score: 30, triggeredRules: ["appointment:delete"] },
    });
    await detectMaliciousBehavior(logs, susp, SESSION, "auth:login_failed");
    expect(susp.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ triggeredRules: ["appointment:delete", "auth:login_failed"] })
    );
  });

  it("does not duplicate a ruleId that has already fired", async () => {
    const { logs, susp } = makeRepos({
      count: 5,
      existing: { score: 30, triggeredRules: ["appointment:delete"] },
    });
    await detectMaliciousBehavior(logs, susp, SESSION, "appointment:delete");
    const call = susp.upsert.mock.calls[0][0];
    expect(call.triggeredRules.filter((r) => r === "appointment:delete")).toHaveLength(1);
  });

  // ── composite escalation ──────────────────────────────────────────────

  it("escalates reason when new score reaches composite threshold (75)", async () => {
    // existing score 50, delete score 30 → total 80 ≥ 75
    const { logs, susp } = makeRepos({ count: 5, existing: { score: 50 } });
    await detectMaliciousBehavior(logs, susp, SESSION, "appointment:delete");
    expect(susp.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "Comportament multiplu suspect — risc înalt" })
    );
  });

  it("does not escalate reason when score stays below composite threshold", async () => {
    // existing score 0, delete score 30 → total 30 < 75
    const { logs, susp } = makeRepos({ count: 5 });
    await detectMaliciousBehavior(logs, susp, SESSION, "appointment:delete");
    const call = susp.upsert.mock.calls[0][0];
    expect(call.reason).not.toBe("Comportament multiplu suspect — risc înalt");
  });

  // ── WebSocket broadcast ───────────────────────────────────────────────

  it("broadcasts admin:suspicious-flagged when a user is flagged", async () => {
    const { logs, susp } = makeRepos({ count: 5 });
    const broadcaster = { broadcast: vi.fn() };
    await detectMaliciousBehavior(logs, susp, SESSION, "appointment:delete", broadcaster);
    expect(broadcaster.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "admin:suspicious-flagged" })
    );
  });

  it("does not throw when broadcaster is null", async () => {
    const { logs, susp } = makeRepos({ count: 5 });
    await expect(
      detectMaliciousBehavior(logs, susp, SESSION, "appointment:delete", null)
    ).resolves.toBeUndefined();
  });

  it("does not broadcast when count is below threshold", async () => {
    const { logs, susp } = makeRepos({ count: 3 });
    const broadcaster = { broadcast: vi.fn() };
    await detectMaliciousBehavior(logs, susp, SESSION, "appointment:delete", broadcaster);
    expect(broadcaster.broadcast).not.toHaveBeenCalled();
  });

  // ── IP brute-force detection ──────────────────────────────────────────

  it("flags user when IP-based failed-login count reaches threshold", async () => {
    const { logs, susp } = makeRepos({ ipCount: IP_BRUTE_FORCE_RULE.maxCount });
    await detectMaliciousBehavior(logs, susp, SESSION_WITH_IP, "auth:login_failed");
    expect(susp.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ triggeredRules: expect.arrayContaining(["ip:brute_force"]) })
    );
  });

  it("does not run IP check when session has no ipAddress", async () => {
    const { logs, susp } = makeRepos({ ipCount: 99 });
    await detectMaliciousBehavior(logs, susp, SESSION, "auth:login_failed");
    expect(logs.countRecentByIpAndAction).not.toHaveBeenCalled();
  });

  it("does not run IP check for non-login actions", async () => {
    const { logs, susp } = makeRepos({ ipCount: 99 });
    await detectMaliciousBehavior(logs, susp, SESSION_WITH_IP, "appointment:delete");
    expect(logs.countRecentByIpAndAction).not.toHaveBeenCalled();
  });

  it("swallows errors from IP brute-force check", async () => {
    const logs = {
      countRecentByUserAndAction: vi.fn().mockResolvedValue(0),
      countRecentByIpAndAction: vi.fn().mockRejectedValue(new Error("DB err")),
    };
    const susp = { findByUserId: vi.fn(), upsert: vi.fn() };
    await expect(
      detectMaliciousBehavior(logs, susp, SESSION_WITH_IP, "auth:login_failed")
    ).resolves.toBeUndefined();
  });

  it("broadcasts when IP brute-force threshold is crossed", async () => {
    const { logs, susp } = makeRepos({ ipCount: IP_BRUTE_FORCE_RULE.maxCount });
    const broadcaster = { broadcast: vi.fn() };
    await detectMaliciousBehavior(logs, susp, SESSION_WITH_IP, "auth:login_failed", broadcaster);
    const ipBroadcast = broadcaster.broadcast.mock.calls.find(
      ([payload]) => payload.data?.userId === SESSION_WITH_IP.userId
    );
    expect(ipBroadcast).toBeDefined();
  });
});
