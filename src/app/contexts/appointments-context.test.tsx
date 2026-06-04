import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AppointmentsProvider,
  getAppointmentsStorageKey,
  useAppointments,
  validateAppointment,
  type AppointmentFormData,
} from "./appointments-context";
import { ACCOUNTS_STORAGE_KEY, USER_STORAGE_KEY } from "./auth-context";

const mockStartGeneratorInApi = vi.hoisted(() => vi.fn().mockResolvedValue({ message: "ok", interval: 3000 }));
const mockStopGeneratorInApi = vi.hoisted(() => vi.fn().mockResolvedValue({ message: "ok" }));

vi.mock("../api/appointments-api", async () => {
  const actual = await vi.importActual<typeof import("../api/appointments-api")>("../api/appointments-api");
  return {
    ...actual,
    startGeneratorInApi: mockStartGeneratorInApi,
    stopGeneratorInApi: mockStopGeneratorInApi,
  };
});

const mockAuthUser = vi.hoisted(() => ({ value: null as import("./auth-context").User | null }));

vi.mock("./auth-context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./auth-context")>();
  return {
    ...actual,
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children as React.ReactNode}</>,
    useAuth: () => ({
      user: mockAuthUser.value,
      isAuthenticated: !!mockAuthUser.value,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
      updateUser: vi.fn((updatedUser: import("./auth-context").User) => {
        mockAuthUser.value = updatedUser;
        storage[USER_STORAGE_KEY] = JSON.stringify(updatedUser);
      }),
    }),
  };
});

const storage: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete storage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
  }),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AppointmentsProvider>{children}</AppointmentsProvider>
  );
}

function seedSession(email = "demo@exemplu.ro") {
  const user = {
    name: email === "demo@exemplu.ro" ? "Cont Demo" : "Ana Ionescu",
    email,
    phone: "",
    bio: "",
    appointmentCount: email === "demo@exemplu.ro" ? 12 : 0,
    totalSalary: 0,
    investmentGoal: 0,
    role: "user" as const,
  };
  mockAuthUser.value = user;

  storage[ACCOUNTS_STORAGE_KEY] = JSON.stringify([
    {
      name: "Cont Demo",
      email: "demo@exemplu.ro",
      password: "demo123",
      phone: "",
      bio: "",
      appointmentCount: email === "demo@exemplu.ro" ? 12 : 0,
      totalSalary: 0,
      investmentGoal: 0,
    },
    {
      name: "Ana Ionescu",
      email: "ana@example.com",
      password: "secret123",
      phone: "",
      bio: "",
      appointmentCount: 0,
      totalSalary: 0,
      investmentGoal: 0,
    },
  ]);

  storage[USER_STORAGE_KEY] = JSON.stringify(user);
}

const validAppointment: AppointmentFormData = {
  service: "Coaching Bugetar",
  date: "2026-08-10",
  time: "11:00",
  status: "pending",
  clientName: "Ana Ionescu",
  phone: "0722123456",
  notes: "Discuție despre buget.",
};

