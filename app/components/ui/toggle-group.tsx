import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: "default",
  variant: "default",
})

interface ToggleGroupProps extends 
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>,
  VariantProps<typeof toggleVariants> {
  orientation?: "horizontal" | "vertical";
  spacing?: "tight" | "default" | "loose";
}

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  ToggleGroupProps
>(({ className, variant, size, orientation = "horizontal", spacing = "default", children, ...props }, ref) => {
  const spacingClasses = {
    tight: "gap-0",
    default: "gap-1",
    loose: "gap-2",
  };
  
  return (
    <ToggleGroupPrimitive.Root
      ref={ref}
      className={cn(
        "flex items-center",
        orientation === "horizontal" ? "flex-row" : "flex-col",
        spacingClasses[spacing],
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
})

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

interface ToggleGroupItemProps extends 
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>,
  VariantProps<typeof toggleVariants> {
  active?: boolean;
}

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  ToggleGroupItemProps
>(({ className, children, variant, size, active, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext)

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        active && "ring-2 ring-brand-400 ring-offset-1",
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
})

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

export { ToggleGroup, ToggleGroupItem }
