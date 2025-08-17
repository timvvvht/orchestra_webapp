import React from 'react';
import { Plus, X, Server, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { useDraftStore } from '@/stores/draftStore';
import DynamicStatus from './DynamicStatus';
import AmbientIndicators from './AmbientIndicators';
import GitHubConnectPanel from './GitHubConnectPanel';

interface HeaderProps {
  workspaceStatus: 'idle' | 'provisioning' | 'active' | 'error';
  progressText: string;
  workspaceError: string | null;
  onProvisionWorkspace: () => void;
}

const Header: React.FC<HeaderProps> = ({
  workspaceStatus,
  progressText,
  workspaceError,
  onProvisionWorkspace
}) => {
  const { 
    selectedSession,
    setSelectedSession,
    setShowNewDraftModal,
    setInitialDraftCodePath,
    getGroupedSessions
  } = useMissionControlStore();
  

  
  const { getDraftsArray } = useDraftStore();
  const drafts = getDraftsArray();
  const { processing } = getGroupedSessions();



  return (
    <header 
      className="flex-shrink-0 border-b border-white/[0.08] bg-black/80 backdrop-blur-2xl"
      data-testid="mc-header"
    >
      <div className="px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Dynamic Status + Ambient Indicators */}
          <div className="flex items-center gap-6">
            <DynamicStatus 
              processingTasks={processing} 
              drafts={drafts}
            />
            
            <AmbientIndicators />
          </div>
          
          {/* Right: Global Actions */}
          <div className="flex items-center gap-4">
            {/* GitHub Connection Panel
            <div className="min-w-0">
              <GitHubConnectPanel />
            </div> */}

            {/* Provision Workspace */}
            {/* <motion.div className="relative">
              {workspaceStatus === 'provisioning' && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/90 text-white/70 text-xs px-2 py-1 rounded whitespace-nowrap">
                  {progressText}
                </div>
              )}
              
              <motion.button
                onClick={onProvisionWorkspace}
                disabled={workspaceStatus === 'provisioning'}
                className={`
                  group relative px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all
                  ${workspaceStatus === 'idle' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : workspaceStatus === 'provisioning'
                    ? 'bg-blue-600/50 text-white/70 cursor-not-allowed'
                    : workspaceStatus === 'active'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                  }
                `}
                whileHover={workspaceStatus !== 'provisioning' ? { scale: 1.02 } : {}}
                whileTap={workspaceStatus !== 'provisioning' ? { scale: 0.95 } : {}}
                title={
                  workspaceStatus === 'active' 
                    ? progressText 
                    : workspaceError 
                    ? workspaceError 
                    : 'Provision workspace'
                }
              >
                {workspaceStatus === 'provisioning' && <Loader2 className="w-4 h-4 animate-spin" />}
                {workspaceStatus === 'idle' && <Server className="w-4 h-4" />}
                {workspaceStatus === 'active' && <CheckCircle className="w-4 h-4" />}
                {workspaceStatus === 'error' && <AlertCircle className="w-4 h-4" />}
                
                <span>
                  {workspaceStatus === 'idle' && 'Provision'}
                  {workspaceStatus === 'provisioning' && 'Provisioning...'}
                  {workspaceStatus === 'active' && 'Active'}
                  {workspaceStatus === 'error' && 'Error'}
                </span>
              </motion.button>
              
              {workspaceError && (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-red-900/90 text-red-200 text-xs px-2 py-1 rounded whitespace-nowrap max-w-xs truncate">
                  {workspaceError}
                </div>
              )}
            </motion.div> */}

            {/* New Task - Always visible */}
            <motion.button
              onClick={() => {
                setInitialDraftCodePath(null);
                setShowNewDraftModal(true);
              }}
              className="group relative"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Adaptive styling based on state */}
              {processing.length === 0 ? (
                // Primary style when no tasks
                <>
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl opacity-0 group-hover:opacity-50 blur transition-opacity" />
                  <div className="relative px-5 py-2.5 bg-white text-black rounded-xl font-medium text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>New Task</span>
                    <kbd className="hidden group-hover:inline-block text-[10px] bg-black/10 px-1.5 py-0.5 rounded">
                      N
                    </kbd>
                  </div>
                </>
              ) : (
                // Secondary style when tasks active
                <div className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/70 rounded-lg font-medium text-sm flex items-center gap-1.5 transition-all">
                  <Plus className="w-4 h-4" />
                  <span>New</span>
                </div>
              )}
            </motion.button>
            
            {/* Close Split - Only when in split view */}
            {selectedSession && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSelectedSession(null)}
                className="p-2 text-white/40 hover:text-white/60 hover:bg-white/10 rounded-lg transition-all"
                title="Close split view (Esc)"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;