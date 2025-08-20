import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";

export type ProviderOption = {
  value: string;
  label: string;
  description?: string;
};

type ProviderSelectorProps = {
  providers: ProviderOption[];
  value: string | null | undefined;
  onChange: (value: string) => void;
  stored?: Set<string> | string[];
  disabled?: boolean;
  name?: string;
  ariaLabel?: string;
  className?: string;
};

const toSet = (s?: Set<string> | string[]) =>
  s instanceof Set ? s : new Set(s ?? []);

const ProviderGlyph = ({ label }: { label: string }) => {
  const initial = (label?.trim()?.[0] || "?").toUpperCase();
  return (
    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/80">
      <span className="text-sm font-medium">{initial}</span>
    </div>
  );
};

const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  providers,
  value,
  onChange,
  stored,
  disabled = false,
  name,
  ariaLabel = "Model provider",
  className = "",
}) => {
  const groupId = useId();
  const groupName = name || `provider-${groupId}`;
  const storedSet = useMemo(() => toSet(stored), [stored]);

  const selectedIndex = Math.max(
    0,
    providers.findIndex((p) => p.value === value)
  );
  const [focusIndex, setFocusIndex] = useState(selectedIndex);

  useEffect(() => {
    if (selectedIndex !== focusIndex) setFocusIndex(selectedIndex);
  }, [selectedIndex]);

  const itemRefs = useRef<Array<HTMLInputElement | null>>([]);

  const move = (delta: number) => {
    if (!providers.length) return;
    const next = (focusIndex + delta + providers.length) % providers.length;
    setFocusIndex(next);
    const nextOpt = providers[next];
    onChange(nextOpt.value);
    requestAnimationFrame(() => itemRefs.current[next]?.focus());
  };

  if (!providers.length) {
    return (
      <div className={`text-sm text-white/60 ${className}`}>
        No providers available.
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={`${className}`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {providers.map((opt, i) => {
          const checked = value === opt.value;
          const isStored = storedSet.has(opt.value);
          return (
            <label
              key={opt.value}
              htmlFor={`${groupName}-${opt.value}`}
              className={`
                group relative cursor-pointer rounded-xl border 
                ${checked ? "border-white/30 bg-white/[0.08]" : "border-white/10 bg-white/[0.03]"}
                transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]
                hover:bg-white/[0.06] hover:border-white/20
                ${disabled ? "opacity-50 cursor-not-allowed" : "hover:-translate-y-[1px] active:translate-y-[0.5px]"}
                focus-within:ring-2 focus-within:ring-white/30
              `}
              style={{ borderRadius: "12px" }}
            >
              <input
                ref={(el) => (itemRefs.current[i] = el)}
                type="radio"
                id={`${groupName}-${opt.value}`}
                name={groupName}
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                disabled={disabled}
                className="sr-only"
                onKeyDown={(e) => {
                  if (disabled) return;
                  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                    e.preventDefault();
                    move(1);
                  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                    e.preventDefault();
                    move(-1);
                  } else if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    onChange(opt.value);
                  }
                }}
              />

              <div className="p-4 flex items-start gap-3">
                <div className="relative">
                  <ProviderGlyph label={opt.label} />
                  {checked && (
                    <div className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-white/80 text-black flex items-center justify-center shadow">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-white/90 font-medium">
                      {opt.label}
                    </div>
                    {isStored && (
                      <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] tracking-wide bg-emerald-500/20 text-emerald-300">
                        Stored
                      </span>
                    )}
                  </div>
                  {opt.description && (
                    <div className="mt-0.5 text-xs text-white/60 font-light truncate">
                      {opt.description}
                    </div>
                  )}
                </div>
              </div>

              <div className="pointer-events-none absolute inset-0 rounded-xl ring-0 group-focus-within:ring-2 ring-white/30" />
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default ProviderSelector;
