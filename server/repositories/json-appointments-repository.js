/**
 * JsonAppointmentsRepository — file-backed appointments store.
 *
 * Persists the appointments array to a JSON file so data survives server
 * restarts.  On first run the file is seeded with the standard demo set.
 * Implements the same interface as InMemoryAppointmentsRepository.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { ensureDir } from "./json-repository-utils.js";

export class JsonAppointmentsRepository {
  constructor(filePath = "./data/appointments.json") {
    this.filePath = filePath;
    this.appointments = this._load();
  }

  _ensureDir() {
    ensureDir(this.filePath);
  }

  _load() {
    if (!existsSync(this.filePath)) {
      this._persist([]);
      return [];
    }
    try {
      return JSON.parse(readFileSync(this.filePath, "utf8"));
    } catch {
      return [];
    }
  }

  _persist(appointments) {
    this._ensureDir();
    writeFileSync(this.filePath, JSON.stringify(appointments, null, 2), "utf8");
  }

  getAll() {
    return this.appointments.map((a) => ({ ...a }));
  }

  getById(id) {
    const a = this.appointments.find((candidate) => candidate.id === id);
    return a ? { ...a } : null;
  }

  create(appointment) {
    this.appointments.unshift({ ...appointment });
    this._persist(this.appointments);
    return { ...appointment };
  }

  update(id, next) {
    const i = this.appointments.findIndex((a) => a.id === id);
    if (i === -1) return null;
    this.appointments[i] = { ...next };
    this._persist(this.appointments);
    return { ...this.appointments[i] };
  }

  delete(id) {
    const i = this.appointments.findIndex((a) => a.id === id);
    if (i === -1) return null;
    const [removed] = this.appointments.splice(i, 1);
    this._persist(this.appointments);
    return { ...removed };
  }
}
