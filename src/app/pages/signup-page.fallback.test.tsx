import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
const mockSignup = vi.fn();

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
    signup: mockSignup,
  }),
}));

import { SignupPage } from "./signup-page";

describe("SignupPage fallback errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the generic error message when signup fails without a specific message", async () => {
    const { toast } = await import("sonner");
    mockSignup.mockReturnValue({ success: false });

    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText(/prenume/i), {
      target: { value: "Ana" },
    });
    fireEvent.change(screen.getByLabelText("Nume"), {
      target: { value: "Ionescu" },
    });
    fireEvent.change(screen.getByLabelText(/adres.*email/i), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^parol/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/confirm.*parol/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /creeaz/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/contul nu a putut fi creat/i));
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
