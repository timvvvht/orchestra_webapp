import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base: Remove excessive transitions, focus on essentials
  "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        // Primary: High contrast, clear hierarchy (Rule #6: Use Color Purposefully)
        primary: "bg-white text-black hover:bg-gray-100 focus-visible:ring-white",
        // Secondary: Subtle but clear (Rule #14: Emphasize by De-emphasizing)
        secondary: "bg-white/10 text-white hover:bg-white/20 border border-white/20",
        // Ghost: Minimal visual weight
        ghost: "text-white/70 hover:text-white hover:bg-white/5",
        // Danger: Clear semantic meaning
        danger: "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500"
      },
      size: {
        // Consistent sizing system (Rule #3: Start with Too Much White Space)
        sm: "h-8 px-3 text-sm gap-1.5",
        md: "h-10 px-4 text-base gap-2",
        lg: "h-12 px-6 text-lg gap-2.5"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
)

export interface ImprovedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const ImprovedButton = React.forwardRef<
  HTMLButtonElement,
  ImprovedButtonProps
>(({ className, variant, size, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(buttonVariants({ variant, size }), className)}
    {...props}
  />
))
ImprovedButton.displayName = "ImprovedButton"

export { buttonVariants as improvedButtonVariants } 