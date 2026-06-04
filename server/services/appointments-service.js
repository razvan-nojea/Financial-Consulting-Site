import {
  buildAppointmentStatistics,
  createAppointmentRecord,
  paginateAppointments,
  validateAppointmentInput,
} from "../domain/appointments.js";

export class ValidationError extends Error {
  constructor(errors) {
    super("Validation failed.");
    this.name = "ValidationError";
    this.statusCode = 400;
    this.errors = errors;
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

export class AppointmentsService {
  constructor(repository, options = {}) {
    this.repository = repository;
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? (() => String(Date.now()));
  }

  async list(ownerEmail, query = {}) {
    return paginateAppointments(await this.getOwnedAppointments(ownerEmail), query);
  }

  async getById(ownerEmail, id) {
    return this.getOwnedAppointment(ownerEmail, id);
  }

  async create(ownerEmail, input) {
    const today = this.now().toISOString().split("T")[0];
    const validation = validateAppointmentInput(input, { today });

    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }

    const appointment = createAppointmentRecord(validation.value, {
      id: input.id ?? this.createId(),
      createdAt: input.createdAt ?? today,
      ownerEmail,
    });

    return this.repository.create(appointment);
  }

  async update(ownerEmail, id, input) {
    const existing = await this.getOwnedAppointment(ownerEmail, id);

    const merged = {
      service: input.service ?? existing.service,
      date: input.date ?? existing.date,
      time: input.time ?? existing.time,
      status: input.status ?? existing.status,
      clientName: input.clientName ?? existing.clientName,
      phone: input.phone ?? existing.phone,
      notes: input.notes ?? existing.notes,
    };
    const today = this.now().toISOString().split("T")[0];
    const validation = validateAppointmentInput(merged, {
      allowPastDate: true,
      today,
    });

    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }

    return this.repository.update(
      String(id),
      createAppointmentRecord(validation.value, {
        id: existing.id,
        createdAt: existing.createdAt,
        ownerEmail: existing.ownerEmail,
      })
    );
  }

  async delete(ownerEmail, id) {
    const existing = await this.getOwnedAppointment(ownerEmail, id);
    await this.repository.delete(String(id));
    return existing;
  }

  async getStatistics(ownerEmail) {
    const today = this.now().toISOString().split("T")[0];
    return buildAppointmentStatistics(await this.getOwnedAppointments(ownerEmail), today);
  }

  async getOwnedAppointments(ownerEmail) {
    const all = await this.repository.getAll();
    return all.filter((appointment) => appointment.ownerEmail === ownerEmail);
  }

  async getOwnedAppointment(ownerEmail, id) {
    const appointment = await this.repository.getById(String(id));
    if (!appointment || appointment.ownerEmail !== ownerEmail) {
      throw new NotFoundError("Programarea nu a fost gasita.");
    }

    return appointment;
  }
}
