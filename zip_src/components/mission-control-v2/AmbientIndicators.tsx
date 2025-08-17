import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Save, GitBranch } from 'lucide-react';
import { useMissionControlStore } from '@/stores/missionControlStore';

const AmbientIndicators: React.FC = () => {
  const { sessions, selectedSession } = useMissionControlStore();
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [lastCheckpointTime, setLastCheckpointTime] = useState<Date | null>(null);
  
  const hasActiveTasks = sessions.some(s => s.status === 'working' || s.status === 'processing');
  
  // Listen for checkpoint events
  useEffect(() => {
    const unsubscribe = useMissionControlStore.subscribe(
      (state) => state.lastCheckpointSaved,
      (timestamp) => {
        if (timestamp) {
          setShowSaveIndicator(true);
          setLastCheckpointTime(new Date(timestamp));
          // Hide after 2 seconds
          setTimeout(() => setShowSaveIndicator(false), 2000);
        }
      }
    );
    return unsubscribe;
  }, []);
  
  if (!hasActiveTasks) return null;
  
  return (
    <div className="flex items-center gap-3 text-xs text-white/30">
      {/* Persistent indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3"
      >
        <span className="flex items-center gap-1">
          <GitBranch className="w-3 h-3" />
          <span>Isolated</span>
        </span>
        
        <span className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          <span>Protected</span>
        </span>
      </motion.div>
      
      {/* Transient save indicator */}
      <AnimatePresence>
        {showSaveIndicator && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="flex items-center gap-1 text-green-400/60"
          >
            <Save className="w-3 h-3" />
            <span>Saved</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AmbientIndicators;