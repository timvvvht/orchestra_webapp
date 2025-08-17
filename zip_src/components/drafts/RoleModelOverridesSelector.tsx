/**
 * Role Model Overrides Selector Component
 * 
 * Provides UI for selecting model overrides for each of the 4 ACS roles:
 * - explore: For exploration and analysis tasks
 * - plan: For planning and strategy tasks  
 * - execute: For execution and implementation tasks
 * - debug: For debugging and troubleshooting tasks
 */

import React, { useEffect, useState } from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AVAILABLE_MODELS } from '@/utils/modelDefinitions';
import { 
  RoleModelOverrides, 
  ACSRoles, 
  EXPLORE_MODELS, 
  DEBUG_MODELS, 
  PLAN_MODELS, 
  EXECUTE_MODELS,
  getModelsForRole 
} from '@/utils/sendChatMessage';
import { cn } from '@/lib/utils';

interface RoleModelOverridesSelectorProps {
  /** Current role model overrides */
  roleModelOverrides?: RoleModelOverrides;
  /** Called when role model overrides change */
  onChange: (overrides: RoleModelOverrides) => void;
  /** Optional CSS class names */
  className?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
}

/**
 * Role configuration data for UI rendering
 */
interface RoleConfig {
  id: ACSRoles;
  label: string;
  description: string;
  models: readonly string[];
  defaultModel?: string;
}

const ROLE_CONFIGS: RoleConfig[] = [
  {
    id: 'explore',
    label: 'Explore',
    description: 'For exploration and analysis tasks - investigates problems and gathers information',
    models: EXPLORE_MODELS,
    defaultModel: 'gpt-4.1'
  },
  {
    id: 'plan', 
    label: 'Plan',
    description: 'For planning and strategy tasks - creates architectural plans and breaks down work',
    models: PLAN_MODELS,
    defaultModel: 'o3'
  },
  {
    id: 'execute',
    label: 'Execute', 
    description: 'For execution and implementation tasks - writes code and implements solutions',
    models: EXECUTE_MODELS,
    defaultModel: 'claude-4-sonnet'
  },
  {
    id: 'debug',
    label: 'Debug',
    description: 'For debugging and troubleshooting tasks - identifies and fixes issues',
    models: DEBUG_MODELS,
    defaultModel: 'o3'
  }
];

/**
 * Component for selecting model overrides for each ACS role
 */
export const RoleModelOverridesSelector: React.FC<RoleModelOverridesSelectorProps> = ({
  roleModelOverrides = {},
  onChange,
  className,
  disabled = false
}) => {
  // Internal state to manage the overrides
  const [internalOverrides, setInternalOverrides] = useState<RoleModelOverrides>(roleModelOverrides);

  // Sync with props when they change
  useEffect(() => {
    setInternalOverrides(roleModelOverrides || {});
  }, [roleModelOverrides]);

  /**
   * Handle model selection change for a specific role
   */
  const handleRoleModelChange = (role: ACSRoles, modelId: string | undefined) => {
    const newOverrides = { ...internalOverrides };
    
    if (modelId) {
      newOverrides[role] = modelId;
    } else {
      // Remove the override if no model selected
      delete newOverrides[role];
    }
    
    setInternalOverrides(newOverrides);
    onChange(newOverrides);
  };

  /**
   * Get display name for a model ID
   */
  const getModelDisplayName = (modelId: string): string => {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    return model ? model.name : modelId;
  };

  /**
   * Check if a model is the default for its role
   */
  const isDefaultModel = (role: ACSRoles, modelId: string): boolean => {
    const roleConfig = ROLE_CONFIGS.find(r => r.id === role);
    return roleConfig?.defaultModel === modelId;
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white/90">
            Role Model Overrides
          </h3>
          <p className="text-xs text-white/60 mt-1">
            Override the default AI model for each agent role
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {ROLE_CONFIGS.map((roleConfig) => {
          const currentValue = internalOverrides[roleConfig.id];
          const availableModels = getModelsForRole(roleConfig.id);

          return (
            <div key={roleConfig.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white/80">
                    {roleConfig.label}
                  </span>
                  {currentValue && isDefaultModel(roleConfig.id, currentValue) && (
                    <span className="text-xs px-1.5 py-0.5 bg-white/10 text-white/60 rounded">
                      Default
                    </span>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-white/50 leading-relaxed">
                {roleConfig.description}
              </p>

              <Select
                value={currentValue ?? '__default__'}
                onValueChange={(value) => 
                  handleRoleModelChange(
                    roleConfig.id, 
                    value === '__default__' ? undefined : value
                  )
                }
                disabled={disabled}
              >
                <SelectTrigger className="w-full h-8 px-3 py-1 text-sm">
                  <SelectValue placeholder="Use default model">
                    {currentValue ? getModelDisplayName(currentValue) : 'Use default model'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {/* Option to use default model */}
                  <SelectItem value="__default__">
                    <span className="text-white/70">Use default model</span>
                  </SelectItem>
                  
                  {/* Available model options */}
                  {availableModels.map((modelId) => (
                    <SelectItem key={modelId} value={modelId}>
                      <div className="flex items-center gap-2">
                        <span>{getModelDisplayName(modelId)}</span>
                        {isDefaultModel(roleConfig.id, modelId) && (
                          <span className="text-xs text-white/50">(default)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      {/* Help text */}
      <div className="pt-2 border-t border-white/10">
        <p className="text-xs text-white/40">
          These overrides will be applied when auto mode is enabled. Each role will use the selected model instead of its default.
        </p>
      </div>
    </div>
  );
};