/**
 * resolveSession — unified identity resolution.
 *
 * Accepts either a JWT Bearer token or the legacy X-Session-Id header so that
 * both the new JWT-based frontend and the test suite (which still uses
 * X-Session-Id) keep working without any changes to the test layer.
 *
 * Priority: Bearer JWT > X-Session-Id
 */
import { verifyAccessToken } from "./jwt.js";
import { getSessionFromRequest } from "./session-store.js";

/**
 * @param {import("node:http").IncomingMessage} request
 * @returns {{userId:string, email:string, name:string, role:string}|null}
 */
export function resolveSession(request) {
  // ── JWT Bearer ────────────────────────────────────────────────────────────
  const auth = request.headers["authorization"];
  if (auth && auth.startsWith("Bearer ")) {
    const token   = auth.slice(7);
    const payload = verifyAccessToken(token);
    if (payload) {
      return {
        userId: payload.userId,
        email:  payload.email,
        name:   payload.name,
        role:   payload.role,
      };
    }
  }

  // ── Legacy X-Session-Id (tests + non-browser clients) ────────────────────
  return getSessionFromRequest(request);
}
