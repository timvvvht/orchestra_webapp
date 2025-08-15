import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  size?: "xs" | "sm" | "default" | "lg";
  variant?: "default" | "success" | "info" | "warning" | "danger";
  showValue?: boolean;
  valueLabel?: string;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, size = "default", variant = "default", showValue = false, valueLabel, ...props }, ref) => {
  const sizeClasses = {
    xs: "h-1",
    sm: "h-2",
    default: "h-3",
    lg: "h-4",
  };
  
  const variantClasses = {
    default: "bg-brand-500",
    success: "bg-green-500",
    info: "bg-blue-500",
    warning: "bg-amber-500",
    danger: "bg-danger-500",
  };
  
  return (
    <div className="relative w-full">
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-full",
          "bg-neutral-200 dark:bg-neutral-700",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full w-full flex-1 transition-all duration-300 ease-swift-out",
            variantClasses[variant]
          )}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      </ProgressPrimitive.Root>
      
      {showValue && (
        <div className="absolute right-0 -top-6 text-12 text-neutral-600 dark:text-neutral-400">
          {valueLabel || `${value || 0}%`}
        </div>
      )}
    </div>
  );
});

Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
