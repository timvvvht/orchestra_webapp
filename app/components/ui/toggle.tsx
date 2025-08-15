import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 data-[state=on]:bg-neutral-200 dark:data-[state=on]:bg-neutral-700",
        outline: "border border-neutral-300 dark:border-neutral-700 bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 data-[state=on]:bg-neutral-200 dark:data-[state=on]:bg-neutral-700",
        soft: "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 data-[state=on]:bg-brand-100 dark:data-[state=on]:bg-brand-900/30 data-[state=on]:text-brand-600 dark:data-[state=on]:text-brand-400",
        pill: "rounded-full bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 data-[state=on]:bg-brand-500 dark:data-[state=on]:bg-brand-600 data-[state=on]:text-white",
      },
      size: {
        xs: "h-7 px-2 py-1 text-12 rounded-md gap-1",
        sm: "h-8 px-3 py-1.5 text-14 rounded-md gap-1.5",
        default: "h-10 px-4 py-2 text-16 rounded-md gap-2",
        lg: "h-12 px-6 py-3 text-16 rounded-md gap-2",
        icon: "h-10 w-10 rounded-md p-2",
        "icon-sm": "h-8 w-8 rounded-md p-1.5",
        "icon-xs": "h-7 w-7 rounded-md p-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
))

Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle, toggleVariants }