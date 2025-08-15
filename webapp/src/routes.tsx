import React from 'react';
import { createBrowserRouter, RouteObject } from 'react-router-dom';
import { lazy } from 'react';
import AppShell from './shell/AppShell';

// Lazy load components for better performance
const Landing = lazy(() => import('./routes/Landing'));
const MissionControl = lazy(() => import('@/components/mission-control/MissionControl'));

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { 
        index: true, 
        element: <Landing /> 
      },
      { 
        path: 'mission-control', 
        element: <MissionControl /> 
      },
    ],
  },
];

export const router = createBrowserRouter(routes);