import React, { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "../../contexts/chat-context";
import { useAuth } from "../../contexts/auth-context";
import { getSessionId } from "../../api/auth-api";
import { API_BASE } from "../../lib/api-base";
import { Button } from "../ui/button";
import { MessageCircle, X, Send, Wifi, WifiOff, Users, ChevronLeft } from "lucide-react";

interface KnownUser { email: string; name: string; }

export function ChatWindow() {
  const { messages, connected, sendMessage } = useChat();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  /** Admin-only: the currently selected conversation partner (null = show user list) */
  const [selectedUser, setSelectedUser] = useState<KnownUser | null>(null);
  /** All registered users fetched from the admin API */
  const [allUsers, setAllUsers] = useState<KnownUser[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch all users when admin opens the chat panel (only once — skip if already loaded)
  useEffect(() => {
    if (!isAdmin || !open || allUsers.length > 0) return;
    const sessionId = getSessionId();
    const headers: Record<string, string> = {};
    if (sessionId) headers["X-Session-Id"] = sessionId;
    fetch(`${API_BASE}/api/admin/users`, { headers })
      .then((r) => r.json())
      .then((data: { users?: { email: string; name: string }[] }) => {
        if (data.users) {
          setAllUsers(
            data.users
              .filter((u) => u.email !== user?.email)
              .map((u) => ({ email: u.email, name: u.name }))
          );
        }
      })
      .catch(() => {/* server unavailable */});
  }, [isAdmin, open, user?.email, allUsers.length]);

  // Auto-scroll to newest message when window is open and in conversation view
  useEffect(() => {
    if (open && (!isAdmin || selectedUser)) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, isAdmin, selectedUser]);

  // Build sorted list of unique users: registered users merged with any message
  // senders not yet in the DB list (edge case — only scans messages when allUsers
  // is empty, i.e. before the first successful admin API fetch).
  const chatUsers = useMemo(() => {
    if (!isAdmin) return [];
    const seen = new Map<string, KnownUser>(allUsers.map((u) => [u.email, u]));
    if (allUsers.length === 0) {
      for (const msg of messages) {
        if (msg.from !== user?.email && !seen.has(msg.from)) {
          seen.set(msg.from, { email: msg.from, name: msg.fromName });
        }
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [messages, isAdmin, user?.email, allUsers]);

  // Filtered list based on search input
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return chatUsers;
    const q = search.toLowerCase();
    return chatUsers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [chatUsers, search]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (isAdmin && selectedUser) {
      sendMessage(text, selectedUser.email);
    } else {
      sendMessage(text);
    }
    setText("");
  };

  // Compute visible messages only in the conversation branch (not the user list).
  const visibleMessages = useMemo(() => {
    if (isAdmin) {
      if (!selectedUser) return [];
      return messages.filter(
        (m) =>
          m.from === selectedUser.email ||
          (m.from === user?.email && m.to === selectedUser.email)
      );
    }
    return messages.filter(
      (m) => m.from === user?.email || m.to === user?.email
    );
  }, [messages, isAdmin, selectedUser, user?.email]);

  return (
    <>
      {/* ── Floating toggle button ─────────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Chat"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-colors"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* ── Chat panel ────────────────────────────────────────────── */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
            <div className="flex items-center gap-2">
              {isAdmin && selectedUser ? (
                <button
                  onClick={() => setSelectedUser(null)}
                  aria-label="Înapoi la lista utilizatori"
                  className="hover:opacity-70"
                >
                  <ChevronLeft size={18} />
                </button>
              ) : (
                <MessageCircle size={18} />
              )}
              <span className="font-semibold text-sm">
                {isAdmin && selectedUser ? selectedUser.name : "Chat live"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {connected ? (
                <span className="flex items-center gap-1 text-xs text-blue-100">
                  <Wifi size={12} /> conectat
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-blue-200 opacity-70">
                  <WifiOff size={12} /> reconectare…
                </span>
              )}
              <button onClick={() => setOpen(false)} className="hover:opacity-70">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Admin — user list (no conversation selected) */}
          {isAdmin && !selectedUser ? (
            <div className="flex flex-col flex-1 overflow-hidden max-h-80 min-h-[10rem]">
              {/* Search box */}
              <div className="px-3 pt-2 pb-1">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Caută utilizator…"
                  className="w-full text-sm bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1.5 outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                />
              </div>
              <div className="overflow-y-auto flex-1 p-2 space-y-0.5">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-4">
                    {search.trim() ? "Niciun rezultat." : "Niciun utilizator înregistrat."}
                  </p>
                ) : (
                  filteredUsers.map((u) => (
                    <button
                      key={u.email}
                      onClick={() => { setSelectedUser(u); setSearch(""); }}
                      aria-label={`Chat cu ${u.name}`}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                        <Users size={14} className="text-blue-600 dark:text-blue-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{u.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Conversation view (regular users always; admin after selecting a user) */
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-72 min-h-[8rem]">
              {visibleMessages.length === 0 && (
                <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-4">
                  Niciun mesaj încă. Începe conversația!
                </p>
              )}
              {visibleMessages.map((msg) => {
                const isOwn = msg.from === user?.email;
                return (
                  <div
                    key={msg._id}
                    className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                  >
                    {!isOwn && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 mb-0.5 px-1">
                        {msg.fromName}
                      </span>
                    )}
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm break-words ${
                        isOwn
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-600 px-1 mt-0.5">
                      {new Date(msg._createdAt).toLocaleTimeString("ro-RO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Input — only shown in conversation view */}
          {(!isAdmin || selectedUser) && (
            isAuthenticated ? (
              <form
                onSubmit={submit}
                className="flex items-center gap-2 p-3 border-t border-gray-200 dark:border-gray-700"
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Scrie un mesaj…"
                  className="flex-1 text-sm bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-full w-9 h-9 p-0 shrink-0"
                  disabled={!text.trim()}
                >
                  <Send size={16} />
                </Button>
              </form>
            ) : (
              <p className="px-4 py-3 text-xs text-center text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                Autentifică-te pentru a trimite mesaje.
              </p>
            )
          )}
        </div>
      )}
    </>
  );
}
