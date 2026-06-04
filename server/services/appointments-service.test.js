import { describe, expect, it } from "vitest";
import { createSeedAppointments } from "../domain/appointments.js";
import { InMemoryAppointmentsRepository } from "../repositories/in-memory-appointments-repository.js";
import {
  AppointmentsService,
  NotFoundError,
  ValidationError,
} from "./appointments-service.js";

const DEMO_EMAIL = "demo@exemplu.ro";

function buildService(seed = createSeedAppointments()) {
  return new AppointmentsService(new InMemoryAppointmentsRepository(seed), {
    now: () => new Date("2026-04-10T08:00:00.000Z"),
    createId: () => "created-id",
  });
}

describe("AppointmentsService", () => {
  it("lists appointments using paginated repository data", async () => {
    const service = buildService();

    const result = await service.list(DEMO_EMAIL, { page: "2", pageSize: "4" });

    expect(result.items).toHaveLength(4);
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.totalItems).toBe(12);
  });

  it("retrieves appointments by id and throws when one is missing", async () => {
    const service = buildService();

    expect((await service.getById(DEMO_EMAIL, "1")).id).toBe("1");
    await expect(service.getById(DEMO_EMAIL, "missing")).rejects.toThrow(NotFoundError);
  });

  it("creates appointments after validation", async () => {
    const service = buildService([]);

    const appointment = await service.create(DEMO_EMAIL, {
      service: "Buget personal",
      date: "2026-04-12",
      time: "10:30",
      status: "confirmed",
      clientName: "Ana Pop",
      phone: "",
      notes: "Prima sesiune",
    });

    expect(appointment.id).toBe("created-id");
    expect(appointment.createdAt).toBe("2026-04-10");
    expect(appointment.ownerEmail).toBe(DEMO_EMAIL);
    expect((await service.list(DEMO_EMAIL)).items).toHaveLength(1);
  });

  it("throws a validation error when creating invalid appointments", async () => {
    const service = buildService([]);

    await expect(
      service.create(DEMO_EMAIL, {
        service: "",
        date: "2026-04-09",
        time: "",
        status: "invalid",
        clientName: "A",
        phone: "123",
        notes: "x".repeat(501),
      })
    ).rejects.toThrow(ValidationError);
  });

  it("updates appointments while preserving the original created date", async () => {
    const service = buildService([
      {
        id: "1",
        ownerEmail: DEMO_EMAIL,
        service: "Consultanta",
        date: "2026-03-01",
        time: "09:00",
        status: "pending",
        clientName: "Doru Ene",
        phone: "",
        notes: "",
        createdAt: "2026-02-01",
      },
    ]);

    const updated = await service.update(DEMO_EMAIL, "1", {
      status: "completed",
      notes: "Finalizat",
    });

    expect(updated.status).toBe("completed");
    expect(updated.notes).toBe("Finalizat");
    expect(updated.createdAt).toBe("2026-02-01");
  });

  it("throws when updating or deleting an unknown appointment", async () => {
    const service = buildService([]);

    await expect(service.update(DEMO_EMAIL, "404", { notes: "x" })).rejects.toThrow(NotFoundError);
    await expect(service.delete(DEMO_EMAIL, "404")).rejects.toThrow(NotFoundError);
  });

  it("throws a validation error when an update produces invalid data", async () => {
    const service = buildService([
      {
        id: "1",
        ownerEmail: DEMO_EMAIL,
        service: "Consultanta",
        date: "2026-04-12",
        time: "09:00",
        status: "pending",
        clientName: "Doru Ene",
        phone: "",
        notes: "",
        createdAt: "2026-04-01",
      },
    ]);

    await expect(service.update(DEMO_EMAIL, "1", { clientName: "" })).rejects.toThrow(ValidationError);
  });

  it("deletes appointments and computes statistics", async () => {
    const service = buildService([
      {
        id: "1",
        ownerEmail: DEMO_EMAIL,
        service: "Consultanta",
        date: "2026-04-12",
        time: "09:00",
        status: "confirmed",
        clientName: "Doru Ene",
        phone: "",
        notes: "",
        createdAt: "2026-04-01",
      },
      {
        id: "2",
        ownerEmail: DEMO_EMAIL,
        service: "Consultanta",
        date: "2026-03-01",
        time: "09:00",
        status: "cancelled",
        clientName: "Ana Pop",
        phone: "",
        notes: "",
        createdAt: "2026-02-01",
      },
    ]);

    expect((await service.delete(DEMO_EMAIL, "2")).id).toBe("2");

    expect(await service.getStatistics(DEMO_EMAIL)).toEqual({
      totalAppointments: 1,
      upcomingAppointments: 1,
      byStatus: {
        confirmed: 1,
        pending: 0,
        completed: 0,
        cancelled: 0,
      },
      byService: {
        Consultanta: 1,
      },
    });
  });
});
