import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { RoleModelOverridesSelector } from './RoleModelOverridesSelector';
import { Shield, Sparkles, FolderOpen, Trash2, Plus, ChevronDown } from 'lucide-react';

export interface AdvancedOptionsPanelProps {
  open: boolean;
  onClose: () => void;
}

export const AdvancedOptionsPanel: React.FC<AdvancedOptionsPanelProps> = ({ open, onClose }) => {
  // State for the advanced options
  const [allowedDirs, setAllowedDirs] = useState<string[]>([]);
  const [newAllowedDir, setNewAllowedDir] = useState('');
  const [autoMode, setAutoMode] = useState(false);
  const [roleModelOverrides, setRoleModelOverrides] = useState<Record<string, string>>({});
  
  const panelRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle Escape key
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Focus management
  useEffect(() => {
    if (!open) return;

    // Save current active element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus first focusable element in panel
    const firstFocusable = panelRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;
    
    if (firstFocusable) {
      firstFocusable.focus();
    }

    return () => {
      // Restore focus when closing
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [open]);

  const addAllowedDir = () => {
    if (newAllowedDir.trim()) {
      setAllowedDirs(prev => [...prev, newAllowedDir.trim()]);
      setNewAllowedDir('');
    }
  };

  const removeAllowedDir = (index: number) => {
    setAllowedDirs(prev => prev.filter((_, i) => i !== index));
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        data-testid="adv-backdrop" 
        className={cn('adv-backdrop', open && 'adv-backdrop-open')} 
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <aside
        ref={panelRef}
        data-testid="adv-panel"
        role="dialog"
        aria-label="Advanced Options Panel"
        aria-modal="true"
        className={cn('adv-panel', open && 'adv-panel-open')}
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Advanced Options</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              aria-label="Close advanced options"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Role Model Overrides */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-white/60" />
              <h3 className="text-sm font-semibold text-white/80 tracking-tight">Role Model Overrides</h3>
            </div>
            <RoleModelOverridesSelector
              roleModelOverrides={roleModelOverrides}
              onChange={(overrides) => {
                setRoleModelOverrides(overrides);
              }}
              className="w-full"
            />
          </div>

          {/* Section divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-transparent text-white/40">Configuration</span>
            </div>
          </div>

          {/* Auto Mode Configuration */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-white/60" />
              <h3 className="text-sm font-semibold text-white/80 tracking-tight">Auto Mode Configuration</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/10 rounded-lg">
                <div>
                  <h4 className="text-sm font-semibold text-white/90">Auto Mode</h4>
                  <p className="text-xs text-white/50 mt-1">Let Orchestra choose the best models automatically</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white transition-colors">
                    Enable
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Settings */}
          <div>
            <h3 className="text-sm font-semibold text-white/80 mb-3 tracking-tight">Additional Settings</h3>
            <div className="space-y-3">
              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-lg">
                <h4 className="text-sm font-medium text-white/90 mb-2">Allowed Directories</h4>
                <div className="space-y-2">
                  {allowedDirs.map((dir, index) => (
                    <div key={index} className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg transition-all duration-200 border border-white/10">
                      <FolderOpen className="w-3 h-3 text-white/40" />
                      <span className="flex-1 font-mono text-xs text-white/70">{dir}</span>
                      <button
                        onClick={() => removeAllowedDir(index)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/60 transition-all duration-200"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  
                  {allowedDirs.length === 0 && (
                    <div className="py-6 text-center">
                      <Shield className="w-8 h-8 mx-auto text-white/20 mb-2" />
                      <p className="text-white/50 text-xs font-light">No additional folders specified</p>
                      <p className="text-white/30 text-xs mt-1 font-light">Agent has access to the main codebase path above</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};