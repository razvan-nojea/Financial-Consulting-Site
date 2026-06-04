/**
 * Password hashing utilities using Node.js built-in crypto (scrypt).
 *
 * scrypt is a memory-hard key-derivation function specifically designed for
 * password storage and is recommended by NIST and OWASP.
 *
 * Format stored in the database:  "<hex-salt>:<hex-derived-key>"
 */
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const KEY_LEN = 64; // bytes

/**
 * Hashes a plain-text password and returns a string suitable for storage.
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, KEY_LEN);
  return `${salt}:${derived.toString("hex")}`;
}

/**
 * Verifies a plain-text password against a stored hash.
 * Uses timingSafeEqual to prevent timing attacks.
 * @param {string} password
 * @param {string} stored  the value from hashPassword()
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, stored) {
  const [salt, storedHex] = stored.split(":");
  if (!salt || !storedHex) return false;
  try {
    const derived = await scryptAsync(password, salt, KEY_LEN);
    return timingSafeEqual(Buffer.from(storedHex, "hex"), derived);
  } catch {
    return false;
  }
}
