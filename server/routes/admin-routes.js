/**
 * Admin routes — accessible only by users with the "admin" role.
 *
 *   GET   /api/admin/users                    — list all users
 *   GET   /api/admin/logs                     — view the action audit trail (filterable)
 *   GET   /api/admin/logs/user/:userId        — logs for a specific user
 *   GET   /api/admin/stats                    — aggregate statistics
 *   GET   /api/admin/suspicious               — view the observation list
 *   PATCH /api/admin/suspicious/:userId/resolve — mark a user as resolved
 */
import { resolveSession } from "../auth/auth-middleware.js";

function requireAdmin(request) {
  const session = resolveSession(request);
  if (!session) {
    return { statusCode: 401, payload: { message: "Neautentificat." } };
  }
  if (session.role !== "admin") {
    return { statusCode: 403, payload: { message: "Acces interzis. Necesită rol admin." } };
  }
  return null;
}

export async function handleAdminRoutes(context) {
  const { request, pathname, searchParams } = context;
  const { usersRepository, logsRepository, suspiciousUsersRepository } = context;

  if (!pathname.startsWith("/api/admin")) return null;

  // Require admin session for all admin routes.
  const authError = requireAdmin(request);
  if (authError) return authError;

  // ── GET /api/admin/users ────────────────────────────────────────────────
  if (pathname === "/api/admin/users" && request.method === "GET") {
    if (!usersRepository) {
      return { statusCode: 200, payload: { users: [] } };
    }
    const users = await usersRepository.findAll();
    return {
      statusCode: 200,
      payload: {
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          createdAt: u.createdAt,
        })),
      },
    };
  }

  // ── GET /api/admin/logs/user/:userId ────────────────────────────────────
  const userLogsMatch = pathname.match(/^\/api\/admin\/logs\/user\/([^/]+)$/);
  if (userLogsMatch && request.method === "GET") {
    if (!logsRepository) {
      return { statusCode: 200, payload: { logs: [] } };
    }
    const userId = userLogsMatch[1];
    const limitParam = searchParams?.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 200;
    const logs = await logsRepository.findByUserId(userId, { limit });
    return { statusCode: 200, payload: { logs } };
  }

  // ── GET /api/admin/logs ─────────────────────────────────────────────────
  if (pathname === "/api/admin/logs" && request.method === "GET") {
    if (!logsRepository) {
      return { statusCode: 200, payload: { logs: [] } };
    }

    // Support optional query-string filters: userId, action, from, to, limit, offset
    const userId = searchParams?.get("userId") || undefined;
    const action = searchParams?.get("action") || undefined;
    const startDate = searchParams?.get("from") || undefined;
    const endDate = searchParams?.get("to") || undefined;
    const limitParam = searchParams?.get("limit");
    const offsetParam = searchParams?.get("offset");
    const limit = limitParam ? parseInt(limitParam, 10) : 200;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    const logs = await logsRepository.findAllFiltered({ userId, action, startDate, endDate, limit, offset });
    return { statusCode: 200, payload: { logs } };
  }

  // ── GET /api/admin/stats ────────────────────────────────────────────────
  if (pathname === "/api/admin/stats" && request.method === "GET") {
    const stats = { totalLogs: 0, recentLogs: 0, activeSuspicious: 0, totalUsers: 0 };

    if (logsRepository) {
      const logStats = await logsRepository.getStats();
      stats.totalLogs = logStats.total;
      stats.recentLogs = logStats.recentCount;
    }
    if (suspiciousUsersRepository) {
      const rows = await suspiciousUsersRepository.findAll();
      stats.activeSuspicious = rows.filter((r) => !r.resolvedAt).length;
    }
    if (usersRepository) {
      const users = await usersRepository.findAll();
      stats.totalUsers = users.length;
    }

    return { statusCode: 200, payload: { stats } };
  }

  // ── GET /api/admin/suspicious ───────────────────────────────────────────
  if (pathname === "/api/admin/suspicious" && request.method === "GET") {
    if (!suspiciousUsersRepository) {
      return { statusCode: 200, payload: { suspicious: [] } };
    }
    const rows = await suspiciousUsersRepository.findAll();
    const userRole = (u) => u.userRoles?.[0]?.role?.name ?? "user";
    return {
      statusCode: 200,
      payload: {
        suspicious: rows.map((s) => ({
          userId: s.userId,
          email: s.user.email,
          name: s.user.name,
          role: userRole(s.user),
          // Nested user object used by the frontend components
          user: { email: s.user.email, name: s.user.name },
          reason: s.reason,
          score: s.score,
          triggeredRules: Array.isArray(s.triggeredRules) ? s.triggeredRules : [],
          aiAnalysis: s.aiAnalysis ?? null,
          detectedAt: s.detectedAt,
          resolvedAt: s.resolvedAt,
        })),
      },
    };
  }

  // ── PATCH /api/admin/suspicious/:userId/resolve ─────────────────────────
  const resolveMatch = pathname.match(/^\/api\/admin\/suspicious\/([^/]+)\/resolve$/);
  if (resolveMatch && request.method === "PATCH") {
    if (!suspiciousUsersRepository) {
      return { statusCode: 404, payload: { message: "Utilizatorul nu este în lista de observație." } };
    }
    const userId = resolveMatch[1];
    const result = await suspiciousUsersRepository.resolve(userId);
    if (!result) {
      return {
        statusCode: 404,
        payload: { message: "Utilizatorul nu este în lista de observație." },
      };
    }
    return { statusCode: 200, payload: { message: "Utilizatorul a fost scos din lista de observație." } };
  }

  return { statusCode: 404, payload: { message: "Resursa admin nu a fost găsită." } };
}
