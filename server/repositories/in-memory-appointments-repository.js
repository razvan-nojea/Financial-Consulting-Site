import { cloneAppointments, createSeedAppointments } from "../domain/appointments.js";

export class InMemoryAppointmentsRepository {
  constructor(seedAppointments = createSeedAppointments()) {
    this.appointments = cloneAppointments(seedAppointments);
  }

  getAll() {
    return cloneAppointments(this.appointments);
  }

  getById(id) {
    const appointment = this.appointments.find((candidate) => candidate.id === id);
    return appointment ? { ...appointment } : null;
  }

  create(appointment) {
    this.appointments.unshift({ ...appointment });
    return { ...appointment };
  }

  update(id, nextAppointment) {
    const index = this.appointments.findIndex((candidate) => candidate.id === id);
    if (index === -1) {
      return null;
    }

    this.appointments[index] = { ...nextAppointment };
    return { ...this.appointments[index] };
  }

  delete(id) {
    const index = this.appointments.findIndex((candidate) => candidate.id === id);
    if (index === -1) {
      return null;
    }

    const [removed] = this.appointments.splice(index, 1);
    return { ...removed };
  }
}
