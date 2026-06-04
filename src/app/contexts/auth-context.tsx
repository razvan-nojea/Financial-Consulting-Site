import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  loginToServer,
  signupOnServer,
  logoutFromServer,
  clearSession,
  forgotPassword,
  resetPassword,
  changePasswordOnServer,
  hasActiveSession,
} from "../api/auth-api";

export interface User {
  name: string;
  email: string;
  phone: string;
  bio: string;
  appointmentCount: number;
  totalSalary: number;
  investmentGoal: number;
  /** Role assigned by the backend. Defaults to "user" until backend confirms. */
  role: "admin" | "user";
}

interface StoredAccount extends User {
  password: string;
}

interface AuthResult {
  success: boolean;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => AuthResult;
  signup: (name: string, email: string, password: string) => AuthResult;
  logout: () => void;
  updateUser: (user: User) => void;
  changePassword: (currentPassword: string, nextPassword: string) => Promise<AuthResult>;
  forgotPassword: (email: string) => Promise<{ message: string; resetToken?: string } | null>;
  resetPassword: (token: string, newPassword: string) => Promise<{ message: string } | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const USER_STORAGE_KEY = "user";
export const ACCOUNTS_STORAGE_KEY = "accounts";

const DEFAULT_USER_VALUES = {
  phone: "",
  bio: "",
  appointmentCount: 0,
  totalSalary: 0,
  investmentGoal: 0,
  role: "user" as const,
} as const;

const DEFAULT_ACCOUNTS: StoredAccount[] = [
  {
    name: "Cont Demo",
    email: "demo@exemplu.ro",
    password: "demo123",
    ...DEFAULT_USER_VALUES,
  },
  {
    name: "Administrator",
    email: "admin@exemplu.ro",
    password: "admin123",
    ...DEFAULT_USER_VALUES,
    role: "admin" as const,
  },
];

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sanitizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function sanitizeName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value : "";
}

/** Extract the User fields shared by StoredAccount without copying password. */
function toUser({ password: _password, ...rest }: StoredAccount): User {
  return rest;
}

function sanitizeStoredAccount(value: unknown): StoredAccount | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<StoredAccount>;
  const name     = sanitizeName(candidate.name);
  const email    = sanitizeText(candidate.email).trim();
  const password = sanitizeText(candidate.password);

  if (!name || !email || !password) return null;

  return {
    name,
    email,
    password,
    phone:            sanitizeText(candidate.phone),
    bio:              sanitizeText(candidate.bio),
    appointmentCount: sanitizeNumber(candidate.appointmentCount),
    totalSalary:      sanitizeNumber(candidate.totalSalary),
    investmentGoal:   sanitizeNumber(candidate.investmentGoal),
    role:             candidate.role === "admin" ? "admin" : "user",
  };
}

function sanitizeUser(value: unknown): User | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<User>;
  const name  = sanitizeName(candidate.name);
  const email = sanitizeText(candidate.email).trim();

  if (!name || !email) return null;

  return {
    name,
    email,
    phone:            sanitizeText(candidate.phone),
    bio:              sanitizeText(candidate.bio),
    appointmentCount: sanitizeNumber(candidate.appointmentCount),
    totalSalary:      sanitizeNumber(candidate.totalSalary),
    investmentGoal:   sanitizeNumber(candidate.investmentGoal),
    role:             candidate.role === "admin" ? "admin" : "user",
  };
}

