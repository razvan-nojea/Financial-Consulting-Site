import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
const mockLogin = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock("../contexts/auth-context", () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

import { LoginPage } from "./login-page";

describe("LoginPage fallback errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the generic error message when authentication fails without a specific message", async () => {
    const { toast } = await import("sonner");
    mockLogin.mockReturnValue({ success: false });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "missing@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/parol/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /autentific/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/autentificarea a e/i));
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
