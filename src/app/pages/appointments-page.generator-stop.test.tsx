/**
 * Isolated test for the generator stop/start code paths in AppointmentsPage.
 * The appointments context never sets generatorRunning=true on its own,
 * so this test mocks the context to exercise the stop branch.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Appointment } from "../contexts/appointments-context";

const { mockToastSuccess, mockToastError, mockStopGeneratorInApi, mockStartGeneratorInApi } = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockStopGeneratorInApi: vi.fn(),
  mockStartGeneratorInApi: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("sonner", () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

vi.mock("../api/appointments-api", async () => {
  const actual = await vi.importActual<typeof import("../api/appointments-api")>("../api/appointments-api");
  return { ...actual, stopGeneratorInApi: mockStopGeneratorInApi, startGeneratorInApi: mockStartGeneratorInApi };
});

// Dynamic mock state — changed per test
let mockAppointments: Appointment[] = [];
let mockGeneratorRunning = true;

vi.mock("../contexts/appointments-context", async () => {
  const actual = await vi.importActual<typeof import("../contexts/appointments-context")>("../contexts/appointments-context");
  return {
    ...actual,
    useAppointments: () => ({
      appointments: mockAppointments,
      isLoading: false,
      connectionStatus: "online" as const,
      pendingChangesCount: 0,
      generatorRunning: mockGeneratorRunning,
      addAppointment: vi.fn(),
      updateAppointment: vi.fn(),
      deleteAppointment: vi.fn(),
      getAppointment: vi.fn(),
      refreshAppointments: vi.fn(),
      startGenerator: mockStartGeneratorInApi,
      stopGenerator: mockStopGeneratorInApi,
    }),
  };
});

import { AppointmentsPage } from "./appointments-page";

const sampleAppointment: Appointment = {
  id: "1", service: "Coaching Bugetar", date: "2026-09-01", time: "10:00",
  status: "pending", clientName: "Ana Ionescu", phone: "", notes: "",
  createdAt: "2026-09-01", ownerEmail: "demo@exemplu.ro",
};

describe("AppointmentsPage generator stop path", () => {
  beforeEach(() => {
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockStopGeneratorInApi.mockReset();
    mockStartGeneratorInApi.mockReset();
    mockStopGeneratorInApi.mockResolvedValue({ message: "Generator oprit." });
    mockStartGeneratorInApi.mockResolvedValue({ message: "Generator pornit.", interval: 3000 });
    mockGeneratorRunning = true;
    mockAppointments = [sampleAppointment];
    window.localStorage.setItem("user", JSON.stringify({
      name: "Demo", email: "demo@exemplu.ro", phone: "", bio: "",
      appointmentCount: 0, totalSalary: 0, investmentGoal: 0,
    }));
  });

  it("stops the generator and shows success toast", async () => {
    render(<MemoryRouter><AppointmentsPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByTitle(/Oprește generatorul/i)).toBeInTheDocument());
    fireEvent.click(screen.getByTitle(/Oprește generatorul/i));

    await waitFor(() => {
      expect(mockStopGeneratorInApi).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith("Generator oprit.");
    });
  });

  it("starts the generator when generatorRunning is false", async () => {
    mockGeneratorRunning = false;

    render(<MemoryRouter><AppointmentsPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByTitle(/Pornește generatorul/i)).toBeInTheDocument());
    fireEvent.click(screen.getByTitle(/Pornește generatorul/i));

    await waitFor(() => {
      expect(mockStartGeneratorInApi).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith("Generator pornit. Programări noi apar automat.");
    });
  });
});
