import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleModelOverrides } from "@/utils/sendChatMessage";
import { ModelCommandPalette, ModelPreset } from "./ModelCommandPalette";

export interface CommandPaletteAdvancedProps {
  open: boolean;
  onClose: () => void;
  onApply?: (settings: AdvancedSettings) => void;
  initialSettings?: AdvancedSettings;
}

export interface AdvancedSettings {
  enableWorktrees: boolean;
  modelMode: "auto" | "single";
  autoModePreset?: "best" | "cheaper";
  singleModelOverride?: string;
  roleModelOverrides?: RoleModelOverrides;
}

export const CommandPaletteAdvanced: React.FC<CommandPaletteAdvancedProps> = ({
  open,
  onClose,
  onApply,
  initialSettings,
}) => {
  // State for advanced settings
  const [enableWorktrees, setEnableWorktrees] = useState(
    initialSettings?.enableWorktrees ?? true
  );
  const [modelMode, setModelMode] = useState<"auto" | "single">(
    initialSettings?.modelMode ?? "single"
  );
  const [autoModePreset, setAutoModePreset] = useState<"best" | "cheaper">(
    initialSettings?.autoModePreset ?? "best"
  );
  const [singleModelOverride, setSingleModelOverride] = useState(
    initialSettings?.singleModelOverride ?? ""
  );
  const [roleModelOverrides, setRoleModelOverrides] = useState<RoleModelOverrides>(
    initialSettings?.roleModelOverrides || {}
  );

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscKey);
      return () => document.removeEventListener("keydown", handleEscKey);
    }
  }, [open, onClose]);

  // Handle preset selection
  const handlePresetSelect = (preset: ModelPreset) => {
    if (preset.config) {
      if (preset.config.modelMode === 'auto') {
        setModelMode('auto');
        setRoleModelOverrides(preset.config.roleModelOverrides || {});
        setSingleModelOverride('');
      } else {
        setModelMode('single');
        setSingleModelOverride(preset.config.explicitModelId || '');
        setRoleModelOverrides({});
      }
    }
  };

  // Handle worktree toggle
  const handleToggleWorktree = () => {
    setEnableWorktrees(!enableWorktrees);
  };

  // Handle custom config
  const handleCustomConfig = (config: RoleModelOverrides) => {
    setRoleModelOverrides(config);
    setModelMode('auto');
    setSingleModelOverride('');
  };

  // Apply settings when they change
  useEffect(() => {
    const settings: AdvancedSettings = {
      enableWorktrees,
      modelMode,
      autoModePreset: modelMode === "auto" ? autoModePreset : undefined,
      singleModelOverride: modelMode === "single" ? singleModelOverride : undefined,
      roleModelOverrides: modelMode === "auto" ? roleModelOverrides : undefined,
    };

    onApply?.(settings);
  }, [enableWorktrees, modelMode, autoModePreset, singleModelOverride, roleModelOverrides, onApply]);

  if (!open) return null;

  return (
    <ModelCommandPalette
      isOpen={open}
      onClose={onClose}
      onSelectPreset={handlePresetSelect}
      onToggleWorktree={handleToggleWorktree}
      onCustomConfig={handleCustomConfig}
      currentSettings={{
        enableWorktrees,
        modelMode,
        roleModelOverrides,
        explicitModelId: singleModelOverride
      }}
    />
  );
};
