import LeftRail from "@/components/LeftTail";
import { HeaderProvider } from "@/context/HeaderContext";
import { MainLayoutProvider } from "@/context/MainLayoutContext";
import React from "react";
import { Outlet } from "react-router-dom";

export default function AppShell() {
  return (
    <HeaderProvider>
      <MainLayoutProvider>
        <div className="min-h-screen bg-black text-white flex">
          {/* Persistent left navigation */}
          <LeftRail />

          {/* Main routed content */}
          <div className="flex-1 min-h-0">
            <Outlet />
          </div>
        </div>
      </MainLayoutProvider>
    </HeaderProvider>
  );
}
