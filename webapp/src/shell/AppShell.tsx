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
          className="min-h-screen max-h-screen overflow-y-hidden bg-black min-w-full text-white flex"
          id="app-shell"
        >
          {/* Main routed content */}
          <div className="flex flex-1 flex-col min-h-0 pt-1">
            <UserProfile />
            <Outlet />
          </div>
        </div>
      </MainLayoutProvider>
    </HeaderProvider>
  );
}
