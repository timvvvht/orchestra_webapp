import React, { forwardRef, ComponentProps } from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends ComponentProps<"input"> {
  variant?: "default" | "filled" | "ghost";
  size?: "sm" | "default" | "lg";
  as?: "input" | "textarea";
}

export interface TextareaProps extends ComponentProps<"textarea"> {
  variant?: "default" | "filled" | "ghost";
  size?: "sm" | "default" | "lg";
  as: "textarea";
}

type InputOrTextareaProps = InputProps | TextareaProps;

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputOrTextareaProps>(
  ({ className, variant = "default", size = "default", as = "input", ...props }, ref) => {
    const variantClasses = {
      default: "bg-background border border-input text-foreground",
      filled: "bg-muted border-none text-foreground",
      ghost: "bg-transparent border-none hover:bg-muted text-foreground",
    };
    
    const sizeClasses = {
      sm: "min-h-8 px-2 py-1 text-14",
      default: "min-h-10 px-3 py-2 text-16",
      lg: "min-h-12 px-4 py-3 text-16",
    };
    
    const baseClasses = cn(
      "flex w-full rounded-md transition-all duration-150",
      "placeholder:text-muted-foreground",
      "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
      "disabled:cursor-not-allowed disabled:opacity-50",
      variantClasses[variant],
      sizeClasses[size],
      className
    );
    
    if (as === "textarea") {
      return (
        <textarea
          className={cn(baseClasses, "resize-none")}
          ref={ref as React.Ref<HTMLTextAreaElement>}
          {...(props as ComponentProps<"textarea">)}
        />
      );
    }
    
    return (
      <input
        type={(props as InputProps).type}
        className={baseClasses}
        ref={ref as React.Ref<HTMLInputElement>}
        {...(props as ComponentProps<"input">)}
      />
    );
  }
)
Input.displayName = "Input"

export { Input }
