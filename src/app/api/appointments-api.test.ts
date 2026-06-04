import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AppointmentsApiError,
  checkAppointmentsApiHealth,
  createAppointmentInApi,
  deleteAppointmentInApi,
  getAppointmentFromApi,
  getGeneratorStatusFromApi,
  listAppointmentsFromApi,
  listAppointmentsPageFromApi,
  startGeneratorInApi,
  stopGeneratorInApi,
  updateAppointmentInApi,
} from "./appointments-api";
import type { Appointment } from "../contexts/appointments-context";

const sampleAppointment: Appointment = {
  id: "appointment-1",
  service: "Consultanta bugetara",
  date: "2026-08-10",
  time: "11:00",
  status: "pending",
  clientName: "Ana Ionescu",
  phone: "0722123456",
  notes: "",
  createdAt: "2026-08-01",
};

describe("appointments-api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("checks health and lists appointments with the scoped user header", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [sampleAppointment] }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        })
      );

    await expect(checkAppointmentsApiHealth()).resolves.toEqual({ status: "ok" });
    await expect(listAppointmentsFromApi("ana@example.com")).resolves.toEqual({
      items: [sampleAppointment],
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3001/api/health",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-user-email": "healthcheck@local",
        }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3001/api/appointments?page=1&pageSize=100",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-user-email": "ana@example.com",
        }),
      })
    );
  });

  it("gets, creates, updates, and deletes appointments", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: sampleAppointment }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: sampleAppointment }), {
          status: 201,
          headers: {
            "Content-Type": "application/json",
          },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { ...sampleAppointment, status: "confirmed" } }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        })
      )
      .mockResolvedValueOnce(
        new Response("", {
          status: 200,
        })
      );

    await expect(getAppointmentFromApi("ana@example.com", "appointment-1")).resolves.toEqual({
      data: sampleAppointment,
    });
    await expect(createAppointmentInApi("ana@example.com", sampleAppointment)).resolves.toEqual({
      data: sampleAppointment,
    });
    await expect(
      updateAppointmentInApi("ana@example.com", {
        ...sampleAppointment,
        status: "confirmed",
      })
    ).resolves.toEqual({
      data: {
        ...sampleAppointment,
        status: "confirmed",
      },
    });
    await expect(deleteAppointmentInApi("ana@example.com", "appointment-1")).resolves.toEqual({});

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3001/api/appointments",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-user-email": "ana@example.com",
        }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3001/api/appointments/appointment-1",
      expect.objectContaining({
        method: "PUT",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:3001/api/appointments/appointment-1",
      expect.objectContaining({
        method: "DELETE",
      })
    );
  });

  it("surfaces server-provided and fallback error messages", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Programarea nu a fost gasita." }), {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ errors: { service: "required" } }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        })
      );

    await expect(getAppointmentFromApi("ana@example.com", "missing")).rejects.toMatchObject({
      name: "AppointmentsApiError",
      message: "Programarea nu a fost gasita.",
      statusCode: 404,
    });

    await expect(getAppointmentFromApi("ana@example.com", "still-missing")).rejects.toMatchObject({
      name: "AppointmentsApiError",
      message: "Cererea catre server a esuat.",
      statusCode: 400,
      details: {
        errors: {
          service: "required",
        },
      },
    });
  });

  it("wraps network failures in AppointmentsApiError", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("offline"));

    const requestPromise = listAppointmentsFromApi("ana@example.com");

    await expect(requestPromise).rejects.toBeInstanceOf(AppointmentsApiError);
    await expect(requestPromise).rejects.toMatchObject({
      message: "Serverul nu poate fi contactat momentan.",
      statusCode: 0,
    });
  });

  it("listAppointmentsPageFromApi requests the correct paginated URL", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [], pagination: { totalPages: 1, totalItems: 0, hasNextPage: false } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await listAppointmentsPageFromApi("test@example.com", 2, 20);
    expect(result).toMatchObject({ items: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/appointments?page=2&pageSize=20",
      expect.objectContaining({ headers: expect.objectContaining({ "x-user-email": "test@example.com" }) })
    );
  });

  it("startGeneratorInApi sends POST to generator/start with interval param", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Generator pornit.", interval: 2000 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await startGeneratorInApi("test@example.com", 2000);
    expect(result).toMatchObject({ message: "Generator pornit.", interval: 2000 });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/generator/start?interval=2000",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("stopGeneratorInApi sends POST to generator/stop", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Generator oprit." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await stopGeneratorInApi("test@example.com");
    expect(result).toMatchObject({ message: "Generator oprit." });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/generator/stop",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("getGeneratorStatusFromApi sends GET to generator/status", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ running: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await getGeneratorStatusFromApi("test@example.com");
    expect(result).toEqual({ running: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/generator/status",
      expect.not.objectContaining({ method: "POST" })
    );
  });
});