describe("appointments-context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockAuthUser.value = null;
    mockStartGeneratorInApi.mockResolvedValue({ message: "ok", interval: 3000 });
    mockStopGeneratorInApi.mockResolvedValue({ message: "ok" });
  });

  it("throws an error when useAppointments is used outside the provider", () => {
    expect(() => renderHook(() => useAppointments())).toThrow(
      "useAppointments must be used within AppointmentsProvider"
    );
  });

  it("loads the demo appointments for the demo account and syncs the count", async () => {
    seedSession();

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => {
      expect(result.current.appointments).toHaveLength(12);
    });

    expect(storage[getAppointmentsStorageKey("demo@exemplu.ro")]).toContain(
      "Planificare Financiară pentru Afaceri"
    );

    const storedUser = JSON.parse(storage[USER_STORAGE_KEY]);
    expect(storedUser.appointmentCount).toBe(12);
  });

  it("starts a newly created account with zero appointments", async () => {
    seedSession("ana@example.com");

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => {
      expect(result.current.appointments).toHaveLength(0);
    });

    expect(storage[getAppointmentsStorageKey("ana@example.com")]).toBe("[]");
  });

  it("sanitizes malformed appointments from local storage and keeps only valid entries", async () => {
    seedSession("ana@example.com");
    storage[getAppointmentsStorageKey("ana@example.com")] = JSON.stringify([
      null,
      {
        id: "valid-id",
        service: "Consultanta bugetara",
        date: "2026-08-10",
        time: "11:00",
        status: "pending",
        clientName: "Ana Ionescu",
        phone: "0722123456",
        notes: "",
        createdAt: "2026-08-01",
      },
      {
        id: "missing-created-at",
        service: "Invalida",
        date: "2026-08-11",
        time: "09:00",
        status: "pending",
        clientName: "Ana",
        phone: "",
        notes: "",
      },
      {
        id: "invalid-status",
        service: "Alta",
        date: "2026-08-12",
        time: "10:00",
        status: "unknown",
        clientName: "Ana",
        phone: "",
        notes: "",
        createdAt: "2026-08-02",
      },
    ]);

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => {
      expect(result.current.appointments).toHaveLength(1);
    });

    expect(result.current.appointments[0].id).toBe("valid-id");
  });

  it("falls back to an empty list when stored appointments are not an array", async () => {
    seedSession("ana@example.com");
    storage[getAppointmentsStorageKey("ana@example.com")] = JSON.stringify({
      nope: true,
    });

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => {
      expect(result.current.appointments).toEqual([]);
    });
  });

  it("falls back to an empty list when stored appointments contain invalid json", async () => {
    seedSession("ana@example.com");
    storage[getAppointmentsStorageKey("ana@example.com")] = "{invalid-json";

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => {
      expect(result.current.appointments).toEqual([]);
    });
  });

  it("stores appointments under the active account and increments the synced count", async () => {
    seedSession("ana@example.com");

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => {
      expect(result.current.appointments).toHaveLength(0);
    });

    let createdId = "";
    act(() => {
      const created = result.current.addAppointment(validAppointment);
      createdId = created.id;
    });

    await waitFor(() => {
      expect(result.current.appointments).toHaveLength(1);
    });

    const storedAppointments = JSON.parse(storage[getAppointmentsStorageKey("ana@example.com")]);
    expect(storedAppointments).toContainEqual(
      expect.objectContaining({
        id: createdId,
        clientName: "Ana Ionescu",
      })
    );

    const storedUser = JSON.parse(storage[USER_STORAGE_KEY]);
    expect(storedUser.appointmentCount).toBe(1);
  });

  it("rehydrates locally stored appointments for the same account after remounting", async () => {
    seedSession("ana@example.com");

    const firstRender = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => {
      expect(firstRender.result.current.appointments).toHaveLength(0);
    });

    let createdId = "";
    act(() => {
      createdId = firstRender.result.current.addAppointment(validAppointment).id;
    });

    await waitFor(() => {
      expect(firstRender.result.current.appointments).toHaveLength(1);
    });

    firstRender.unmount();

    const secondRender = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => {
      expect(secondRender.result.current.appointments).toHaveLength(1);
    });

    expect(secondRender.result.current.getAppointment(createdId)).toEqual(
      expect.objectContaining({
        clientName: "Ana Ionescu",
        service: "Coaching Bugetar",
      })
    );

    const storedUser = JSON.parse(storage[USER_STORAGE_KEY]);
    expect(storedUser.appointmentCount).toBe(1);
  });

  it("updates an appointment and keeps the change in the correct local account", async () => {
    seedSession("ana@example.com");

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => {
      expect(result.current.appointments).toHaveLength(0);
    });

    let createdId = "";
    act(() => {
      createdId = result.current.addAppointment(validAppointment).id;
    });

    act(() => {
      result.current.updateAppointment(createdId, {
        status: "completed",
        notes: "Actualizat după întâlnire.",
      });
    });

    await waitFor(() => {
      expect(result.current.getAppointment(createdId)?.status).toBe("completed");
    });

    const storedAppointments = JSON.parse(storage[getAppointmentsStorageKey("ana@example.com")]);
    expect(storedAppointments).toContainEqual(
      expect.objectContaining({
        id: createdId,
        status: "completed",
        notes: "Actualizat după întâlnire.",
      })
    );
  });

  it("deletes an appointment and decrements the synced appointment count", async () => {
    seedSession("ana@example.com");

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => {
      expect(result.current.appointments).toHaveLength(0);
    });

    let createdId = "";
    act(() => {
      createdId = result.current.addAppointment(validAppointment).id;
    });

    await waitFor(() => {
      expect(result.current.appointments).toHaveLength(1);
    });

    act(() => {
      result.current.deleteAppointment(createdId);
    });

    await waitFor(() => {
      expect(result.current.appointments).toHaveLength(0);
    });

    const storedAppointments = JSON.parse(storage[getAppointmentsStorageKey("ana@example.com")]);
    expect(storedAppointments).toEqual([]);

    const storedUser = JSON.parse(storage[USER_STORAGE_KEY]);
    expect(storedUser.appointmentCount).toBe(0);
  });

  it("does not leak appointments between different accounts", async () => {
    seedSession("ana@example.com");
    storage[getAppointmentsStorageKey("demo@exemplu.ro")] = JSON.stringify([
      {
        id: "special-demo",
        service: "Consultanță Demo",
        date: "2026-07-20",
        time: "09:00",
        status: "pending",
        clientName: "Demo Client",
        phone: "",
        notes: "",
        createdAt: "2026-07-01",
      },
    ]);

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => {
      expect(result.current.appointments).toEqual([]);
    });
  });

  it("gets a stored appointment by id", async () => {
    seedSession();

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => {
      expect(result.current.appointments).toHaveLength(12);
    });

    expect(result.current.getAppointment("1")).toEqual(
      expect.objectContaining({
        service: "Consultanță Planificare Pensie",
      })
    );
  });

  it("validates required fields", () => {
    const errors = validateAppointment({
      service: "",
      date: "",
      time: "",
      status: "pending",
      clientName: "",
      phone: "",
      notes: "",
    });

    expect(errors.service).toBeTruthy();
    expect(errors.date).toBeTruthy();
    expect(errors.time).toBeTruthy();
    expect(errors.clientName).toBeTruthy();
  });

  it("validates past dates for new appointments", () => {
    const errors = validateAppointment({
      ...validAppointment,
      date: "2020-01-01",
    });

    expect(errors.date).toContain("trecut");
  });

  it("allows past dates for editing existing appointments", () => {
    const errors = validateAppointment(
      {
        ...validAppointment,
        date: "2020-01-01",
      },
      false
    );

    expect(errors.date).toBeUndefined();
  });

  it("validates minimum client name length", () => {
    const errors = validateAppointment({
      ...validAppointment,
      clientName: "Io",
    });

    expect(errors.clientName).toContain("3 caractere");
  });

  it("validates phone number format", () => {
    const errors = validateAppointment({
      ...validAppointment,
      phone: "123",
    });

    expect(errors.phone).toBeTruthy();
  });

  it("validates notes length", () => {
    const errors = validateAppointment({
      ...validAppointment,
      notes: "a".repeat(501),
    });

    expect(errors.notes).toContain("500");
  });

  it("startGenerator calls the API with the user's email and sets generatorRunning to true", async () => {
    seedSession();

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => {
      expect(result.current.generatorRunning).toBe(false);
    });

    await act(async () => {
      await result.current.startGenerator(3000);
    });

    expect(result.current.generatorRunning).toBe(true);
    expect(mockStartGeneratorInApi).toHaveBeenCalledWith("demo@exemplu.ro", 3000);
  });

  it("stopGenerator calls the API with the user's email and sets generatorRunning to false", async () => {
    seedSession();

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await act(async () => {
      await result.current.startGenerator(3000);
    });

    expect(result.current.generatorRunning).toBe(true);

    await act(async () => {
      await result.current.stopGenerator();
    });

    expect(result.current.generatorRunning).toBe(false);
    expect(mockStopGeneratorInApi).toHaveBeenCalledWith("demo@exemplu.ro");
  });

  it("startGenerator does nothing when no user is logged in", async () => {
    const { result } = renderHook(() => useAppointments(), { wrapper });

    await act(async () => {
      await result.current.startGenerator(3000);
    });

    expect(mockStartGeneratorInApi).not.toHaveBeenCalled();
    expect(result.current.generatorRunning).toBe(false);
  });

  it("stopGenerator does nothing when no user is logged in", async () => {
    const { result } = renderHook(() => useAppointments(), { wrapper });

    await act(async () => {
      await result.current.stopGenerator();
    });

    expect(mockStopGeneratorInApi).not.toHaveBeenCalled();
  });
});
