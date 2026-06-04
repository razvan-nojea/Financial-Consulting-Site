import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, extname, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handleAppointmentsRoutes } from "../routes/appointments-routes.js";
import { handleHealthRoutes } from "../routes/health-routes.js";
import { handleStatisticsRoutes } from "../routes/statistics-routes.js";
import { handleGeneratorRoutes } from "../routes/generator-routes.js";
import { handleGraphqlRoute } from "../routes/graphql-routes.js";
import { handleAuthRoutes } from "../routes/auth-routes.js";
import { handleAdminRoutes } from "../routes/admin-routes.js";
import { handleChatRoutes } from "../routes/chat-routes.js";
import { AppointmentsService, NotFoundError, ValidationError } from "../services/appointments-service.js";
import { InMemoryAppointmentsRepository } from "../repositories/in-memory-appointments-repository.js";
import { Broadcaster } from "../ws/broadcaster.js";
import { resolveSession } from "../auth/auth-middleware.js";
import { getSessionIdFromRequest } from "../auth/session-store.js";
import { logAction, getIpAddress } from "../middleware/logger.js";
import { detectMaliciousBehavior } from "../middleware/behavior-detection.js";


// Absolute path to the compiled frontend — only present after `npm run build`.
const DIST_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../dist");

const MIME_TYPES = {
  ".html":  "text/html; charset=utf-8",
  ".js":    "application/javascript; charset=utf-8",
  ".mjs":   "application/javascript; charset=utf-8",
  ".css":   "text/css; charset=utf-8",
  ".svg":   "image/svg+xml",
  ".png":   "image/png",
  ".jpg":   "image/jpeg",
  ".jpeg":  "image/jpeg",
  ".ico":   "image/x-icon",
  ".woff2": "font/woff2",
  ".woff":  "font/woff",
  ".webp":  "image/webp",
};

/**
 * Serve a file from dist/ or fall back to dist/index.html for React Router paths.
 * Returns true if the response was handled (caller should return early).
 * Returns false for API routes or when dist/ hasn't been built yet.
 */
function tryServeStatic(response, pathname) {
  // Only active in production — in dev, Vite handles the frontend.
  if (process.env.NODE_ENV !== "production") return false;
  if (!existsSync(join(DIST_DIR, "index.html"))) return false;
  if (pathname.startsWith("/api") || pathname === "/health") return false;

  const safePath = join(DIST_DIR, decodeURIComponent(pathname));
  // Guard against path traversal (e.g. /../../etc/passwd)
  if (!safePath.startsWith(DIST_DIR)) {
    response.writeHead(403, { "Content-Type": "text/plain" });
    response.end("Forbidden");
    return true;
  }

  const isFile  = existsSync(safePath) && statSync(safePath).isFile();
  const target  = isFile ? safePath : join(DIST_DIR, "index.html");
  const isAsset = isFile && pathname.startsWith("/assets/");

  response.writeHead(200, {
    "Content-Type":  MIME_TYPES[extname(target).toLowerCase()] ?? "application/octet-stream",
    // Vite hashes asset filenames — safe to cache forever. index.html must not be cached.
    "Cache-Control": isAsset ? "public, max-age=31536000, immutable" : "no-cache",
  });

  const stream = createReadStream(target);
  stream.on("error", () => { if (!response.writableEnded) response.end(); });
  stream.pipe(response);
  return true;
}

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Email, X-Session-Id, Authorization",
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return null;
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  if (!rawBody) {
    return null;
  }

  return JSON.parse(rawBody);
}

async function resolveRoute(context) {
  // Friendly root response so opening localhost:3001 in the browser shows
  // something helpful instead of a bare 404.
  if (context.request.method === "GET" && context.pathname === "/") {
    return {
      statusCode: 200,
      payload: {
        name: "Consultanță Financiară — API Server",
        status: "running",
        note: "Acesta este serverul API. Interfața web rulează la http://localhost:5173",
        endpoints: [
          "/health",
          "/api/auth/login",
          "/api/auth/signup",
          "/api/auth/me",
          "/api/appointments",
          "/api/statistics/appointments",
          "/api/generator/start",
          "/api/generator/stop",
          "/api/admin/users",
          "/api/admin/logs",
          "/api/admin/suspicious",
          "/api/chat/messages",
        ],
      },
    };
  }

  const handlers = [
    handleHealthRoutes,
    handleAuthRoutes,
    handleAdminRoutes,
    handleChatRoutes,
    handleAppointmentsRoutes,
    handleStatisticsRoutes,
    handleGeneratorRoutes,
    handleGraphqlRoute,
  ];

  for (const handler of handlers) {
    const result = await handler(context);
    if (result) {
      return result;
    }
  }

  return {
    statusCode: 404,
    payload: {
      message: "Resursa nu a fost gasita.",
    },
  };
}

