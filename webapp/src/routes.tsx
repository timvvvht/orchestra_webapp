import React from "react";
import { createBrowserRouter, RouteObject } from "react-router-dom";
import { lazy } from "react";
import AppShell from "./shell/AppShell";
import MockTestPage from "./components/test-components/testSendChatMessage";
import MissionControl from "@/components/mission-control/MissionControl";

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
        path: "mission-control",
        element: <MissionControl />,
      },
      { path: "mock-test", element: <MockTestPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
