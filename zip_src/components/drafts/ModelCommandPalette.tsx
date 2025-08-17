import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Zap, 
  Coins, 
  Sliders, 
  GitBranch, 
  Check,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleModelOverrides } from "@/utils/sendChatMessage";

export interface ModelPreset {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action: 'preset' | 'toggle' | 'custom';
  config?: {
    modelMode: 'auto' | 'single';
    roleModelOverrides?: RoleModelOverrides;
    explicitModelId?: string;
  };
  tags: string[];
}

export interface ModelCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: ModelPreset) => void;
  onToggleWorktree: () => void;
  onCustomConfig: (config: RoleModelOverrides) => void;
  currentSettings: {
    enableWorktrees: boolean;
    modelMode: 'auto' | 'single';
    roleModelOverrides?: RoleModelOverrides;
    explicitModelId?: string;
  };
}

const MODEL_PRESETS: ModelPreset[] = [
  {
    id: 'smart-mode',
    label: 'Smart Mode',
    description: 'Best model for each task automatically',
    icon: Sparkles,
    shortcut: '⌘1',
    action: 'preset',
    config: {
      modelMode: 'auto',
      roleModelOverrides: {
        explore: 'gpt-4.1',
        plan: 'o3',
        execute: 'claude-4-sonnet',
        debug: 'o3'
      }
    },
    tags: ['auto', 'smart', 'best', 'quality']
  },
  {
    id: 'speed-mode',
    label: 'Speed Mode',
    description: 'Fastest response times',
    icon: Zap,
    shortcut: '⌘2',
    action: 'preset',
    config: {
      modelMode: 'single',
      explicitModelId: 'gpt-4-turbo'
    },
    tags: ['fast', 'speed', 'quick', 'performance']
  },
  {
    id: 'economy-mode',
    label: 'Economy Mode',
    description: 'Cost-optimized model selection',
    icon: Coins,
    shortcut: '⌘3',
    action: 'preset',
    config: {
      modelMode: 'auto',
      roleModelOverrides: {
        explore: 'z-ai/glm-4.5',
        plan: 'o3',
        execute: 'z-ai/glm-4.5',
        debug: 'o3'
      }
    },
    tags: ['cheap', 'economy', 'budget', 'cost']
  },
  {
    id: 'custom-mode',
    label: 'Custom Configuration',
    description: 'Fine-tune model selection per role',
    icon: Sliders,
    shortcut: '⌘4',
    action: 'custom',
    tags: ['custom', 'advanced', 'manual']
  },
  {
    id: 'toggle-worktree',
    label: 'Toggle Workspace Isolation',
    description: 'Enable/disable worktree creation',
    icon: GitBranch,
    action: 'toggle',
    tags: ['worktree', 'git', 'workspace', 'isolation']
  }
];

const getModelsForRole = (role: keyof RoleModelOverrides): string[] => {
  switch (role) {
    case 'explore':
      return ['gpt-4.1', 'gemini-2.5-pro-preview-05-06', 'z-ai/glm-4.5'];
    case 'plan':
      return ['o3'];
    case 'execute':
      return ['claude-4-sonnet', 'z-ai/glm-4.5'];
    case 'debug':
      return ['o3'];
    default:
      return [];
  }
};

const CommandOption: React.FC<{
  option: ModelPreset;
  isSelected: boolean;
  isCurrent: boolean;
  onClick: () => void;
}> = ({ option, isSelected, isCurrent, onClick }) => {
  const Icon = option.icon;
  
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 transition-all",
        "hover:bg-white/[0.05]",
        isSelected && "bg-white/[0.08]"
      )}
      onClick={onClick}
    >
      <Icon className={cn(
        "w-4 h-4 flex-shrink-0",
        isSelected ? "text-white/70" : "text-white/40"
      )} />
      
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm",
            isSelected ? "text-white/90" : "text-white/70"
          )}>
            {option.label}
          </span>
          {option.shortcut && (
            <kbd className={cn(
              "text-[10px] px-1.5 py-0.5 rounded",
              "bg-white/10 text-white/50"
            )}>
              {option.shortcut}
            </kbd>
          )}
        </div>
        <span className={cn(
          "text-xs",
          isSelected ? "text-white/60" : "text-white/40"
        )}>
          {option.description}
        </span>
      </div>
      
      {/* Current indicator */}
      {isCurrent && (
        <div className="w-2 h-2 rounded-full bg-green-500/80" />
      )}
    </button>
  );
};

