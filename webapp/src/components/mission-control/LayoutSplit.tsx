import React, { useState, useRef, useCallback } from "react";
import { useMissionControlStore } from "@/stores/missionControlStore";
import AgentListPanel from "./AgentListPanel";
import ChatPane from "./ChatPane";

const LayoutSplit: React.FC = () => {
  const { selectedSession } = useMissionControlStore();
  const [leftPanelPercentage, setLeftPanelPercentage] = useState(40); // 40% by default
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);
  const dragStartPercentage = useRef<number>(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartX.current = e.clientX;
      dragStartPercentage.current = leftPanelPercentage;
    },
    [leftPanelPercentage]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const containerWidth = window.innerWidth; // You could also get this from a ref if needed
      const deltaX = e.clientX - dragStartX.current;
      const deltaPercentage = (deltaX / containerWidth) * 100;
      const newPercentage = Math.max(
        20, // Minimum 20%
        Math.min(80, dragStartPercentage.current + deltaPercentage) // Maximum 80%
      );
      setLeftPanelPercentage(newPercentage);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Reset percentage when session changes
  React.useEffect(() => {
    if (selectedSession) {
      setLeftPanelPercentage(40); // Reset to 40% when session changes
    }
  }, [selectedSession]);

  return (
    <div className="flex-1 flex overflow-hidden min-h-0">
      {/* Left Panel - Agent List */}
      <div
        data-testid="mc-left-wrapper"
        className={`
          transition-[width] duration-300 
          relative h-full min-h-0 min-w-0 overflow-y-auto isolate
        `}
        style={{ width: selectedSession ? `${leftPanelPercentage}%` : "100%" }}
      >
        <AgentListPanel />
      </div>

      {/* Draggable Divider */}
      {selectedSession && (
        <div
          className={`
            w-1 bg-white/10 hover:bg-white/20 cursor-col-resize
            transition-colors duration-200
            ${isDragging ? "bg-white/30" : ""}
            relative
          `}
          onMouseDown={handleMouseDown}
          data-testid="layout-divider"
        >
          {/* Drag Handle Indicator */}
          <div
            className="
            absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
            w-3 h-8 rounded-sm bg-white/20 hover:bg-white/30
            transition-colors duration-200
            flex items-center justify-center
          "
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-1 h-1 bg-white/60 rounded-full"></div>
              <div className="w-1 h-1 bg-white/60 rounded-full"></div>
              <div className="w-1 h-1 bg-white/60 rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      {/* Right Panel - Chat View - Only render when session is selected */}
      {selectedSession && (
        <div
          className="
          flex-1 h-full min-h-0 
          bg-black/95 backdrop-blur-2xl
          border-l border-white/10
          flex flex-col
          overflow-hidden p-1
        "
        >
          <ChatPane />
        </div>
      )}
    </div>
  );
};

export default LayoutSplit;
