import { describe, expect, it, vi } from "vitest";
import { handleGraphqlRoute } from "./graphql-routes.js";

function makeService(overrides = {}) {
  return {
    list: vi.fn(() => ({
      items: [],
      pagination: { totalItems: 0, totalPages: 0, page: 1, pageSize: 10 },
    })),
    getById: vi.fn(() => ({ id: "1", service: "Test", date: "2026-01-01", time: "10:00", status: "pending", clientName: "Ana", phone: "", notes: "", createdAt: "2026-01-01", ownerEmail: "test@example.com" })),
    getStatistics: vi.fn(() => ({ total: 0, upcoming: 0, byStatus: {}, byService: {} })),
    create: vi.fn((email, data) => ({ ...data, id: "created-1", ownerEmail: email, createdAt: "2026-01-01" })),
    update: vi.fn((email, id, fields) => ({ id, ...fields, ownerEmail: email })),
    delete: vi.fn((email, id) => ({ id, ownerEmail: email })),
    ...overrides,
  };
}

function makeContext(overrides = {}) {
  return {
    request: { method: "GET" },
    pathname: "/api/graphql",
    body: null,
    ownerEmail: "test@example.com",
    service: makeService(),
    ...overrides,
  };
}

describe("handleGraphqlRoute", () => {
  it("returns null for non-graphql paths", async () => {
    const result = await handleGraphqlRoute(makeContext({ pathname: "/api/other" }));
    expect(result).toBeNull();
  });

  it("GET returns endpoint info", async () => {
    const result = await handleGraphqlRoute(makeContext({ request: { method: "GET" } }));
    expect(result.statusCode).toBe(200);
    expect(result.payload.message).toMatch(/activ/i);
  });

  it("returns 405 for unsupported methods", async () => {
    const result = await handleGraphqlRoute(makeContext({ request: { method: "PUT" } }));
    expect(result.statusCode).toBe(405);
  });

  it("returns 400 when body is missing", async () => {
    const result = await handleGraphqlRoute(makeContext({ request: { method: "POST" }, body: null }));
    expect(result.statusCode).toBe(400);
  });

  it("returns 400 when body.query is not a string", async () => {
    const result = await handleGraphqlRoute(makeContext({ request: { method: "POST" }, body: { query: 123 } }));
    expect(result.statusCode).toBe(400);
  });

  it("POST executes appointments query", async () => {
    const result = await handleGraphqlRoute(makeContext({
      request: { method: "POST" },
      body: { query: "{ appointments { items { id } totalItems totalPages page pageSize } }" },
    }));

    expect(result.statusCode).toBe(200);
    expect(result.payload.data.appointments).toBeDefined();
    expect(result.payload.data.appointments.items).toEqual([]);
  });

  it("POST executes appointment(id) query", async () => {
    const result = await handleGraphqlRoute(makeContext({
      request: { method: "POST" },
      body: { query: '{ appointment(id: "1") { id clientName } }' },
    }));

    expect(result.statusCode).toBe(200);
    expect(result.payload.data.appointment.id).toBe("1");
  });

  it("POST returns null for appointment that throws", async () => {
    const service = makeService({ getById: vi.fn(() => { throw new Error("not found"); }) });
    const result = await handleGraphqlRoute(makeContext({
      request: { method: "POST" },
      body: { query: '{ appointment(id: "missing") { id } }' },
      service,
    }));

    expect(result.statusCode).toBe(200);
    expect(result.payload.data.appointment).toBeNull();
  });

  it("POST executes statistics query", async () => {
    const service = makeService({
      getStatistics: vi.fn(() => ({
        total: 5,
        upcoming: 2,
        byStatus: { confirmed: 3, pending: 2 },
        byService: { "Coaching Bugetar": 5 },
      })),
    });

    const result = await handleGraphqlRoute(makeContext({
      request: { method: "POST" },
      body: { query: "{ statistics { total upcoming byStatus { status count } byService { service count } } }" },
      service,
    }));

    expect(result.statusCode).toBe(200);
    expect(result.payload.data.statistics.total).toBe(5);
    expect(result.payload.data.statistics.byStatus).toHaveLength(2);
  });

  it("POST executes createAppointment mutation", async () => {
    const result = await handleGraphqlRoute(makeContext({
      request: { method: "POST" },
      body: {
        query: `mutation {
          createAppointment(
            service: "Coaching Bugetar"
            date: "2026-08-01"
            time: "10:00"
            status: "pending"
            clientName: "Ana Ionescu"
          ) { success appointment { id clientName } }
        }`,
      },
    }));

    expect(result.statusCode).toBe(200);
    expect(result.payload.data.createAppointment.success).toBe(true);
    expect(result.payload.data.createAppointment.appointment.clientName).toBe("Ana Ionescu");
  });

  it("POST createAppointment returns success:false when service throws", async () => {
    const service = makeService({ create: vi.fn(() => { throw new Error("invalid"); }) });
    const result = await handleGraphqlRoute(makeContext({
      request: { method: "POST" },
      body: {
        query: `mutation {
          createAppointment(
            service: "X" date: "2026-01-01" time: "10:00"
            status: "pending" clientName: "X"
          ) { success message }
        }`,
      },
      service,
    }));

    expect(result.payload.data.createAppointment.success).toBe(false);
    expect(result.payload.data.createAppointment.message).toBe("invalid");
  });

  it("POST executes updateAppointment mutation", async () => {
    const result = await handleGraphqlRoute(makeContext({
      request: { method: "POST" },
      body: {
        query: `mutation {
          updateAppointment(id: "1", status: "confirmed") { success appointment { id } }
        }`,
      },
    }));

    expect(result.payload.data.updateAppointment.success).toBe(true);
  });

  it("POST updateAppointment returns success:false when service throws", async () => {
    const service = makeService({ update: vi.fn(() => { throw new Error("not found"); }) });
    const result = await handleGraphqlRoute(makeContext({
      request: { method: "POST" },
      body: { query: `mutation { updateAppointment(id: "x") { success message } }` },
      service,
    }));

    expect(result.payload.data.updateAppointment.success).toBe(false);
  });

  it("POST executes deleteAppointment mutation", async () => {
    const result = await handleGraphqlRoute(makeContext({
      request: { method: "POST" },
      body: { query: `mutation { deleteAppointment(id: "1") { success } }` },
    }));

    expect(result.payload.data.deleteAppointment.success).toBe(true);
  });

  it("POST deleteAppointment returns success:false when service throws", async () => {
    const service = makeService({ delete: vi.fn(() => { throw new Error("gone"); }) });
    const result = await handleGraphqlRoute(makeContext({
      request: { method: "POST" },
      body: { query: `mutation { deleteAppointment(id: "x") { success message } }` },
      service,
    }));

    expect(result.payload.data.deleteAppointment.success).toBe(false);
  });

  it("uses appointments query with all filter params", async () => {
    const service = makeService();
    await handleGraphqlRoute(makeContext({
      request: { method: "POST" },
      body: {
        query: `{ appointments(page: 2, pageSize: 5, search: "Ana", status: "pending") {
          items { id } totalItems totalPages page pageSize
        } }`,
      },
      service,
    }));

    expect(service.list).toHaveBeenCalledWith(
      "test@example.com",
      expect.objectContaining({ page: 2, pageSize: 5, search: "Ana", status: "pending" })
    );
  });

  it("falls back to guest@local when ownerEmail is missing", async () => {
    const service = makeService();
    const ctx = makeContext({
      request: { method: "POST" },
      body: { query: "{ appointments { items { id } totalItems totalPages page pageSize } }" },
      service,
      ownerEmail: undefined,
    });

    await handleGraphqlRoute(ctx);
    expect(service.list).toHaveBeenCalledWith("guest@local", expect.any(Object));
  });

  it("statistics query uses fallback values when fields are null/undefined", async () => {
    const service = makeService({
      getStatistics: vi.fn(() => ({
        total: null,
        upcoming: undefined,
        byStatus: null,
        byService: undefined,
      })),
    });

    const result = await handleGraphqlRoute(makeContext({
      request: { method: "POST" },
      body: { query: "{ statistics { total upcoming byStatus { status count } byService { service count } } }" },
      service,
    }));

    expect(result.payload.data.statistics.total).toBe(0);
    expect(result.payload.data.statistics.upcoming).toBe(0);
    expect(result.payload.data.statistics.byStatus).toEqual([]);
    expect(result.payload.data.statistics.byService).toEqual([]);
  });
});
