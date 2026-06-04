import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountSettings } from "./account-settings";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockAuthUser = vi.hoisted(() => ({
  value: null as import("../contexts/auth-context").User | null,
}));

vi.mock("../contexts/auth-context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../contexts/auth-context")>();
  return {
    ...actual,
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children as React.ReactNode}</>,
    useAuth: () => ({
      user: mockAuthUser.value,
      isAuthenticated: !!mockAuthUser.value,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
      changePassword: vi.fn(async (currentPassword: string, nextPassword: string) => {
        const accounts = JSON.parse(window.localStorage.getItem("accounts") ?? "[]");
        const account = accounts.find(
          (a: { email: string; password: string }) => a.email === mockAuthUser.value?.email
        );
        if (!account) return { success: false, message: "Contul nu a fost găsit." };
        if (account.password !== currentPassword) return { success: false, message: "Parola curentă este incorectă." };
        if (nextPassword.length < 8) return { success: false, message: "Parola trebuie să aibă cel puțin 8 caractere." };
        account.password = nextPassword;
        window.localStorage.setItem("accounts", JSON.stringify(accounts));
        return { success: true };
      }),
      updateUser: vi.fn((updatedUser: import("../contexts/auth-context").User) => {
        mockAuthUser.value = updatedUser;
        window.localStorage.setItem("user", JSON.stringify(updatedUser));
        const accounts = JSON.parse(window.localStorage.getItem("accounts") ?? "[]");
        const idx = accounts.findIndex(
          (a: { email: string }) => a.email === updatedUser.email
        );
        if (idx !== -1) {
          accounts[idx] = { ...accounts[idx], ...updatedUser };
          window.localStorage.setItem("accounts", JSON.stringify(accounts));
        }
      }),
    }),
  };
});

function seedSession() {
  const user = {
    name: "Ana Ionescu",
    email: "ana@example.com",
    phone: "0722 111 222",
    bio: "Plan financiar personal.",
    appointmentCount: 0,
    totalSalary: 45000,
    investmentGoal: 90000,
    role: "user" as const,
  };
  mockAuthUser.value = user;

  window.localStorage.setItem(
    "accounts",
    JSON.stringify([
      {
        name: "Ana Ionescu",
        email: "ana@example.com",
        password: "secret123",
        phone: "0722 111 222",
        bio: "Plan financiar personal.",
        appointmentCount: 0,
        totalSalary: 45000,
        investmentGoal: 90000,
      },
    ])
  );

  window.localStorage.setItem("user", JSON.stringify(user));
}

function renderSettings() {
  return render(
    <MemoryRouter>
      <AccountSettings />
    </MemoryRouter>
  );
}