export function readOwnerEmail(request) {
  const header = request.headers["x-user-email"];
  if (Array.isArray(header)) {
    return header[0] ?? "guest@local";
  }

  if (typeof header === "string" && header.trim()) {
    return header.trim().toLowerCase();
  }

  return "guest@local";
}

function normalizeError(error) {
  if (error instanceof ValidationError) {
    return {
      statusCode: error.statusCode,
      payload: {
        message: error.message,
        errors: error.errors,
      },
    };
  }

  if (error instanceof NotFoundError) {
    return {
      statusCode: error.statusCode,
      payload: {
        message: error.message,
      },
    };
  }

  if (error instanceof SyntaxError) {
    return {
      statusCode: 400,
      payload: {
        message: "Corpul cererii trebuie sa fie JSON valid.",
      },
    };
  }

  return {
    statusCode: 500,
    payload: {
      message: "A aparut o eroare interna pe server.",
    },
  };
}

/** Derives a loggable action label from the method + pathname. */
export function resolveActionLabel(method, pathname) {
  if (pathname.match(/^\/api\/appointments\/[^/]+$/) && method === "PUT")
    return "appointment:update";
  if (pathname.match(/^\/api\/appointments\/[^/]+$/) && method === "DELETE")
    return "appointment:delete";
  if (pathname.match(/^\/api\/appointments\/[^/]+$/) && method === "GET")
    return "appointment:view";
  if (pathname === "/api/appointments" && method === "GET") return "appointment:list";
  if (pathname === "/api/appointments" && method === "POST") return "appointment:create";
  if (pathname === "/api/statistics/appointments") return "statistics:view";
  if (pathname === "/api/generator/start") return "generator:start";
  if (pathname === "/api/generator/stop") return "generator:stop";
  if (pathname === "/api/admin/users" && method === "GET") return "admin:users_view";
  if (pathname.startsWith("/api/admin/logs") && method === "GET") return "admin:logs_view";
  if (pathname === "/api/admin/suspicious" && method === "GET") return "admin:suspicious_view";
  if (pathname.match(/^\/api\/admin\/suspicious\/[^/]+\/resolve$/) && method === "PATCH")
    return "admin:resolve_suspicious";
  return null;
}

export function createApp(options = {}) {
  const service =
    options.service ??
    new AppointmentsService(options.repository ?? new InMemoryAppointmentsRepository(), {
      now: options.now,
      createId: options.createId,
    });

  const broadcaster = options.broadcaster ?? new Broadcaster();

  // Optional repositories (present when DATABASE_URL is set)
  const usersRepository = options.usersRepository ?? null;
  const logsRepository = options.logsRepository ?? null;
  const suspiciousUsersRepository = options.suspiciousUsersRepository ?? null;
  const chatStore = options.chatStore ?? null;

  // Register chat WebSocket handler
  if (chatStore) {
    broadcaster.onMessage(async (msg, _ws, bc) => {
      if (msg?.type === "chat:send") {
        const text = (msg.text ?? "").trim();
        if (!text) return;
        const from = msg.from ?? "anonymous";
        const fromName = msg.fromName ?? from;
        const to = msg.to ?? null;
        const message = await chatStore.insert({ from, fromName, text, to });
        bc.broadcast({ type: "chat:message", data: message });
      }
    });
  }

  const server = createServer(async (request, response) => {
    if (request.method === "OPTIONS") {
      writeJson(response, 204, {});
      return;
    }

    try {
      const url = new URL(request.url, "http://localhost");

      // Serve the compiled React app for non-API paths (production build).
      // In dev there is no dist/, so this is a no-op and Vite handles the frontend.
      if (tryServeStatic(response, url.pathname)) return;

      const body =
        request.method === "POST" || request.method === "PUT" || request.method === "PATCH"
          ? await readJsonBody(request)
          : null;

      const context = {
        request,
        response,
        pathname: url.pathname,
        searchParams: url.searchParams,
        body,
        ownerEmail: readOwnerEmail(request),
        service,
        broadcaster,
        usersRepository,
        logsRepository,
        suspiciousUsersRepository,
        chatStore,
      };

      const result = await resolveRoute(context);

      // ── Audit logging ───────────────────────────────────────────────────
      const session = resolveSession(request);
      const action = resolveActionLabel(request.method, url.pathname);
      if (session && action && logsRepository) {
        const sessionId = getSessionIdFromRequest(request);
        await logAction(logsRepository, session, action, {}, getIpAddress(request), sessionId);
        await detectMaliciousBehavior(
          logsRepository, suspiciousUsersRepository, session, action, broadcaster
        );
      }

      writeJson(response, result.statusCode, result.payload);
    } catch (error) {
      const failure = normalizeError(error);
      writeJson(response, failure.statusCode, failure.payload);
    }
  });

  return {
    service,
    broadcaster,
    server,
    async listen(port = 3001) {
      await new Promise((resolve) => {
        server.listen(port, resolve);
      });
      broadcaster.attach(server);

      return server.address();
    },
    async close() {
      if (!server.listening) {
        return;
      }

      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
  };
}
