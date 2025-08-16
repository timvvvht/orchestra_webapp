import React from 'react';
import { Outlet } from 'react-router-dom';

export default function AppShell() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Outlet />
    </div>
  );
}