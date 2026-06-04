import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password utilities", () => {
  it("hashPassword returns a non-empty string", async () => {
    const hash = await hashPassword("secret123");
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
  });

  it("hashPassword includes a salt separator", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).toContain(":");
  });

  it("two hashes for the same password are different (random salt)", async () => {
    const h1 = await hashPassword("secret123");
    const h2 = await hashPassword("secret123");
    expect(h1).not.toBe(h2);
  });

  it("verifyPassword returns true for the correct password", async () => {
    const hash = await hashPassword("myPassword!");
    expect(await verifyPassword("myPassword!", hash)).toBe(true);
  });

  it("verifyPassword returns false for a wrong password", async () => {
    const hash = await hashPassword("myPassword!");
    expect(await verifyPassword("wrongPassword", hash)).toBe(false);
  });

  it("verifyPassword returns false for a malformed stored hash", async () => {
    expect(await verifyPassword("any", "notAValidHash")).toBe(false);
  });

  it("verifyPassword returns false for an empty stored hash", async () => {
    expect(await verifyPassword("any", "")).toBe(false);
  });

  it("verifyPassword returns false when buffers differ in length (timingSafeEqual throws)", async () => {
    // "salt:ab" — "ab" decodes to 1 byte but scrypt produces 64 bytes → timingSafeEqual throws
    expect(await verifyPassword("pw", "somesalt:ab")).toBe(false);
  });
});
