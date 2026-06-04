import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/auth-context";
import { getSessionId } from "../api/auth-api";
import { useChat } from "../contexts/chat-context";

/**
 * Returns the current session ID, recomputed on every render.
 * Callers should place this in a useEffect dependency array so the
 * effect re-runs as soon as loginToServer stores the session.
 */
function useSessionId() {
  const { user } = useAuth();
  // Recompute getSessionId() whenever user changes (loginToServer resolves)
  return user ? getSessionId() : null;
}
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface LogEntry {
  id: string;
  userEmail: string;
  groupId: string;
  action: string;
  ipAddress: string;
  timestamp: string;
}

interface AiAnalysis {
  suspicious:  boolean;
  confidence:  number;
  reason:      string;
  model:       string;
  analyzedAt:  string;
}

interface SuspiciousUser {
  userId: string;
  reason: string;
  score: number;
  triggeredRules?: string[];
  aiAnalysis?: AiAnalysis | null;
  detectedAt: string;
  resolvedAt: string | null;
  user?: { email: string; name: string };
}

interface AdminStats {
  totalLogs: number;
  recentLogs: number;
  activeSuspicious: number;
  totalUsers: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function adminHeaders(): Record<string, string> {
  const sessionId = getSessionId();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (sessionId) headers["X-Session-Id"] = sessionId;
  return headers;
}

import { API_BASE as API } from "../lib/api-base";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { ...init, headers: { ...adminHeaders(), ...init?.headers } });
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

// ── Sub-components ──────────────────────────────────────────────────────────

