import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaAppointmentsRepository } from "./prisma-appointments-repository.js";

// ── Mock @prisma/client ───────────────────────────────────────────────────────
// We test the repository's logic (correct Prisma calls, correct mapping) without
// needing a live database by injecting a mock PrismaClient.

const SERVICE_ROW = { id: 1, name: "Coaching Bugetar" };

const DB_RECORD = {
  id: "appt-1",
  ownerEmail: "demo@exemplu.ro",
  serviceId: 1,
  service: SERVICE_ROW,
  date: "2026-09-01",
  time: "10:00",
  status: "pending",
  clientName: "Ana Ionescu",
  phone: "0722 123 456",
  notes: "Note",
  createdAt: "2026-08-01",
};

const DOMAIN_RECORD = {
  id: "appt-1",
  ownerEmail: "demo@exemplu.ro",
  service: "Coaching Bugetar",
  date: "2026-09-01",
  time: "10:00",
  status: "pending",
  clientName: "Ana Ionescu",
  phone: "0722 123 456",
  notes: "Note",
  createdAt: "2026-08-01",
};

function makePrisma(overrides = {}) {
  return {
    appointment: {
      findMany: vi.fn().mockResolvedValue([DB_RECORD]),
      findUnique: vi.fn().mockResolvedValue(DB_RECORD),
      create: vi.fn().mockResolvedValue(DB_RECORD),
      update: vi.fn().mockResolvedValue(DB_RECORD),
      delete: vi.fn().mockResolvedValue(DB_RECORD),
      ...overrides.appointment,
    },
    service: {
      upsert: vi.fn().mockResolvedValue(SERVICE_ROW),
      ...overrides.service,
    },
  };
}

describe("PrismaAppointmentsRepository", () => {
  let prisma;
  let repo;

  beforeEach(() => {
    prisma = makePrisma();
    repo = new PrismaAppointmentsRepository(prisma);
  });

  // ── getAll ────────────────────────────────────────────────────────────────

  it("getAll returns all appointments mapped to domain shape", async () => {
    const result = await repo.getAll();

    expect(prisma.appointment.findMany).toHaveBeenCalledWith({
      include: { service: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(DOMAIN_RECORD);
  });

  it("getAll returns an empty array when there are no appointments", async () => {
    prisma.appointment.findMany.mockResolvedValue([]);
    const result = await repo.getAll();
    expect(result).toEqual([]);
  });

  // ── getById ───────────────────────────────────────────────────────────────

  it("getById returns the mapped appointment when found", async () => {
    const result = await repo.getById("appt-1");

    expect(prisma.appointment.findUnique).toHaveBeenCalledWith({
      where: { id: "appt-1" },
      include: { service: true },
    });
    expect(result).toEqual(DOMAIN_RECORD);
  });

  it("getById returns null when the appointment does not exist", async () => {
    prisma.appointment.findUnique.mockResolvedValue(null);
    const result = await repo.getById("missing");
    expect(result).toBeNull();
  });

  // ── create ────────────────────────────────────────────────────────────────

  it("create upserts the service and persists the appointment", async () => {
    const input = { ...DOMAIN_RECORD };
    const result = await repo.create(input);

    expect(prisma.service.upsert).toHaveBeenCalledWith({
      where: { name: "Coaching Bugetar" },
      update: {},
      create: { name: "Coaching Bugetar" },
    });
    expect(prisma.appointment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "appt-1",
        ownerEmail: "demo@exemplu.ro",
        serviceId: 1,
      }),
      include: { service: true },
    });
    expect(result).toEqual(DOMAIN_RECORD);
  });

  it("create defaults phone and notes to empty string when missing", async () => {
    const input = { ...DOMAIN_RECORD, phone: undefined, notes: undefined };
    await repo.create(input);

    expect(prisma.appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: "", notes: "" }),
      })
    );
  });

  // ── update ────────────────────────────────────────────────────────────────

  it("update upserts the service and replaces the appointment data", async () => {
    const input = { ...DOMAIN_RECORD, status: "confirmed" };
    const result = await repo.update("appt-1", input);

    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: "appt-1" },
      data: expect.objectContaining({ serviceId: 1 }),
      include: { service: true },
    });
    expect(result).toEqual(DOMAIN_RECORD);
  });

  it("update defaults phone and notes to empty string when missing", async () => {
    const input = { ...DOMAIN_RECORD, phone: undefined, notes: undefined };
    await repo.update("appt-1", input);

    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: "", notes: "" }),
      })
    );
  });

  it("update returns null when the appointment does not exist", async () => {
    prisma.appointment.update.mockRejectedValue(new Error("Record not found"));
    const result = await repo.update("missing", DOMAIN_RECORD);
    expect(result).toBeNull();
  });

  // ── delete ────────────────────────────────────────────────────────────────

  it("delete removes the appointment and returns the deleted record", async () => {
    const result = await repo.delete("appt-1");

    expect(prisma.appointment.delete).toHaveBeenCalledWith({
      where: { id: "appt-1" },
      include: { service: true },
    });
    expect(result).toEqual(DOMAIN_RECORD);
  });

  it("delete returns null when the appointment does not exist", async () => {
    prisma.appointment.delete.mockRejectedValue(new Error("Record not found"));
    const result = await repo.delete("missing");
    expect(result).toBeNull();
  });
});
