import LeftRail from "@/components/LeftTail";
import UserProfile from "@/components/UserProfile";
import { HeaderProvider } from "@/context/HeaderContext";
import { MainLayoutProvider } from "@/context/MainLayoutContext";
import React from "react";
import { Outlet } from "react-router-dom";

export default function AppShell() {
  return (
    <HeaderProvider>
      <MainLayoutProvider>
        <div
          className="min-h-screen bg-black min-w-screen text-white flex"
          id="app-shell"
        >
          {/* Persistent left navigation */}
          <LeftRail />

          {/* Main routed content */}
          <div className="flex-1 flex flex-col min-h-0 pt-1">
            <UserProfile />
            <Outlet />
          </div>
        </div>
      </MainLayoutProvider>
    </HeaderProvider>
  );
}