export function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionId = useSessionId();

  useEffect(() => {
    setLoading(true);
    apiFetch<{ users: AdminUser[] }>("/api/admin/users").then((data) => {
      setUsers(data?.users ?? []);
      setLoading(false);
    });
  }, [sessionId]);

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Se încarcă utilizatorii…</p>;
  }

  if (users.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Nu există utilizatori înregistrați.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
            <th className="pb-2 font-semibold text-gray-600 dark:text-gray-400">Nume</th>
            <th className="pb-2 font-semibold text-gray-600 dark:text-gray-400">Email</th>
            <th className="pb-2 font-semibold text-gray-600 dark:text-gray-400">Rol</th>
            <th className="pb-2 font-semibold text-gray-600 dark:text-gray-400">Creat la</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <td className="py-2 pr-4 text-gray-900 dark:text-gray-100">{u.name}</td>
              <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{u.email}</td>
              <td className="py-2 pr-4">
                <Badge variant={u.role === "admin" ? "destructive" : "secondary"}>{u.role}</Badge>
              </td>
              <td className="py-2 text-gray-500 dark:text-gray-500">
                {new Date(u.createdAt).toLocaleDateString("ro-RO")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LogsTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const sessionId = useSessionId();

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterUser.trim()) params.set("userId", filterUser.trim());
    if (filterAction.trim()) params.set("action", filterAction.trim());
    const query = params.toString() ? `?${params.toString()}` : "";
    apiFetch<{ logs: LogEntry[] }>(`/api/admin/logs${query}`).then((data) => {
      setLogs(data?.logs ?? []);
      setLoading(false);
    });
  }, [sessionId, filterUser, filterAction]);

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Se încarcă jurnalul…</p>;
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Filtrare după user ID…"
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Filtrare după acțiune…"
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {(filterUser || filterAction) && (
          <Button size="sm" variant="ghost" onClick={() => { setFilterUser(""); setFilterAction(""); }}>
            Resetează filtre
          </Button>
        )}
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nu există intrări în jurnal.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                <th className="pb-2 font-semibold text-gray-600 dark:text-gray-400">Utilizator</th>
                <th className="pb-2 font-semibold text-gray-600 dark:text-gray-400">Grup</th>
                <th className="pb-2 font-semibold text-gray-600 dark:text-gray-400">Acțiune</th>
                <th className="pb-2 font-semibold text-gray-600 dark:text-gray-400">IP</th>
                <th className="pb-2 font-semibold text-gray-600 dark:text-gray-400">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{log.userEmail}</td>
                  <td className="py-2 pr-4">
                    <Badge variant={log.groupId === "ADMIN" ? "destructive" : "secondary"}>{log.groupId}</Badge>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-gray-900 dark:text-gray-100">{log.action}</td>
                  <td className="py-2 pr-4 text-gray-500 dark:text-gray-500">{log.ipAddress || "—"}</td>
                  <td className="py-2 text-gray-500 dark:text-gray-500 text-xs">
                    {new Date(log.timestamp).toLocaleString("ro-RO")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SuspiciousTab() {
  const [suspicious, setSuspicious] = useState<SuspiciousUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const sessionId = useSessionId();
  const { dismissAlert, lastMessage } = useChat();

  // Initial load
  useEffect(() => {
    setLoading(true);
    apiFetch<{ suspicious: SuspiciousUser[] }>("/api/admin/suspicious").then((data) => {
      setSuspicious(data?.suspicious ?? []);
      setLoading(false);
    });
  }, [sessionId, reloadTrigger]);

  // Real-time: new flagging OR AI analysis arriving via WebSocket
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === "admin:suspicious-flagged") {
      // A new user was flagged — reload the list
      setReloadTrigger((t) => t + 1);
    }

    if (lastMessage.type === "admin:ai-analysis") {
      const { userId, analysis } = lastMessage.data ?? {};
      if (!userId || !analysis) return;
      // Patch just the aiAnalysis field of the matching entry in-place
      setSuspicious((prev) =>
        prev.map((s) => (s.userId === userId ? { ...s, aiAnalysis: analysis } : s))
      );
    }
  }, [lastMessage]);

  const resolve = async (userId: string) => {
    setResolving(userId);
    await apiFetch(`/api/admin/suspicious/${userId}/resolve`, { method: "PATCH" });
    setResolving(null);
    dismissAlert(userId);
    setReloadTrigger((t) => t + 1);
  };

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Se încarcă lista de supraveghere…</p>;
  }

  if (suspicious.length === 0) {
    return (
      <p className="text-sm text-green-600 dark:text-green-400">
        Nu există utilizatori suspicioși în acest moment.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {suspicious.map((s) => (
        <div
          key={s.userId}
          className="flex items-start justify-between p-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20"
        >
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {s.user?.name ?? s.userId}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{s.user?.email}</span>
              {s.resolvedAt && (
                <Badge variant="secondary" className="text-xs">Rezolvat</Badge>
              )}
            </div>

            {/* Rule-based reason */}
            <p className="text-sm text-gray-700 dark:text-gray-300">{s.reason}</p>

            {/* Risk score progress bar */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Scor risc:</span>
              <div className="flex-1 max-w-[120px] bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    s.score >= 75 ? "bg-red-600" : s.score >= 50 ? "bg-orange-500" : "bg-yellow-400"
                  }`}
                  style={{ width: `${s.score}%` }}
                />
              </div>
              <strong className="text-xs text-red-600 dark:text-red-400">{s.score}/100</strong>
            </div>

            {/* AI analysis block — shown when Ollama has responded */}
            {s.aiAnalysis ? (
              <div className="mt-2 rounded-md border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 px-3 py-2 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                    🤖 Analiză AI ({s.aiAnalysis.model})
                  </span>
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                      s.aiAnalysis.suspicious
                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    }`}
                  >
                    {s.aiAnalysis.suspicious ? "Suspect" : "Benign"} —{" "}
                    {Math.round(s.aiAnalysis.confidence * 100)}% încredere
                  </span>
                </div>
                <p className="text-xs text-purple-800 dark:text-purple-200 leading-relaxed">
                  {s.aiAnalysis.reason}
                </p>
                <p className="text-[10px] text-purple-400 dark:text-purple-500">
                  Analizat la {new Date(s.aiAnalysis.analyzedAt).toLocaleString("ro-RO")}
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">
                ⏳ Analiză AI în curs… (necesită Ollama activ)
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap mt-1">
              <span>Detectat: {new Date(s.detectedAt).toLocaleString("ro-RO")}</span>
              {s.resolvedAt && (
                <span>Rezolvat: {new Date(s.resolvedAt).toLocaleString("ro-RO")}</span>
              )}
              {s.triggeredRules && s.triggeredRules.length > 0 && (
                <span>Reguli: {s.triggeredRules.join(", ")}</span>
              )}
            </div>
          </div>

          {!s.resolvedAt && (
            <Button
              size="sm"
              variant="outline"
              className="ml-4 shrink-0"
              disabled={resolving === s.userId}
              onClick={() => resolve(s.userId)}
            >
              {resolving === s.userId ? "Se procesează…" : "Marchează rezolvat"}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Stats card ─────────────────────────────────────────────────────────────────

function StatsCard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const sessionId = useSessionId();

  useEffect(() => {
    apiFetch<{ stats: AdminStats }>("/api/admin/stats").then((data) => {
      if (data?.stats) setStats(data.stats);
    });
  }, [sessionId]);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Total loguri", value: stats.totalLogs, color: "text-blue-600 dark:text-blue-400" },
        { label: "Loguri 24h", value: stats.recentLogs, color: "text-green-600 dark:text-green-400" },
        { label: "Suspicioși activi", value: stats.activeSuspicious, color: "text-red-600 dark:text-red-400" },
        { label: "Utilizatori", value: stats.totalUsers, color: "text-purple-600 dark:text-purple-400" },
      ].map(({ label, value, color }) => (
        <div key={label} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-center">
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function AdminPage() {
  const { user } = useAuth();
  const { adminAlerts, clearAdminAlerts } = useChat();
  const uniqueSuspiciousCount = new Set(adminAlerts.map((a) => a.userId)).size;

  if (user?.role !== "admin") {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 dark:text-red-400 font-semibold">
          Acces interzis — pagina este disponibilă doar administratorilor.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Panou Administrare</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestionare utilizatori, jurnale de activitate și utilizatori suspicioși.
          </p>
        </div>

        {/* Real-time alert badge */}
        {uniqueSuspiciousCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
              {uniqueSuspiciousCount}
            </span>
            <span className="text-sm text-red-700 dark:text-red-300 font-medium">
              {uniqueSuspiciousCount === 1
                ? "utilizator nou marcat ca suspect"
                : "utilizatori noi marcați ca suspecți"}
            </span>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-red-600 dark:text-red-400" onClick={clearAdminAlerts}>
              Șterge
            </Button>
          </div>
        )}
      </div>

      {/* Stats overview */}
      <StatsCard />

      <Card>
        <CardHeader>
          <CardTitle>Monitorizare sistem</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users">
            <TabsList className="mb-4">
              <TabsTrigger value="users">Utilizatori</TabsTrigger>
              <TabsTrigger value="logs">Jurnal acțiuni</TabsTrigger>
              <TabsTrigger value="suspicious">
                Supraveghere
                {uniqueSuspiciousCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-600 rounded-full">
                    {uniqueSuspiciousCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <UsersTab />
            </TabsContent>

            <TabsContent value="logs">
              <LogsTab />
            </TabsContent>

            <TabsContent value="suspicious">
              <SuspiciousTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
