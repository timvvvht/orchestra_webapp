import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/landing" replace />;
  }
  return <>{children}</>;
}
