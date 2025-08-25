import React, { StrictMode, Suspense } from "react";
// process shim must be the very first import so any module that references
// `process` in the bundle sees a defined global.
import "./shims/process-shim";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import "./app.css";

// Initialize GlobalServiceManager early
import { ensureGSMInitialised } from "@/services/GlobalServiceManager";
import { AuthProvider } from "@/auth/AuthContext";
import UserProfile from "./components/UserProfile";
ensureGSMInitialised();

const rootEl = document.getElementById("app")!;
createRoot(rootEl).render(
  <StrictMode>
    <AuthProvider>
      <Suspense fallback={<div className="min-h-screen bg-black" />}>
        <RouterProvider router={router} />
      </Suspense>
    </AuthProvider>
  </StrictMode>
);
