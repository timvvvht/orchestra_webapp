import React from "react";
import { Link } from "react-router-dom";
import { Github } from "lucide-react";
import { Button } from "./Button";

interface GitHubConnectButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export const GitHubConnectButton: React.FC<GitHubConnectButtonProps> = ({
  variant = "default",
  size = "default",
  className = "",
}) => {
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link to="/github-connect" className="flex items-center gap-2">
        <Github className="w-4 h-4" />
        Connect GitHub
      </Link>
    </Button>
  );
};
