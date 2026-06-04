import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentsProvider } from "../contexts/appointments-context";
import { AppointmentsPage, runIfTargetPresent } from "./appointments-page";

const { mockNavigate, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
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

const apiMocks = vi.hoisted(() => ({
  startGeneratorInApi: vi.fn(),
  stopGeneratorInApi: vi.fn(),
}));

vi.mock("../api/appointments-api", async () => {
  const actual = await vi.importActual<typeof import("../api/appointments-api")>("../api/appointments-api");
  return { ...actual, ...apiMocks };
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
    error: mockToastError,
  },
}));

function seedSession(mode: "demo" | "empty" = "demo") {
  const accounts = [
    {
      name: "Cont Demo",
      email: "demo@exemplu.ro",
      password: "demo123",
      phone: "",
      bio: "",
      appointmentCount: mode === "demo" ? 12 : 0,
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
  ];

  const user =
    mode === "demo"
      ? {
          name: "Cont Demo",
          email: "demo@exemplu.ro",
          phone: "",
          bio: "",
          appointmentCount: 12,
          totalSalary: 0,
          investmentGoal: 0,
          role: "user" as const,
        }
      : {
          name: "Ana Ionescu",
          email: "ana@example.com",
          phone: "",
          bio: "",
          appointmentCount: 0,
          totalSalary: 0,
          investmentGoal: 0,
          role: "user" as const,
        };

  mockAuthUser.value = user;
  window.localStorage.setItem("accounts", JSON.stringify(accounts));
  window.localStorage.setItem("user", JSON.stringify(user));
}

function renderAppointmentsPage(mode: "demo" | "empty" = "demo") {
  seedSession(mode);

  return render(
    <MemoryRouter>
      <AppointmentsProvider>
        <AppointmentsPage />
      </AppointmentsProvider>
    </MemoryRouter>
  );
}

describe("AppointmentsPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockAuthUser.value = null;
    // Clear cookies so filter-tab preferences from previous tests don't leak
    document.cookie.split(";").forEach((c) => {
      const name = c.trim().split("=")[0];
      if (name) document.cookie = `${name}=; max-age=0; path=/`;
    });
    mockNavigate.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    apiMocks.startGeneratorInApi.mockReset();
    apiMocks.stopGeneratorInApi.mockReset();
    apiMocks.startGeneratorInApi.mockResolvedValue({ message: "Generator pornit.", interval: 3000 });
    apiMocks.stopGeneratorInApi.mockResolvedValue({ message: "Generator oprit." });
    (window.scrollTo as ReturnType<typeof vi.fn>).mockClear();
  });

  it("runs guarded actions only when a target exists", () => {
    const guardedAction = vi.fn();

    runIfTargetPresent(null, guardedAction);
    expect(guardedAction).not.toHaveBeenCalled();

    runIfTargetPresent({ id: "7" }, guardedAction);
    expect(guardedAction).toHaveBeenCalledWith({ id: "7" });
  });

  it("renders the master table with infinite scroll and shows initial items", async () => {
    renderAppointmentsPage();

    await waitFor(() => {
      expect(
        screen.getByRole("table", {
          name: /vedere master-detail pentru programari/i,
        })
      ).toBeInTheDocument();
    });

    // First PAGE_SIZE items visible (most recent first)
    expect(screen.getAllByText(/Planificare Financiară pentru Afaceri/i).length).toBeGreaterThan(0);

    // Navigating to detail works
    fireEvent.click(
      screen.getAllByLabelText(/Vezi detalii pentru Planificare Financiară pentru Afaceri/i)[0]
    );
    expect(mockNavigate).toHaveBeenCalledWith("/cont/programari/6");

    // Count label shows total vs displayed
    await waitFor(() => {
      expect(screen.getByText(/din \d+ programări afișate/i)).toBeInTheDocument();
    });
  });

  it("creates a new appointment and redirects to the detail page", async () => {
    renderAppointmentsPage("empty");

    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(424242);

    fireEvent.click(screen.getByRole("button", { name: /adaugă programare/i }));

    const comboboxes = screen.getAllByRole("combobox");
    fireEvent.click(comboboxes[0]);
    await waitFor(() => {
      fireEvent.click(screen.getAllByText("Coaching Bugetar").at(-1)!);
    });

    fireEvent.change(document.querySelector('input[type="date"]') as HTMLInputElement, {
      target: { value: "2026-07-10" },
    });

    fireEvent.click(comboboxes[1]);
    await waitFor(() => {
      fireEvent.click(screen.getAllByText("11:00").at(-1)!);
    });

    fireEvent.change(screen.getByPlaceholderText(/Ion Popescu/i), {
      target: { value: "Ana Ionescu" },
    });
    fireEvent.change(screen.getByPlaceholderText(/0722 123 456/i), {
      target: { value: "0722123456" },
    });
    fireEvent.change(document.querySelector("textarea") as HTMLTextAreaElement, {
      target: { value: "Discutie despre bugetul familiei." },
    });

    fireEvent.click(screen.getByRole("button", { name: /adaugă programare/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Programare adăugată cu succes!");
      expect(mockNavigate).toHaveBeenCalledWith("/cont/programari/424242");
    });

    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    dateNowSpy.mockRestore();
  });

  it("deletes an appointment from the master list", async () => {
    renderAppointmentsPage();

    await waitFor(() => {
      expect(screen.getAllByText(/Planificare Financiară pentru Afaceri/i).length).toBeGreaterThan(0);
    });

    fireEvent.click(
      screen.getAllByLabelText(/Sterge Planificare Financiară pentru Afaceri/i)[0]
    );
    fireEvent.click(screen.getByRole("button", { name: /da, șterge/i }));

    await waitFor(() => {
      expect(screen.queryAllByText(/Planificare Financiară pentru Afaceri/i)).toHaveLength(0);
    });
  });

  it("filters the master list through search", async () => {
    renderAppointmentsPage();

    fireEvent.change(screen.getByPlaceholderText(/Caută serviciu sau client/i), {
      target: { value: "Imobiliar" },
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Imobiliară/i).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/Afaceri/i)).toHaveLength(0);
    });
  });

  it("switches filter tabs and scrolls back to the top", async () => {
    renderAppointmentsPage();

    fireEvent.click(screen.getByRole("button", { name: /completate/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/Consultanță Inițială/i).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /^anulate$/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/Planificare Educație Copii/i).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /viitoare/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/Planificare Financiară pentru Afaceri/i).length).toBeGreaterThan(0);
    });

    expect(window.scrollTo).toHaveBeenCalledTimes(3);
  });

  it("shows the empty state for no results and clears the active search", async () => {
    renderAppointmentsPage();

    const searchInput = screen.getByPlaceholderText(/Caută serviciu sau client/i);
    fireEvent.change(searchInput, { target: { value: "rezultat inexistent" } });

    await waitFor(() => {
      expect(screen.getAllByText(/Nicio programare găsită/i).length).toBeGreaterThan(1);
    });

    fireEvent.click(screen.getByRole("button", { name: /șterge filtrul/i }));

    await waitFor(() => {
      expect(searchInput).toHaveValue("");
      expect(screen.getAllByText(/Planificare Financiară pentru Afaceri/i).length).toBeGreaterThan(0);
    });
  });

  it("opens the edit dialog, supports cancel, and saves updates", async () => {
    renderAppointmentsPage();

    await waitFor(() => {
      expect(screen.getAllByLabelText(/Editeaza Planificare Financiară pentru Afaceri/i)[0]).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getAllByLabelText(/Editeaza Planificare Financiară pentru Afaceri/i)[0]
    );

    fireEvent.change(screen.getByDisplayValue("Ion Popescu"), {
      target: { value: "Client Temporar" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^anulează$/i }));

    await waitFor(() => {
      expect(screen.queryByDisplayValue("Client Temporar")).not.toBeInTheDocument();
    });

    fireEvent.click(
      screen.getAllByLabelText(/Editeaza Planificare Financiară pentru Afaceri/i)[0]
    );
    fireEvent.change(screen.getByDisplayValue("Ion Popescu"), {
      target: { value: "Firma Test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvează modificările/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Programare actualizată!");
    });

    expect(screen.getAllByText("Firma Test").length).toBeGreaterThan(0);
  });

  it("supports add dialog cancel and mobile row actions on visible items", async () => {
    renderAppointmentsPage();

    // Cancel add dialog
    fireEvent.click(screen.getByRole("button", { name: /adaug/i }));
    fireEvent.click(screen.getByRole("button", { name: /anuleaz/i }));

    await waitFor(() => {
      expect(screen.queryByText(/programare nou/i)).not.toBeInTheDocument();
    });

    // Mobile actions on first visible item (Planificare Financiară pentru Afaceri)
    await waitFor(() => {
      expect(screen.getAllByLabelText(/Editeaza Planificare Financiară pentru Afaceri/i).length).toBeGreaterThan(0);
    });

    fireEvent.click(
      screen.getAllByLabelText(/Editeaza Planificare Financiară pentru Afaceri/i).at(-1)!
    );
    fireEvent.keyDown(document, { key: "Escape" });

    fireEvent.click(
      screen.getAllByLabelText(/Sterge Planificare Financiară pentru Afaceri/i).at(-1)!
    );
    fireEvent.keyDown(document, { key: "Escape" });

    // Mobile "Detalii" button
    fireEvent.click(
      screen.getAllByLabelText(/Vezi detalii pentru Planificare Financiară pentru Afaceri/i).at(-1)!
    );
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/\/cont\/programari\//));
  });

  it("supports delete confirmation dialog", async () => {
    renderAppointmentsPage();

    await waitFor(() => {
      expect(screen.getAllByLabelText(/Sterge Planificare Financiară pentru Afaceri/i)[0]).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getAllByLabelText(/Sterge Planificare Financiară pentru Afaceri/i)[0]
    );

    expect(screen.getByText(/ștergi această programare/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^anulează$/i }));

    await waitFor(() => {
      expect(screen.queryByText(/ștergi această programare/i)).not.toBeInTheDocument();
    });
  });

  it("renders both desktop and mobile empty states for a new account", async () => {
    renderAppointmentsPage("empty");

    await waitFor(() => {
      expect(screen.getAllByText(/Nicio programare găsită/i).length).toBeGreaterThan(1);
    });

    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /adaugă programare/i })).toBeEnabled();
  });

  it("IntersectionObserver loadMore increases visible count when sentinel intersects", async () => {
    let observerCallback: IntersectionObserverCallback | null = null;
    const observeSpy = vi.fn();
    const disconnectSpy = vi.fn();

    vi.stubGlobal("IntersectionObserver", vi.fn((cb: IntersectionObserverCallback) => {
      observerCallback = cb;
      return { observe: observeSpy, disconnect: disconnectSpy };
    }));

    renderAppointmentsPage();

    await waitFor(() => expect(observeSpy).toHaveBeenCalled());

    // Initially 5 items visible (PAGE_SIZE); demo has 12 total — hasMore is true
    const countBefore = screen.getAllByRole("row").length;

    // Trigger intersection: load next page
    act(() => {
      observerCallback!([{ isIntersecting: true }] as IntersectionObserverEntry[]);
    });

    await waitFor(() => {
      expect(screen.getAllByRole("row").length).toBeGreaterThan(countBefore);
    });

    vi.unstubAllGlobals();
  });

  it("generator toggle starts the generator and shows success toast", async () => {
    renderAppointmentsPage();

    await waitFor(() => {
      expect(screen.getByTitle(/Pornește generatorul/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle(/Pornește generatorul/i));

    await waitFor(() => {
      expect(apiMocks.startGeneratorInApi).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith("Generator pornit. Programări noi apar automat.");
    });
  });

  it("generator toggle shows error toast when API call fails", async () => {
    apiMocks.startGeneratorInApi.mockRejectedValueOnce(new Error("network error"));
    renderAppointmentsPage();

    await waitFor(() => {
      expect(screen.getByTitle(/Pornește generatorul/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle(/Pornește generatorul/i));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Nu s-a putut contacta serverul.");
    });
  });

  it("generator start uses the logged-in user's email", async () => {
    // "empty" mode seeds user as ana@example.com with no appointments
    renderAppointmentsPage("empty");

    await waitFor(() => {
      expect(screen.getByTitle(/Pornește generatorul/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle(/Pornește generatorul/i));

    await waitFor(() => {
      expect(apiMocks.startGeneratorInApi).toHaveBeenCalledWith("ana@example.com", 3000);
    });
  });
});
