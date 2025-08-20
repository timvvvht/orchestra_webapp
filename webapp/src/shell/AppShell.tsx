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
          className="h-dvh w-dvw overflow-hidden bg-black text-white flex flex-col"
          id="app-shell"
        >
          <UserProfile />
          <Outlet />
        </div>
      </MainLayoutProvider>
    </HeaderProvider>
  );
}
