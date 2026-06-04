import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleGeneratorRoutes } from "./generator-routes.js";

function makeService() {
  return {
    create: vi.fn(() => ({ id: "gen-1" })),
  };
}

function makeContext(overrides = {}) {
  return {
    request: { method: "GET" },
    pathname: "/api/generator/status",
    searchParams: new URLSearchParams(),
    ownerEmail: "demo@exemplu.ro",
    service: makeService(),
    broadcaster: { broadcast: vi.fn() },
    ...overrides,
  };
}

describe("handleGeneratorRoutes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for non-generator paths", async () => {
    const result = await handleGeneratorRoutes(makeContext({ pathname: "/api/appointments" }));
    expect(result).toBeNull();
  });

  it("GET /api/generator/status returns running: false initially", async () => {
    const result = await handleGeneratorRoutes(makeContext({ pathname: "/api/generator/status" }));
    expect(result.statusCode).toBe(200);
    expect(result.payload.running).toBe(false);
  });

  it("POST /api/generator/start starts the generator and returns 200", async () => {
    const ctx = makeContext({
      request: { method: "POST" },
      pathname: "/api/generator/start",
    });

    const result = await handleGeneratorRoutes(ctx);
    expect(result.statusCode).toBe(200);
    expect(result.payload.message).toMatch(/pornit/i);
    expect(result.payload.interval).toBe(3000);

    // status should now be running
    const statusResult = await handleGeneratorRoutes(makeContext({ pathname: "/api/generator/status" }));
    expect(statusResult.payload.running).toBe(true);

    // cleanup
    await handleGeneratorRoutes(makeContext({ request: { method: "POST" }, pathname: "/api/generator/stop" }));
  });

  it("POST /api/generator/start clamps interval to [1000, 10000]", async () => {
    const ctx = makeContext({
      request: { method: "POST" },
      pathname: "/api/generator/start",
      searchParams: new URLSearchParams("interval=50000"),
    });

    const result = await handleGeneratorRoutes(ctx);
    expect(result.payload.interval).toBe(10000);

    await handleGeneratorRoutes(makeContext({ request: { method: "POST" }, pathname: "/api/generator/stop" }));
  });

  it("POST /api/generator/start broadcasts a new appointment when timer fires", async () => {
    const service = makeService();
    const broadcaster = { broadcast: vi.fn() };
    const ctx = makeContext({
      request: { method: "POST" },
      pathname: "/api/generator/start",
      searchParams: new URLSearchParams("interval=1000"),
      service,
      broadcaster,
      ownerEmail: "test@example.com",
    });

    await handleGeneratorRoutes(ctx);
    vi.advanceTimersByTime(1000);

    expect(service.create).toHaveBeenCalledOnce();
    expect(broadcaster.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "new-appointment" })
    );

    await handleGeneratorRoutes(makeContext({ request: { method: "POST" }, pathname: "/api/generator/stop" }));
  });

  it("POST /api/generator/start does not crash if service.create throws", async () => {
    const service = { create: vi.fn(() => { throw new Error("validation error"); }) };
    const ctx = makeContext({
      request: { method: "POST" },
      pathname: "/api/generator/start",
      searchParams: new URLSearchParams("interval=1000"),
      service,
    });

    await handleGeneratorRoutes(ctx);
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow();

    await handleGeneratorRoutes(makeContext({ request: { method: "POST" }, pathname: "/api/generator/stop" }));
  });

  it("POST /api/generator/start without broadcaster does not crash", async () => {
    const ctx = makeContext({
      request: { method: "POST" },
      pathname: "/api/generator/start",
      searchParams: new URLSearchParams("interval=1000"),
      broadcaster: null,
    });

    await handleGeneratorRoutes(ctx);
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow();

    await handleGeneratorRoutes(makeContext({ request: { method: "POST" }, pathname: "/api/generator/stop" }));
  });

  it("POST /api/generator/start restarts if already running", async () => {
    const startCtx = () => makeContext({
      request: { method: "POST" },
      pathname: "/api/generator/start",
    });

    await handleGeneratorRoutes(startCtx());
    const result = await handleGeneratorRoutes(startCtx());
    expect(result.statusCode).toBe(200);

    await handleGeneratorRoutes(makeContext({ request: { method: "POST" }, pathname: "/api/generator/stop" }));
  });

  it("POST /api/generator/start uses demo email when ownerEmail is not provided", async () => {
    const ctx = makeContext({
      request: { method: "POST" },
      pathname: "/api/generator/start",
      ownerEmail: undefined,
    });

    const result = await handleGeneratorRoutes(ctx);
    expect(result.statusCode).toBe(200);

    await handleGeneratorRoutes(makeContext({ request: { method: "POST" }, pathname: "/api/generator/stop" }));
  });

  it("generateFakeAppointment covers both notes branches (empty and sentence)", async () => {
    const service = makeService();
    const ctx = makeContext({
      request: { method: "POST" },
      pathname: "/api/generator/start",
      searchParams: new URLSearchParams("interval=1000"),
      service,
    });

    await handleGeneratorRoutes(ctx);

    // Run enough ticks to statistically cover both Math.random() > 0.5 branches
    const randomSpy = vi.spyOn(Math, "random");
    // Force notes = "" branch (random <= 0.5)
    randomSpy.mockReturnValue(0.3);
    vi.advanceTimersByTime(1000);
    // Force notes = faker sentence branch (random > 0.5)
    randomSpy.mockReturnValue(0.7);
    vi.advanceTimersByTime(1000);

    expect(service.create).toHaveBeenCalledTimes(2);
    randomSpy.mockRestore();

    await handleGeneratorRoutes(makeContext({ request: { method: "POST" }, pathname: "/api/generator/stop" }));
  });

  it("POST /api/generator/stop stops the generator and returns 200", async () => {
    await handleGeneratorRoutes(makeContext({ request: { method: "POST" }, pathname: "/api/generator/start" }));

    const broadcaster = { broadcast: vi.fn() };
    const result = await handleGeneratorRoutes(
      makeContext({ request: { method: "POST" }, pathname: "/api/generator/stop", broadcaster })
    );
    expect(result.statusCode).toBe(200);
    expect(result.payload.message).toMatch(/oprit/i);
    expect(broadcaster.broadcast).toHaveBeenCalledWith({ type: "generator-stopped" });

    const status = await handleGeneratorRoutes(makeContext({ pathname: "/api/generator/status" }));
    expect(status.payload.running).toBe(false);
  });

  it("POST /api/generator/stop is idempotent when already stopped", async () => {
    const result = await handleGeneratorRoutes(
      makeContext({ request: { method: "POST" }, pathname: "/api/generator/stop" })
    );
    expect(result.statusCode).toBe(200);
  });

  it("POST /api/generator/stop does not throw when broadcaster is null", async () => {
    await handleGeneratorRoutes(makeContext({ request: { method: "POST" }, pathname: "/api/generator/start" }));
    const result = await handleGeneratorRoutes(
      makeContext({ request: { method: "POST" }, pathname: "/api/generator/stop", broadcaster: null })
    );
    expect(result.statusCode).toBe(200);
  });

  it("returns null for unknown sub-paths under /api/generator", async () => {
    const result = await handleGeneratorRoutes(
      makeContext({ pathname: "/api/generator/unknown" })
    );
    expect(result).toBeNull();
  });
});
