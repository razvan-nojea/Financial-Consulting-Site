import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_STATUSES,
  buildAppointmentStatistics,
  cloneAppointments,
  createAppointmentRecord,
  createSeedAppointments,
  paginateAppointments,
  validateAppointmentInput,
} from "./appointments.js";

describe("appointments domain helpers", () => {
  it("clones seed appointments without sharing references", () => {
    const seed = createSeedAppointments();
    const clone = cloneAppointments(seed);

    expect(seed).toHaveLength(12);
    expect(clone).toEqual(seed);
    expect(clone).not.toBe(seed);
    expect(clone[0]).not.toBe(seed[0]);
  });

  it("validates a correct appointment payload", () => {
    const result = validateAppointmentInput({
      service: "Coaching Bugetar",
      date: "2026-08-12",
      time: "11:30",
      status: "pending",
      clientName: "Ana Ionescu",
      phone: "0722 123 456",
      notes: "Sedinta initiala",
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.value.clientName).toBe("Ana Ionescu");
  });

  it("reports validation errors for invalid appointment payloads", () => {
    const result = validateAppointmentInput(
      {
        service: " ",
        date: "2026/01/01",
        time: "25:61",
        status: "draft",
        clientName: "Al",
        phone: "abc",
        notes: "x".repeat(501),
      },
      { today: "2026-01-01" }
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual({
      service: "Serviciul este obligatoriu.",
      date: "Data trebuie sa fie in formatul YYYY-MM-DD.",
      time: "Ora trebuie sa fie in formatul HH:MM.",
      status: "Status invalid.",
      clientName: "Numele clientului trebuie sa aiba cel putin 3 caractere.",
      phone: "Numar invalid. Exemplu valid: 0722 123 456.",
      notes: "Notitele depasesc limita de 500 de caractere (501/500).",
    });
  });

  it("rejects past dates for new appointments and allows partial updates", () => {
    const invalidNew = validateAppointmentInput(
      {
        service: "Audit financiar",
        date: "2026-01-01",
        time: "09:00",
        status: "confirmed",
        clientName: "Mihai Pavel",
        phone: "",
        notes: "",
      },
      { today: "2026-01-02" }
    );

    const partial = validateAppointmentInput(
      {
        phone: "",
      },
      { partial: true, allowPastDate: true, today: "2026-01-02" }
    );

    expect(invalidNew.errors.date).toBe("Data nu poate fi in trecut.");
    expect(partial.isValid).toBe(true);
    expect(partial.value).toEqual({ phone: "" });
  });

  it("reports missing required fields explicitly", () => {
    const result = validateAppointmentInput({
      service: "Consultanta",
      date: "",
      time: "10:00",
      status: "",
      clientName: "",
      phone: "",
      notes: "",
    });

    expect(result.errors.date).toBe("Data este obligatorie.");
    expect(result.errors.status).toBe("Statusul este obligatoriu.");
    expect(result.errors.clientName).toBe("Numele clientului este obligatoriu.");
  });

  it("creates normalized appointment records", () => {
    expect(
      createAppointmentRecord(
        {
          service: "Consultanta",
          date: "2026-08-01",
          time: "10:00",
          status: "confirmed",
          clientName: "Dora Pop",
          phone: "",
          notes: "",
        },
        { id: 99, createdAt: "2026-07-01", ownerEmail: "demo@exemplu.ro" }
      )
    ).toEqual({
      id: "99",
      ownerEmail: "demo@exemplu.ro",
      service: "Consultanta",
      date: "2026-08-01",
      time: "10:00",
      status: "confirmed",
      clientName: "Dora Pop",
      phone: "",
      notes: "",
      createdAt: "2026-07-01",
    });
  });

  it("fills in empty optional fields when creating a record", () => {
    expect(
      createAppointmentRecord(
        {
          service: "Consultanta",
          date: "2026-08-01",
          time: "10:00",
          status: "confirmed",
          clientName: "Dora Pop",
        },
        { id: "100", createdAt: "2026-07-01", ownerEmail: "demo@exemplu.ro" }
      )
    ).toEqual(
      expect.objectContaining({
        ownerEmail: "demo@exemplu.ro",
        phone: "",
        notes: "",
      })
    );
  });

  it("defaults the owner email to an empty string when none is provided", () => {
    expect(
      createAppointmentRecord(
        {
          service: "Consultanta",
          date: "2026-08-01",
          time: "10:00",
          status: "confirmed",
          clientName: "Dora Pop",
        },
        { id: "101", createdAt: "2026-07-01" }
      )
    ).toEqual(
      expect.objectContaining({
        ownerEmail: "",
      })
    );
  });

  it("paginates, filters, and normalizes invalid query parameters", () => {
    const seed = createSeedAppointments();
    const page = paginateAppointments(seed, {
      page: "100",
      pageSize: "200",
      search: "investitii",
      status: "pending",
    });

    expect(page.items).toHaveLength(2);
    expect(page.pagination).toEqual({
      page: 1,
      pageSize: 5,
      totalItems: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
    expect(page.filters).toEqual({
      search: "investitii",
      status: "pending",
    });
  });

  it("returns a stable pagination shape for empty result sets", () => {
    const page = paginateAppointments(createSeedAppointments(), {
      search: "inexistent",
      page: "-4",
      pageSize: "0",
    });

    expect(page.items).toEqual([]);
    expect(page.pagination.totalPages).toBe(1);
    expect(page.pagination.page).toBe(1);
  });

  it("builds statistics grouped by status and service", () => {
    const statistics = buildAppointmentStatistics(createSeedAppointments(), "2026-04-01");

    expect(Object.keys(statistics.byStatus)).toEqual(APPOINTMENT_STATUSES);
    expect(statistics.totalAppointments).toBe(12);
    expect(statistics.upcomingAppointments).toBe(6);
    expect(statistics.byStatus.completed).toBe(4);
    expect(statistics.byStatus.cancelled).toBe(2);
    expect(statistics.byService["Strategii de Investitii"]).toBe(3);
  });
});