const CustomModelPalette: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: RoleModelOverrides) => void;
  initialConfig: RoleModelOverrides;
}> = ({ isOpen, onClose, onSave, initialConfig }) => {
  const [config, setConfig] = useState<RoleModelOverrides>(initialConfig);

  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[62] bg-black/20"
            onClick={onClose}
          />
          
          {/* Custom palette */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[63] w-[400px]"
          >
            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white/90">
                  Custom Model Configuration
                </h3>
                <button
                  onClick={onClose}
                  className="p-1 rounded hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>
              
              {(['explore', 'plan', 'execute', 'debug'] as const).map(role => (
                <div key={role} className="flex items-center gap-3 mb-3">
                  <span className="text-xs text-white/50 w-16 capitalize">
                    {role}
                  </span>
                  <select
                    value={config[role] || ''}
                    onChange={(e) => setConfig({ ...config, [role]: e.target.value })}
                    className="flex-1 bg-white/[0.05] border border-white/10 rounded px-3 py-1.5 text-xs text-white/90 focus:outline-none focus:border-white/20"
                  >
                    <option value="">Select model...</option>
                    {getModelsForRole(role).map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>
              ))}
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-3 py-1.5 text-xs text-white/60 hover:text-white/80"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onSave(config);
                    onClose();
                  }}
                  className="flex-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium"
                >
                  Apply
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export const ModelCommandPalette: React.FC<ModelCommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  onToggleWorktree,
  onCustomConfig,
  currentSettings
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showCustomPalette, setShowCustomPalette] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset search and selection when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[selectedIndex]) {
          handleSelect(filteredOptions[selectedIndex]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
        
      // Number shortcuts (1-4)
      case '1':
      case '2':
      case '3':
      case '4':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          const preset = MODEL_PRESETS[parseInt(e.key) - 1];
          if (preset) handleSelect(preset);
        }
        break;
    }
  };

  // Filter options based on search query
  const filteredOptions = MODEL_PRESETS.filter(option => {
    if (!searchQuery) return true;
    
    const searchText = `${option.label} ${option.description} ${option.tags.join(' ')}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return searchText.includes(query);
  });

  // Handle option selection
  const handleSelect = (option: ModelPreset) => {
    switch (option.action) {
      case 'preset':
        onSelectPreset(option);
        onClose();
        break;
        
      case 'toggle':
        onToggleWorktree();
        onClose();
        break;
        
      case 'custom':
        setShowCustomPalette(true);
        break;
    }
  };

  // Check if an option represents the current settings
  const isCurrentSetting = (option: ModelPreset): boolean => {
    if (option.id === 'toggle-worktree') {
      return currentSettings.enableWorktrees;
    }
    
    if (option.config) {
      if (option.config.modelMode === 'auto' && currentSettings.modelMode === 'auto') {
        return JSON.stringify(option.config.roleModelOverrides) === 
               JSON.stringify(currentSettings.roleModelOverrides);
      }
      
      if (option.config.modelMode === 'single' && currentSettings.modelMode === 'single') {
        return option.config.explicitModelId === currentSettings.explicitModelId;
      }
    }
    
    return false;
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/20"
            onClick={onClose}
          />
          
          {/* Main palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -20 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[61] w-[400px] max-h-[320px]"
          >
            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="p-3 border-b border-white/5">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search settings..."
                  className="w-full bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              
              {/* Options list */}
              <div className="py-1 max-h-[250px] overflow-y-auto">
                {filteredOptions.map((option, index) => (
                  <CommandOption
                    key={option.id}
                    option={option}
                    isSelected={selectedIndex === index}
                    isCurrent={isCurrentSetting(option)}
                    onClick={() => handleSelect(option)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
          
          {/* Custom palette */}
          <CustomModelPalette
            isOpen={showCustomPalette}
            onClose={() => setShowCustomPalette(false)}
            onSave={onCustomConfig}
            initialConfig={currentSettings.roleModelOverrides || {}}
          />
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};