describe("AccountSettings", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockAuthUser.value = null;
    window.history.replaceState(null, "", "/cont/setari");
    vi.clearAllMocks();
  });

  it("loads the persisted profile values into the form", async () => {
    seedSession();

    renderSettings();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Ana")).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("Ionescu")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ana@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("0722 111 222")).toBeInTheDocument();
    expect(screen.getByDisplayValue("45000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("90000")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/plan financiar personal/i)).toBeInTheDocument();
  });

  it("persists profile changes to the active user and stored account", async () => {
    const { toast } = await import("sonner");
    seedSession();

    renderSettings();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Ana")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/prenume/i), {
      target: { value: "Maria" },
    });
    fireEvent.change(screen.getByLabelText(/^nume$/i), {
      target: { value: "Popescu" },
    });
    fireEvent.change(screen.getByLabelText(/telefon/i), {
      target: { value: "0733 000 999" },
    });
    fireEvent.change(screen.getByLabelText(/venit total/i), {
      target: { value: "60000" },
    });
    fireEvent.change(screen.getByLabelText(/obiectiv investiții/i), {
      target: { value: "120000" },
    });
    fireEvent.change(screen.getByLabelText(/despre tine/i), {
      target: { value: "Obiective noi pentru 2026." },
    });

    fireEvent.click(screen.getByRole("button", { name: /salvează modificările/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Profilul a fost actualizat cu succes!");
    });

    const storedUser = JSON.parse(window.localStorage.getItem("user") ?? "{}");
    expect(storedUser).toEqual(
      expect.objectContaining({
        name: "Maria Popescu",
        phone: "0733 000 999",
        totalSalary: 60000,
        investmentGoal: 120000,
        bio: "Obiective noi pentru 2026.",
      })
    );

    const storedAccounts = JSON.parse(window.localStorage.getItem("accounts") ?? "[]");
    expect(storedAccounts[0]).toEqual(
      expect.objectContaining({
        name: "Maria Popescu",
        phone: "0733 000 999",
        totalSalary: 60000,
      })
    );
  });

  it("validates password changes and persists a successful update", async () => {
    const { toast } = await import("sonner");
    seedSession();
    window.history.replaceState(null, "", "/cont/setari?tab=security");

    renderSettings();

    fireEvent.change(screen.getByLabelText(/parola curentă/i), {
      target: { value: "wrong-pass" },
    });
    fireEvent.change(screen.getByLabelText(/parolă nouă/i), {
      target: { value: "newPassword123" },
    });
    fireEvent.change(screen.getByLabelText(/confirmă parola nouă/i), {
      target: { value: "newPassword123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /actualizează parola/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Parola curentă este incorectă.");
    });

    fireEvent.change(screen.getByLabelText(/parola curentă/i), {
      target: { value: "secret123" },
    });
    fireEvent.change(screen.getByLabelText(/parolă nouă/i), {
      target: { value: "updated1234" },
    });
    fireEvent.change(screen.getByLabelText(/confirmă parola nouă/i), {
      target: { value: "updated1234" },
    });

    fireEvent.click(screen.getByRole("button", { name: /actualizează parola/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Parola a fost schimbată cu succes!");
    });

    const storedAccounts = JSON.parse(window.localStorage.getItem("accounts") ?? "[]");
    expect(storedAccounts[0].password).toBe("updated1234");
  });

  it("shows an error when the new password confirmation does not match", async () => {
    const { toast } = await import("sonner");
    seedSession();
    window.history.replaceState(null, "", "/cont/setari?tab=security");

    renderSettings();

    fireEvent.change(screen.getByLabelText(/parola curent/i), {
      target: { value: "secret123" },
    });
    fireEvent.change(document.getElementById("newPassword") as HTMLInputElement, {
      target: { value: "updated1234" },
    });
    fireEvent.change(document.getElementById("confirmPassword") as HTMLInputElement, {
      target: { value: "different1234" },
    });

    fireEvent.click(screen.getByRole("button", { name: /actualizeaz.*parola/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Parolele noi nu se potrivesc.");
    });
  });

  it("saves notification preferences in local storage and keeps the active tab in the url", async () => {
    const { toast } = await import("sonner");
    seedSession();
    window.history.replaceState(null, "", "/cont/setari?tab=notifications");

    renderSettings();

    const appointmentSwitch = screen.getAllByRole("switch")[0];
    fireEvent.click(appointmentSwitch);
    fireEvent.click(screen.getByRole("button", { name: /salvează preferințele/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Preferințele de notificări au fost salvate!");
    });

    expect(window.location.search).toContain("tab=notifications");

    const storedNotifications = JSON.parse(
      window.localStorage.getItem("account-notifications:ana@example.com") ?? "{}"
    );
    expect(storedNotifications.emailAppointments).toBe(false);
  });

  it("does not save notifications when no authenticated user is available", async () => {
    const { toast } = await import("sonner");
    window.history.replaceState(null, "", "/cont/setari?tab=notifications");

    renderSettings();

    fireEvent.click(screen.getByRole("button", { name: /salveaz.*preferin/i }));

    expect(toast.success).not.toHaveBeenCalledWith(
      "PreferinÈ›ele de notificÄƒri au fost salvate!"
    );
    expect(window.localStorage.getItem("account-notifications:ana@example.com")).toBeNull();
  });

  it("does not persist profile updates when no authenticated user is available", async () => {
    const { toast } = await import("sonner");

    renderSettings();

    fireEvent.click(screen.getByRole("button", { name: /salveaz.*modific/i }));

    expect(toast.success).not.toHaveBeenCalledWith("Profilul a fost actualizat cu succes!");
    expect(window.localStorage.getItem("user")).toBeNull();
  });
});
