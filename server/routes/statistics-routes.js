/**
 * Statistics routes
 *
 *   GET /api/statistics/appointments         — per-user appointment stats
 *   GET /api/statistics/heavy                — heavy M:M cross-table stats
 *                                              (users × services × permissions)
 *                                              results are TTL-cached for 60 s
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── TTL cache ─────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 60_000; // 60 seconds

/** @type {Map<string, { data: unknown; expiresAt: number }>} */
const cache = new Map();

/**
 * Gets a value from the cache, or calls `computeFn` to produce and store it.
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} computeFn
 * @returns {Promise<{ data: T; cached: boolean }>}
 */
async function withCache(key, computeFn) {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return { data: /** @type {T} */ (entry.data), cached: true };
  }
  const data = await computeFn();
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return { data, cached: false };
}

// ── Heavy M:M statistics ──────────────────────────────────────────────────────

/**
 * Computes cross-table M:M statistics without the cache.
 * This is deliberately "naive" — it fetches raw rows and aggregates in JS —
 * to demonstrate the performance improvement that the cache provides.
 *
 * Returns:
 *   topServices      — [{name, count}] top 10 services by appointment count
 *   userServiceMatrix — [{userEmail, serviceName, count}] (capped at 100 rows)
 *   permissionStats  — [{permission, roleCount, userCount}]
 *   totalUsers       — number
 *   totalAppointments — number
 *   computedAt       — ISO timestamp
 */
async function computeHeavyStats() {
  // 1. Fetch all appointments with their service name (M:M via serviceId)
  const appointments = await prisma.appointment.findMany({
    select: {
      ownerEmail: true,
      service:    { select: { name: true } },
    },
  });

  // 2. Count by service
  /** @type {Map<string, number>} */
  const serviceCount = new Map();
  for (const a of appointments) {
    const svc = a.service?.name ?? "Unknown";
    serviceCount.set(svc, (serviceCount.get(svc) ?? 0) + 1);
  }
  const topServices = [...serviceCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // 3. User × Service matrix (top 100 combinations)
  /** @type {Map<string, number>} */
  const matrixCount = new Map();
  for (const a of appointments) {
    const key = `${a.ownerEmail}||${a.service?.name ?? "Unknown"}`;
    matrixCount.set(key, (matrixCount.get(key) ?? 0) + 1);
  }
  const userServiceMatrix = [...matrixCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([key, count]) => {
      const [userEmail, serviceName] = key.split("||");
      return { userEmail, serviceName, count };
    });

  // 4. Permission stats — roles × permissions × users (3-way M:M)
  const roles = await prisma.role.findMany({
    include: {
      rolePermissions: { include: { permission: true } },
      userRoles:       { select: { userId: true } },
    },
  });

  const permissionStats = [];
  /** @type {Map<string, { roleCount: number; userCount: number }>} */
  const permMap = new Map();

  for (const role of roles) {
    for (const rp of role.rolePermissions) {
      const permName = rp.permission.name;
      const existing = permMap.get(permName) ?? { roleCount: 0, userCount: 0 };
      permMap.set(permName, {
        roleCount: existing.roleCount + 1,
        userCount: existing.userCount + role.userRoles.length,
      });
    }
  }
  for (const [permission, counts] of permMap.entries()) {
    permissionStats.push({ permission, ...counts });
  }
  permissionStats.sort((a, b) => b.userCount - a.userCount);

  const totalUsers        = await prisma.user.count();
  const totalAppointments = appointments.length;

  return {
    topServices,
    userServiceMatrix,
    permissionStats,
    totalUsers,
    totalAppointments,
    computedAt: new Date().toISOString(),
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function handleStatisticsRoutes(context) {
  const { request, pathname, service, ownerEmail } = context;

  // ── GET /api/statistics/appointments ───────────────────────────────────
  if (pathname === "/api/statistics/appointments") {
    if (request.method !== "GET") {
      return { statusCode: 405, payload: { message: "Metoda nu este permisa." } };
    }
    return {
      statusCode: 200,
      payload: { data: await service.getStatistics(ownerEmail) },
    };
  }

  // ── GET /api/statistics/heavy ──────────────────────────────────────────
  if (pathname === "/api/statistics/heavy") {
    if (request.method !== "GET") {
      return { statusCode: 405, payload: { message: "Metoda nu este permisa." } };
    }

    const { data, cached } = await withCache("heavy-stats", computeHeavyStats);

    return {
      statusCode: 200,
      payload: {
        cached,
        cacheTtlSeconds: CACHE_TTL_MS / 1000,
        stats: data,
      },
    };
  }

  return null;
}
