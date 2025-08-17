import React from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, MessageSquare, Plus, Sparkles, X } from 'lucide-react';
import { ProjectContext } from '@/types/landingTypes';
import '@/styles/orchestra-transitions.css';

interface LandingPagePreludeProps {
  onModeSelect: (mode: 'chat' | 'project', projectPath?: string) => void;
  recentProjects: ProjectContext[];
  onRemoveRecent?: (path: string) => void;
}

export function LandingPagePrelude({
  onModeSelect,
  recentProjects,
  onRemoveRecent
}: LandingPagePreludeProps) {

  const handleFolderPick = async (isNewProject: boolean) => {
    if (!(window as any).__TAURI__) {
      alert('Folder picker is only available in the desktop app.');
      return;
    }

    const { open } = await import('@tauri-apps/plugin-dialog');

    try {
      const folderPath = await open({
        multiple: false,
        directory: true,
        title: isNewProject ? 'Select folder for new project' : 'Select project folder'
      });

      if (folderPath && typeof folderPath === 'string') {
        onModeSelect('project', folderPath);
      }
    } catch (error) {
      console.error('Error picking folder:', error);
      alert('Failed to select folder. Please try again.');
    }
  };

  const handleRecentProjectClick = (project: ProjectContext) => {
    // Update lastAccessed time
    onModeSelect('project', project.path);
  };

  return (
    <div className="orchestra-page">
      {/* Background - reuse from LandingPageInfinite */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-950" />
        <div
          className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"
          style={{ animation: 'float 24s ease-in-out infinite' }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"
          style={{ animation: 'float 24s ease-in-out infinite reverse' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="max-w-4xl w-full"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-sm mb-6"
            >
              <Sparkles className="w-6 h-6 text-white/60" />
            </motion.div>
            <h1 className="text-4xl font-extralight text-white mb-2">
              Welcome to Orchestra
            </h1>
            <p className="text-white/50 font-light">
              Choose how you'd like to begin
            </p>
          </div>

          {/* Three Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* New Project Card */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleFolderPick(true)}
              className="group p-8 bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-200 text-center"
            >
              <div className="flex justify-center mb-4">
                <Plus className="w-8 h-8 text-white/40 group-hover:text-white/60 transition-colors" />
              </div>
              <h3 className="text-lg font-light text-white mb-2">New Project</h3>
              <p className="text-sm text-white/50">Start something fresh</p>
            </motion.button>
            {/* Load Project Card */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleFolderPick(false)}
              className="group p-8 bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-200 text-center"
            >
              <div className="flex justify-center mb-4">
                <FolderOpen className="w-8 h-8 text-white/40 group-hover:text-white/60 transition-colors" />
              </div>
              <h3 className="text-lg font-light text-white mb-2">Load Project</h3>
              <p className="text-sm text-white/50">Continue where you left off</p>
            </motion.button>

            {/* Quick Chat Card */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onModeSelect('chat')}
              className="group p-8 bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-200 text-center"
            >
              <div className="flex justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-white/40 group-hover:text-white/60 transition-colors" />
              </div>
              <h3 className="text-lg font-light text-white mb-2">Quick Chat</h3>
              <p className="text-sm text-white/50">Brainstorm, search, vibe</p>
            </motion.button>


          </div>

          {/* Recent Projects */}
          {recentProjects.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <h4 className="text-sm text-white/40 mb-4">Recent Projects</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {recentProjects.map((project, index) => (
                  <motion.div
                    key={project.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="group relative"
                  >
                    <button
                      onClick={() => handleRecentProjectClick(project)}
                      className="w-full text-left p-3 bg-white/[0.02] rounded-lg hover:bg-white/[0.04] transition-all duration-200 pr-10"
                    >
                      <span className="text-sm text-white/70">{project.name}</span>
                      <span className="text-xs text-white/40 ml-2">
                        {project.path.replace(/^.*\/(?=.*\/)/, '.../')}
                      </span>
                    </button>
                    {onRemoveRecent && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveRecent(project.path);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white/40" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -20px) scale(1.05); }
          66% { transform: translate(-15px, 15px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}

export default LandingPagePrelude;