function readStoredUser() {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return sanitizeUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeStoredUser(user: User | null) {
  if (!user) {
    localStorage.removeItem(USER_STORAGE_KEY);
    return;
  }
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function readStoredAccounts(): StoredAccount[] {
  const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((account) => sanitizeStoredAccount(account))
      .filter((account): account is StoredAccount => account !== null);
  } catch {
    return [];
  }
}

function writeStoredAccounts(accounts: StoredAccount[]) {
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

function ensureLocalAccounts() {
  const existingAccounts = readStoredAccounts();
  const merged = [...existingAccounts];

  // Always ensure every default account (demo, admin) exists in storage.
  // This handles the case where localStorage was seeded before an account
  // was added to DEFAULT_ACCOUNTS (e.g. admin added after initial release).
  for (const def of DEFAULT_ACCOUNTS) {
    const alreadyPresent = merged.some(
      (a) => normalizeEmail(a.email) === normalizeEmail(def.email)
    );
    if (!alreadyPresent) {
      merged.push(def);
    }
  }

  writeStoredAccounts(merged);
  return merged;
}

/** Auto-logout after this many milliseconds of inactivity. */
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userRef = useRef<User | null>(null);

  // Keep userRef in sync so the inactivity handler can read the latest value
  // without capturing a stale closure.
  userRef.current = user;

  useEffect(() => {
    // Always start unauthenticated on page load / refresh.
    // Users must log in each visit, which re-establishes a fresh backend session
    // and ensures the admin log captures activity from the correct account.
    ensureLocalAccounts();   // seed localStorage with demo/admin accounts if absent
    writeStoredUser(null);   // clear any previously stored session user
    clearSession();          // clear sessionStorage tokens
    setUser(null);
  }, []);

  const login = (email: string, password: string): AuthResult => {
    const normalizedEmail = normalizeEmail(email);
    // ensureLocalAccounts seeds defaults; subsequent reads use readStoredAccounts directly.
    const account = ensureLocalAccounts().find((storedAccount) => {
      return normalizeEmail(storedAccount.email) === normalizedEmail;
    });

    if (!account) {
      return { success: false, message: "Contul nu a fost găsit în registrul local." };
    }
    if (account.password !== password) {
      return { success: false, message: "Parola este incorectă." };
    }

    const authenticatedUser = toUser(account);
    setUser(authenticatedUser);
    writeStoredUser(authenticatedUser);

    // Clear any stale session from a previous user immediately so the next
    // sendMessage / API call doesn't use the wrong identity while the async
    // loginToServer resolves.
    clearSession();

    // Fire-and-forget backend login to establish a server session
    loginToServer(email, password).then((result) => {
      if (result?.user?.role) {
        const backendRole: "admin" | "user" = result.user.role === "admin" ? "admin" : "user";
        const updatedUser = { ...authenticatedUser, role: backendRole };
        setUser(updatedUser);
        writeStoredUser(updatedUser);
      }
    }).catch(() => {/* ignore — server may be unavailable */});

    return { success: true };
  };

  const signup = (name: string, email: string, password: string): AuthResult => {
    const normalizedEmail = normalizeEmail(email);
    const accounts = readStoredAccounts();
    const alreadyExists = accounts.some((account) => {
      return normalizeEmail(account.email) === normalizedEmail;
    });

    if (alreadyExists) {
      return { success: false, message: "Există deja un cont local cu acest email." };
    }

    const newAccount: StoredAccount = {
      name: sanitizeName(name),
      email: email.trim(),
      password,
      ...DEFAULT_USER_VALUES,
    };

    writeStoredAccounts([...accounts, newAccount]);

    const authenticatedUser = toUser(newAccount);
    setUser(authenticatedUser);
    writeStoredUser(authenticatedUser);

    // Fire-and-forget backend signup to persist user in DB
    signupOnServer(sanitizeName(name), email.trim(), password).catch(() => {/* ignore */});

    return { success: true };
  };

  const updateUser = (updatedUser: User) => {
    const sanitizedUser = sanitizeUser(updatedUser);
    if (!sanitizedUser) return;

    const currentEmail = normalizeEmail(user?.email ?? sanitizedUser.email);
    const persistedUser = { ...sanitizedUser, email: user?.email ?? sanitizedUser.email };

    setUser(persistedUser);
    writeStoredUser(persistedUser);

    const accounts = readStoredAccounts();
    const accountIndex = accounts.findIndex(
      (account) => normalizeEmail(account.email) === currentEmail
    );

    if (accountIndex !== -1) {
      accounts[accountIndex] = { ...accounts[accountIndex], ...persistedUser };
      writeStoredAccounts(accounts);
    }
  };

  const changePassword = async (currentPassword: string, nextPassword: string): Promise<AuthResult> => {
    if (!user) {
      return { success: false, message: "Trebuie să fii autentificat pentru a schimba parola." };
    }
    if (nextPassword.trim().length < 8) {
      return { success: false, message: "Parola nouă trebuie să aibă cel puțin 8 caractere." };
    }

    // Ensure a server session exists — loginToServer may still be in-flight from login().
    if (!hasActiveSession()) {
      await loginToServer(user.email, currentPassword);
    }

    // Try the server first (DB-backed users)
    const serverResult = await changePasswordOnServer(currentPassword, nextPassword);
    if (serverResult !== null && serverResult.success) {
      // Server confirmed the change — sync local cache and return
      const accounts = readStoredAccounts();
      const idx = accounts.findIndex(
        (a) => normalizeEmail(a.email) === normalizeEmail(user.email)
      );
      if (idx !== -1) {
        accounts[idx] = { ...accounts[idx], password: nextPassword };
        writeStoredAccounts(accounts);
      }
      return { success: true };
    }

    if (serverResult !== null && !serverResult.success) {
      // Server reachable and rejected — surface the error unless it's a 401
      // (session wasn't ready), in which case fall through to the local check.
      if (serverResult.statusCode !== 401) {
        return { success: false, message: serverResult.message };
      }
    }

    // Server unreachable or session not established — use local account store
    const accounts = readStoredAccounts();
    const accountIndex = accounts.findIndex(
      (a) => normalizeEmail(a.email) === normalizeEmail(user.email)
    );

    if (accountIndex === -1) {
      return { success: false, message: "Contul nu a fost găsit." };
    }
    if (accounts[accountIndex].password !== currentPassword) {
      return { success: false, message: "Parola curentă este incorectă." };
    }

    accounts[accountIndex] = { ...accounts[accountIndex], password: nextPassword };
    writeStoredAccounts(accounts);
    return { success: true };
  };

  const logout = useCallback(() => {
    setUser(null);
    writeStoredUser(null);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    logoutFromServer().catch(() => {/* ignore */});
  }, []);

  // ── Inactivity timeout ────────────────────────────────────────────────────
  // Reset the timer on any user interaction.  When the timer fires, log the
  // user out automatically regardless of which page they are on.
  const resetInactivityTimer = useCallback(() => {
    if (!userRef.current) return; // not logged in — nothing to do
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      if (userRef.current) {
        console.info("[auth] Inactivity timeout — logging out.");
        logout();
      }
    }, INACTIVITY_TIMEOUT_MS);
  }, [logout]);

  useEffect(() => {
    if (!user) {
      // Not logged in — clear any lingering timer and remove listeners
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      return;
    }

    // Start the timer immediately after login
    resetInactivityTimer();

    const EVENTS = ["click", "keydown", "mousemove", "touchstart", "scroll"] as const;
    // Stable reference so addEventListener / removeEventListener see the same fn.
    const handleActivity = () => resetInactivityTimer();
    for (const event of EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      for (const event of EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
    // Depend on !!user (login/logout transitions) not the user object itself,
    // so listeners are not torn down and re-added on every profile update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user, resetInactivityTimer]);

  // ── Password recovery ─────────────────────────────────────────────────────
  const handleForgotPassword = useCallback(
    (email: string) => forgotPassword(email),
    []
  );

  const handleResetPassword = useCallback(
    async (token: string, newPassword: string) => {
      const result = await resetPassword(token, newPassword);
      // Sync the new password into the local account store so the next
      // login() call (which checks localStorage) finds the updated password.
      if (result?.email) {
        const accounts = readStoredAccounts();
        const idx = accounts.findIndex(
          (a) => normalizeEmail(a.email) === normalizeEmail(result.email!)
        );
        if (idx !== -1) {
          accounts[idx] = { ...accounts[idx], password: newPassword };
          writeStoredAccounts(accounts);
        }
      }
      return result;
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        updateUser,
        changePassword,
        forgotPassword: handleForgotPassword,
        resetPassword:  handleResetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
