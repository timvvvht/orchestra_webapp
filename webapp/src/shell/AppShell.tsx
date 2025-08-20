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
          className="min-h-screen max-h-screen overflow-hidden bg-black min-w-full text-white flex flex-col h-dvh"
          id="app-shell"
        >
          <UserProfile />
          <Outlet />
        </div>
      </MainLayoutProvider>
    </HeaderProvider>
  );
}
