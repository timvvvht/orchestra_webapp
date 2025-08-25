import React, { useState } from "react";
import { WorkspaceDropdown } from "./index";
import type { RepoItem } from "@/hooks/useGitHubRepos";

export const WorkspaceDropdownDemo: React.FC = () => {
  const [selectedWorkspace, setSelectedWorkspace] = useState<any | null>(null);

  const handleWorkspaceSelect = (workspace: any | null) => {
    setSelectedWorkspace(workspace);
    console.log("Selected workspace:", workspace);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-md">
        <h2 className="text-xl font-semibold text-white mb-4">
          Workspace Dropdown Demo
        </h2>

        <WorkspaceDropdown
          onWorkspaceSelect={handleWorkspaceSelect}
          selectedWorkspace={selectedWorkspace}
          placeholder="Choose a workspace to work in..."
          className="w-full"
        />

        {selectedWorkspace && (
          <div className="mt-4 p-4 bg-white/[0.03] border border-white/10 rounded-xl">
            <h3 className="text-sm font-medium text-white/90 mb-2">
              Selected Workspace:
            </h3>
            <pre className="text-xs text-white/60 overflow-auto">
              {JSON.stringify(selectedWorkspace, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceDropdownDemo;
