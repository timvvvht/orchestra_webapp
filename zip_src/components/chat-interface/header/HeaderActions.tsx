import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Settings, Bug, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

interface HeaderActionsProps {
  // Actions
  onNewChat: () => void;
  onToggleDebug?: () => void;
  onToggleSettings?: () => void;
  
  // Refined Mode
  refinedMode: boolean;
  onRefinedModeChange: (enabled: boolean) => void;
  
  // State
  showDebugToggle?: boolean;
  showSettingsToggle?: boolean;
  showRefinedMode?: boolean;
  
  // Styling
  className?: string;
}

/**
 * HeaderActions - Action buttons and toggles for the chat header
 * 
 * Features:
 * - New chat button
 * - Refined mode toggle
 * - Debug panel toggle
 * - Settings toggle
 * - Smooth animations
 * - Configurable visibility
 */
export const HeaderActions: React.FC<HeaderActionsProps> = ({
  onNewChat,
  onToggleDebug,
  onToggleSettings,
  refinedMode,
  onRefinedModeChange,
  showDebugToggle = false,
  showSettingsToggle = false,
  showRefinedMode = true,
  className
}) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Refined Mode Toggle */}
      {showRefinedMode && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] rounded-full">
          <Sparkles className={cn(
            "w-3 h-3 transition-colors",
            refinedMode ? "text-[#007AFF]" : "text-white/40"
          )} />
          <span className="text-xs text-white/60">Refined</span>
          <Switch
            checked={refinedMode}
            onCheckedChange={(checked) => {
              console.log('🔄 [HeaderActions] Refined mode toggle clicked:', { from: refinedMode, to: checked });
              onRefinedModeChange(checked);
            }}
            className="scale-75"
          />
        </div>
      )}
      
      {/* Debug Toggle */}
      {showDebugToggle && onToggleDebug && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleDebug}
          className={cn(
            "p-2 rounded-full",
            "bg-white/[0.04] hover:bg-white/[0.08]",
            "border border-white/[0.04] hover:border-white/[0.08]",
            "transition-all"
          )}
          title="Toggle Debug Panel"
        >
          <Bug className="w-4 h-4 text-white/60" />
        </motion.button>
      )}
      
      {/* Settings Toggle */}
      {showSettingsToggle && onToggleSettings && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleSettings}
          className={cn(
            "p-2 rounded-full",
            "bg-white/[0.04] hover:bg-white/[0.08]",
            "border border-white/[0.04] hover:border-white/[0.08]",
            "transition-all"
          )}
          title="Settings"
        >
          <Settings className="w-4 h-4 text-white/60" />
        </motion.button>
      )}
      
      {/* New Chat Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onNewChat}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full",
          "bg-[#007AFF] hover:bg-[#0056CC]",
          "text-white font-medium text-sm",
          "transition-all shadow-lg"
        )}
      >
        <Plus className="w-4 h-4" />
        <span>New Chat</span>
      </motion.button>
    </div>
  );
};

export default HeaderActions;