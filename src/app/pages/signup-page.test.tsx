import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SignupPage } from "./signup-page";
import { AuthProvider } from "../contexts/auth-context";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  MemoryRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("SignupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render signup form with all required elements", () => {
    render(
      <TestWrapper>
        <SignupPage />
      </TestWrapper>
    );

    expect(screen.getByLabelText(/prenume/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Nume")).toBeInTheDocument();
    expect(screen.getByLabelText(/adresă email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^parol/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmă parol/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /creează cont/i })).toBeInTheDocument();
  });

  it("should update form data when inputs change", () => {
    render(
      <TestWrapper>
        <SignupPage />
      </TestWrapper>
    );

    const firstNameInput = screen.getByLabelText(/prenume/i);
    const lastNameInput = screen.getByLabelText("Nume");
    const emailInput = screen.getByLabelText(/adresă email/i);
    const passwordInput = screen.getByLabelText(/^parol/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmă parol/i);

    fireEvent.change(firstNameInput, { target: { value: "John" } });
    fireEvent.change(lastNameInput, { target: { value: "Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });

    expect(firstNameInput).toHaveValue("John");
    expect(lastNameInput).toHaveValue("Doe");
    expect(emailInput).toHaveValue("john@example.com");
    expect(passwordInput).toHaveValue("password123");
    expect(confirmPasswordInput).toHaveValue("password123");
  });

  it("should handle checkbox change", () => {
    render(
      <TestWrapper>
        <SignupPage />
      </TestWrapper>
    );

    const checkbox = screen.getByRole("checkbox");

    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("should show error when passwords don't match", async () => {
    const { toast } = await import("sonner");

    render(
      <TestWrapper>
        <SignupPage />
      </TestWrapper>
    );

    const firstNameInput = screen.getByLabelText(/prenume/i);
    const lastNameInput = screen.getByLabelText("Nume");
    const emailInput = screen.getByLabelText(/adresă email/i);
    const passwordInput = screen.getByLabelText(/^parol/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmă parol/i);
    const checkbox = screen.getByRole("checkbox");
    const submitButton = screen.getByRole("button", { name: /creează cont/i });

    fireEvent.change(firstNameInput, { target: { value: "John" } });
    fireEvent.change(lastNameInput, { target: { value: "Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "different" } });
    fireEvent.click(checkbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Parolele nu se potrivesc!");
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should show error when terms are not accepted", async () => {
    const { toast } = await import("sonner");

    render(
      <TestWrapper>
        <SignupPage />
      </TestWrapper>
    );

    const firstNameInput = screen.getByLabelText(/prenume/i);
    const lastNameInput = screen.getByLabelText("Nume");
    const emailInput = screen.getByLabelText(/adresă email/i);
    const passwordInput = screen.getByLabelText(/^parol/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmă parol/i);
    const submitButton = screen.getByRole("button", { name: /creează cont/i });

    fireEvent.change(firstNameInput, { target: { value: "John" } });
    fireEvent.change(lastNameInput, { target: { value: "Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Trebuie să accepți termenii și condițiile!");
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should submit form and navigate on successful signup", async () => {
    const { toast } = await import("sonner");

    render(
      <TestWrapper>
        <SignupPage />
      </TestWrapper>
    );

    const firstNameInput = screen.getByLabelText(/prenume/i);
    const lastNameInput = screen.getByLabelText("Nume");
    const emailInput = screen.getByLabelText(/adresă email/i);
    const passwordInput = screen.getByLabelText(/^parol/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmă parol/i);
    const checkbox = screen.getByRole("checkbox");
    const submitButton = screen.getByRole("button", { name: /creează cont/i });

    fireEvent.change(firstNameInput, { target: { value: "John" } });
    fireEvent.change(lastNameInput, { target: { value: "Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });
    fireEvent.click(checkbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/cont");
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Cont creat cu succes! Bun venit!");
    });
  });

  it("should have link to login page", () => {
    render(
      <TestWrapper>
        <SignupPage />
      </TestWrapper>
    );

    const loginLink = screen.getByRole("link", { name: /autentifică-te/i });
    expect(loginLink).toHaveAttribute("href", "/autentificare");
  });

  it("should update form values and terms checkbox via handleChange path", () => {
    render(
      <TestWrapper>
        <SignupPage />
      </TestWrapper>
    );

    const firstNameInput = screen.getByLabelText(/prenume/i);
    const lastNameInput = screen.getByLabelText("Nume");
    const emailInput = screen.getByLabelText(/adresă email/i);
    const passwordInput = screen.getByLabelText(/^parol/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmă parol/i);
    const checkbox = screen.getByRole("checkbox");

    fireEvent.change(firstNameInput, { target: { value: "Ana" } });
    fireEvent.change(lastNameInput, { target: { value: "Ionescu" } });
    fireEvent.change(emailInput, { target: { value: "ana@example.ro" } });
    fireEvent.change(passwordInput, { target: { value: "secure123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "secure123" } });
    fireEvent.click(checkbox);

    expect(firstNameInput).toHaveValue("Ana");
    expect(lastNameInput).toHaveValue("Ionescu");
    expect(emailInput).toHaveValue("ana@example.ro");
    expect(passwordInput).toHaveValue("secure123");
    expect(confirmPasswordInput).toHaveValue("secure123");
    expect(checkbox).toBeChecked();
  });

  it("should have link to home page", () => {
    render(
      <TestWrapper>
        <SignupPage />
      </TestWrapper>
    );

    const homeLink = screen.getAllByRole("link").find(l => l.getAttribute("href") === "/");
    expect(homeLink).toBeTruthy();
  });
});