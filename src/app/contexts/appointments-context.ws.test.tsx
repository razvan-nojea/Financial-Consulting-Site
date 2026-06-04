import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Appointment } from "./appointments-context";
import {
  AppointmentsProvider,
  getAppointmentsStorageKey,
  useAppointments,
} from "./appointments-context";
import { ACCOUNTS_STORAGE_KEY, USER_STORAGE_KEY, useAuth } from "./auth-context";

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
      logout: vi.fn(() => { mockAuthUser.value = null; }),
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
  setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete storage[key]; }),
  clear: vi.fn(() => { Object.keys(storage).forEach((k) => delete storage[k]); }),
};

Object.defineProperty(window, "localStorage", { value: localStorageMock });

function wrapper({ children }: { children: React.ReactNode }) {
  return <AppointmentsProvider>{children}</AppointmentsProvider>;
}

function seedSession(email = "demo@exemplu.ro") {
  const user = {
    name: "Cont Demo", email, phone: "", bio: "",
    appointmentCount: 0, totalSalary: 0, investmentGoal: 0,
    role: "user" as const,
  };
  mockAuthUser.value = user;

  storage[ACCOUNTS_STORAGE_KEY] = JSON.stringify([{
    name: "Cont Demo", email: "demo@exemplu.ro", password: "demo123",
    phone: "", bio: "", appointmentCount: 0, totalSalary: 0, investmentGoal: 0,
  }]);
  storage[USER_STORAGE_KEY] = JSON.stringify(user);
  storage[getAppointmentsStorageKey(email)] = "[]";
}

const newApt: Appointment = {
  id: "ws-1", service: "Coaching Bugetar", date: "2026-09-01", time: "10:00",
  status: "pending", clientName: "Ana Ionescu", phone: "", notes: "",
  createdAt: "2026-09-01", ownerEmail: "demo@exemplu.ro",
};

function makeMockWs() {
  return {
    onmessage: null as ((e: { data: string }) => void) | null,
    onerror: null as (() => void) | null,
    onclose: null as (() => void) | null,
    readyState: 3,
    close: vi.fn(),
  };
}

describe("appointments-context WebSocket", () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockAuthUser.value = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("handles new-appointment message matching the owner email", async () => {
    const mockWs = makeMockWs();
    vi.stubGlobal("WebSocket", vi.fn(() => mockWs));

    seedSession();
    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => expect(vi.mocked(WebSocket)).toHaveBeenCalled());

    act(() => {
      mockWs.onmessage!({ data: JSON.stringify({ type: "new-appointment", data: newApt }) });
    });

    await waitFor(() => {
      expect(result.current.appointments).toHaveLength(1);
      expect(result.current.appointments[0].id).toBe("ws-1");
    });

    const stored = JSON.parse(storage[getAppointmentsStorageKey("demo@exemplu.ro")]);
    expect(stored).toHaveLength(1);
  });

  it("ignores new-appointment message for a different owner", async () => {
    const mockWs = makeMockWs();
    vi.stubGlobal("WebSocket", vi.fn(() => mockWs));

    seedSession();
    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => expect(vi.mocked(WebSocket)).toHaveBeenCalled());

    act(() => {
      mockWs.onmessage!({
        data: JSON.stringify({ type: "new-appointment", data: { ...newApt, ownerEmail: "other@example.com" } }),
      });
    });

    // No new appointments should be added
    expect(result.current.appointments).toHaveLength(0);
  });

  it("handles generator-stopped message by setting generatorRunning to false", async () => {
    const mockWs = makeMockWs();
    vi.stubGlobal("WebSocket", vi.fn(() => mockWs));

    seedSession();
    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => expect(vi.mocked(WebSocket)).toHaveBeenCalled());

    act(() => {
      mockWs.onmessage!({ data: JSON.stringify({ type: "generator-stopped" }) });
    });

    await waitFor(() => expect(result.current.generatorRunning).toBe(false));
  });

  it("ignores malformed (non-JSON) WebSocket messages without throwing", async () => {
    const mockWs = makeMockWs();
    vi.stubGlobal("WebSocket", vi.fn(() => mockWs));

    seedSession();
    renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => expect(vi.mocked(WebSocket)).toHaveBeenCalled());

    expect(() => {
      act(() => { mockWs.onmessage!({ data: "not-json{{" }); });
    }).not.toThrow();
  });

  it("onerror handler does not throw", async () => {
    const mockWs = makeMockWs();
    vi.stubGlobal("WebSocket", vi.fn(() => mockWs));

    seedSession();
    renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => expect(vi.mocked(WebSocket)).toHaveBeenCalled());

    expect(() => { act(() => { mockWs.onerror!(); }); }).not.toThrow();
  });

  it("onclose triggers reconnect after 3 seconds", async () => {
    const mockWs = makeMockWs();
    vi.stubGlobal("WebSocket", vi.fn(() => mockWs));

    seedSession();
    renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => expect(vi.mocked(WebSocket)).toHaveBeenCalledTimes(1));

    // Enable fake timers only for this test after the initial render
    vi.useFakeTimers({ shouldAdvanceTime: false });

    act(() => { mockWs.onclose!(); });

    expect(vi.mocked(WebSocket)).toHaveBeenCalledTimes(1);

    act(() => { vi.advanceTimersByTime(3000); });
    expect(vi.mocked(WebSocket)).toHaveBeenCalledTimes(2);
  });

  it("swallows exceptions when WebSocket constructor throws", async () => {
    vi.stubGlobal("WebSocket", vi.fn(() => { throw new Error("not supported"); }));
    seedSession();

    expect(() => {
      renderHook(() => useAppointments(), { wrapper });
    }).not.toThrow();
  });

  it("closes WebSocket when authenticated user logs out", async () => {
    const mockWs = makeMockWs();
    vi.stubGlobal("WebSocket", vi.fn(() => mockWs));

    seedSession();
    const { result } = renderHook(
      () => ({ auth: useAuth(), appts: useAppointments() }),
      { wrapper }
    );

    // Wait for WS to connect
    await waitFor(() => expect(vi.mocked(WebSocket)).toHaveBeenCalledTimes(1));

    // Log out — this should trigger wsRef.current?.close() + wsRef.current = null
    act(() => { result.current.auth.logout(); });

    await waitFor(() => expect(mockWs.close).toHaveBeenCalled());
  });

  it("skips reconnect when an OPEN WebSocket already exists (readyState < 2)", async () => {
    // Create a ws that reports OPEN (readyState = 1)
    const openWs = { ...makeMockWs(), readyState: 1 };
    vi.stubGlobal("WebSocket", vi.fn(() => openWs));

    seedSession();
    renderHook(() => useAppointments(), { wrapper });

    // First connect creates the ws
    await waitFor(() => expect(vi.mocked(WebSocket)).toHaveBeenCalledTimes(1));

    // Simulate the effect re-running by calling connectWebSocket again via onclose
    // Since readyState is 1 (OPEN), the guard should return early — no 2nd constructor call
    act(() => {
      // close fires reconnect after 3 s, but ws.readyState is still 1 (guard prevents reconnect)
      vi.useFakeTimers({ shouldAdvanceTime: false });
      openWs.onclose?.();
      vi.advanceTimersByTime(3000);
    });

    // Still only called once — guard blocked the reconnect
    expect(vi.mocked(WebSocket)).toHaveBeenCalledTimes(1);
  });
});
