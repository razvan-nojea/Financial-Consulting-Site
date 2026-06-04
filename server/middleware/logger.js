/**
 * Action logger middleware.
 *
 * Every authenticated action is persisted in the `logs` table via
 * LogsRepository.  Failure to log must never break the main request.
 */
import { randomUUID } from "node:crypto";

/**
 * Persists one log entry.
 * @param {import("../repositories/logs-repository.js").LogsRepository|undefined} logsRepository
 * @param {{userId:string, email:string, role:string}|null} session
 * @param {string} action      a dot-namespaced label, e.g. "appointment:create"
 * @param {object} [details={}]  arbitrary extra data captured in the JSONB column
 * @param {string} [ipAddress=""]
 * @param {string|null} [sessionId=null]  browser session ID for cross-referencing
 */
export async function logAction(logsRepository, session, action, details = {}, ipAddress = "", sessionId = null) {
  if (!logsRepository || !session) return;
  try {
    await logsRepository.create({
      id: randomUUID(),
      userId: session.userId,
      userEmail: session.email,
      groupId: session.role === "admin" ? "ADMIN" : "USER",
      action,
      details,
      ipAddress,
      sessionId,
    });
  } catch {
    // Logging failures are swallowed — they must not affect the response.
  }
}

/**
 * Extracts the best-effort client IP from a request.
 * @param {import("node:http").IncomingMessage} request
 * @returns {string}
 */
export function getIpAddress(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (forwarded) {
    const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return value.split(",")[0].trim();
  }
  return request.socket?.remoteAddress ?? "";
}
