/**
 * Authentication routes
 *   POST /api/auth/signup           — register a new user account
 *   POST /api/auth/login            — obtain access + refresh tokens
 *   POST /api/auth/logout           — invalidate the current session
 *   GET  /api/auth/me               — return the currently authenticated user
 *   POST /api/auth/refresh          — exchange a refresh token for a new access token
 *   POST /api/auth/forgot-password  — request a password-reset token
 *   POST /api/auth/reset-password   — consume the token and set a new password
 */
import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "../auth/password.js";
import {
  createSession,
  destroySession,
  getSessionFromRequest,
} from "../auth/session-store.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../auth/jwt.js";
import { resolveSession } from "../auth/auth-middleware.js";
import { getSessionIdFromRequest } from "../auth/session-store.js";
import { logAction, getIpAddress } from "../middleware/logger.js";
import { detectMaliciousBehavior } from "../middleware/behavior-detection.js";

// ── In-memory password-reset token store ──────────────────────────────────────
// Maps resetToken → { userId, email, expiresAt }.
// A real implementation would persist these in the database.
const _resetTokens = new Map();
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** @param {string} token */
function consumeResetToken(token) {
  const entry = _resetTokens.get(token);
  if (!entry) return null;
  _resetTokens.delete(token);
  if (entry.expiresAt < Date.now()) return null;
  return entry;
}

/** Clears all reset tokens — exposed for use in tests only. */
export function _clearResetTokens() {
  _resetTokens.clear();
}

