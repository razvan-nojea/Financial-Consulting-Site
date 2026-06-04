import React from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCOUNTS_STORAGE_KEY,
  AuthProvider,
  USER_STORAGE_KEY,
  type User,
  useAuth,
} from "./auth-context";

// Mock the backend auth API to avoid network calls in unit tests
vi.mock("../api/auth-api", () => ({
  loginToServer:           vi.fn().mockResolvedValue(null),
  signupOnServer:          vi.fn().mockResolvedValue(null),
  logoutFromServer:        vi.fn().mockResolvedValue(undefined),
  forgotPassword:          vi.fn().mockResolvedValue({ message: "ok" }),
  resetPassword:           vi.fn().mockResolvedValue({ message: "ok" }),
  // Simulate server unavailable by default → context falls back to local store
  changePasswordOnServer:  vi.fn().mockResolvedValue(null),
  // Simulate no active session by default → changePassword calls loginToServer first
  hasActiveSession:        vi.fn().mockReturnValue(false),
  getCachedRole:    vi.fn().mockReturnValue("user"),
  SESSION_STORAGE_KEY: "sessionId",
  SESSION_ROLE_KEY:    "sessionRole",
  getSessionId:  vi.fn().mockReturnValue(null),
  clearSession:  vi.fn(),
}));

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
  return <AuthProvider>{children}</AuthProvider>;
}

