import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getSessionId } from "../api/auth-api";
import { useAuth } from "./auth-context";

import { API_BASE, WS_BASE } from "../lib/api-base";

export interface ChatMessage {
  _id: string;
  from: string;
  fromName: string;
  /** null / undefined = broadcast; an email address = direct message */
  to?: string | null;
  text: string;
  _createdAt: string;
}

export interface AdminAlert {
  userId: string;
  reason: string;
  score: number;
  receivedAt: string;
}

export interface WsMessage {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

interface ChatContextType {
  messages: ChatMessage[];
  connected: boolean;
  sendMessage: (text: string, to?: string) => void;
  adminAlerts: AdminAlert[];
  clearAdminAlerts: () => void;
  dismissAlert: (userId: string) => void;
  /** The most recent raw WebSocket message received (any type). */
  lastMessage: WsMessage | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const RECONNECT_DELAY_MS = 3000;
const MAX_HISTORY = 100;

export function ChatProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [adminAlerts, setAdminAlerts] = useState<AdminAlert[]>([]);
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const clearAdminAlerts = useCallback(() => setAdminAlerts([]), []);
  const dismissAlert = useCallback(
    (userId: string) => setAdminAlerts((prev) => prev.filter((a) => a.userId !== userId)),
    []
  );

  // Load recent messages from REST on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/chat/messages`)
      .then((r) => r.json())
      .then((data: { messages?: ChatMessage[] }) => {
        if (data.messages) {
          setMessages(data.messages.slice(-MAX_HISTORY));
        }
      })
      .catch(() => {/* server may be unavailable */});
  }, []);

  const connect = useCallback(() => {
    /* v8 ignore next */
    if (unmountedRef.current) return;

    const ws = new WebSocket(`${WS_BASE}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!unmountedRef.current) setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WsMessage & { data: ChatMessage & { userId?: string; reason?: string; score?: number } };
        // Always expose the raw message so consumers can react to any type.
        setLastMessage({ type: msg.type, data: msg.data });

        if (msg.type === "chat:message" && msg.data) {
          setMessages((prev) => [...prev.slice(-(MAX_HISTORY - 1)), msg.data]);
        } else if (msg.type === "admin:suspicious-flagged" && msg.data) {
          const alert: AdminAlert = {
            userId: msg.data.userId ?? "",
            reason: msg.data.reason ?? "",
            score: msg.data.score ?? 0,
            receivedAt: new Date().toISOString(),
          };
          setAdminAlerts((prev) => [...prev, alert]);
        }
      } catch {
        /* ignore malformed frames */
      }
    };

    ws.onclose = () => {
      if (unmountedRef.current) return;
      setConnected(false);
      if (!unmountedRef.current) {
        reconnectRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback(
    (text: string, to?: string) => {
      if (!isAuthenticated || !user) return;

      const trimmed = text.trim();
      if (!trimmed) return;

      // Prefer WebSocket — works for every authenticated user regardless of
      // whether loginToServer has resolved yet (no server session required).
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "chat:send",
          text: trimmed,
          from: user.email,
          fromName: user.name,
          ...(to !== undefined ? { to } : {}),
        }));
        return;
      }

      // WebSocket not yet open — fall back to REST POST (requires server session).
      const sessionId = getSessionId();
      const msgHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionId) msgHeaders["X-Session-Id"] = sessionId;
      fetch(`${API_BASE}/api/chat/messages`, {
        method: "POST",
        headers: msgHeaders,
        body: JSON.stringify({ text: trimmed, ...(to !== undefined ? { to } : {}) }),
      }).catch(() => {/* ignore */});
    },
    [isAuthenticated, user]
  );

  return (
    <ChatContext.Provider value={{ messages, connected, sendMessage, adminAlerts, clearAdminAlerts, dismissAlert, lastMessage }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within a ChatProvider");
  return ctx;
}
