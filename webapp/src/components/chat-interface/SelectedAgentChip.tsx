import React from "react";
import { X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectedAgentChipProps = {
  label: string;
  command?: string;
  onClear: () => void;
  className?: string;
  size?: "sm" | "md";
  icon?: React.ReactNode;
  ariaLabel?: string;
};

export const SelectedAgentChip: React.FC<SelectedAgentChipProps> = ({
  label,
  command,
  onClear,
  className,
  size = "md",
  icon,
  ariaLabel,
}) => {
  const isSm = size === "sm";

  return (
    <div
      className={cn(
        "inline-flex items-center group",
        // Distinct look vs model selector: glass + gradient + ring accent + subtle inner border
        "rounded-xl border border-white/10 bg-gradient-to-br from-[#2A2D3A]/70 via-[#1D2030]/70 to-[#121420]/70 backdrop-blur",
        "ring-1 ring-inset ring-[#67E8F9]/20",
        "text-white/90 select-none",
        isSm ? "px-2 py-1 gap-1.5" : "px-2.5 py-1.5 gap-2",
        "shadow-[0_10px_30px_rgba(0,0,0,0.35)]",
        "transition-all",
        "hover:ring-[#67E8F9]/35 hover:shadow-[0_14px_40px_rgba(0,0,0,0.45)]",
        className
      )}
      role="status"
      aria-label={
        ariaLabel || `Selected agent: ${label}${command ? ` (${command})` : ""}`
      }
      data-testid="selected-agent-chip"
    >
      <span className={cn("flex items-center", isSm ? "gap-1" : "gap-1.5")}>
        {/* Agent badge */}
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-md",
            "bg-[#0EA5E9]/15 text-[#67E8F9] border border-[#67E8F9]/25",
            isSm ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-[11px]"
          )}
          aria-hidden
        >
          {icon ??
            (label?.[0]?.toUpperCase() || (
              <Sparkles className={cn(isSm ? "h-3.5 w-3.5" : "h-4 w-4")} />
            ))}
        </span>
        {/* Primary label */}
        <span
          className={cn(
            "font-semibold tracking-tight",
            isSm ? "text-[12px]" : "text-[13px]"
          )}
        >
          {label}
        </span>
        {/* Command tag (monospace capsule) */}
        {command && (
          <span
            className={cn(
              "px-1.5 rounded-md font-mono",
              "bg-white/5 text-white/70 border border-white/10",
              isSm ? "text-[10px] py-0" : "text-[11px] py-[1px]"
            )}
          >
            {command}
          </span>
        )}
      </span>

      <button
        type="button"
        onClick={onClear}
        className={cn(
          "relative -ml-0.5 -mr-0.5 inline-flex items-center justify-center rounded-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
          "focus-visible:ring-[#67E8F9]/50",
          isSm ? "h-5 w-5" : "h-5.5 w-5.5"
        )}
        aria-label={`Clear ${label}`}
        title="Clear"
      >
        <X
          className={cn(
            "text-white/60 group-hover:text-white/85 transition-colors",
            isSm ? "h-3 w-3" : "h-3.5 w-3.5"
          )}
        />
      </button>
    </div>
  );
};

export default SelectedAgentChip;
