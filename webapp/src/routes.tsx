import React from "react";
import { createBrowserRouter, RouteObject } from "react-router-dom";
import { lazy } from "react";
import AppShell from "./shell/AppShell";
import AuthCallback from "./routes/auth/callback";
import GitHubConnectPage from "./routes/github-connect";
import GitHubWizardLayout from "./routes/github/GitHubWizardLayout";
import StepConfig from "./routes/github/StepConfig";
import StepLogin from "./routes/github/StepLogin";
import StepExchange from "./routes/github/StepExchange";
import StepInstall from "./routes/github/StepInstall";

// Lazy load components for better performance
const Landing = lazy(() => import("./routes/Landing"));
const MissionControl = lazy(
  () => import("@/components/mission-control/MissionControl")
);

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
        path: "mission-control",
        element: <MissionControl />,
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
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
