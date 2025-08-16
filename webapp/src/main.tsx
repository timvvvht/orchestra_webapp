import React, { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import './app.css';

// Initialize GlobalServiceManager early
import { ensureGSMInitialised } from '@/services/GlobalServiceManager';
import { AuthProvider } from '@/auth/AuthContext';
ensureGSMInitialised();

const rootEl = document.getElementById('app')!;
createRoot(rootEl).render(
  <StrictMode>
    <AuthProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1 h-1 rounded-full bg-white/40 animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      }>
        <RouterProvider router={router} />
      </Suspense>
    </AuthProvider>
  </StrictMode>
);