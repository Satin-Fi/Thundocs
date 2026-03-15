import React from "react";
import { Navigate } from "react-router-dom";

const ADMIN_KEY = "thundocs_admin_v1";

export function isAdmin(): boolean {
  return localStorage.getItem(ADMIN_KEY) === "true";
}

export function grantAdmin() {
  localStorage.setItem(ADMIN_KEY, "true");
}

export function revokeAdmin() {
  localStorage.removeItem(ADMIN_KEY);
}

/** Wraps a route — if not admin, redirects to 404 */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  if (!isAdmin()) return <Navigate to="/not-found" replace />;
  return <>{children}</>;
}
