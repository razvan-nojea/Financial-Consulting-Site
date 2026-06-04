import { describe, expect, it } from "vitest";
import { InMemoryAppointmentsRepository } from "./in-memory-appointments-repository.js";

describe("InMemoryAppointmentsRepository", () => {
  it("returns null for unknown updates and deletes", () => {
    const repository = new InMemoryAppointmentsRepository([]);

    expect(repository.getById("missing")).toBeNull();
    expect(repository.update("missing", { id: "missing" })).toBeNull();
    expect(repository.delete("missing")).toBeNull();
  });
});
