import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateUser = vi.fn();
const mockChangePassword = vi.fn(async () => ({ success: true }));
const mockUser = {
  name: "Ana Ionescu",
  email: "ana@example.com",
  phone: "0722 111 222",
  bio: "Plan financiar personal.",
  appointmentCount: 0,
  totalSalary: 45000,
  investmentGoal: 90000,
};

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../contexts/auth-context", () => ({
  useAuth: () => ({
    user: mockUser,
    updateUser: mockUpdateUser,
    changePassword: mockChangePassword,
  }),
}));

vi.mock("../components/ui/tabs", () => ({
  Tabs: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange: (value: string) => void;
  }) => (
    <div>
      {children}
      <button type="button" onClick={() => onValueChange("security")}>
        Trigger tab change
      </button>
    </div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { AccountSettings } from "./account-settings";

describe("AccountSettings tab changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.history.replaceState(null, "", "/cont/setari");
  });

  it("updates the active tab query string and scrolls the settings container into view", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    render(<AccountSettings />);

    fireEvent.click(screen.getByRole("button", { name: /trigger tab change/i }));

    await waitFor(() => {
      expect(window.location.search).toContain("tab=security");
    });

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("handles empty names and malformed notification storage gracefully", async () => {
    mockUser.name = "";
    window.localStorage.setItem("account-notifications:ana@example.com", "{invalid-json");

    render(<AccountSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText(/prenume/i)).toHaveValue("");
    });

    expect(screen.getByLabelText(/^nume$/i)).toHaveValue("");

    const switches = screen.getAllByRole("switch");
    expect(switches[0]).toHaveAttribute("aria-checked", "true");
    expect(switches[1]).toHaveAttribute("aria-checked", "true");
    expect(switches[2]).toHaveAttribute("aria-checked", "false");
    expect(switches[3]).toHaveAttribute("aria-checked", "true");

    mockUser.name = "Ana Ionescu";
  });

  it("fills missing notification flags with defaults when partial preferences exist", async () => {
    window.localStorage.setItem(
      "account-notifications:ana@example.com",
      JSON.stringify({ emailAppointments: false })
    );

    render(<AccountSettings />);

    await waitFor(() => {
      expect(screen.getAllByRole("switch")[0]).toHaveAttribute("aria-checked", "false");
    });

    const switches = screen.getAllByRole("switch");
    expect(switches[1]).toHaveAttribute("aria-checked", "true");
    expect(switches[2]).toHaveAttribute("aria-checked", "false");
    expect(switches[3]).toHaveAttribute("aria-checked", "true");
  });

  it("normalizes zero numeric profile values before saving", async () => {
    render(<AccountSettings />);

    fireEvent.change(screen.getByLabelText(/venit total/i), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/obiectiv investi/i), {
      target: { value: "0" },
    });
    const submitButton = screen.getByRole("button", { name: /salveaz.*modific/i });
    fireEvent.submit(submitButton.closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          totalSalary: 0,
          investmentGoal: 0,
        })
      );
    });
  });

  it("falls back to defaults when stored notification flags have invalid types", async () => {
    window.localStorage.setItem(
      "account-notifications:ana@example.com",
      JSON.stringify({
        emailAppointments: "no",
        emailNewsletter: 1,
        smsAppointments: null,
        smsReminders: "yes",
      })
    );

    render(<AccountSettings />);

    await waitFor(() => {
      expect(screen.getAllByRole("switch")[0]).toHaveAttribute("aria-checked", "true");
    });

    const switches = screen.getAllByRole("switch");
    expect(switches[1]).toHaveAttribute("aria-checked", "true");
    expect(switches[2]).toHaveAttribute("aria-checked", "false");
    expect(switches[3]).toHaveAttribute("aria-checked", "true");
  });

  it("loads valid notification flags from storage", async () => {
    window.localStorage.setItem(
      "account-notifications:ana@example.com",
      JSON.stringify({
        emailAppointments: false,
        emailNewsletter: false,
        smsAppointments: true,
        smsReminders: false,
      })
    );

    render(<AccountSettings />);

    await waitFor(() => {
      expect(screen.getAllByRole("switch")[0]).toHaveAttribute("aria-checked", "false");
    });

    const switches = screen.getAllByRole("switch");
    expect(switches[1]).toHaveAttribute("aria-checked", "false");
    expect(switches[2]).toHaveAttribute("aria-checked", "true");
    expect(switches[3]).toHaveAttribute("aria-checked", "false");
  });

  it("shows the generic password error when the auth layer fails without a message", async () => {
    const { toast } = await import("sonner");
    mockChangePassword.mockResolvedValueOnce({ success: false });

    render(<AccountSettings />);

    fireEvent.change(screen.getByLabelText(/parola curent/i), {
      target: { value: "secret123" },
    });
    fireEvent.change(document.getElementById("newPassword") as HTMLInputElement, {
      target: { value: "updated1234" },
    });
    fireEvent.change(document.getElementById("confirmPassword") as HTMLInputElement, {
      target: { value: "updated1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /actualizeaz.*parola/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Parola nu a putut fi schimbată.");
    });
  });
});
