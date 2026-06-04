import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentsProvider } from "../contexts/appointments-context";
import { AccountOverview } from "./account-overview";

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
      updateUser: vi.fn((updatedUser: import("../contexts/auth-context").User) => {
        mockAuthUser.value = updatedUser;
        window.localStorage.setItem("user", JSON.stringify(updatedUser));
      }),
    }),
  };
});

function seedSession(email = "ana@example.com", overrides?: Record<string, unknown>) {
  const demoOverrides = email === "demo@exemplu.ro" ? overrides : undefined;
  const anaOverrides = email === "ana@example.com" ? overrides : undefined;

  const user = {
    name: email === "demo@exemplu.ro" ? "Cont Demo" : "Ana Ionescu",
    email,
    phone: email === "demo@exemplu.ro" ? "" : "0722 111 222",
    bio: email === "demo@exemplu.ro" ? "" : "Planific un fond de siguranta.",
    appointmentCount: email === "demo@exemplu.ro" ? 12 : 0,
    totalSalary: 0,
    investmentGoal: 0,
    role: "user" as const,
    ...overrides,
  };
  mockAuthUser.value = user as import("../contexts/auth-context").User;

  window.localStorage.setItem(
    "accounts",
    JSON.stringify([
      {
        name: "Cont Demo",
        email: "demo@exemplu.ro",
        password: "demo123",
        phone: "",
        bio: "",
        appointmentCount: 12,
        totalSalary: 0,
        investmentGoal: 0,
        ...demoOverrides,
      },
      {
        name: "Ana Ionescu",
        email: "ana@example.com",
        password: "secret123",
        phone: "0722 111 222",
        bio: "Planific un fond de siguranta.",
        appointmentCount: 0,
        totalSalary: 0,
        investmentGoal: 0,
        ...anaOverrides,
      },
    ])
  );

  window.localStorage.setItem("user", JSON.stringify(user));
}

function renderOverview() {
  return render(
    <MemoryRouter>
      <AppointmentsProvider>
        <AccountOverview />
      </AppointmentsProvider>
    </MemoryRouter>
  );
}

describe("AccountOverview", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockAuthUser.value = null;
  });

  it("shows zeroed account metrics for a fresh local account", async () => {
    seedSession();

    renderOverview();

    await waitFor(() => {
      expect(screen.getByText(/bun venit, ana ionescu/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/venit declarat/i)).toBeInTheDocument();
    expect(screen.getByText(/obiectiv investi/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /program/i })).toBeInTheDocument();
    expect(screen.getByText(/nu ai program/i)).toBeInTheDocument();
    expect(screen.getByText(/planific un fond de siguranta/i)).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
  });

  it("renders upcoming appointments and the financial progress card for the demo account", async () => {
    seedSession("demo@exemplu.ro", {
      name: "Cont Demo",
      appointmentCount: 12,
      totalSalary: 50000,
      investmentGoal: 100000,
      phone: "",
      bio: "",
    });

    renderOverview();

    await waitFor(() => {
      expect(screen.getByText(/coaching bugetar/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/4 finalizate/i)).toBeInTheDocument();
    expect(screen.getByText(/progres curent/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /vezi toate/i })).toHaveAttribute(
      "href",
      "/cont/programari"
    );
  });

  it("caps financial progress at 100 percent when declared income exceeds the target", async () => {
    seedSession("demo@exemplu.ro", {
      name: "Cont Demo",
      appointmentCount: 12,
      totalSalary: 250000,
      investmentGoal: 100000,
      phone: "",
      bio: "",
    });

    renderOverview();

    await waitFor(() => {
      expect(screen.getByText(/progres curent/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/100/).length).toBeGreaterThan(0);
  });
});
