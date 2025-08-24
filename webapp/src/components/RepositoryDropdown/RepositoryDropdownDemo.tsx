import React, { useState } from "react";
import { RepositoryDropdown, type RepoItem } from "./RepositoryDropdown";

export const RepositoryDropdownDemo: React.FC = () => {
  const [selectedRepo, setSelectedRepo] = useState<RepoItem | null>(null);

  const handleRepoSelect = (repo: RepoItem) => {
    setSelectedRepo(repo);
    console.log("Selected repository:", repo);
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">
        Repository Selection Demo
      </h2>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Select a Repository
        </label>
        <RepositoryDropdown
          onRepoSelect={handleRepoSelect}
          selectedRepo={selectedRepo}
          placeholder="Choose a repository to work with"
        />
      </div>

      {selectedRepo && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">
            Selected Repository:
          </h3>
          <div className="text-sm text-blue-800">
            <p>
              <strong>ID:</strong> {selectedRepo.id}
            </p>
            <p>
              <strong>Name:</strong> {selectedRepo.full_name}
            </p>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500">
        <p>This demo shows how to use the RepositoryDropdown component.</p>
        <p>
          The component automatically handles loading states, errors, and GitHub
          connection requirements.
        </p>
      </div>
    </div>
  );
};

export default RepositoryDropdownDemo;
