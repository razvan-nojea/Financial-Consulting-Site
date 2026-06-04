/**
 * JWT utilities — sign and verify access and refresh tokens.
 *
 * Access token  : short-lived (15 min), carries full user identity.
 * Refresh token : long-lived (7 days), carries only userId (minimal surface).
 *
 * Both secrets are read from env vars at call time so that tests can override
 * them via process.env without needing to restart the module.
 */
import jwt from "jsonwebtoken";

const ACCESS_EXPIRY  = "15m";
const REFRESH_EXPIRY = "7d";

function accessSecret()  { return process.env.JWT_SECRET         || "dev-jwt-secret-change-in-prod"; }
function refreshSecret() { return process.env.JWT_REFRESH_SECRET || "dev-jwt-refresh-secret-change-in-prod"; }

/**
 * Signs a new access token for the given user.
 * @param {{id:string, email:string, name:string, role:string}} user
 * @returns {string}
 */
export function signAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name, role: user.role },
    accessSecret(),
    { expiresIn: ACCESS_EXPIRY }
  );
}

/**
 * Signs a new refresh token for the given user.
 * @param {{id:string}} user
 * @returns {string}
 */
export function signRefreshToken(user) {
  return jwt.sign(
    { userId: user.id },
    refreshSecret(),
    { expiresIn: REFRESH_EXPIRY }
  );
}

/**
 * Verifies an access token and returns its payload, or null if invalid/expired.
 * @param {string} token
 * @returns {{userId:string, email:string, name:string, role:string}|null}
 */
export function verifyAccessToken(token) {
  try {
    return /** @type {any} */ (jwt.verify(token, accessSecret()));
  } catch {
    return null;
  }
}

/**
 * Verifies a refresh token and returns its payload, or null if invalid/expired.
 * @param {string} token
 * @returns {{userId:string}|null}
 */
export function verifyRefreshToken(token) {
  try {
    return /** @type {any} */ (jwt.verify(token, refreshSecret()));
  } catch {
    return null;
  }
}
