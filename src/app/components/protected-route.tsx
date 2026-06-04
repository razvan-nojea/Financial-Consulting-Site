import React from 'react';
import { Navigate } from "react-router";
import { useAuth } from "../contexts/auth-context";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/autentificare" replace />;
  }

  return <>{children}</>;
}

/**
 * Wraps a route so that only admin users can access it.
 * Authenticated non-admins are redirected to their dashboard overview.
 * Unauthenticated users are redirected to login.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/autentificare" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/cont" replace />;
  }

  return <>{children}</>;
}
