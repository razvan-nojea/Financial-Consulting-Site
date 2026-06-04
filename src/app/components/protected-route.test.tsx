import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ProtectedRoute, AdminRoute } from "./protected-route";
import { AuthProvider } from "../contexts/auth-context";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the auth context
const mockAuthContext = vi.fn();
vi.mock("../contexts/auth-context", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => mockAuthContext(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
  Navigate: ({ to, replace }: { to: string; replace?: boolean }) => {
    mockNavigate(to, replace);
    return <div data-testid="navigate" data-to={to} data-replace={replace} />;
  },
  MemoryRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function TestWrapper({
  children,
  isAuthenticated = false,
  role = "user",
}: {
  children: React.ReactNode;
  isAuthenticated?: boolean;
  role?: "admin" | "user";
}) {
  mockAuthContext.mockReturnValue({
    user: isAuthenticated ? { name: "Test User", email: "test@example.com", role } : null,
    isAuthenticated,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
  });

  return (
    <MemoryRouter>
      {children}
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("should render children when user is authenticated", () => {
    const { getByText } = render(
      <TestWrapper isAuthenticated={true}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(getByText("Protected Content")).toBeInTheDocument();
  });

  it("should redirect to login when user is not authenticated", () => {
    render(
      <TestWrapper isAuthenticated={false}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(mockNavigate).toHaveBeenCalledWith("/autentificare", true);
  });

  it("should not render protected content when not authenticated", () => {
    const { queryByText } = render(
      <TestWrapper isAuthenticated={false}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(queryByText("Protected Content")).not.toBeInTheDocument();
  });
});

describe("AdminRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders children when user is admin", () => {
    const { getByText } = render(
      <TestWrapper isAuthenticated={true} role="admin">
        <AdminRoute>
          <div>Admin Content</div>
        </AdminRoute>
      </TestWrapper>
    );
    expect(getByText("Admin Content")).toBeInTheDocument();
  });

  it("redirects to dashboard when user is authenticated but not admin", () => {
    render(
      <TestWrapper isAuthenticated={true} role="user">
        <AdminRoute>
          <div>Admin Content</div>
        </AdminRoute>
      </TestWrapper>
    );
    expect(mockNavigate).toHaveBeenCalledWith("/cont", true);
  });

  it("redirects to login when user is not authenticated", () => {
    render(
      <TestWrapper isAuthenticated={false}>
        <AdminRoute>
          <div>Admin Content</div>
        </AdminRoute>
      </TestWrapper>
    );
    expect(mockNavigate).toHaveBeenCalledWith("/autentificare", true);
  });

  it("does not render admin content for regular users", () => {
    const { queryByText } = render(
      <TestWrapper isAuthenticated={true} role="user">
        <AdminRoute>
          <div>Admin Content</div>
        </AdminRoute>
      </TestWrapper>
    );
    expect(queryByText("Admin Content")).not.toBeInTheDocument();
  });
});