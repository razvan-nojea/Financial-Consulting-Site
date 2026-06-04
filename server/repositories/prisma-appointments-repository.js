import { PrismaClient } from "@prisma/client";

// Singleton client reused across calls.
const defaultPrisma = new PrismaClient();

/**
 * Maps a Prisma record (with an included `service` relation) back to the flat
 * domain shape expected by AppointmentsService.
 *
 * @param {{ service: { name: string }, status: string, [key: string]: unknown }} record
 * @returns {import("../domain/appointments.js").Appointment}
 */
function mapRecord(record) {
  return {
    id: record.id,
    ownerEmail: record.ownerEmail,
    service: record.service.name,
    date: record.date,
    time: record.time,
    status: record.status,
    clientName: record.clientName,
    phone: record.phone,
    notes: record.notes,
    createdAt: record.createdAt,
  };
}

/**
 * Upserts a service row by name and returns its id.
 *
 * @param {PrismaClient} prisma
 * @param {string} name
 * @returns {Promise<number>}
 */
async function resolveServiceId(prisma, name) {
  const row = await prisma.service.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  return row.id;
}

/**
 * Production repository backed by PostgreSQL via Prisma.
 * Implements the same interface as InMemoryAppointmentsRepository so the
 * service layer requires no changes.
 */
export class PrismaAppointmentsRepository {
  /**
   * @param {PrismaClient} [client] – injectable for testing
   */
  constructor(client = defaultPrisma) {
    this.prisma = client;
  }

  /**
   * Returns all appointments ordered by createdAt descending (newest first).
   * @returns {Promise<object[]>}
   */
  async getAll() {
    const records = await this.prisma.appointment.findMany({
      include: { service: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return records.map(mapRecord);
  }

  /**
   * Returns a single appointment by id, or null if not found.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async getById(id) {
    const record = await this.prisma.appointment.findUnique({
      where: { id },
      include: { service: true },
    });
    return record ? mapRecord(record) : null;
  }

  /**
   * Persists a new appointment and returns the saved record.
   * The service name is normalised into the `services` lookup table.
   * @param {object} appointment
   * @returns {Promise<object>}
   */
  async create(appointment) {
    const { service: serviceName, ...rest } = appointment;
    const serviceId = await resolveServiceId(this.prisma, serviceName);

    const record = await this.prisma.appointment.create({
      data: {
        id: rest.id,
        ownerEmail: rest.ownerEmail,
        serviceId,
        date: rest.date,
        time: rest.time,
        status: rest.status,
        clientName: rest.clientName,
        phone: rest.phone ?? "",
        notes: rest.notes ?? "",
        createdAt: rest.createdAt,
      },
      include: { service: true },
    });

    return mapRecord(record);
  }

  /**
   * Replaces an existing appointment. Returns the updated record, or null when
   * the appointment does not exist.
   * @param {string} id
   * @param {object} appointment
   * @returns {Promise<object|null>}
   */
  async update(id, appointment) {
    const { service: serviceName, ...rest } = appointment;
    const serviceId = await resolveServiceId(this.prisma, serviceName);

    try {
      const record = await this.prisma.appointment.update({
        where: { id },
        data: {
          ownerEmail: rest.ownerEmail,
          serviceId,
          date: rest.date,
          time: rest.time,
          status: rest.status,
          clientName: rest.clientName,
          phone: rest.phone ?? "",
          notes: rest.notes ?? "",
          createdAt: rest.createdAt,
        },
        include: { service: true },
      });
      return mapRecord(record);
    } catch {
      return null;
    }
  }

  /**
   * Removes an appointment by id. Returns the deleted record, or null when the
   * appointment does not exist.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async delete(id) {
    try {
      const record = await this.prisma.appointment.delete({
        where: { id },
        include: { service: true },
      });
      return mapRecord(record);
    } catch {
      return null;
    }
  }
}
