import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import {
  Home,
  Bot,
  FileText,
  Settings,
  Code,
  LogOut,
  Activity,
  Zap,
  Wand2,
  GitBranch,
  GitCommit,
} from "lucide-react";
import { useMainLayout } from "@/context/MainLayoutContext";
import { useAuth } from "@/auth/AuthContext";

export const LeftRail: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [, setIsMacOS] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { toggleFilePanel } = useMainLayout();
  const { isAuthenticated, user, logout, setShowModal } = useAuth();

  // Detect platform on mount
  useEffect(() => {
    const detectPlatform = async () => {
      try {
        // Simplified platform detection for demo
        const platform = navigator.platform.toLowerCase().includes("mac");
        setIsMacOS(platform);
      } catch (error) {
        console.error("Failed to detect platform:", error);
      }
    };

    detectPlatform();
  }, []);

  // Handle vault icon click
  const handleVaultClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default behavior
    e.stopPropagation(); // Stop event propagation

    // Check authentication before allowing vault access
    if (!user) {
      console.log(
        "[LeftRail] Vault access requires authentication, showing auth modal"
      );
      setShowModal(true);
      return;
    }

    // If we're already on the vault page, just toggle the file panel
    if (pathname === "/vault") {
      toggleFilePanel();
    } else {
      // Otherwise navigate to the vault page
      // The file panel will be shown by the VaultPage component's useEffect
      navigate("/vault");
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      // Logout from Supabase
      await logout();

      // Clear any ACS-related data from localStorage/sessionStorage
      // This ensures a clean logout even if ACS hook isn't available
      try {
        localStorage.removeItem("acs_session");
        sessionStorage.removeItem("acs_session");
      } catch (e) {
        console.warn("Could not clear ACS session storage:", e);
      }

      console.log("Logout completed from LeftRail");

      // Navigate to landing page after logout
      // Using window.location.href for a clean page reload
      window.location.href = "/landing";
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  // Handle navigation with auth check
  const handleNavigation = (to: string, e: React.MouseEvent) => {
    // Landing page and settings are always accessible
    if (to === "/landing" || to === "/settings") {
      return; // Let the default NavLink behavior handle it
    }

    // Other pages require authentication
    if (!user) {
      e.preventDefault();
      console.log(
        `[LeftRail] ${to} requires authentication, showing auth modal`
      );
      setShowModal(true);
      return;
    }

    // If authenticated, let the default NavLink behavior handle navigation
  };

  // Navigation items configuration
  const navItems = [
    // { to: '/dev/native-tools', label: 'Native Tools', icon: Wrench },
    //{ to: "/", label: "Home", icon: Home },
    { to: "/", label: "Home", icon: Home },
    { to: "/mission-control", label: "Mission", icon: Bot },
    // { to: '/dashboard', label: 'Home', icon: Home },
    //{ to: "/chat", label: "Chat", icon: Bot },
    //{ to: "/vault", label: "Notes", icon: FileText, onClick: handleVaultClick },
    // { to: '/mcp-playground', label: 'MCP Playground', icon: Zap },
    // { to: '/animations', label: 'Animations', icon: Wand2 },
    // { to: '/demo/mermaid', label: 'Mermaid Demo', icon: GitBranch },
    // { to: '/git-log', label: 'Git Log', icon: GitCommit },
    // { to: '/tools-schema', label: 'Tool Schemas', icon: Code },
    // { to: '/plans', label: 'Plans', icon: Layout },
    // { to: '/agent-store', label: 'Agent Store', icon: Store },
    // { to: '/agent-configs', label: 'Agent Configs', icon: TestTube },
  ];

  // Conditional landing page styling for LeftRail removed for consistent theming

  return (
    <aside
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className={clsx(
        "flex flex-col shrink-0 select-none min-h-full z-10",
        "transition-all duration-300 ease-in-out overflow-hidden",
        "bg-transparent min-h-full max-h-screen",
        open ? "w-[200px]" : "w-[68px]"
      )}
    >
      {/* Nav Items */}
      <nav className="flex flex-col py-3 space-y-1 px-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={(e) => {
              // Handle custom onClick first (like vault)
              //if (item.onClick) {
              //item.onClick(e);
              //} else {
              // Handle general auth check for other nav items
              handleNavigation(item.to, e);
              //}
            }}
            className={({ isActive }) =>
              clsx(
                "group flex items-center overflow-hidden rounded-lg h-10 pl-1.5",
                open ? "gap-2" : "",
                "transition-all duration-200",
                isActive
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/70 hover:bg-white/5"
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Icon with colored glow for active state */}
                <span
                  className={clsx(
                    "flex justify-center items-center w-10 h-10 shrink-0",
                    isActive
                      ? "text-white"
                      : "text-white/70 group-hover:text-white"
                  )}
                >
                  <item.icon
                    className={clsx(
                      "w-[18px] h-[18px]",
                      isActive && "drop-shadow-[0_0_2px_rgba(255,255,255,0.4)]"
                    )}
                    strokeWidth={1.5}
                  />
                </span>
                {/* Label */}
                <span
                  className={clsx(
                    "text-sm tracking-wide whitespace-nowrap font-medium",
                    "transition-opacity duration-150",
                    isActive ? "text-white" : "text-white/70",
                    open ? "opacity-100 pr-4" : "opacity-0 pr-0 w-0"
                  )}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Spacer to push settings to bottom */}
      <div className="flex-grow"></div>

      {/* Bottom controls - debug and settings */}
      <div className="px-2 pt-1 pb-3 border-t border-white/10 mt-auto space-y-1">
        {/* Debug Link */}

        {/* Settings Link 
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              "group flex items-center overflow-hidden rounded-lg h-10 pl-1.5",
              open ? "gap-2" : "",
              "transition-all duration-200",
              isActive
                ? "bg-white/10 text-white shadow-sm"
                : "text-white/70 hover:bg-white/5"
            )
          }
        >
          {({ isActive }) => (
            <>
              // Icon with colored glow for active state 
              <span
                className={clsx(
                  "flex justify-center items-center w-10 h-10 shrink-0",
                  isActive
                    ? "text-white"
                    : "text-white/70 group-hover:text-white"
                )}
              >
                <Settings
                  className={clsx(
                    "w-[18px] h-[18px]",
                    isActive && "drop-shadow-[0_0_2px_rgba(255,255,255,0.4)]"
                  )}
                  strokeWidth={1.5}
                />
              </span>

              // Label 
              <span
                className={clsx(
                  "text-sm tracking-wide whitespace-nowrap font-medium",
                  "transition-opacity duration-150",
                  isActive ? "text-white" : "text-white/70",
                  open ? "opacity-100 pr-4" : "opacity-0 pr-0 w-0"
                )}
              >
                Settings
              </span>
            </>
          )}
        </NavLink>*/}

        {/* Logout Button - Only show when user is authenticated */}
        {isAuthenticated && (
          <button
            onClick={handleLogout}
            className={clsx(
              "group flex items-center overflow-hidden rounded-lg h-10 pl-1.5",
              open ? "gap-2" : "",
              "transition-all duration-200",
              "text-white/70 hover:bg-white/5 hover:text-white"
            )}
          >
            {/* Icon */}
            <span
              className={clsx(
                "flex justify-center items-center w-10 h-10 shrink-0",
                "text-white/70 group-hover:text-white"
              )}
            >
              <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </span>

            {/* Label */}
            <span
              className={clsx(
                "text-sm tracking-wide whitespace-nowrap font-medium",
                "transition-opacity duration-150",
                "text-white/70 group-hover:text-white",
                open ? "opacity-100 pr-4" : "opacity-0 pr-0 w-0"
              )}
            >
              Logout
            </span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default LeftRail;
