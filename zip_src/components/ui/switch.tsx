import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  size?: "sm" | "default" | "lg";
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, size = "default", ...props }, ref) => {
  const sizeClasses = {
    sm: {
      root: "h-5 w-9",
      thumb: "h-3.5 w-3.5 data-[state=checked]:translate-x-4",
    },
    default: {
      root: "h-6 w-11",
      thumb: "h-4 w-4 data-[state=checked]:translate-x-5",
    },
    lg: {
      root: "h-7 w-14",
      thumb: "h-5 w-5 data-[state=checked]:translate-x-7",
    },
  };
  
  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full",
        "border-2 border-transparent",
        "transition-all duration-150 ease-swift-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-brand-500 dark:data-[state=checked]:bg-brand-600",
        "data-[state=unchecked]:bg-neutral-200 dark:data-[state=unchecked]:bg-neutral-700",
        sizeClasses[size].root,
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block rounded-full",
          "bg-white dark:bg-neutral-100",
          "shadow-sm",
          "transition-transform duration-150 ease-swift-out",
          "data-[state=unchecked]:translate-x-0",
          sizeClasses[size].thumb
        )}
      />
    </SwitchPrimitives.Root>
  );
});

Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }