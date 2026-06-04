/**
 * In-memory session store.
 *
 * A session is created on successful login and contains the user's id, email,
 * name, and role.  The client stores the session ID (a UUID) in localStorage
 * and sends it back as the "X-Session-Id" request header.
 *
 * For production the map would be replaced with Redis, but this in-memory
 * implementation is sufficient for the assignment requirements.
 */
import { randomUUID } from "node:crypto";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * @type {Map<string, {userId:string, email:string, name:string, role:string, expiresAt:number}>}
 */
const _sessions = new Map();

/**
 * Creates a new session for the given user and returns the session ID.
 * @param {{id:string, email:string, name:string, role:string}} user
 * @returns {string} sessionId
 */
export function createSession(user) {
  const sessionId = randomUUID();
  _sessions.set(sessionId, {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role ?? "user",
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return sessionId;
}

/**
 * Returns the session for the given ID, or null if expired/missing.
 * @param {string|undefined} sessionId
 * @returns {{userId:string, email:string, name:string, role:string}|null}
 */
export function getSession(sessionId) {
  if (!sessionId) return null;
  const session = _sessions.get(sessionId);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    _sessions.delete(sessionId);
    return null;
  }
  return session;
}

/**
 * Destroys the session with the given ID.
 * @param {string} sessionId
 */
export function destroySession(sessionId) {
  _sessions.delete(sessionId);
}

/**
 * Extracts the X-Session-Id header value from a request.
 * @param {import("node:http").IncomingMessage} request
 * @returns {string|null}
 */
export function getSessionIdFromRequest(request) {
  const header = request.headers["x-session-id"];
  if (Array.isArray(header)) return header[0] ?? null;
  return typeof header === "string" && header.trim() ? header.trim() : null;
}

/**
 * Reads the session from the X-Session-Id request header.
 * @param {import("node:http").IncomingMessage} request
 * @returns {{userId:string, email:string, name:string, role:string}|null}
 */
export function getSessionFromRequest(request) {
  return getSession(getSessionIdFromRequest(request));
}

/** @returns {number} number of active sessions (for testing) */
export function sessionCount() {
  return _sessions.size;
}

/** Clears all sessions — for use in tests only. */
export function _clearAllSessions() {
  _sessions.clear();
}
