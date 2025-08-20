import React, { useState, useRef, useCallback, useEffect } from "react";
import { useMissionControlStore } from "@/stores/missionControlStore";
import AgentListPanel from "./AgentListPanel";
import ChatPane from "./ChatPane";

const LayoutSplit: React.FC = () => {
  const { selectedSession } = useMissionControlStore();
  // Committed width percentage (applied on mount and when drag ends)
  const [leftPanelPercentage, setLeftPanelPercentage] = useState(40);
  const [isDragging, setIsDragging] = useState(false);

  // Refs for DOM and drag state
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leftRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const frameRef = useRef<number>(0);
  const committedPctRef = useRef<number>(leftPanelPercentage);
  const pendingPctRef = useRef<number>(leftPanelPercentage);

  // Keep ref in sync with state
  useEffect(() => {
    committedPctRef.current = leftPanelPercentage;
    // Ensure DOM reflects committed value when not dragging

    if (!draggingRef.current && leftRef.current) {
      leftRef.current.style.width = selectedSession
        ? `${leftPanelPercentage}%`
        : "100%";
    }
  }, [leftPanelPercentage, selectedSession]);

  const computePctFromClientX = useCallback((clientX: number) => {
    if (!containerRef.current) return committedPctRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    // Clamp clientX to the container bounds
    const clampedX = Math.max(rect.left, Math.min(clientX, rect.right));
    const relative = (clampedX - rect.left) / rect.width;
    const pct = relative * 100;
    // Enforce min/max bounds
    return Math.max(20, Math.min(80, pct));
  }, []);

  const applyPendingWidth = useCallback(() => {
    if (!leftRef.current) return;
    leftRef.current.style.width = selectedSession
      ? `${pendingPctRef.current}%`
      : "100%";
  }, [selectedSession]);
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      setIsDragging(true);
      // Initialize pending to current committed
      pendingPctRef.current = computePctFromClientX(e.clientX);
      // Apply immediately without re-render
      applyPendingWidth();

      const onMouseMove = (ev: MouseEvent) => {
        if (!draggingRef.current) return;
        pendingPctRef.current = computePctFromClientX(ev.clientX);
        // rAF throttle DOM writes
        if (frameRef.current) return;
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = 0;
          applyPendingWidth();
        });
      };

      const onMouseUp = () => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        setIsDragging(false);
        // Commit once to React state to keep width persistent
        setLeftPanelPercentage(pendingPctRef.current);
        // Cleanup listeners
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        // Cancel any scheduled frame
        if (frameRef.current) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = 0;
        }
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [applyPendingWidth, computePctFromClientX]
  );

  // Cleanup on unmount just in case
  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
      draggingRef.current = false;
    };
  }, []);

  return (
    <div className="flex-1 flex overflow-hidden min-h-0" ref={containerRef}>
      {/* Left Panel - Agent List */}
      <div
        data-testid="mc-left-wrapper"
        className={`
                      relative h-full min-h-0 min-w-0 overflow-y-auto isolate
                    `}
        ref={leftRef}
        style={{
          width: selectedSession ? `${leftPanelPercentage}%` : "100%",
          // Remove width transitions during drag to avoid layout thrash
          transition: isDragging ? "none" : "width 300ms",
        }}
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
