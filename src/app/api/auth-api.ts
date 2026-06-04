/**
 * Auth API client — talks to the backend authentication routes.
 *
 * Token strategy:
 *   • Login/signup → backend returns accessToken (15 min) + refreshToken (7 d)
 *   • Tokens are stored in sessionStorage so each tab is independent
 *   • Every authenticated request sends:  Authorization: Bearer <accessToken>
 *   • On 401 the client automatically tries POST /api/auth/refresh
 *   • Legacy X-Session-Id header is kept alongside for backward compat
 */

import { API_BASE } from "../lib/api-base";

export const SESSION_STORAGE_KEY   = "sessionId";
export const SESSION_ROLE_KEY      = "sessionRole";
export const ACCESS_TOKEN_KEY      = "accessToken";
export const REFRESH_TOKEN_KEY     = "refreshToken";

export interface BackendUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
}

export interface LoginResponse {
  accessToken:  string;
  refreshToken: string;
  sessionId:    string;   // legacy — kept for backward compat
  user:         BackendUser;
  permissions:  string[];
}

export interface SignupResponse {
  accessToken:  string;
  refreshToken: string;
  sessionId:    string;
  user:         BackendUser;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function getAccessToken(): string | null  { return sessionStorage.getItem(ACCESS_TOKEN_KEY);  }
function getRefreshToken(): string | null { return sessionStorage.getItem(REFRESH_TOKEN_KEY); }

function storeTokens(resp: { accessToken?: string; refreshToken?: string; sessionId?: string; user?: BackendUser }) {
  if (resp.accessToken)  sessionStorage.setItem(ACCESS_TOKEN_KEY,   resp.accessToken);
  if (resp.refreshToken) sessionStorage.setItem(REFRESH_TOKEN_KEY,  resp.refreshToken);
  if (resp.sessionId)    sessionStorage.setItem(SESSION_STORAGE_KEY, resp.sessionId);
  // Always store a role: use the value from the server or default to "user"
  if (resp.user)         sessionStorage.setItem(SESSION_ROLE_KEY,   resp.user.role ?? "user");
}

/** Builds auth headers from the current sessionStorage tokens. */
function makeHeaders(init?: RequestInit): Record<string, string> {
  const sessionId   = sessionStorage.getItem(SESSION_STORAGE_KEY);
  const accessToken = getAccessToken();
  return {
    ...(init?.body    ? { "Content-Type": "application/json" }      : {}),
    ...(accessToken   ? { "Authorization": `Bearer ${accessToken}` } : {}),
    ...(sessionId     ? { "X-Session-Id": sessionId }                : {}),
    ...(init?.headers as Record<string, string> ?? {}),
  };
}

/** Parse a fetch response as JSON, returning {} on empty body. */
async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

/** Try to get a fresh access token using the stored refresh token. */
async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json() as { accessToken?: string; refreshToken?: string };
    if (data.accessToken) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      if (data.refreshToken) sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Authenticated fetch with automatic token refresh on 401.
 * Sends both Bearer JWT (primary) and X-Session-Id (legacy fallback).
 */
async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: makeHeaders(init),
  });

  // Auto-refresh on 401
  if (response.status === 401 && path !== "/api/auth/refresh") {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const retried = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: makeHeaders(init),
      });
      return parseResponse<T>(retried);
    }
  }

  return parseResponse<T>(response);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function loginToServer(email: string, password: string): Promise<LoginResponse | null> {
  try {
    const result = await authRequest<LoginResponse>("/api/auth/login", {
      method: "POST",
      body:   JSON.stringify({ email, password }),
    });
    // Store whatever tokens the server returned (accessToken + refreshToken for
    // new JWT flow, or just sessionId for legacy / test mocks).
    if (result.accessToken || result.sessionId) storeTokens(result);
    return result;
  } catch {
    return null;
  }
}

export async function signupOnServer(
  name: string,
  email: string,
  password: string
): Promise<SignupResponse | null> {
  try {
    const result = await authRequest<SignupResponse>("/api/auth/signup", {
      method: "POST",
      body:   JSON.stringify({ name, email, password }),
    });
    if (result.accessToken || result.sessionId) storeTokens(result);
    return result;
  } catch {
    return null;
  }
}

export async function logoutFromServer(): Promise<void> {
  try {
    await authRequest("/api/auth/logout", { method: "POST" });
  } catch {
    // Ignore — tokens cleared locally regardless
  } finally {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_ROLE_KEY);
  }
}

export async function getMeFromServer(): Promise<{ user: BackendUser; permissions: string[] } | null> {
  try {
    return await authRequest<{ user: BackendUser; permissions: string[] }>("/api/auth/me");
  } catch {
    return null;
  }
}

export async function forgotPassword(email: string): Promise<{ message: string; resetToken?: string } | null> {
  try {
    return await authRequest<{ message: string; resetToken?: string }>("/api/auth/forgot-password", {
      method: "POST",
      body:   JSON.stringify({ email }),
    });
  } catch {
    return null;
  }
}

export async function resetPassword(
  resetToken: string,
  newPassword: string
): Promise<{ message: string; email?: string } | null> {
  try {
    return await authRequest<{ message: string; email?: string }>("/api/auth/reset-password", {
      method: "POST",
      body:   JSON.stringify({ resetToken, newPassword }),
    });
  } catch {
    return null;
  }
}

/**
 * Calls the change-password endpoint using the current session tokens.
 * The caller is responsible for ensuring a session exists before calling this
 * (e.g. by calling loginToServer when hasActiveSession() is false).
 *
 * Returns null only when the network is unreachable.
 * Returns { success, message, statusCode } otherwise — statusCode 401 means
 * no valid session was present, not a wrong-password error.
 */
export async function changePasswordOnServer(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string; statusCode: number } | null> {
  try {
    const body = JSON.stringify({ currentPassword, newPassword });
    const res  = await fetch(`${API_BASE}/api/auth/change-password`, {
      method:  "POST",
      headers: makeHeaders({ body }),
      body,
    });
    const data = await res.json() as { message?: string };
    return { success: res.ok, message: data.message ?? "", statusCode: res.status };
  } catch {
    // Network unreachable — caller falls back to local store
    return null;
  }
}

/** Returns true when at least one auth token is present in sessionStorage. */
export function hasActiveSession(): boolean {
  return !!(sessionStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY));
}

/** Returns the cached role from sessionStorage, defaulting to "user". */
export function getCachedRole(): "admin" | "user" {
  return (sessionStorage.getItem(SESSION_ROLE_KEY) as "admin" | "user") ?? "user";
}

/** Returns the stored session ID or null (legacy). */
export function getSessionId(): string | null {
  return sessionStorage.getItem(SESSION_STORAGE_KEY);
}

/**
 * Clears all auth tokens from sessionStorage immediately.
 * Call this synchronously before any fire-and-forget login to ensure the
 * previous user's tokens are never used by the incoming request.
 */
export function clearSession(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_ROLE_KEY);
}
