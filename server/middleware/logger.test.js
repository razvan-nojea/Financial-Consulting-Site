import { describe, it, expect, vi } from "vitest";
import { logAction, getIpAddress } from "./logger.js";

const SESSION = { userId: "u1", email: "demo@exemplu.ro", role: "user" };
const ADMIN_SESSION = { userId: "u2", email: "admin@exemplu.ro", role: "admin" };

describe("logAction", () => {
  it("calls logsRepository.create with correct fields for a user", async () => {
    const repo = { create: vi.fn().mockResolvedValue({}) };
    await logAction(repo, SESSION, "appointment:create", { id: "appt-1" }, "127.0.0.1");

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: SESSION.userId,
        userEmail: SESSION.email,
        groupId: "USER",
        action: "appointment:create",
        details: { id: "appt-1" },
        ipAddress: "127.0.0.1",
      })
    );
  });

  it("sets groupId to ADMIN for admin sessions", async () => {
    const repo = { create: vi.fn().mockResolvedValue({}) };
    await logAction(repo, ADMIN_SESSION, "admin:logs");
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: "ADMIN" })
    );
  });

  it("does nothing when logsRepository is null", async () => {
    // Should not throw
    await expect(logAction(null, SESSION, "x")).resolves.toBeUndefined();
  });

  it("does nothing when session is null", async () => {
    const repo = { create: vi.fn() };
    await logAction(repo, null, "x");
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("swallows errors from the repository", async () => {
    const repo = { create: vi.fn().mockRejectedValue(new Error("DB down")) };
    await expect(logAction(repo, SESSION, "x")).resolves.toBeUndefined();
  });

  it("defaults details to {} and ipAddress to empty string", async () => {
    const repo = { create: vi.fn().mockResolvedValue({}) };
    await logAction(repo, SESSION, "appointment:list");
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ details: {}, ipAddress: "" })
    );
  });

  it("defaults sessionId to null when not provided", async () => {
    const repo = { create: vi.fn().mockResolvedValue({}) };
    await logAction(repo, SESSION, "appointment:list");
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: null })
    );
  });

  it("passes sessionId to the repository when provided", async () => {
    const repo = { create: vi.fn().mockResolvedValue({}) };
    await logAction(repo, SESSION, "appointment:list", {}, "127.0.0.1", "sess-xyz");
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "sess-xyz" })
    );
  });
});

describe("getIpAddress", () => {
  it("reads from x-forwarded-for header", () => {
    const req = { headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" }, socket: {} };
    expect(getIpAddress(req)).toBe("203.0.113.1");
  });

  it("reads from socket when no forwarded header", () => {
    const req = { headers: {}, socket: { remoteAddress: "192.168.1.1" } };
    expect(getIpAddress(req)).toBe("192.168.1.1");
  });

  it("returns empty string when socket is absent", () => {
    const req = { headers: {} };
    expect(getIpAddress(req)).toBe("");
  });

  it("handles array x-forwarded-for", () => {
    const req = { headers: { "x-forwarded-for": ["203.0.113.1", "10.0.0.1"] }, socket: {} };
    expect(getIpAddress(req)).toBe("203.0.113.1");
  });
});
