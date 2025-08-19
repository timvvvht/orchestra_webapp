import React from "react";
import { createBrowserRouter, Navigate, RouteObject } from "react-router-dom";
import { lazy } from "react";
import AppShell from "./shell/AppShell";
import AuthCallback from "./routes/auth/callback";
import GitHubConnectPage from "./routes/github-connect";
import MockTestPage from "./components/test-components/testSendChatMessage";
import MissionControl from "@/components/mission-control/MissionControl";
import GitHubWizardLayout from "./routes/github/GitHubWizardLayout";
import StepConfig from "./routes/github/StepConfig";
import StepLogin from "./routes/github/StepLogin";
import StepExchange from "./routes/github/StepExchange";
import StepInstall from "./routes/github/StepInstall";
import InstallCallback from "./routes/github/InstallCallback";
import StartChat from "./routes/StartChat";
import Sessions from "./routes/Sessions";
import InfraDashboard from "./routes/InfraDashboard";

// Lazy load components for better performance
const Landing = lazy(() => import("./routes/Landing"));

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Landing />,
      },
      {
        path: "start",
        element: <StartChat />,
      },
      {
        path: "mission-control",
        element: <MissionControl />,
      },
      {
        path: "sessions",
        element: <Sessions />,
      },
      {
        path: "infra/dashboard",
        element: <InfraDashboard />,
      },
      {
        path: "auth",
        children: [
          {
            path: "callback",
            element: <AuthCallback />,
          },
        ],
      },
      {
        path: "github-connect",
        element: <GitHubConnectPage />,
      },
      {
        path: "github",
        element: <GitHubWizardLayout />,
      },
      {
        path: "/github/connect",
        element: <GitHubWizardLayout />,
        children: [
          { index: true, element: <StepConfig /> },
          { path: "config", element: <StepConfig /> },
          { path: "login", element: <StepLogin /> },
          { path: "exchange", element: <StepExchange /> },
          { path: "install", element: <StepInstall /> },
          { path: "install/callback", element: <InstallCallback /> },
        ],
      },
      { path: "mock-test", element: <MockTestPage /> },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
