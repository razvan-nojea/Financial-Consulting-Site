import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPage, UsersTab, LogsTab, SuspiciousTab } from "./admin-page";

// ── Mock setup with vi.hoisted so factories can access mutable state ────────

const mockUser = vi.hoisted(() => ({
  email: "admin@exemplu.ro",
  name: "Admin",
  role: "admin" as "admin" | "user",
}));

const mockGetSessionId = vi.hoisted(() => vi.fn().mockReturnValue("admin-session"));

vi.mock("../contexts/auth-context", () => ({
  useAuth: () => ({ user: mockUser, isAuthenticated: true }),
}));

vi.mock("../contexts/chat-context", () => ({
  useChat: () => ({ adminAlerts: [], clearAdminAlerts: vi.fn(), dismissAlert: vi.fn() }),
}));

vi.mock("../api/auth-api", () => ({
  getSessionId: mockGetSessionId,
  SESSION_STORAGE_KEY: "sessionId",
  SESSION_ROLE_KEY: "sessionRole",
}));

// ── Sample data ────────────────────────────────────────────────────────────────

function makeResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SAMPLE_USERS = [
  { id: "u1", email: "admin@exemplu.ro", name: "Admin", role: "admin", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "u2", email: "demo@exemplu.ro", name: "Demo", role: "user", createdAt: "2026-01-02T00:00:00.000Z" },
];

const SAMPLE_LOGS = [
  {
    id: "l1",
    userEmail: "admin@exemplu.ro",
    groupId: "ADMIN",
    action: "appointment:list",
    ipAddress: "127.0.0.1",
    timestamp: "2026-05-14T10:00:00.000Z",
  },
];

const SAMPLE_SUSPICIOUS = [
  {
    userId: "u2",
    reason: "Too many deletes",
    score: 60,
    detectedAt: "2026-05-14T09:00:00.000Z",
    resolvedAt: null,
    user: { email: "demo@exemplu.ro", name: "Demo" },
  },
];

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("AdminPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetSessionId.mockReturnValue("admin-session");
    mockUser.role = "admin";
    mockUser.email = "admin@exemplu.ro";
    mockUser.name = "Admin";
  });

  it("shows access denied for non-admin users", () => {
    mockUser.role = "user";
    render(<AdminPage />);
    expect(screen.getByText(/acces interzis/i)).toBeInTheDocument();
  });

  it("renders the admin panel heading for admin users", () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(makeResponse({ users: [] }));
    render(<AdminPage />);
    expect(screen.getByText("Panou Administrare")).toBeInTheDocument();
  });
});

describe("UsersTab", () => {
  beforeEach(() => { vi.restoreAllMocks(); mockGetSessionId.mockReturnValue("admin-session"); });

  it("shows loading state initially", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {/* never resolves */}));
    render(<UsersTab />);
    expect(screen.getByText(/se încarcă utilizatorii/i)).toBeInTheDocument();
  });

  it("re-fetches when the session becomes available after initially being null", async () => {
    // Simulate: session is null on mount (loginToServer hasn't resolved yet)
    mockGetSessionId.mockReturnValue(null);
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(makeResponse({ users: [] }))            // 1st fetch: no session → empty
      .mockResolvedValueOnce(makeResponse({ users: SAMPLE_USERS })); // 2nd fetch: session available

    const { rerender } = render(<UsersTab />);

    // First fetch completes with empty state
    await waitFor(() => {
      expect(screen.getByText(/nu există utilizatori/i)).toBeInTheDocument();
    });

    // loginToServer resolves: session is now stored
    mockGetSessionId.mockReturnValue("admin-session");
    rerender(<UsersTab />); // useSessionId() recomputes → "admin-session" → effect re-runs

    // Second fetch populates the table
    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("renders users list after loading", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeResponse({ users: SAMPLE_USERS }));
    render(<UsersTab />);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
      expect(screen.getByText("demo@exemplu.ro")).toBeInTheDocument();
    });
  });

  it("shows empty state when no users returned", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeResponse({ users: [] }));
    render(<UsersTab />);

    await waitFor(() => {
      expect(screen.getByText(/nu există utilizatori/i)).toBeInTheDocument();
    });
  });

  it("handles fetch error gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));
    render(<UsersTab />);

    await waitFor(() => {
      expect(screen.getByText(/nu există utilizatori/i)).toBeInTheDocument();
    });
  });
});

