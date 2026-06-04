import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatWindow } from "./chat-window";

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// ── Mock setup with vi.hoisted so factories can access mutable state ──────────

const mockChat = vi.hoisted(() => ({
  messages: [] as {
    _id: string;
    from: string;
    fromName: string;
    to?: string | null;
    text: string;
    _createdAt: string;
  }[],
  connected: false,
  sendMessage: vi.fn(),
}));

const mockAuth = vi.hoisted(() => ({
  user: { email: "test@example.com", name: "Test User", role: "user" as const },
  isAuthenticated: true as boolean,
}));

vi.mock("../../contexts/chat-context", () => ({
  useChat: () => mockChat,
}));

vi.mock("../../contexts/auth-context", () => ({
  useAuth: () => mockAuth,
}));

vi.mock("../../api/auth-api", () => ({
  getSessionId: vi.fn().mockReturnValue("test-session"),
}));

vi.mock("../../lib/api-base", () => ({
  API_BASE: "https://localhost:3001",
}));

/** Helper: mock the /api/admin/users fetch for admin tests */
function mockAdminUsers(users: { email: string; name: string; id: string; role: string; createdAt: string }[] = []) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ users }), { status: 200 })
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("ChatWindow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChat.messages = [];
    mockChat.connected = false;
    mockChat.sendMessage = vi.fn();
    mockAuth.user = { email: "test@example.com", name: "Test User", role: "user" };
    mockAuth.isAuthenticated = true;
    // Default: admin users fetch returns empty list
    mockAdminUsers([]);
  });

  it("renders the chat toggle button", () => {
    render(<ChatWindow />);
    expect(screen.getByLabelText("Chat")).toBeInTheDocument();
  });

  it("opens the chat panel when toggle button is clicked", () => {
    render(<ChatWindow />);
    fireEvent.click(screen.getByLabelText("Chat"));
    expect(screen.getByText("Chat live")).toBeInTheDocument();
  });

  it("closes the chat panel when toggle button is clicked again", () => {
    render(<ChatWindow />);
    fireEvent.click(screen.getByLabelText("Chat"));
    expect(screen.getByText("Chat live")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Chat"));
    expect(screen.queryByText("Chat live")).not.toBeInTheDocument();
  });

  it("shows 'no messages' placeholder when chat is empty", () => {
    render(<ChatWindow />);
    fireEvent.click(screen.getByLabelText("Chat"));
    expect(screen.getByText(/niciun mesaj/i)).toBeInTheDocument();
  });

  it("displays own and DM messages with correct sender labels", () => {
    mockChat.messages = [
      { _id: "1", from: "test@example.com", fromName: "Test User", text: "My message", _createdAt: "2026-05-14T10:00:00.000Z" },
      // DM from another user addressed directly to this user
      { _id: "2", from: "other@example.com", fromName: "Other Person", text: "Their DM", _createdAt: "2026-05-14T10:01:00.000Z", to: "test@example.com" },
    ];

    render(<ChatWindow />);
    fireEvent.click(screen.getByLabelText("Chat"));

    expect(screen.getByText("My message")).toBeInTheDocument();
    expect(screen.getByText("Their DM")).toBeInTheDocument();
    // Other user's name shown above their bubble
    expect(screen.getByText("Other Person")).toBeInTheDocument();
  });

  it("shows connected status indicator when connected", () => {
    mockChat.connected = true;
    render(<ChatWindow />);
    fireEvent.click(screen.getByLabelText("Chat"));
    expect(screen.getByText(/conectat/i)).toBeInTheDocument();
  });

  it("shows reconnecting status when disconnected", () => {
    mockChat.connected = false;
    render(<ChatWindow />);
    fireEvent.click(screen.getByLabelText("Chat"));
    expect(screen.getByText(/reconectare/i)).toBeInTheDocument();
  });

  it("sends a message when form is submitted", () => {
    render(<ChatWindow />);
    fireEvent.click(screen.getByLabelText("Chat"));

    const input = screen.getByPlaceholderText(/scrie un mesaj/i);
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.submit(input.closest("form")!);

    expect(mockChat.sendMessage).toHaveBeenCalledWith("Hello");
  });

  it("clears the input after sending a message", () => {
    render(<ChatWindow />);
    fireEvent.click(screen.getByLabelText("Chat"));

    const input = screen.getByPlaceholderText(/scrie un mesaj/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.submit(input.closest("form")!);

    expect(input.value).toBe("");
  });

  it("does not send an empty message", () => {
    render(<ChatWindow />);
    fireEvent.click(screen.getByLabelText("Chat"));

    const input = screen.getByPlaceholderText(/scrie un mesaj/i);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.submit(input.closest("form")!);

    expect(mockChat.sendMessage).not.toHaveBeenCalled();
  });

  it("shows login prompt when user is not authenticated", () => {
    mockAuth.isAuthenticated = false;
    (mockAuth as { user: typeof mockAuth.user | null }).user = null;

    render(<ChatWindow />);
    fireEvent.click(screen.getByLabelText("Chat"));

    expect(screen.getByText(/autentific/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/scrie un mesaj/i)).not.toBeInTheDocument();
  });

  it("closes panel from the close button inside the panel header", () => {
    render(<ChatWindow />);
    fireEvent.click(screen.getByLabelText("Chat"));
    expect(screen.getByText("Chat live")).toBeInTheDocument();

    // The close button inside the header (no aria-label="Chat")
    const allButtons = screen.getAllByRole("button");
    const headerCloseBtn = allButtons.find((btn) => !btn.getAttribute("aria-label"));
    fireEvent.click(headerCloseBtn!);

    expect(screen.queryByText("Chat live")).not.toBeInTheDocument();
  });

  it("disables send button when input is empty", () => {
    render(<ChatWindow />);
    fireEvent.click(screen.getByLabelText("Chat"));

    const form = screen.getByPlaceholderText(/scrie un mesaj/i).closest("form")!;
    const submitBtn = form.querySelector("button[type='submit']") as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  // ── Regular-user message filtering ────────────────────────────────────────

  it("regular user only sees own messages and DMs addressed to them (private chat)", () => {
    mockChat.messages = [
      { _id: "1", from: "test@example.com", fromName: "Test User", text: "My message", _createdAt: "2026-05-14T10:00:00.000Z", to: null },
      { _id: "2", from: "other@example.com", fromName: "Other", text: "Other broadcast", _createdAt: "2026-05-14T10:01:00.000Z", to: null },
      { _id: "3", from: "other@example.com", fromName: "Other", text: "DM to me", _createdAt: "2026-05-14T10:02:00.000Z", to: "test@example.com" },
      { _id: "4", from: "other@example.com", fromName: "Other", text: "DM to someone else", _createdAt: "2026-05-14T10:03:00.000Z", to: "third@example.com" },
    ];

    render(<ChatWindow />);
    fireEvent.click(screen.getByLabelText("Chat"));

    // Own message — visible
    expect(screen.getByText("My message")).toBeInTheDocument();
    // DM addressed to me — visible
    expect(screen.getByText("DM to me")).toBeInTheDocument();
    // Broadcast from another user — NOT visible
    expect(screen.queryByText("Other broadcast")).not.toBeInTheDocument();
    // DM to someone else — NOT visible
    expect(screen.queryByText("DM to someone else")).not.toBeInTheDocument();
  });

  // ── Admin chat paths ────────────────────────────────────────────────────────

  it("admin sees user list instead of messages when no user is selected", async () => {
    mockAuth.user = { email: "admin@example.com", name: "Admin", role: "admin" };
    mockAdminUsers([{ id: "u1", email: "user@example.com", name: "User One", role: "user", createdAt: "" }]);
    mockChat.messages = [
      { _id: "1", from: "user@example.com", fromName: "User One", text: "Hello admin", _createdAt: "2026-05-14T10:00:00.000Z", to: null },
    ];

    render(<ChatWindow />);
    await act(async () => { fireEvent.click(screen.getByLabelText("Chat")); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    expect(screen.getByText("User One")).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    // Input is NOT shown in user-list view
    expect(screen.queryByPlaceholderText(/scrie un mesaj/i)).not.toBeInTheDocument();
  });

  it("admin sees 'no users' message when no users are registered and nobody has chatted", async () => {
    mockAuth.user = { email: "admin@example.com", name: "Admin", role: "admin" };
    mockAdminUsers([]);
    mockChat.messages = [];

    render(<ChatWindow />);
    await act(async () => { fireEvent.click(screen.getByLabelText("Chat")); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    expect(screen.getByText(/niciun utilizator înregistrat/i)).toBeInTheDocument();
  });

  it("admin opens a conversation after selecting a user", async () => {
    mockAuth.user = { email: "admin@example.com", name: "Admin", role: "admin" };
    mockAdminUsers([{ id: "u1", email: "user@example.com", name: "User One", role: "user", createdAt: "" }]);
    mockChat.messages = [
      { _id: "1", from: "user@example.com", fromName: "User One", text: "Hello admin", _createdAt: "2026-05-14T10:00:00.000Z", to: null },
    ];

    render(<ChatWindow />);
    await act(async () => { fireEvent.click(screen.getByLabelText("Chat")); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    fireEvent.click(screen.getByLabelText("Chat cu User One"));

    // Header title changes to the selected user's name (appears at least once)
    expect(screen.getAllByText("User One").length).toBeGreaterThan(0);
    // Message is now visible
    expect(screen.getByText("Hello admin")).toBeInTheDocument();
    // Input appears
    expect(screen.getByPlaceholderText(/scrie un mesaj/i)).toBeInTheDocument();
  });

  it("admin can go back to the user list with the back button", async () => {
    mockAuth.user = { email: "admin@example.com", name: "Admin", role: "admin" };
    mockAdminUsers([{ id: "u1", email: "user@example.com", name: "User One", role: "user", createdAt: "" }]);
    mockChat.messages = [
      { _id: "1", from: "user@example.com", fromName: "User One", text: "Hello", _createdAt: "2026-05-14T10:00:00.000Z", to: null },
    ];

    render(<ChatWindow />);
    await act(async () => { fireEvent.click(screen.getByLabelText("Chat")); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    fireEvent.click(screen.getByLabelText("Chat cu User One"));

    // Now in conversation view
    expect(screen.getByLabelText("Înapoi la lista utilizatori")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Înapoi la lista utilizatori"));

    // Back to user list: email visible again
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  it("admin sends a DM to the selected user", async () => {
    mockAuth.user = { email: "admin@example.com", name: "Admin", role: "admin" };
    mockAdminUsers([{ id: "u1", email: "user@example.com", name: "User One", role: "user", createdAt: "" }]);
    mockChat.messages = [
      { _id: "1", from: "user@example.com", fromName: "User One", text: "Hello", _createdAt: "2026-05-14T10:00:00.000Z", to: null },
    ];

    render(<ChatWindow />);
    await act(async () => { fireEvent.click(screen.getByLabelText("Chat")); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    fireEvent.click(screen.getByLabelText("Chat cu User One"));

    const input = screen.getByPlaceholderText(/scrie un mesaj/i);
    fireEvent.change(input, { target: { value: "Hi there" } });
    fireEvent.submit(input.closest("form")!);

    expect(mockChat.sendMessage).toHaveBeenCalledWith("Hi there", "user@example.com");
  });

  it("admin only sees messages from and to the selected user in the conversation", async () => {
    mockAuth.user = { email: "admin@example.com", name: "Admin", role: "admin" };
    mockAdminUsers([
      { id: "u1", email: "alice@example.com", name: "Alice", role: "user", createdAt: "" },
      { id: "u2", email: "bob@example.com",   name: "Bob",   role: "user", createdAt: "" },
    ]);
    mockChat.messages = [
      { _id: "1", from: "alice@example.com", fromName: "Alice", text: "Alice msg", _createdAt: "2026-05-14T10:00:00.000Z", to: null },
      { _id: "2", from: "bob@example.com",   fromName: "Bob",   text: "Bob msg",   _createdAt: "2026-05-14T10:01:00.000Z", to: null },
      { _id: "3", from: "admin@example.com", fromName: "Admin", text: "Reply to Alice", _createdAt: "2026-05-14T10:02:00.000Z", to: "alice@example.com" },
    ];

    render(<ChatWindow />);
    await act(async () => { fireEvent.click(screen.getByLabelText("Chat")); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    fireEvent.click(screen.getByLabelText("Chat cu Alice"));

    expect(screen.getByText("Alice msg")).toBeInTheDocument();
    expect(screen.getByText("Reply to Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob msg")).not.toBeInTheDocument();
  });

  it("admin user list shows all registered users (not just message senders)", async () => {
    mockAuth.user = { email: "admin@example.com", name: "Admin", role: "admin" };
    mockAdminUsers([
      { id: "u1", email: "active@example.com",  name: "Active User",  role: "user", createdAt: "" },
      { id: "u2", email: "silent@example.com",  name: "Silent User",  role: "user", createdAt: "" },
    ]);
    // Only Active User has sent messages
    mockChat.messages = [
      { _id: "1", from: "active@example.com", fromName: "Active User", text: "Hi", _createdAt: "2026-05-14T10:00:00.000Z", to: null },
    ];

    render(<ChatWindow />);
    await act(async () => { fireEvent.click(screen.getByLabelText("Chat")); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    // Both users visible — not just the one who sent a message
    expect(screen.getByText("Active User")).toBeInTheDocument();
    expect(screen.getByText("Silent User")).toBeInTheDocument();
  });

  it("admin search filters the user list", async () => {
    mockAuth.user = { email: "admin@example.com", name: "Admin", role: "admin" };
    mockAdminUsers([
      { id: "u1", email: "alice@example.com", name: "Alice", role: "user", createdAt: "" },
      { id: "u2", email: "bob@example.com",   name: "Bob",   role: "user", createdAt: "" },
    ]);
    mockChat.messages = [];

    render(<ChatWindow />);
    await act(async () => { fireEvent.click(screen.getByLabelText("Chat")); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    const searchInput = screen.getByPlaceholderText(/caută utilizator/i);
    fireEvent.change(searchInput, { target: { value: "alice" } });

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });
});
