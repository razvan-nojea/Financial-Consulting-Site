import { describe, expect, it, vi } from "vitest";
import { handleAppointmentsRoutes } from "./appointments-routes.js";

function createContext(overrides = {}) {
  return {
    request: { method: "GET" },
    pathname: "/api/appointments",
    searchParams: new URLSearchParams(),
    body: undefined,
    ownerEmail: "demo@exemplu.ro",
    service: {
      list: vi.fn(() => ({ items: [] })),
      create: vi.fn(() => ({ id: "1" })),
      getById: vi.fn(() => ({ id: "1" })),
      update: vi.fn(() => ({ id: "1" })),
      delete: vi.fn(() => ({ id: "1" })),
    },
    ...overrides,
  };
}

describe("handleAppointmentsRoutes", () => {
  it("uses an empty object when post or put bodies are missing", async () => {
    const postContext = createContext({
      request: { method: "POST" },
    });
    const putContext = createContext({
      request: { method: "PUT" },
      pathname: "/api/appointments/1",
    });

    const postResult = await handleAppointmentsRoutes(postContext);
    const putResult = await handleAppointmentsRoutes(putContext);

    expect(postContext.service.create).toHaveBeenCalledWith("demo@exemplu.ro", {});
    expect(putContext.service.update).toHaveBeenCalledWith("demo@exemplu.ro", "1", {});
    expect(postResult.statusCode).toBe(201);
    expect(putResult.statusCode).toBe(200);
  });

  it("returns null for unmatched paths and 405 for unsupported item methods", async () => {
    const unmatched = await handleAppointmentsRoutes(
      createContext({
        pathname: "/api/not-appointments",
      })
    );
    const unsupported = await handleAppointmentsRoutes(
      createContext({
        request: { method: "PATCH" },
        pathname: "/api/appointments/1",
      })
    );

    expect(unmatched).toBeNull();
    expect(unsupported.statusCode).toBe(405);
  });
});
