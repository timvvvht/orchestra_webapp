/**
 * Permissions Modal Component
 * Allows users to customize access policies per session
 */

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, RotateCcw, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSessionPermissionsStore } from '@/store/sessionPermissionsStore';
import type { AccessPolicy } from '@/services/localTool/types';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  currentCwd: string;
}

interface PatternListProps {
  title: string;
  description: string;
  patterns: string[];
  onPatternsChange: (patterns: string[]) => void;
  placeholder: string;
  icon: React.ReactNode;
  variant?: 'default' | 'destructive' | 'warning';
}

const PatternList: React.FC<PatternListProps> = ({
  title,
  description,
  patterns,
  onPatternsChange,
  placeholder,
  icon,
  variant = 'default'
}) => {
  const [newPattern, setNewPattern] = useState('');

  const addPattern = () => {
    if (newPattern.trim() && !patterns.includes(newPattern.trim())) {
      onPatternsChange([...patterns, newPattern.trim()]);
      setNewPattern('');
    }
  };

  const removePattern = (index: number) => {
    onPatternsChange(patterns.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPattern();
    }
  };

  const getBadgeVariant = () => {
    switch (variant) {
      case 'destructive': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <Label className="text-sm font-medium">{title}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          value={newPattern}
          onChange={(e) => setNewPattern(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          onClick={addPattern}
          disabled={!newPattern.trim() || patterns.includes(newPattern.trim())}
          size="sm"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {patterns.length === 0 ? (
          <span className="text-xs text-muted-foreground italic">No patterns defined</span>
        ) : (
          patterns.map((pattern, index) => (
            <Badge key={index} variant={getBadgeVariant()} className="flex items-center gap-1">
              <span className="text-xs">{pattern}</span>
              <button
                onClick={() => removePattern(index)}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>
    </div>
  );
};

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  currentCwd
}) => {
  const {
    getSessionPermissions,
    setSessionPermissions,
    resetSessionPermissions,
    hasCustomPermissions
  } = useSessionPermissionsStore();

  const [accessPolicy, setAccessPolicy] = useState<AccessPolicy>({
    whitelist: [`${currentCwd}/**`],
    blacklist: ['**/*.env', '**/*.log'],
    shell_forbidden_patterns: ['rm -rf*', 'sudo*']
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isCustomized = hasCustomPermissions(sessionId);

  // Load existing permissions when modal opens
  useEffect(() => {
    if (isOpen && sessionId) {
      const existingPermissions = getSessionPermissions(sessionId);
      if (existingPermissions) {
        setAccessPolicy(existingPermissions.accessPolicy);
      } else {
        // Set default permissions
        const defaultPolicy: AccessPolicy = {
          whitelist: [`${currentCwd}/**`],
          blacklist: ['**/*.env', '**/*.log'],
          shell_forbidden_patterns: ['rm -rf*', 'sudo*']
        };
        setAccessPolicy(defaultPolicy);
      }
      setHasUnsavedChanges(false);
    }
  }, [isOpen, sessionId, currentCwd, getSessionPermissions]);

  // Track changes
  useEffect(() => {
    const existingPermissions = getSessionPermissions(sessionId);
    if (existingPermissions) {
      const hasChanges = JSON.stringify(accessPolicy) !== JSON.stringify(existingPermissions.accessPolicy);
      setHasUnsavedChanges(hasChanges);
    } else {
      setHasUnsavedChanges(true);
    }
  }, [accessPolicy, sessionId, getSessionPermissions]);

  const handleSave = () => {
    setSessionPermissions(sessionId, accessPolicy, true);
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleReset = () => {
    resetSessionPermissions(sessionId, currentCwd);
    const defaultPolicy: AccessPolicy = {
      whitelist: [`${currentCwd}/**`],
      blacklist: ['**/*.env', '**/*.log'],
      shell_forbidden_patterns: ['rm -rf*', 'sudo*']
    };
    setAccessPolicy(defaultPolicy);
    setHasUnsavedChanges(false);
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <div>
              <h2 className="text-lg font-semibold">Session Permissions</h2>
              <p className="text-sm text-muted-foreground">
                Session: {sessionId.slice(0, 8)}... • CWD: {currentCwd}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCustomized && (
              <Badge variant="secondary" className="text-xs">
                Customized
              </Badge>
            )}
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-xs text-orange-600">
                Unsaved
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">Security Notice</p>
              <p className="text-yellow-700 dark:text-yellow-300">
                These permissions control what files and commands local tools can access. 
                Be careful when modifying these settings.
              </p>
            </div>
          </div>

          {/* Whitelist */}
          <PatternList
            title="Whitelist"
            description="File patterns that tools are allowed to access"
            patterns={accessPolicy.whitelist || []}
            onPatternsChange={(patterns) => 
              setAccessPolicy(prev => ({ ...prev, whitelist: patterns }))
            }
            placeholder="/path/to/allowed/files/**"
            icon={<Shield className="h-4 w-4 text-green-500" />}
            variant="default"
          />

          <Separator />

          {/* Blacklist */}
          <PatternList
            title="Blacklist"
            description="File patterns that tools are forbidden to access"
            patterns={accessPolicy.blacklist || []}
            onPatternsChange={(patterns) => 
              setAccessPolicy(prev => ({ ...prev, blacklist: patterns }))
            }
            placeholder="**/*.secret"
            icon={<X className="h-4 w-4 text-red-500" />}
            variant="destructive"
          />

          <Separator />

          {/* Shell Forbidden Patterns */}
          <PatternList
            title="Forbidden Commands"
            description="Shell command patterns that are not allowed"
            patterns={accessPolicy.shell_forbidden_patterns || []}
            onPatternsChange={(patterns) => 
              setAccessPolicy(prev => ({ ...prev, shell_forbidden_patterns: patterns }))
            }
            placeholder="rm -rf*"
            icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
            variant="warning"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Save Permissions
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionsModal;