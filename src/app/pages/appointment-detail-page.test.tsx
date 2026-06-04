import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentsProvider } from "../contexts/appointments-context";
import { AppointmentDetailPage } from "./appointment-detail-page";

const { mockNavigate, mockToastSuccess } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToastSuccess: vi.fn(),
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
      updateUser: vi.fn((updatedUser: import("../contexts/auth-context").User) => {
        mockAuthUser.value = updatedUser;
        window.localStorage.setItem("user", JSON.stringify(updatedUser));
      }),
    }),
  };
});

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
  },
}));

function seedDemoSession() {
  const user = {
    name: "Cont Demo",
    email: "demo@exemplu.ro",
    phone: "",
    bio: "",
    appointmentCount: 12,
    totalSalary: 0,
    investmentGoal: 0,
    role: "user" as const,
  };
  mockAuthUser.value = user;

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
      },
    ])
  );

  window.localStorage.setItem("user", JSON.stringify(user));
}

function renderDetailPage(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppointmentsProvider>
        <Routes>
          <Route path="/cont/programari/:id" element={<AppointmentDetailPage />} />
        </Routes>
      </AppointmentsProvider>
    </MemoryRouter>
  );
}

describe("AppointmentDetailPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockAuthUser.value = null;
    mockNavigate.mockReset();
    mockToastSuccess.mockReset();
  });

  it("renders the detail page for an existing appointment", async () => {
    seedDemoSession();
    renderDetailPage("/cont/programari/1");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /planificare pensie/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Programare #1/i)).toBeInTheDocument();
    expect(screen.getByText("Ion Popescu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editeaza .*pensie/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sterge .*pensie/i })).toBeInTheDocument();
  });

  it("shows the not-found state when the appointment is missing", async () => {
    seedDemoSession();
    renderDetailPage("/cont/programari/9999");

    await waitFor(() => {
      expect(screen.getByText(/Programare neg/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /Înapoi la Programări/i })).toHaveAttribute(
      "href",
      "/cont/programari"
    );
  });

  it("shows the not-found state when no route parameter is available", () => {
    seedDemoSession();
    render(
      <MemoryRouter>
        <AppointmentsProvider>
          <AppointmentDetailPage />
        </AppointmentsProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Programare neg/i)).toBeInTheDocument();
  });

  it("opens edit mode and updates the appointment", async () => {
    seedDemoSession();
    renderDetailPage("/cont/programari/1");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /editeaza .*pensie/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /editeaza .*pensie/i }));

    const clientNameInput = screen.getByDisplayValue("Ion Popescu");
    fireEvent.change(clientNameInput, { target: { value: "Maria Popescu" } });
    fireEvent.click(screen.getByRole("button", { name: /salvează modificările/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Programare actualizată cu succes!");
    });

    expect(screen.getByText("Maria Popescu")).toBeInTheDocument();
  });

  it("can cancel edit mode without saving", async () => {
    seedDemoSession();
    renderDetailPage("/cont/programari/1");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /editeaza .*pensie/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /editeaza .*pensie/i }));
    fireEvent.change(screen.getByDisplayValue("Ion Popescu"), {
      target: { value: "Nume Temporar" },
    });
    fireEvent.click(screen.getByRole("button", { name: /anulează/i }));

    await waitFor(() => {
      expect(screen.queryByDisplayValue("Nume Temporar")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Ion Popescu")).toBeInTheDocument();
  });

  it("renders fallback placeholders when phone and notes are missing", async () => {
    seedDemoSession();
    renderDetailPage("/cont/programari/5");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /strategii de investiții/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Necompletat/i)).toBeInTheDocument();
    expect(screen.getByText(/Fără notițe/i)).toBeInTheDocument();
  });

  it("deletes the appointment and navigates back to the master page", async () => {
    seedDemoSession();
    renderDetailPage("/cont/programari/1");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sterge .*pensie/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /sterge .*pensie/i }));
    fireEvent.click(screen.getByRole("button", { name: /da, șterge/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Programarea a fost ștearsă.");
      expect(mockNavigate).toHaveBeenCalledWith("/cont/programari");
    });
  });
});
