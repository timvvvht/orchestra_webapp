import React, { useRef, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Clock,
  Sparkles,
  ArrowRight,
  Save,
  GitBranch,
  Archive,
} from "lucide-react";
import { useMissionControlStore } from "@/stores/missionControlStore";
import { useDraftStore } from "@/stores/draftStore";
import { useMissionControlArchive } from "@/hooks/useMissionControlArchive";
import AgentGroup from "./AgentGroup";
import DraftCard from "./DraftCard";
import AgentCard from "./AgentCard";
import CwdFilterDropdown from "./CwdFilterDropdown";
import { motion } from "framer-motion";
import { isTauri } from "@/utils/environment";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { ProjectSelectionModal } from "@/components/modals/ProjectSelectionModal";

interface ViewMode {
    icon?: any
    title: string
    
}

const AgentListPanel: React.FC = () => {
  const listRef = useRef<HTMLDivElement>(null);
  const {
    viewMode,
    setViewMode,
    getGroupedSessions,
    collapsedGroups,
    selectedSession,
    isSessionUnread,
    setShowNewDraftModal,
    setInitialDraftCodePath,
  } = useMissionControlStore();
  const auth = useAuth();

  const { getDraftsArray } = useDraftStore();
  const { archiveSession, unarchiveSession } = useMissionControlArchive();
  const drafts = getDraftsArray();
  const groupedSessions = getGroupedSessions();
  const [showProjectModal, setShowProjectModal] = useState(false);


  const viewModes = [
  ]

  // Split idle sessions into unread and read
  const unreadIdle = groupedSessions.idle.filter((agent) =>
    isSessionUnread(agent.id)
  );
  const readIdle = groupedSessions.idle.filter(
    (agent) => !isSessionUnread(agent.id)
  );

  // Smooth scroll to selected session
  useEffect(() => {
    if (selectedSession && listRef.current) {
      const el = listRef.current.querySelector(
        `[data-session-id="${selectedSession}"]`
      ) as HTMLElement | null;
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedSession]);

  return (
    <div className="flex-1 min-h-0">
      <div
        ref={listRef}
        // className="mcv2-left-scroll flex flex-col h-full overflow-y-auto min-h-0"ß
        data-testid="agent-list-panel"
      >
        {/* Sticky Filters Bar */}
        <div className="sticky top-0 z-10 bg-black/50 backdrop-blur-sm border-b border-white/10">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Directory Filter */}
              <CwdFilterDropdown />

              {/* View Mode Toggle */}
              <div className="flex items-center bg-white/[0.02] backdrop-blur-sm rounded-lg p-0.5 border border-white/[0.06]">
                <button
                  onClick={() => setViewMode("active")}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200
                    ${
                      viewMode === "active"
                        ? "bg-white/[0.08] text-white/90 shadow-sm"
                        : "text-white/50 hover:text-white/70 hover:bg-white/[0.03]"
                    }
                  `}
                >
                  Active
                </button>
                <button
                  onClick={() => setViewMode("archived")}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center gap-1.5
                    ${
                      viewMode === "archived"
                        ? "bg-white/[0.08] text-white/90 shadow-sm"
                        : "text-white/50 hover:text-white/70 hover:bg-white/[0.03]"
                    }
                  `}
                >
                  <Archive className="w-3 h-3" />
                  Archived
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-[400px]">
          <div className="py-4">
            {/* Empty State */}
            {groupedSessions.processing.length === 0 &&
              unreadIdle.length === 0 &&
              readIdle.length === 0 &&
              (viewMode === "archived" || drafts.length === 0) && (
                <motion.div
                  className="flex flex-col items-center justify-center py-20 px-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8 }}
                >
                  <div className="text-center max-w-3xl">
                    {viewMode === "archived" ? (
                      <>
                        {/* Archived view - keep simple */}
                        <h2 className="text-2xl font-light text-white/70 mb-3">
                          No archived sessions
                        </h2>
                        <p className="text-base text-white/50">
                          Completed sessions will appear here
                        </p>
                      </>
                    ) : (
                      <>
                        {/* Active view - MUCH bigger and better */}
                        {/* Animated gradient text */}
                        <motion.h1
                          className="text-5xl md:text-6xl lg:text-7xl font-extralight text-white/95 mb-6 tracking-tight leading-[1.1]"
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.1, duration: 0.6 }}
                        >
                          Run Background Coding Agents
                          <br />
                          <motion.span
                            className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
                            animate={{
                              backgroundPosition: [
                                "0% 50%",
                                "100% 50%",
                                "0% 50%",
                              ],
                            }}
                            transition={{ duration: 5, repeat: Infinity }}
                            style={{ backgroundSize: "200% 200%" }}
                          >
                            In Parallel
                          </motion.span>
                        </motion.h1>

                        {/* Warmer, more conversational subtitle */}
                        <motion.p
                          className="text-xl md:text-2xl text-white/70 mb-12 leading-relaxed"
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.2, duration: 0.6 }}
                        >
                          Tell me what you want to build,
                          <br />
                          and we'll make it happen.
                        </motion.p>

                        {/* Visual demonstration */}
                        <div className="flex justify-center gap-3 mb-10">
                          {["Exploring", "Coding", "Testing"].map(
                            (label, i) => (
                              <motion.div
                                key={label}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 + i * 0.1 }}
                                className="px-5 py-3 bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="relative">
                                    <div className="w-2 h-2 rounded-full bg-green-400/60" />
                                    <div className="absolute inset-0 rounded-full bg-green-400 animate-ping" />
                                  </div>
                                  <span className="text-sm text-white/70">
                                    {label}
                                  </span>
                                </div>
                              </motion.div>
                            )
                          )}
                        </div>

                        {/* Enhanced CTA button */}
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            delay: 0.4,
                            duration: 0.5,
                            type: "spring",
                          }}
                        >
                          <button
                            onClick={() => {
                              if (!auth?.isAuthenticated) {
                                auth?.setShowModal(true);
                                return;
                              }
                              setShowProjectModal(true);
                            }}
                            className="group relative"
                          >
                            {/* Button glow effect */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition-opacity" />

                            {/* Button content */}
                            <div className="relative px-12 py-5 bg-white text-black rounded-2xl font-medium text-lg flex items-center gap-3">
                              <Sparkles className="w-5 h-5" />
                              <span>Start Your First Task</span>
                              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </button>

                          <motion.p
                            className="mt-4 text-sm text-white/50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                          >
                            No setup required • Works with any codebase
                          </motion.p>
                        </motion.div>

                        {/* Feature badges */}
                        <div className="mt-10 flex items-center justify-center gap-6">
                          <div className="flex items-center gap-2">
                            <Save className="w-4 h-4 text-green-400/60" />
                            <span className="text-xs text-white/50">
                              Auto-checkpoint
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <GitBranch className="w-4 h-4 text-blue-400/60" />
                            <span className="text-xs text-white/50">
                              Isolated branches
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                    {!auth?.isAuthenticated && viewMode !== "archived" && (
                      <div className="mt-4">
                        <button
                          onClick={() => auth?.setShowModal(true)}
                          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Sign in to start →
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

            {/* Drafts Section */}
            {drafts.length > 0 && viewMode === "active" && (
              <AgentGroup
                title="Drafts"
                count={drafts.length}
                isCollapsed={collapsedGroups.drafts}
                groupKey="drafts"
              >
                <div className="px-6">
                  {drafts.map((draft) => (
                    <DraftCard key={draft.id} draft={draft} />
                  ))}
                </div>
              </AgentGroup>
            )}

            {/* Processing Section */}
            {groupedSessions.processing.length > 0 && viewMode === "active" && (
              <AgentGroup
                title="Processing"
                count={groupedSessions.processing.length}
                icon={
                  <Loader2 className="w-3.5 h-3.5 text-white/50 animate-spin" />
                }
                isCollapsed={collapsedGroups.processing}
                groupKey="processing"
              >
                <div className="px-6">
                  {groupedSessions.processing.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      group="processing"
                      showArchived={false}
                      isInSplitScreen={!!selectedSession}
                      onArchive={archiveSession}
                      onUnarchive={unarchiveSession}
                    />
                  ))}
                </div>
              </AgentGroup>
            )}

            {/* Unread Section */}
            {unreadIdle.length > 0 && viewMode === "active" && (
              <AgentGroup
                title="Unread"
                count={unreadIdle.length}
                icon={<Clock className="w-3.5 h-3.5 text-white/30" />}
                isCollapsed={collapsedGroups.idleUnread}
                groupKey="idleUnread"
              >
                <div className="px-6">
                  {unreadIdle.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      group="idle"
                      showArchived={false}
                      isInSplitScreen={!!selectedSession}
                      onArchive={archiveSession}
                      onUnarchive={unarchiveSession}
                    />
                  ))}
                </div>
              </AgentGroup>
            )}

            {/* Read Section */}
            {readIdle.length > 0 && viewMode === "active" && (
              <AgentGroup
                title="Read"
                count={readIdle.length}
                icon={<Clock className="w-3.5 h-3.5 text-white/30" />}
                isCollapsed={collapsedGroups.idleRead}
                groupKey="idleRead"
              >
                <div className="px-6">
                  {readIdle.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      group="idle"
                      showArchived={false}
                      isInSplitScreen={!!selectedSession}
                      onArchive={archiveSession}
                      onUnarchive={unarchiveSession}
                    />
                  ))}
                </div>
              </AgentGroup>
            )}

            {/* Archived Sessions */}
            {viewMode === "archived" && (
              <AgentGroup
                title="Archived Sessions"
                count={
                  groupedSessions.processing.length +
                  unreadIdle.length +
                  readIdle.length
                }
                isCollapsed={false}
                groupKey="drafts" // Use drafts as placeholder since archived doesn't collapse
              >
                <div className="px-6">
                  {[
                    ...groupedSessions.processing,
                    ...unreadIdle,
                    ...readIdle,
                  ].map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      group="idle"
                      showArchived={true}
                      isInSplitScreen={!!selectedSession}
                      onArchive={archiveSession}
                      onUnarchive={unarchiveSession}
                    />
                  ))}
                </div>
              </AgentGroup>
            )}
          </div>
        </div>

        {/* Project Selection Modal */}
        {showProjectModal && (
          <ProjectSelectionModal
            onClose={() => setShowProjectModal(false)}
            onProjectSelected={(path) => {
              setInitialDraftCodePath(path);
              setShowNewDraftModal(true);
              setShowProjectModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AgentListPanel;
