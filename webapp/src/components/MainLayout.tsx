import React, { ReactNode, useRef, useEffect, useState } from "react";
import { useMainLayout } from "@/context/MainLayoutContext";
import { useHeader } from "@/context/HeaderContext";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  initialFilePath?: string;
}

// Main layout wrapper (context now provided by RootLayout)
const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  title = "Orchestra",
  initialFilePath,
}) => {
  return <MainLayoutContent title={title}>{children}</MainLayoutContent>;
};

// Inner component that consumes the context
interface MainLayoutContentProps {
  children: ReactNode;
  title?: string;
}

const MainLayoutContent: React.FC<MainLayoutContentProps> = ({
  children,
  title,
}) => {
  const {
    showFilePanel,
    sidePanelWidth,
    setSidePanelWidth,
    error,
    filePanelRef,
  } = useMainLayout();

  const { setTitle } = useHeader();

  // Update header title when MainLayout title prop changes
  useEffect(() => {
    if (title) {
      setTitle(title);
    }
  }, [title, setTitle]);

  const [currentPlatform, setCurrentPlatform] = useState<string | null>(null);
  const [teamStatus, setTeamStatus] = useState<"auto" | "paused" | "off">(
    "off"
  );
  const [viewMode, setViewMode] = useState<"tasks" | "email" | "social">(
    "tasks"
  );
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  // Check if we're on the vault route
  const location = window.location;
  const isVaultRoute = location.pathname.includes("/vault");
  const isMissionControlV2 = location.pathname.includes("/mission-control-v2");

  // Detect platform on mount
  React.useEffect(() => {
    const detectPlatform = async () => {
      try {
        // Simplified platform detection for demo
        const platform = navigator.platform.toLowerCase().includes("mac")
          ? "macos"
          : "windows";
        setCurrentPlatform(platform);
      } catch (error) {
        console.error("Failed to detect platform:", error);
      }
    };

    detectPlatform();
  }, []);

  // Handle panel resizing
  useEffect(() => {
    const resizeHandle = resizeHandleRef.current;
    const filePanel = filePanelRef.current;
    if (!resizeHandle || !filePanel) {
      console.log("Resize handle or file panel ref not available", {
        resizeHandle,
        filePanel,
      });
      return;
    }

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    const onMouseDown = (e: MouseEvent) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = filePanel.offsetWidth;
      document.body.classList.add("resizing");

      // Prevent text selection during resize
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = startWidth + (e.clientX - startX);
      // Limit min and max width
      const limitedWidth = Math.max(150, Math.min(500, newWidth));

      // Update panel width
      setSidePanelWidth(limitedWidth);
      filePanel.style.width = `${limitedWidth}px`;

      // Update CSS variable for grid layout
      document.documentElement.style.setProperty(
        "--file-panel-width",
        `${limitedWidth}px`
      );
    };

    const onMouseUp = () => {
      if (isResizing) {
        isResizing = false;
        document.body.classList.remove("resizing");
      }
    };

    resizeHandle.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      resizeHandle.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [setSidePanelWidth]);

  return (
    <div className="flex h-full w-full overflow-hidden min-h-0">
      {/* Command Bar */}
      {/* <CommandBar 
        teamStatus={teamStatus} 
        onChangeStatus={setTeamStatus} 
        viewMode={viewMode} 
        onChangeViewMode={setViewMode} 
      /> */}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* File-specific header for routes that need file functionality */}

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* File panel resize handle - only shown on vault route */}
          {isVaultRoute && showFilePanel && (
            <div className="resize-handle" ref={resizeHandleRef}></div>
          )}

          {/* Content area */}
          <div
            className={`flex-1 ${isMissionControlV2 ? "overflow-hidden min-h-0" : "overflow-auto"} bg-surface-0`}
          >
            <div
              className={`h-full ${isMissionControlV2 ? "overflow-hidden min-h-0" : "overflow-auto"}`}
            >
              {error ? (
                <div className="error-message">
                  <p>{error}</p>
                  <button className="retry-button">Retry</button>
                </div>
              ) : (
                children
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