describe("auth-context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it("initializes with no active user and seeds local accounts", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(storage[ACCOUNTS_STORAGE_KEY]).toContain("demo@exemplu.ro");
  });

  it("always starts with no active user even when a stored session exists", () => {
    storage[ACCOUNTS_STORAGE_KEY] = JSON.stringify([
      {
        name: "Ana Demo",
        email: "ana@example.com",
        password: "secret123",
        phone: "0712 000 000",
        bio: "Plan pe termen lung",
        appointmentCount: 3,
        totalSalary: 12000,
        investmentGoal: 30000,
      },
    ]);
    storage[USER_STORAGE_KEY] = JSON.stringify({
      name: "Ana Demo",
      email: "ana@example.com",
      phone: "0712 000 000",
      bio: "Plan pe termen lung",
      appointmentCount: 3,
      totalSalary: 12000,
      investmentGoal: 30000,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("clears any stored user on mount regardless of stored profile data", () => {
    storage[ACCOUNTS_STORAGE_KEY] = JSON.stringify([
      {
        name: "  Ana   Demo  ",
        email: "ana@example.com",
        password: "secret123",
        phone: 123,
        bio: false,
        appointmentCount: "3",
        totalSalary: "12000",
        investmentGoal: "30000",
      },
      {
        name: 123,
        email: "invalid@example.com",
        password: "secret123",
      },
    ]);
    storage[USER_STORAGE_KEY] = JSON.stringify({
      name: "Ana Demo",
      email: "ana@example.com",
      phone: "",
      bio: "",
      appointmentCount: "3",
      totalSalary: "12000",
      investmentGoal: "30000",
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
  });

  it("ignores non-object account entries while keeping valid stored accounts", () => {
    storage[ACCOUNTS_STORAGE_KEY] = JSON.stringify([
      null,
      {
        name: "Ana Demo",
        email: "ana@example.com",
        password: "secret123",
        phone: "",
        bio: "",
        appointmentCount: 1,
        totalSalary: 5000,
        investmentGoal: 10000,
      },
    ]);
    storage[USER_STORAGE_KEY] = JSON.stringify({
      name: "Ana Demo",
      email: "ana@example.com",
      phone: "",
      bio: "",
      appointmentCount: 1,
      totalSalary: 5000,
      investmentGoal: 10000,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Provider always starts with null user; accounts are still preserved
    expect(result.current.user).toBeNull();
    // The valid account entry should still be accessible via login
    let loginResult;
    act(() => {
      loginResult = result.current.login("ana@example.com", "secret123");
    });
    expect(loginResult).toEqual({ success: true });
  });

  it("seeds default accounts when the stored accounts payload is invalid json", () => {
    storage[ACCOUNTS_STORAGE_KEY] = "{invalid-json";

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(storage[ACCOUNTS_STORAGE_KEY]).toContain("demo@exemplu.ro");
  });

  it("seeds default accounts when the stored accounts payload is not an array", () => {
    storage[ACCOUNTS_STORAGE_KEY] = JSON.stringify({ invalid: true });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(storage[ACCOUNTS_STORAGE_KEY]).toContain("demo@exemplu.ro");
  });

  it("ignores an invalid stored user payload", () => {
    storage[ACCOUNTS_STORAGE_KEY] = JSON.stringify([
      {
        name: "Ana Demo",
        email: "ana@example.com",
        password: "secret123",
        phone: "",
        bio: "",
        appointmentCount: 0,
        totalSalary: 0,
        investmentGoal: 0,
      },
    ]);
    storage[USER_STORAGE_KEY] = "{invalid-json";

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
  });

  it("ignores a non-object stored user payload", () => {
    storage[ACCOUNTS_STORAGE_KEY] = JSON.stringify([
      {
        name: "Ana Demo",
        email: "ana@example.com",
        password: "secret123",
        phone: "",
        bio: "",
        appointmentCount: 0,
        totalSalary: 0,
        investmentGoal: 0,
      },
    ]);
    storage[USER_STORAGE_KEY] = JSON.stringify("invalid-user");

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
  });

  it("clears the stored session when it points to a missing account", () => {
    storage[ACCOUNTS_STORAGE_KEY] = JSON.stringify([
      {
        name: "Ana Demo",
        email: "ana@example.com",
        password: "secret123",
        phone: "",
        bio: "",
        appointmentCount: 0,
        totalSalary: 0,
        investmentGoal: 0,
      },
    ]);
    storage[USER_STORAGE_KEY] = JSON.stringify({
      name: "Cont lipsa",
      email: "missing@example.com",
      phone: "",
      bio: "",
      appointmentCount: 0,
      totalSalary: 0,
      investmentGoal: 0,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(storage[USER_STORAGE_KEY]).toBeUndefined();
  });

  it("logs in with the locally stored account fields", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    let authResult;
    act(() => {
      authResult = result.current.login("demo@exemplu.ro", "demo123");
    });

    expect(authResult).toEqual({ success: true });
    expect(result.current.user).toEqual({
      name: "Cont Demo",
      email: "demo@exemplu.ro",
      phone: "",
      bio: "",
      appointmentCount: 0,
      totalSalary: 0,
      investmentGoal: 0,
      role: "user",
    });
  });

  it("calls clearSession immediately on login to drop any stale session", async () => {
    const { clearSession: mockClearSession } = await import("../api/auth-api");

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login("demo@exemplu.ro", "demo123");
    });

    // clearSession must be called synchronously (before the async loginToServer resolves)
    expect(vi.mocked(mockClearSession)).toHaveBeenCalled();
  });

  it("rejects login when the account is missing from local storage", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    let authResult;
    act(() => {
      authResult = result.current.login("missing@example.com", "password123");
    });

    expect(authResult).toMatchObject({ success: false });
    expect(authResult?.message).toMatch(/contul nu a fost/i);
    expect(result.current.user).toBeNull();
  });

  it("rejects login when the password is incorrect", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    let authResult;
    act(() => {
      authResult = result.current.login("demo@exemplu.ro", "wrong-password");
    });

    expect(authResult).toMatchObject({ success: false });
    expect(authResult?.message).toMatch(/parola este incorect/i);
    expect(result.current.user).toBeNull();
  });

  it("creates a new account with zeroed values and empty profile fields", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    let signupResult;
    act(() => {
      signupResult = result.current.signup("John Doe", "john@example.com", "password123");
    });

    expect(signupResult).toEqual({ success: true });
    expect(result.current.user).toEqual({
      name: "John Doe",
      email: "john@example.com",
      phone: "",
      bio: "",
      appointmentCount: 0,
      totalSalary: 0,
      investmentGoal: 0,
      role: "user",
    });

    const storedAccounts = JSON.parse(storage[ACCOUNTS_STORAGE_KEY]);
    expect(storedAccounts).toContainEqual(
      expect.objectContaining({
        name: "John Doe",
        email: "john@example.com",
        phone: "",
        bio: "",
        appointmentCount: 0,
        totalSalary: 0,
        investmentGoal: 0,
      })
    );
  });

  it("does not create duplicate local accounts on signup", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    let signupResult;
    act(() => {
      signupResult = result.current.signup("Alt Demo", "demo@exemplu.ro", "demo123");
    });

    expect(signupResult).toMatchObject({ success: false });
    expect(signupResult?.message).toMatch(/cont local cu acest email/i);
  });

  it("updates the active user and persists changes to the stored account", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login("demo@exemplu.ro", "demo123");
    });

    act(() => {
      result.current.updateUser({
        name: "Cont Demo",
        email: "alt-email@example.com",
        phone: "0722 000 111",
        bio: "Client demo",
        appointmentCount: 5,
        totalSalary: 50000,
        investmentGoal: 100000,
        role: "user",
      });
    });

    expect(result.current.user).toEqual({
      name: "Cont Demo",
      email: "demo@exemplu.ro",
      phone: "0722 000 111",
      bio: "Client demo",
      appointmentCount: 5,
      totalSalary: 50000,
      investmentGoal: 100000,
      role: "user",
    });

    const storedUser = JSON.parse(storage[USER_STORAGE_KEY]);
    expect(storedUser.email).toBe("demo@exemplu.ro");
    expect(storedUser.totalSalary).toBe(50000);

    const storedAccounts = JSON.parse(storage[ACCOUNTS_STORAGE_KEY]);
    expect(storedAccounts[0]).toEqual(
      expect.objectContaining({
        email: "demo@exemplu.ro",
        phone: "0722 000 111",
        bio: "Client demo",
        appointmentCount: 5,
        totalSalary: 50000,
        investmentGoal: 100000,
      })
    );
  });

  it("does not rehydrate user on remount — always starts logged out", () => {
    const firstRender = renderHook(() => useAuth(), { wrapper });

    act(() => {
      firstRender.result.current.login("demo@exemplu.ro", "demo123");
    });

    act(() => {
      firstRender.result.current.updateUser({
        name: "Client Actualizat",
        email: "ignored@example.com",
        phone: "0733 222 111",
        bio: "Date persistente",
        appointmentCount: 2,
        totalSalary: 82000,
        investmentGoal: 150000,
        role: "user",
      });
    });

    firstRender.unmount();

    const secondRender = renderHook(() => useAuth(), { wrapper });

    // Provider always starts with null user regardless of stored data
    expect(secondRender.result.current.user).toBeNull();
  });

  it("ignores invalid user payloads when updateUser cannot sanitize the input", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login("demo@exemplu.ro", "demo123");
    });

    const originalUser = result.current.user;

    act(() => {
      result.current.updateUser({} as User);
    });

    expect(result.current.user).toEqual(originalUser);
    expect(JSON.parse(storage[USER_STORAGE_KEY])).toEqual(originalUser);
  });

  it("can persist a valid user payload even when no session is active yet", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.updateUser({
        name: "Profil Local",
        email: "local@example.com",
        phone: "0711 222 333",
        bio: "Creat fara login",
        appointmentCount: 0,
        totalSalary: 4500,
        investmentGoal: 9000,
        role: "user",
      });
    });

    expect(result.current.user).toEqual({
      name: "Profil Local",
      email: "local@example.com",
      phone: "0711 222 333",
      bio: "Creat fara login",
      appointmentCount: 0,
      totalSalary: 4500,
      investmentGoal: 9000,
      role: "user",
    });
  });

  it("clears stored user on mount even when stored profile has sanitizable values", () => {
    storage[ACCOUNTS_STORAGE_KEY] = JSON.stringify([
      {
        name: "Ana Demo",
        email: "ana@example.com",
        password: "secret123",
        phone: "",
        bio: "",
        appointmentCount: "-2",
        totalSalary: "-100",
        investmentGoal: "-300",
      },
    ]);
    storage[USER_STORAGE_KEY] = JSON.stringify({
      name: "Ana Demo",
      email: "ana@example.com",
      phone: "",
      bio: "",
      appointmentCount: "-2",
      totalSalary: "-100",
      investmentGoal: "-300",
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
  });

  it("changes the password when the current password is correct", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login("demo@exemplu.ro", "demo123");
    });

    let changeResult;
    await act(async () => {
      changeResult = await result.current.changePassword("demo123", "newPassword123");
    });

    expect(changeResult).toEqual({ success: true });

    act(() => {
      result.current.logout();
    });

    let reloginResult;
    act(() => {
      reloginResult = result.current.login("demo@exemplu.ro", "newPassword123");
    });

    expect(reloginResult).toEqual({ success: true });
  });

  it("returns a helpful message when the password change cannot be completed", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    let unauthenticatedResult;
    await act(async () => {
      unauthenticatedResult = await result.current.changePassword("demo123", "newPassword123");
    });

    expect(unauthenticatedResult).toMatchObject({ success: false });
    expect(unauthenticatedResult?.message).toMatch(/autentificat pentru a schimba parola/i);

    act(() => {
      result.current.login("demo@exemplu.ro", "demo123");
    });

    let incorrectPasswordResult;
    await act(async () => {
      incorrectPasswordResult = await result.current.changePassword("wrong", "newPassword123");
    });

    expect(incorrectPasswordResult).toMatchObject({ success: false });
    expect(incorrectPasswordResult?.message).toMatch(/parola curent/i);

    let shortPasswordResult;
    await act(async () => {
      shortPasswordResult = await result.current.changePassword("demo123", "short");
    });

    expect(shortPasswordResult).toMatchObject({ success: false });
    expect(shortPasswordResult?.message).toMatch(/cel pu.*in 8 caractere/i);
  });

  it("merges missing default accounts into existing stored accounts on mount", () => {
    // Simulate a user whose localStorage only contains the demo account
    // (e.g. they visited before the admin account was added to DEFAULT_ACCOUNTS)
    storage[ACCOUNTS_STORAGE_KEY] = JSON.stringify([
      {
        name: "Cont Demo",
        email: "demo@exemplu.ro",
        password: "demo123",
        phone: "",
        bio: "",
        appointmentCount: 0,
        totalSalary: 0,
        investmentGoal: 0,
      },
    ]);

    renderHook(() => useAuth(), { wrapper });

    // admin account should have been merged in automatically
    expect(storage[ACCOUNTS_STORAGE_KEY]).toContain("admin@exemplu.ro");
  });

  it("returns account not found when a non-default account is missing from storage", async () => {
    // Pre-seed with a custom user that is NOT in DEFAULT_ACCOUNTS
    storage[ACCOUNTS_STORAGE_KEY] = JSON.stringify([
      {
        name: "Custom User",
        email: "custom@example.com",
        password: "custom123",
        phone: "",
        bio: "",
        appointmentCount: 0,
        totalSalary: 0,
        investmentGoal: 0,
      },
    ]);

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login("custom@example.com", "custom123");
    });

    // Remove the custom user — defaults will be re-merged but custom stays gone
    storage[ACCOUNTS_STORAGE_KEY] = JSON.stringify([
      {
        name: "Alt Cont",
        email: "alt@example.com",
        password: "secret123",
        phone: "",
        bio: "",
        appointmentCount: 0,
        totalSalary: 0,
        investmentGoal: 0,
      },
    ]);

    let changeResult;
    await act(async () => {
      changeResult = await result.current.changePassword("custom123", "newPassword123");
    });

    expect(changeResult).toMatchObject({ success: false });
    expect(changeResult?.message).toMatch(/contul nu a fost/i);
  });

  it("logs out the user and keeps the stored accounts intact", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login("demo@exemplu.ro", "demo123");
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(storage[ACCOUNTS_STORAGE_KEY]).toContain("demo@exemplu.ro");
    expect(storage[USER_STORAGE_KEY]).toBeUndefined();
  });

  it("throws an error when useAuth is used outside the provider", () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within an AuthProvider");
  });

  it("updates user role from backend after successful login when server returns admin role", async () => {
    const { loginToServer: mockLogin } = await import("../api/auth-api");
    vi.mocked(mockLogin).mockResolvedValueOnce({
      sessionId: "srv-session",
      user: { id: "u1", email: "admin@exemplu.ro", name: "Administrator", role: "admin" },
      permissions: [],
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login("admin@exemplu.ro", "admin123");
    });

    // Wait for the fire-and-forget backend call to resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.user?.role).toBe("admin");
    expect(result.current.user?.email).toBe("admin@exemplu.ro");
  });

  it("keeps 'user' role when backend returns user role on login", async () => {
    const { loginToServer: mockLogin } = await import("../api/auth-api");
    vi.mocked(mockLogin).mockResolvedValueOnce({
      sessionId: "srv-session",
      user: { id: "u1", email: "demo@exemplu.ro", name: "Cont Demo", role: "user" },
      permissions: [],
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login("demo@exemplu.ro", "demo123");
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.user?.role).toBe("user");
  });

  it("always starts logged out even for stored admin accounts", async () => {
    // Provider always starts with null user regardless of stored role.
    storage[ACCOUNTS_STORAGE_KEY] = JSON.stringify([
      {
        name: "Administrator",
        email: "admin@exemplu.ro",
        password: "admin123",
        role: "admin",
        phone: "",
        bio: "",
        appointmentCount: 0,
        totalSalary: 0,
        investmentGoal: 0,
      },
    ]);
    storage[USER_STORAGE_KEY] = JSON.stringify({
      name: "Administrator",
      email: "admin@exemplu.ro",
      role: "admin",
      phone: "",
      bio: "",
      appointmentCount: 0,
      totalSalary: 0,
      investmentGoal: 0,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
  });

  it("always starts logged out, getCachedRole is not called on mount", async () => {
    // Provider always starts with null user — getCachedRole is not invoked during hydration.
    const { getSessionId: mockGetSessionId, getCachedRole: mockGetCachedRole } = await import("../api/auth-api");
    vi.mocked(mockGetSessionId).mockReturnValueOnce("active-session");
    vi.mocked(mockGetCachedRole).mockReturnValueOnce("admin");

    storage[ACCOUNTS_STORAGE_KEY] = JSON.stringify([
      {
        name: "Cont Demo",
        email: "demo@exemplu.ro",
        password: "demo123",
        role: "user",
        phone: "",
        bio: "",
        appointmentCount: 0,
        totalSalary: 0,
        investmentGoal: 0,
      },
    ]);
    storage[USER_STORAGE_KEY] = JSON.stringify({
      name: "Cont Demo",
      email: "demo@exemplu.ro",
      role: "user",
      phone: "",
      bio: "",
      appointmentCount: 0,
      totalSalary: 0,
      investmentGoal: 0,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
  });
});