describe("LogsTab", () => {
  beforeEach(() => { vi.restoreAllMocks(); mockGetSessionId.mockReturnValue("admin-session"); });

  it("shows loading state initially", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {/* never resolves */}));
    render(<LogsTab />);
    expect(screen.getByText(/se încarcă jurnalul/i)).toBeInTheDocument();
  });

  it("renders log entries after loading", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeResponse({ logs: SAMPLE_LOGS }));
    render(<LogsTab />);

    await waitFor(() => {
      expect(screen.getByText("appointment:list")).toBeInTheDocument();
    });
  });

  it("shows empty state when no logs returned", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeResponse({ logs: [] }));
    render(<LogsTab />);

    await waitFor(() => {
      expect(screen.getByText(/nu există intrări în jurnal/i)).toBeInTheDocument();
    });
  });

  it("handles fetch error gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));
    render(<LogsTab />);

    await waitFor(() => {
      expect(screen.getByText(/nu există intrări în jurnal/i)).toBeInTheDocument();
    });
  });

  it("shows dash for logs with empty IP address", async () => {
    const logNoIp = [{ ...SAMPLE_LOGS[0], ipAddress: "" }];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeResponse({ logs: logNoIp }));
    render(<LogsTab />);

    await waitFor(() => {
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  it("shows secondary badge for USER group logs", async () => {
    // Covers the groupId !== "ADMIN" branch in the Badge variant
    const userLog = [{ ...SAMPLE_LOGS[0], groupId: "USER" }];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeResponse({ logs: userLog }));
    render(<LogsTab />);

    await waitFor(() => {
      expect(screen.getByText("USER")).toBeInTheDocument();
    });
  });

  it("omits session header when getSessionId returns null", async () => {
    // Covers the `if (sessionId)` false branch in adminHeaders.
    // Use mockReturnValue (not Once) because useSessionId() also calls getSessionId()
    // during the render phase — both calls must return null to keep sessionId stable.
    mockGetSessionId.mockReturnValue(null);

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeResponse({ logs: [] }));
    render(<LogsTab />);

    await waitFor(() => {
      expect(screen.getByText(/nu există intrări/i)).toBeInTheDocument();
    });

    // Verify no X-Session-Id header was sent
    const [, init] = fetchSpy.mock.calls[0];
    const headers = (init as RequestInit | undefined)?.headers as Record<string, string> | undefined;
    expect(headers?.["X-Session-Id"]).toBeUndefined();
  });

  it("handles empty body response gracefully", async () => {
    // Covers the `text ? JSON.parse(text) : null` false branch in apiFetch
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", { status: 200 })
    );
    render(<LogsTab />);

    await waitFor(() => {
      expect(screen.getByText(/nu există intrări/i)).toBeInTheDocument();
    });
  });
});

describe("SuspiciousTab", () => {
  beforeEach(() => { vi.restoreAllMocks(); mockGetSessionId.mockReturnValue("admin-session"); });

  it("shows loading state initially", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {/* never resolves */}));
    render(<SuspiciousTab />);
    expect(screen.getByText(/se încarcă lista de supraveghere/i)).toBeInTheDocument();
  });

  it("shows suspicious users after loading", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeResponse({ suspicious: SAMPLE_SUSPICIOUS }));
    render(<SuspiciousTab />);

    await waitFor(() => {
      expect(screen.getByText("Too many deletes")).toBeInTheDocument();
    });
  });

  it("shows clean state when no suspicious users", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeResponse({ suspicious: [] }));
    render(<SuspiciousTab />);

    await waitFor(() => {
      expect(screen.getByText(/nu există utilizatori suspicioși/i)).toBeInTheDocument();
    });
  });

  it("handles fetch error gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));
    render(<SuspiciousTab />);

    await waitFor(() => {
      expect(screen.getByText(/nu există utilizatori suspicioși/i)).toBeInTheDocument();
    });
  });

  it("resolves a suspicious user when the button is clicked", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(makeResponse({ suspicious: SAMPLE_SUSPICIOUS }))
      .mockResolvedValueOnce(makeResponse({}, 200)) // PATCH resolve
      .mockResolvedValueOnce(makeResponse({ suspicious: [{ ...SAMPLE_SUSPICIOUS[0], resolvedAt: "2026-05-14T12:00:00.000Z" }] }));

    render(<SuspiciousTab />);

    await waitFor(() => {
      expect(screen.getByText("Marchează rezolvat")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Marchează rezolvat"));

    await waitFor(() => {
      const patchCall = fetchSpy.mock.calls.find(
        ([url, init]) => typeof url === "string" && url.includes("/resolve") && (init as RequestInit)?.method === "PATCH"
      );
      expect(patchCall).toBeDefined();
    });
  });

  it("shows resolved badge for already-resolved suspicious users", async () => {
    const resolved = { ...SAMPLE_SUSPICIOUS[0], resolvedAt: "2026-05-14T12:00:00.000Z" };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeResponse({ suspicious: [resolved] }));
    render(<SuspiciousTab />);

    await waitFor(() => {
      expect(screen.getByText("Rezolvat")).toBeInTheDocument();
    });

    expect(screen.queryByText("Marchează rezolvat")).not.toBeInTheDocument();
  });

  it("shows user ID as fallback when user details are missing", async () => {
    const noUserDetails = { ...SAMPLE_SUSPICIOUS[0], user: undefined };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeResponse({ suspicious: [noUserDetails] }));
    render(<SuspiciousTab />);

    await waitFor(() => {
      expect(screen.getByText("u2")).toBeInTheDocument();
    });
  });
});
