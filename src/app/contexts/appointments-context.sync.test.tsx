import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Appointment } from "./appointments-context";
import {
  AppointmentsProvider,
  getAppointmentsQueueStorageKey,
  getAppointmentsStorageKey,
  useAppointments,
} from "./appointments-context";
import { ACCOUNTS_STORAGE_KEY, USER_STORAGE_KEY } from "./auth-context";

const apiMocks = vi.hoisted(() => ({
  checkAppointmentsApiHealth: vi.fn(),
  createAppointmentInApi: vi.fn(),
  deleteAppointmentInApi: vi.fn(),
  listAppointmentsFromApi: vi.fn(),
  updateAppointmentInApi: vi.fn(),
}));

vi.mock("../api/appointments-api", () => apiMocks);

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

const remoteAppointment: Appointment = {
  id: "remote-1",
  service: "Consultanta bugetara",
  date: "2026-08-10",
  time: "11:00",
  status: "confirmed",
  clientName: "Ana Ionescu",
  phone: "0722123456",
  notes: "Din server",
  createdAt: "2026-08-01",
};

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AppointmentsProvider>{children}</AppointmentsProvider>
  );
}

function seedSession(email = "ana@example.com") {
  const user = {
    name: "Ana Ionescu",
    email,
    phone: "",
    bio: "",
    appointmentCount: 0,
    totalSalary: 0,
    investmentGoal: 0,
    role: "user" as const,
  };
  mockAuthUser.value = user;

  storage[ACCOUNTS_STORAGE_KEY] = JSON.stringify([
    {
      name: "Ana Ionescu",
      email,
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

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value,
  });
}

describe("appointments-context sync behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockAuthUser.value = null;
    setNavigatorOnline(true);
    apiMocks.checkAppointmentsApiHealth.mockResolvedValue({ status: "ok" });
    apiMocks.createAppointmentInApi.mockResolvedValue({ data: remoteAppointment });
    apiMocks.deleteAppointmentInApi.mockResolvedValue({});
    apiMocks.listAppointmentsFromApi.mockResolvedValue({ items: [] });
    apiMocks.updateAppointmentInApi.mockResolvedValue({ data: remoteAppointment });
  });

  it("supports provider usage without an authenticated user and recovers online status", async () => {
    setNavigatorOnline(false);

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe("offline");
    });

    let createdId = "";
    act(() => {
      createdId = result.current.addAppointment({
        service: "Consultanta rapida",
        date: "2026-09-10",
        time: "09:00",
        status: "pending",
        clientName: "Vizitator Local",
        phone: "",
        notes: "",
      }).id;
      result.current.updateAppointment("missing", { status: "completed" });
      result.current.deleteAppointment("missing");
    });

    expect(createdId).toBeTruthy();
    expect(result.current.appointments).toEqual([]);

    await act(async () => {
      await result.current.refreshAppointments();
    });

    expect(result.current.isLoading).toBe(false);

    setNavigatorOnline(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe("online");
    });
  });

  it("keeps local data when offline and skips server synchronization", async () => {
    seedSession();
    setNavigatorOnline(false);
    storage[getAppointmentsStorageKey("ana@example.com")] = JSON.stringify([remoteAppointment]);
    storage[getAppointmentsQueueStorageKey("ana@example.com")] = JSON.stringify({
      unexpected: true,
    });

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => {
      expect(result.current.appointments).toEqual([remoteAppointment]);
    });

    expect(result.current.connectionStatus).toBe("offline");
    expect(apiMocks.checkAppointmentsApiHealth).not.toHaveBeenCalled();
    expect(apiMocks.listAppointmentsFromApi).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current.connectionStatus).toBe("offline");

    setNavigatorOnline(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => {
      expect(apiMocks.checkAppointmentsApiHealth).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(apiMocks.listAppointmentsFromApi).toHaveBeenCalledWith("ana@example.com");
    });
  });

  it("falls back to an empty sync queue when the stored queue json is malformed", async () => {
    seedSession();
    storage[getAppointmentsQueueStorageKey("ana@example.com")] = "{invalid-json";

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => {
      expect(result.current.pendingChangesCount).toBe(0);
    });
  });

  it("sanitizes the stored queue, syncs queued changes, and refreshes from the server", async () => {
    seedSession();
    storage[getAppointmentsQueueStorageKey("ana@example.com")] = JSON.stringify([
      null,
      {
        type: "create",
        appointmentId: "created-local",
        payload: {
          id: "created-local",
          service: "Noua consultanta",
          date: "2026-08-12",
          time: "10:30",
          status: "pending",
          clientName: "Ana Ionescu",
          phone: "",
          notes: "",
          createdAt: "2026-08-01",
        },
        timestamp: 1,
      },
      {
        type: "update",
        appointmentId: "updated-local",
        payload: {
          id: "updated-local",
          service: "Consultanta actualizata",
          date: "2026-08-13",
          time: "12:00",
          status: "confirmed",
          clientName: "Ana Ionescu",
          phone: "",
          notes: "actualizare",
          createdAt: "2026-08-02",
        },
        timestamp: 2,
      },
      {
        type: "delete",
        appointmentId: "deleted-local",
        timestamp: 3,
      },
      {
        type: "create",
        appointmentId: "invalid-payload",
        payload: {
          id: "invalid-payload",
        },
        timestamp: 4,
      },
      {
        type: "invalid",
        appointmentId: "invalid-type",
        timestamp: 5,
      },
    ]);
    apiMocks.listAppointmentsFromApi.mockResolvedValue({ items: [remoteAppointment] });

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe("online");
    });

    expect(apiMocks.checkAppointmentsApiHealth).toHaveBeenCalledTimes(1);
    expect(apiMocks.createAppointmentInApi).toHaveBeenCalledWith(
      "ana@example.com",
      expect.objectContaining({
        id: "created-local",
      })
    );
    expect(apiMocks.updateAppointmentInApi).toHaveBeenCalledWith(
      "ana@example.com",
      expect.objectContaining({
        id: "updated-local",
      })
    );
    expect(apiMocks.deleteAppointmentInApi).toHaveBeenCalledWith(
      "ana@example.com",
      "deleted-local"
    );
    expect(apiMocks.listAppointmentsFromApi).toHaveBeenCalledWith("ana@example.com");
    expect(result.current.pendingChangesCount).toBe(0);
    expect(result.current.appointments).toEqual([remoteAppointment]);
    expect(storage[getAppointmentsQueueStorageKey("ana@example.com")]).toBe("[]");
  });

  it("queueChange pushes changes to server but does not replace local state from server", async () => {
    seedSession();
    // Remote starts with one appointment
    const remoteFirst = { ...remoteAppointment, id: "first-remote" };
    apiMocks.listAppointmentsFromApi.mockResolvedValueOnce({ items: [remoteFirst] });
    apiMocks.createAppointmentInApi.mockResolvedValue({ data: remoteAppointment });

    const { result } = renderHook(() => useAppointments(), { wrapper });

    // Initial mount sync: fetchRemote=true → local becomes [remoteFirst]
    await waitFor(() => {
      expect(result.current.appointments).toEqual([remoteFirst]);
    });

    // Swap remote mock so a second fetch would return different data
    apiMocks.listAppointmentsFromApi.mockResolvedValue({ items: [{ ...remoteAppointment, id: "second-remote" }] });

    // Add an appointment — triggers queueChange which should NOT fetch remote
    act(() => {
      result.current.addAppointment({
        service: "Serviciu local",
        date: "2026-09-01",
        time: "10:00",
        status: "pending",
        clientName: "Client Nou",
        phone: "",
        notes: "",
      });
    });

    await waitFor(() => {
      expect(result.current.appointments).toHaveLength(2);
    });

    // listAppointmentsFromApi must have been called exactly once (on mount, not again)
    expect(apiMocks.listAppointmentsFromApi).toHaveBeenCalledTimes(1);
  });

  it("marks the context offline when synchronization fails and can refresh successfully later", async () => {
    seedSession();
    apiMocks.checkAppointmentsApiHealth.mockRejectedValueOnce(new Error("server down"));
    apiMocks.listAppointmentsFromApi.mockResolvedValue({ items: [remoteAppointment] });

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe("offline");
    });

    apiMocks.checkAppointmentsApiHealth.mockResolvedValue({ status: "ok" });

    await act(async () => {
      await result.current.refreshAppointments();
    });

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe("online");
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.appointments).toEqual([remoteAppointment]);
  });
});
