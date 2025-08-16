import { useAuth } from "./AuthContext";
import { cn } from "@/lib/utils";

interface GitHubLoginButtonProps {
  className?: string;
  variant?: "default" | "outline";
}

export const GitHubLoginButton = ({
  className,
  variant = "default",
}: GitHubLoginButtonProps = {}) => {
  const { loginGitHub } = useAuth();
  return (
    <button
      onClick={loginGitHub}
      className={cn(
        // Base styles
        "relative flex items-center justify-center gap-3 w-full px-5 py-3 rounded-lg",
        "text-sm font-medium transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        // Variant styles
        variant === "default" && [
          "bg-white border border-gray-200 text-gray-700 shadow-sm",
          "hover:bg-gray-50 hover:border-gray-300 hover:shadow-md",
          "focus:ring-indigo-500",
          // Subtle animation on hover
          "hover:translate-y-[-1px]",
        ],
        variant === "outline" && [
          "bg-transparent border-2 border-white/30 text-white",
          "hover:bg-white/10 hover:border-white/50",
          "focus:ring-white/50",
        ],
        className
      )}
      aria-label="Sign in with GitHub"
    >
      {/* GitHub Logo with better spacing */}
      <svg
        className="w-5 h-5 flex-shrink-0"
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="currentColor"
      >
        <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.49 2.87 8.3 6.84 9.64.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.1-1.5-1.1-1.5-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.38-2.03 1.02-2.75-.1-.26-.44-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.36 9.36 0 0 1 12 6.84c.85.004 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.54 1.4.2 2.44.1 2.7.64.72 1.02 1.63 1.02 2.75 0 3.94-2.34 4.81-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.58.69.48A10.01 10.01 0 0 0 22 12.26C22 6.58 17.52 2 12 2z" />
      </svg>
      <span>Continue with GitHub</span>
      {/* Subtle shine effect on hover */}
      <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
      </div>
    </button>
  );
};
