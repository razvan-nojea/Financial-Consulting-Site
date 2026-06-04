import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, readOwnerEmail } from "./app.js";
import { NotFoundError, ValidationError } from "../services/appointments-service.js";
import { createSession, _clearAllSessions } from "../auth/session-store.js";

const runningApps = [];
const DEMO_HEADERS = {
  "x-user-email": "demo@exemplu.ro",
};
const NEW_ACCOUNT_HEADERS = {
  "x-user-email": "rest@exemplu.ro",
};

async function startApp(options) {
  const app = createApp(options);
  const address = await app.listen(0);
  const port =
    typeof address === "object" && address !== null ? address.port : Number.parseInt(String(address), 10);
  runningApps.push(app);
  return {
    app,
    baseUrl: `http://127.0.0.1:${port}`,
  };
}

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

afterEach(async () => {
  while (runningApps.length > 0) {
    const app = runningApps.pop();
    await app.close();
  }
});

describe("HTTP app", () => {
  it("serves paginated appointments and appointment details", async () => {
    const { baseUrl } = await startApp();

    const listResponse = await fetch(
      `${baseUrl}/api/appointments?page=2&pageSize=4&search=plan&status=completed`,
      {
        headers: DEMO_HEADERS,
      }
    );
    const listPayload = await readJson(listResponse);
    const detailResponse = await fetch(`${baseUrl}/api/appointments/1`, {
      headers: DEMO_HEADERS,
    });
    const detailPayload = await readJson(detailResponse);

    expect(listResponse.status).toBe(200);
    expect(listPayload.pagination.pageSize).toBe(4);
    expect(listPayload.pagination.totalItems).toBe(3);
    expect(detailPayload.data.id).toBe("1");
  });

  it("creates, updates, deletes, and summarizes appointments through REST endpoints", async () => {
    const { baseUrl } = await startApp({
      now: () => new Date("2026-04-10T08:00:00.000Z"),
      createId: () => "rest-created-id",
    });

    const createResponse = await fetch(`${baseUrl}/api/appointments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...NEW_ACCOUNT_HEADERS,
      },
      body: JSON.stringify({
        service: "Audit financiar",
        date: "2026-04-15",
        time: "12:30",
        status: "pending",
        clientName: "Mara Ionescu",
        phone: "",
        notes: "Sesiune noua",
      }),
    });
    const createdPayload = await readJson(createResponse);

    const updateResponse = await fetch(`${baseUrl}/api/appointments/rest-created-id`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...NEW_ACCOUNT_HEADERS,
      },
      body: JSON.stringify({
        status: "confirmed",
        notes: "Confirmata",
      }),
    });
    const updatedPayload = await readJson(updateResponse);

    const statisticsResponse = await fetch(`${baseUrl}/api/statistics/appointments`, {
      headers: NEW_ACCOUNT_HEADERS,
    });
    const statisticsPayload = await readJson(statisticsResponse);

    const deleteResponse = await fetch(`${baseUrl}/api/appointments/rest-created-id`, {
      method: "DELETE",
      headers: NEW_ACCOUNT_HEADERS,
    });
    const deletedPayload = await readJson(deleteResponse);

    expect(createResponse.status).toBe(201);
    expect(createdPayload.data.id).toBe("rest-created-id");
    expect(updatedPayload.data.status).toBe("confirmed");
    expect(statisticsPayload.data.byStatus.confirmed).toBeGreaterThan(0);
    expect(deleteResponse.status).toBe(200);
    expect(deletedPayload.data.id).toBe("rest-created-id");
  });

  it("returns validation, not-found, method, and route errors", async () => {
    const { baseUrl } = await startApp();

    const invalidBody = await fetch(`${baseUrl}/api/appointments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...NEW_ACCOUNT_HEADERS,
      },
      body: JSON.stringify({
        service: "",
        date: "2026-01-01",
        time: "",
        status: "invalid",
        clientName: "A",
        phone: "123",
        notes: "x".repeat(501),
      }),
    });

    const missingAppointment = await fetch(`${baseUrl}/api/appointments/404`, {
      headers: NEW_ACCOUNT_HEADERS,
    });
    const invalidMethod = await fetch(`${baseUrl}/api/statistics/appointments`, {
      method: "POST",
    });
    const invalidItemMethod = await fetch(`${baseUrl}/api/appointments/1`, {
      method: "PATCH",
      headers: DEMO_HEADERS,
    });
    const missingRoute = await fetch(`${baseUrl}/api/unknown`);

    expect(invalidBody.status).toBe(400);
    expect((await readJson(invalidBody)).errors.service).toBe("Serviciul este obligatoriu.");
    expect(missingAppointment.status).toBe(404);
    expect((await readJson(missingAppointment)).message).toBe("Programarea nu a fost gasita.");
    expect(invalidMethod.status).toBe(405);
    expect((await readJson(invalidMethod)).message).toContain("Metoda");
    expect(invalidItemMethod.status).toBe(405);
    expect(missingRoute.status).toBe(404);
  });

  it("handles invalid json, generic server errors, preflight requests, and safe close calls", async () => {
    const { baseUrl } = await startApp();

    const invalidJson = await fetch(`${baseUrl}/api/appointments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{invalid-json",
    });
    const preflight = await fetch(`${baseUrl}/api/appointments`, {
      method: "OPTIONS",
    });

    expect(invalidJson.status).toBe(400);
    expect((await readJson(invalidJson)).message).toBe("Corpul cererii trebuie sa fie JSON valid.");
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("*");
    expect(preflight.headers.get("access-control-allow-headers")).toContain("X-User-Email");

    const blankBody = await fetch(`${baseUrl}/api/appointments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...NEW_ACCOUNT_HEADERS,
      },
      body: "   ",
    });

    expect(blankBody.status).toBe(400);
    expect((await readJson(blankBody)).errors.service).toBe("Serviciul este obligatoriu.");

    const failingService = {
      list: vi.fn(() => {
        throw new Error("boom");
      }),
      create: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getStatistics: vi.fn(),
    };
    const { baseUrl: failingBaseUrl, app: failingApp } = await startApp({
      service: failingService,
    });
    const genericFailure = await fetch(`${failingBaseUrl}/api/appointments`, {
      headers: NEW_ACCOUNT_HEADERS,
    });

    expect(genericFailure.status).toBe(500);
    expect((await readJson(genericFailure)).message).toBe("A aparut o eroare interna pe server.");

    await failingApp.close();
    await expect(failingApp.close()).resolves.toBeUndefined();

    const closeFailureApp = createApp();
    await closeFailureApp.listen(0);
    const originalClose = closeFailureApp.server.close.bind(closeFailureApp.server);
    closeFailureApp.server.close = (callback) => {
      callback(new Error("close failed"));
      return closeFailureApp.server;
    };

    await expect(closeFailureApp.close()).rejects.toThrow("close failed");
    closeFailureApp.server.close = originalClose;
    await closeFailureApp.close();
  });

  it("surfaces service-raised validation and not-found errors", async () => {
    const service = {
      list: vi.fn(),
      create: vi.fn(() => {
        throw new ValidationError({ service: "required" });
      }),
      getById: vi.fn(() => {
        throw new NotFoundError("Lipsa");
      }),
      update: vi.fn(),
      delete: vi.fn(),
      getStatistics: vi.fn(),
    };
    const { baseUrl } = await startApp({ service });

    const createResponse = await fetch(`${baseUrl}/api/appointments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...NEW_ACCOUNT_HEADERS,
      },
      body: "{}",
    });
    const getResponse = await fetch(`${baseUrl}/api/appointments/1`, {
      headers: DEMO_HEADERS,
    });

    expect(createResponse.status).toBe(400);
    expect((await readJson(createResponse)).errors).toEqual({ service: "required" });
    expect(getResponse.status).toBe(404);
    expect((await readJson(getResponse)).message).toBe("Lipsa");
  });

  it("registers chat WebSocket handler and routes chat:send messages", async () => {
    const INSERTED_MSG = { _id: "m1", from: "a@b.com", text: "hello" };
    const chatStore = {
      // The handler is now async — insert must return a Promise
      insert: vi.fn().mockResolvedValue(INSERTED_MSG),
      findRecent: vi.fn().mockResolvedValue([]),
    };
    const broadcaster = {
      onMessage: vi.fn(),
      attach: vi.fn(),
      broadcast: vi.fn(),
    };
    const { app } = await startApp({ chatStore, broadcaster });
    expect(broadcaster.onMessage).toHaveBeenCalled();

    // The registered handler is async — await it so assertions run after it settles
    const handler = broadcaster.onMessage.mock.calls[0][0];

    // chat:send with all fields provided
    await handler({ type: "chat:send", text: "hello", from: "a@b.com", fromName: "A" }, null, broadcaster);
    expect(chatStore.insert).toHaveBeenCalled();
    expect(broadcaster.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "chat:message" })
    );

    // chat:send with no text field — early return, insert not called again
    await handler({ type: "chat:send" }, null, broadcaster);
    expect(chatStore.insert).toHaveBeenCalledTimes(1);

    // chat:send with no from/fromName — covers ?? "anonymous" fallbacks
    chatStore.insert.mockClear();
    await handler({ type: "chat:send", text: "hi" }, null, broadcaster);
    expect(chatStore.insert).toHaveBeenCalledWith(
      expect.objectContaining({ from: "anonymous", fromName: "anonymous" })
    );

    // chat:send with a DM recipient — covers the msg.to branch
    chatStore.insert.mockClear();
    await handler({ type: "chat:send", text: "dm", from: "a@b.com", fromName: "A", to: "b@c.com" }, null, broadcaster);
    expect(chatStore.insert).toHaveBeenCalledWith(
      expect.objectContaining({ to: "b@c.com" })
    );

    // chat:send with empty text string — should be ignored (no insert)
    await handler({ type: "chat:send", text: "   " }, null, broadcaster);
    expect(chatStore.insert).toHaveBeenCalledTimes(1); // only the dm call above

    // other message types — ignored
    await handler({ type: "other" }, null, broadcaster);
  });

  it("writes audit logs when a session + action + logsRepository are all present", async () => {
    const logsRepo = { create: vi.fn().mockResolvedValue({}) };
    const suspRepo = { findByUserId: vi.fn().mockResolvedValue(null), upsert: vi.fn() };
    const { baseUrl } = await startApp({ logsRepository: logsRepo, suspiciousUsersRepository: suspRepo });

    _clearAllSessions();
    const sessionId = createSession({ id: "u1", email: "demo@exemplu.ro", name: "Demo", role: "user" });
    const headers = { "x-user-email": "demo@exemplu.ro", "x-session-id": sessionId };

    // Hit each auditable action to cover all branches in resolveActionLabel
    await fetch(`${baseUrl}/api/appointments`, { headers });
    await fetch(`${baseUrl}/api/statistics/appointments`, { headers });
    await fetch(`${baseUrl}/api/generator/start`, { method: "POST", headers });
    await fetch(`${baseUrl}/api/generator/stop`, { method: "POST", headers });
    await fetch(`${baseUrl}/api/appointments`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: "null" });
    await fetch(`${baseUrl}/api/appointments/1`, { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: "null" });
    await fetch(`${baseUrl}/api/appointments/1`, { method: "DELETE", headers });

    expect(logsRepo.create).toHaveBeenCalled();
  });

  it("returns a helpful JSON payload when the root path is requested", async () => {
    const { baseUrl } = await startApp();

    const response = await fetch(`${baseUrl}/`);
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.status).toBe("running");
    expect(Array.isArray(payload.endpoints)).toBe(true);
    expect(payload.endpoints).toContain("/health");
  });

  it("reads repeated owner-email headers and falls back when none are present", () => {
    expect(
      readOwnerEmail({
        headers: {
          "x-user-email": ["demo@exemplu.ro"],
        },
      })
    ).toBe("demo@exemplu.ro");

    expect(
      readOwnerEmail({
        headers: {
          "x-user-email": [],
        },
      })
    ).toBe("guest@local");
  });
});
