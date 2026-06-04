import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./login-page";
import { AuthProvider } from "../contexts/auth-context";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  MemoryRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render login form with all required elements", () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    expect(screen.getByText(/bun revenit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/parol/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /autentific/i })).toBeInTheDocument();
    expect(screen.getByText(/nu ai cont/i)).toBeInTheDocument();
    expect(screen.getByText(/conturi demo/i)).toBeInTheDocument();
  });

  it("should update form data when inputs change", () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/parol/i);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(emailInput).toHaveValue("test@example.com");
    expect(passwordInput).toHaveValue("password123");
  });

  it("should toggle password visibility", () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const passwordInput = screen.getByLabelText(/parol/i);
    const toggleButton = screen.getByRole("button", { name: /show password|hide password/i });

    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("should submit form and navigate on successful local login", async () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "demo@exemplu.ro" },
    });
    fireEvent.change(screen.getByLabelText(/parol/i), {
      target: { value: "demo123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /autentific/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/cont");
    });
  });

  it("should show success toast on login", async () => {
    const { toast } = await import("sonner");

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "demo@exemplu.ro" },
    });
    fireEvent.change(screen.getByLabelText(/parol/i), {
      target: { value: "demo123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /autentific/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Autentificare reușită!");
    });
  });

  it("should show an error and stay on the page when the local account is missing", async () => {
    const { toast } = await import("sonner");

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "missing@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/parol/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /autentific/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Contul nu a fost găsit în registrul local."
      );
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should show error when password is incorrect", async () => {
    const { toast } = await import("sonner");

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "demo@exemplu.ro" },
    });
    fireEvent.change(screen.getByLabelText(/parol/i), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /autentific/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Parola este incorectă.");
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should have link to signup page", () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    expect(screen.getByRole("link", { name: /nregistreaz/i })).toHaveAttribute(
      "href",
      "/inregistrare"
    );
  });

  it("should have link to home page", () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const homeLink = screen.getAllByRole("link").find(l => l.getAttribute("href") === "/");
    expect(homeLink).toBeTruthy();
  });
});