export async function handleAuthRoutes(context) {
  const { request, pathname, body } = context;
  const { usersRepository, logsRepository, suspiciousUsersRepository } = context;

  if (!pathname.startsWith("/api/auth")) return null;

  // ── POST /api/auth/signup ───────────────────────────────────────────────
  if (pathname === "/api/auth/signup" && request.method === "POST") {
    const { name, email, password } = body ?? {};

    if (!name || !email || !password) {
      return {
        statusCode: 400,
        payload: { message: "Numele, emailul și parola sunt obligatorii." },
      };
    }
    if (password.length < 8) {
      return {
        statusCode: 400,
        payload: { message: "Parola trebuie să aibă cel puțin 8 caractere." },
      };
    }

    if (usersRepository) {
      const existing = await usersRepository.findByEmail(email);
      if (existing) {
        return {
          statusCode: 409,
          payload: { message: "Există deja un cont cu acest email." },
        };
      }

      const userRole = await usersRepository.getRoleByName("user");
      if (!userRole) {
        return {
          statusCode: 500,
          payload: { message: "Configurare server incompletă (lipsă rol user)." },
        };
      }

      const passwordHash = await hashPassword(password);
      const user = await usersRepository.create({
        id: randomUUID(),
        email,
        passwordHash,
        name,
        roleId: userRole.id,
      });

      // Issue JWT tokens
      const accessToken  = signAccessToken(user);
      const refreshToken = signRefreshToken(user);

      // Also maintain a legacy session for backward compat
      const sessionId = createSession(user);

      if (logsRepository) {
        await logAction(logsRepository, { userId: user.id, email: user.email, role: user.role }, "auth:signup", { email, name });
      }

      return {
        statusCode: 201,
        payload: {
          accessToken,
          refreshToken,
          sessionId,
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
        },
      };
    }

    // No DB — best-effort in-memory response (dev without PostgreSQL)
    const fakeUser = { id: randomUUID(), email, name, role: "user" };
    return {
      statusCode: 201,
      payload: {
        accessToken:  signAccessToken(fakeUser),
        refreshToken: signRefreshToken(fakeUser),
        sessionId:    randomUUID(),
        user:         fakeUser,
      },
    };
  }

  // ── POST /api/auth/login ────────────────────────────────────────────────
  if (pathname === "/api/auth/login" && request.method === "POST") {
    const { email, password } = body ?? {};

    if (!email || !password) {
      return {
        statusCode: 400,
        payload: { message: "Email și parola sunt obligatorii." },
      };
    }

    if (!usersRepository) {
      // Dev mode without DB — always succeed for demo accounts
      const isAdmin = email.toLowerCase() === "admin@exemplu.ro";
      const fakeUser = {
        id:    "dev-user",
        email: email.toLowerCase(),
        name:  email,
        role:  isAdmin ? "admin" : "user",
      };
      const sessionId = createSession(fakeUser);
      return {
        statusCode: 200,
        payload: {
          accessToken:  signAccessToken(fakeUser),
          refreshToken: signRefreshToken(fakeUser),
          sessionId,
          user:         fakeUser,
          permissions:  [],
        },
      };
    }

    const user = await usersRepository.findByEmail(email);
    const verified = user ? await verifyPassword(password, user.passwordHash) : false;
    console.log(`[login] email=${email} found=${!!user} verified=${verified} pwLen=${password?.length}`);

    if (!verified) {
      if (logsRepository && user) {
        // Include ipAddress so the IP-based brute-force rule can fire.
        const fakeSession = {
          userId:    user.id,
          email:     user.email,
          role:      user.role,
          ipAddress: getIpAddress(request),
        };
        await logAction(logsRepository, fakeSession, "auth:login_failed", { email }, getIpAddress(request));
        await detectMaliciousBehavior(logsRepository, suspiciousUsersRepository, fakeSession, "auth:login_failed");
      }
      return {
        statusCode: 401,
        payload: { message: "Credențiale invalide." },
      };
    }

    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const sessionId    = createSession(user);
    const permissions  = await usersRepository.getPermissionsForRole(user.role);

    if (logsRepository) {
      await logAction(logsRepository, { userId: user.id, email: user.email, role: user.role }, "auth:login", { email });
    }

    return {
      statusCode: 200,
      payload: {
        accessToken,
        refreshToken,
        sessionId,
        user:        { id: user.id, email: user.email, name: user.name, role: user.role },
        permissions,
      },
    };
  }

  // ── POST /api/auth/logout ───────────────────────────────────────────────
  if (pathname === "/api/auth/logout" && request.method === "POST") {
    const sessionId = getSessionIdFromRequest(request);

    if (sessionId) {
      if (logsRepository) {
        const session = getSessionFromRequest(request);
        if (session) {
          await logAction(logsRepository, session, "auth:logout", {}, getIpAddress(request));
        }
      }
      destroySession(sessionId);
    }

    return { statusCode: 200, payload: { message: "Deconectat cu succes." } };
  }

  // ── GET /api/auth/me ────────────────────────────────────────────────────
  if (pathname === "/api/auth/me" && request.method === "GET") {
    const session = resolveSession(request);
    if (!session) {
      return { statusCode: 401, payload: { message: "Neautentificat." } };
    }

    const permissions = usersRepository
      ? await usersRepository.getPermissionsForRole(session.role)
      : [];

    return {
      statusCode: 200,
      payload: {
        user: {
          id:    session.userId,
          email: session.email,
          name:  session.name,
          role:  session.role,
        },
        permissions,
      },
    };
  }

  // ── POST /api/auth/refresh ──────────────────────────────────────────────
  if (pathname === "/api/auth/refresh" && request.method === "POST") {
    const { refreshToken } = body ?? {};

    if (!refreshToken) {
      return { statusCode: 400, payload: { message: "refreshToken este obligatoriu." } };
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return { statusCode: 401, payload: { message: "Refresh token invalid sau expirat." } };
    }

    // Fetch fresh user data from DB (role may have changed since the token was issued)
    if (!usersRepository) {
      // Dev / no-DB mode: we cannot look up the user, so refresh is unavailable.
      return { statusCode: 503, payload: { message: "Refresh token requires a database." } };
    }

    const user = await usersRepository.findById(payload.userId);
    if (!user) {
      return { statusCode: 401, payload: { message: "Utilizatorul nu mai există." } };
    }

    const newAccessToken  = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    return {
      statusCode: 200,
      payload: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    };
  }

  // ── POST /api/auth/forgot-password ─────────────────────────────────────
  if (pathname === "/api/auth/forgot-password" && request.method === "POST") {
    const { email } = body ?? {};

    if (!email) {
      return { statusCode: 400, payload: { message: "Emailul este obligatoriu." } };
    }

    // Always return 200 so attackers cannot enumerate existing accounts.
    if (usersRepository) {
      const user = await usersRepository.findByEmail(email);
      if (user) {
        const resetToken = randomUUID();
        _resetTokens.set(resetToken, {
          userId:    user.id,
          email:     user.email,
          expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
        });

        // In production, send this token via email.
        // For the assignment we expose it directly in the response body.
        console.log(`[forgot-password] Reset token for ${email}: ${resetToken}`);

        return {
          statusCode: 200,
          payload: {
            message: "Dacă emailul există, vei primi un link de resetare.",
            // Returned only for the assignment demo — remove in production!
            resetToken,
          },
        };
      }
    }

    return {
      statusCode: 200,
      payload: { message: "Dacă emailul există, vei primi un link de resetare." },
    };
  }

  // ── POST /api/auth/reset-password ──────────────────────────────────────
  if (pathname === "/api/auth/reset-password" && request.method === "POST") {
    const { resetToken, newPassword } = body ?? {};

    if (!resetToken || !newPassword) {
      return {
        statusCode: 400,
        payload: { message: "resetToken și newPassword sunt obligatorii." },
      };
    }

    if (newPassword.length < 8) {
      return {
        statusCode: 400,
        payload: { message: "Parola trebuie să aibă cel puțin 8 caractere." },
      };
    }

    const entry = consumeResetToken(resetToken);
    if (!entry) {
      return { statusCode: 400, payload: { message: "Token invalid sau expirat." } };
    }

    if (usersRepository) {
      const passwordHash = await hashPassword(newPassword);
      await usersRepository.updatePassword(entry.userId, passwordHash);
    }

    return {
      statusCode: 200,
      payload: {
        message: "Parola a fost resetată cu succes.",
        email: entry.email,   // let the client sync its local store
      },
    };
  }

  // ── POST /api/auth/change-password ─────────────────────────────────────
  if (pathname === "/api/auth/change-password" && request.method === "POST") {
    const session = resolveSession(request);
    if (!session) {
      return { statusCode: 401, payload: { message: "Neautentificat." } };
    }

    const { currentPassword, newPassword } = body ?? {};
    if (!currentPassword || !newPassword) {
      return {
        statusCode: 400,
        payload: { message: "currentPassword și newPassword sunt obligatorii." },
      };
    }

    if (newPassword.length < 8) {
      return {
        statusCode: 400,
        payload: { message: "Parola nouă trebuie să aibă cel puțin 8 caractere." },
      };
    }

    if (!usersRepository) {
      return { statusCode: 503, payload: { message: "Serviciu indisponibil." } };
    }

    const user = await usersRepository.findById(session.userId);
    if (!user) {
      return { statusCode: 404, payload: { message: "Utilizatorul nu a fost găsit." } };
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return { statusCode: 400, payload: { message: "Parola curentă este incorectă." } };
    }

    const newHash = await hashPassword(newPassword);
    await usersRepository.updatePassword(session.userId, newHash);

    return { statusCode: 200, payload: { message: "Parola a fost schimbată cu succes." } };
  }

  return null;
}
