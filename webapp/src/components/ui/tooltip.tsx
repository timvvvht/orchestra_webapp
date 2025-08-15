import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

interface TooltipContentProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  size?: "sm" | "default" | "lg";
  variant?: "default" | "info" | "success" | "warning" | "danger";
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, sideOffset = 4, size = "default", variant = "default", ...props }, ref) => {
  const sizeClasses = {
    sm: "px-2 py-1 text-12",
    default: "px-3 py-1.5 text-14",
    lg: "px-4 py-2 text-16",
  };
  
  const variantClasses = {
    default: "bg-neutral-800 text-neutral-100",
    info: "bg-brand-500 text-white",
    success: "bg-green-500 text-white",
    warning: "bg-amber-500 text-white",
    danger: "bg-danger-500 text-white",
  };
  
  return (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md shadow-surface-3",
        "data-[state=closed]:animate-fade-out data-[state=closed]:animate-scale-out",
        "data-[state=open]:animate-fade-in data-[state=open]:animate-scale-in",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
});

TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
