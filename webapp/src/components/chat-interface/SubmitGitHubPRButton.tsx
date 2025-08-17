import { GitPullRequest } from "lucide-react";

interface SubmitGitHubPRButtonProps {
  sessionId: string;
  onClick: () => void;
}

const SubmitGitHubPRButton: React.FC<SubmitGitHubPRButtonProps> = ({
  onClick,
}: SubmitGitHubPRButtonProps) => {
  const handleLinkClick = () => {
    onClick();
  };

  return (
    <div className="flex items-center bg-white backdrop-blur-sm rounded-lg p-0.5 cursor-pointer">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 bg-white text-black shadow-sm">
        <GitPullRequest className="w-3.5 h-3.5" />
        <span>Create PR</span>
      </div>
    </div>
  );
};

export default SubmitGitHubPRButton;
