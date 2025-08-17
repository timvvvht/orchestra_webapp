import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModelDefinition } from '@/utils/modelDefinitions';

interface ModelSelectorProps {
  // Data
  currentModelId: string | null;
  availableModels: ModelDefinition[];
  currentModel: ModelDefinition;
  
  // State
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  
  // Actions
  onModelSelect: (model: ModelDefinition) => void;
  
  // Styling
  className?: string;
}

/**
 * ModelSelector - Dropdown component for selecting AI models
 * 
 * Features:
 * - Displays current model with provider info
 * - Dropdown with available models grouped by provider
 * - Visual indicators for selected model
 * - Smooth animations
 * - Click outside to close
 */
export const ModelSelector: React.FC<ModelSelectorProps> = ({
  currentModelId,
  availableModels,
  currentModel,
  isOpen,
  onToggle,
  onClose,
  onModelSelect,
  className
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Handle click outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);
  
  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Model Selector Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full",
          "bg-white/[0.06] hover:bg-white/[0.1]",
          "border border-white/[0.08] hover:border-white/[0.12]",
          "transition-all group",
          isOpen && "bg-white/[0.1] border-white/[0.15]"
        )}
      >
        <div className={cn(
          "w-2 h-2 rounded-full",
          "bg-[#10B981] animate-pulse"
        )} />
        <span className="text-[13px] font-medium text-white/90 truncate max-w-[120px]">
          {currentModel?.shortName || currentModel?.name || 'No Model'}
        </span>
        <ChevronDown className={cn(
          "w-3 h-3 text-white/40 group-hover:text-white/60 transition-all",
          isOpen && "rotate-180 text-white/60"
        )} />
      </motion.button>

      {/* Model Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute top-full left-0 mt-2 w-80 z-50",
              "bg-black/95 backdrop-blur-xl border border-white/[0.08]",
              "rounded-xl shadow-2xl overflow-hidden"
            )}
          >
            <div className="p-2">
              <div className="text-xs text-white/50 px-3 py-2 font-medium">
                Available Models
              </div>
              <div className="max-h-64 overflow-y-auto">
                {availableModels.map((model) => (
                  <motion.button
                    key={model.id}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    onClick={() => onModelSelect(model)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
                      "text-left transition-colors",
                      currentModelId === model.id && "bg-white/[0.08]"
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      currentModelId === model.id ? "bg-[#10B981]" : "bg-white/20"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-white/90 truncate">
                          {model.name}
                        </div>
                        <div className="text-xs text-white/40 px-1.5 py-0.5 bg-white/[0.06] rounded">
                          {model.provider}
                        </div>
                      </div>
                      <div className="text-xs text-white/50 truncate">
                        {model.description}
                      </div>
                    </div>
                    {currentModelId === model.id && (
                      <Check className="w-3 h-3 text-[#10B981]" />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModelSelector;