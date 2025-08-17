import React from "react";

/**
 * Container for the Elixir Command Bar sidebar.
 * Positioned absolutely on the right edge of the editor wrapper.
 */
export const ElixirSidebarContainer: React.FC = () => {
  return (
    <div
      id="elixir-sidebar-root"
      className="absolute right-0 top-0 h-full w-[340px] pointer-events-none z-50"
      style={{
        // Ensure it's positioned relative to the editor wrapper
        position: "absolute",
        right: 0,
        top: 0,
        height: "100%",
        width: "340px",
        pointerEvents: "none",
        zIndex: 50,
      }}
    />
  );
};
