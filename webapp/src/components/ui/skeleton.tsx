import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "avatar" | "text" | "button" | "card";
}

function Skeleton({
  className,
  variant = "default",
  ...props
}: SkeletonProps) {
  const variantClasses = {
    default: "rounded-md",
    avatar: "rounded-full",
    text: "h-4 rounded-sm",
    button: "h-10 rounded-full",
    card: "h-[180px] rounded-lg",
  };
  
  return (
    <div
      className={cn(
        "animate-pulse bg-neutral-200/70 dark:bg-neutral-700/50",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };