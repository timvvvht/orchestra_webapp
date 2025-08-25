import React, { useState } from "react";
import {
  useWorkspaceStore,
  useWorkspaces,
  useActiveWorkspace,
  useRecentWorkspaces,
} from "@/stores/workspaceStore";
import { useWorkspaceGitHubIntegration } from "@/hooks/useWorkspaceGitHubIntegration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/Label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const WorkspaceDemo: React.FC = () => {
  const [userId, setUserId] = useState("user123");
  const [repoId, setRepoId] = useState("456");
  const [repoFullName, setRepoFullName] = useState("owner/repo");
  const [branch, setBranch] = useState("main");
  const [workspaceName, setWorkspaceName] = useState("My Workspace");
  const [description, setDescription] = useState("");

  const {
    createWorkspace,
    setActiveWorkspace,
    deleteWorkspace,
    updateWorkspace,
    isLoading,
    error,
    clearError,
  } = useWorkspaceStore();

  const workspaces = useWorkspaces();
  const activeWorkspace = useActiveWorkspace();
  const recentWorkspaces = useRecentWorkspaces(5);

  // GitHub integration
  const {
    repos,
    loadingRepos,
    error: githubError,
    githubRequired,
    noRepos,
    currentUser,
    loadRepos,
    reposWithWorkspaces,
    stats,
    allReposHaveWorkspaces,
  } = useWorkspaceGitHubIntegration();

  const handleCreateWorkspace = async () => {
    try {
      await createWorkspace({
        userId,
        repoId: parseInt(repoId),
        repoFullName,
        branch,
        name: workspaceName || undefined,
        description: description || undefined,
      });

      // Clear form
      setWorkspaceName("");
      setDescription("");
    } catch (err) {
      console.error("Failed to create workspace:", err);
    }
  };

  const handleUpdateWorkspace = (id: string) => {
    const newName = prompt("Enter new workspace name:");
    if (newName) {
      updateWorkspace(id, { name: newName });
    }
  };

  const handleDeleteWorkspace = (id: string) => {
    if (confirm("Are you sure you want to delete this workspace?")) {
      deleteWorkspace(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Workspace Store Demo</h1>
        <p className="text-muted-foreground">
          This demo shows how to use the workspace store to manage workspaces
          for different repository branches. Workspaces are automatically
          created when GitHub repositories are loaded.
        </p>
      </div>

      {/* GitHub Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            GitHub Integration Status
            {currentUser && (
              <Badge variant="secondary">
                Connected as {currentUser.email}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            GitHub repositories and their associated workspaces
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalRepos}</div>
              <div className="text-sm text-muted-foreground">Total Repos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalWorkspaces}</div>
              <div className="text-sm text-muted-foreground">
                Total Workspaces
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {stats.reposWithWorkspacesCount}
              </div>
              <div className="text-sm text-muted-foreground">
                Repos with Workspaces
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {stats.coverage.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Coverage</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={loadRepos} disabled={loadingRepos}>
              {loadingRepos ? "Loading..." : "Refresh GitHub Repos"}
            </Button>
            {githubRequired && (
              <Button
                variant="outline"
                onClick={() => window.open("/github-connect", "_blank")}
              >
                Connect GitHub
              </Button>
            )}
          </div>

          {githubError && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
              <p className="text-destructive text-sm">{githubError}</p>
            </div>
          )}

          {allReposHaveWorkspaces && repos.length > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 text-sm">
                ✅ All repositories have workspaces!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GitHub Repositories with Workspaces */}
      {reposWithWorkspaces.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>GitHub Repositories & Workspaces</CardTitle>
            <CardDescription>
              Repositories from GitHub and their automatically created
              workspaces
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reposWithWorkspaces.map((repo) => (
                <div key={repo.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{repo.full_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        ID: {repo.id} • Default Branch:{" "}
                        {repo.default_branch || "main"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge
                        variant={repo.hasWorkspaces ? "default" : "secondary"}
                      >
                        {repo.workspaceCount} workspace
                        {repo.workspaceCount !== 1 ? "s" : ""}
                      </Badge>
                      {repo.hasWorkspaces && (
                        <Badge variant="outline">✅ Has Workspaces</Badge>
                      )}
                    </div>
                  </div>

                  {repo.hasWorkspaces && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Workspaces:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {repo.workspaces.map((workspace) => (
                          <div
                            key={workspace.id}
                            className="p-2 bg-muted rounded text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span>{workspace.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {workspace.branch}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Created:{" "}
                              {new Date(
                                workspace.createdAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
          <p className="text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={clearError}
            className="mt-2"
          >
            Clear Error
          </Button>
        </div>
      )}

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create Workspace</TabsTrigger>
          <TabsTrigger value="workspaces">All Workspaces</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          {/* Create Workspace Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Workspace</CardTitle>
              <CardDescription>
                Each workspace represents a branch of a repository and gets a
                unique SHA256 ID.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userId">User ID</Label>
                  <Input
                    id="userId"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="user123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repoId">Repository ID</Label>
                  <Input
                    id="repoId"
                    value={repoId}
                    onChange={(e) => setRepoId(e.target.value)}
                    placeholder="456"
                    type="number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="repoFullName">Repository Full Name</Label>
                  <Input
                    id="repoFullName"
                    value={repoFullName}
                    onChange={(e) => setRepoFullName(e.target.value)}
                    placeholder="owner/repo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch</Label>
                  <Input
                    id="branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workspaceName">Workspace Name (optional)</Label>
                <Input
                  id="workspaceName"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="My Workspace"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description of this workspace"
                />
              </div>

              <Button
                onClick={handleCreateWorkspace}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Creating..." : "Create Workspace"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workspaces" className="space-y-4">
          {/* Active Workspace */}
          {activeWorkspace && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Active Workspace
                  <Badge variant="secondary">Active</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p>
                    <strong>Name:</strong> {activeWorkspace.name}
                  </p>
                  <p>
                    <strong>Repository:</strong> {activeWorkspace.repoFullName}
                  </p>
                  <p>
                    <strong>Branch:</strong> {activeWorkspace.branch}
                  </p>
                  <p>
                    <strong>ID:</strong>{" "}
                    <code className="text-xs">{activeWorkspace.id}</code>
                  </p>
                  <p>
                    <strong>Last Accessed:</strong>{" "}
                    {new Date(activeWorkspace.lastAccessedAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Workspaces */}
          {Object.keys(workspaces).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  All Workspaces ({Object.keys(workspaces).length})
                </CardTitle>
                <CardDescription>
                  Complete list of all workspaces in the store
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.values(workspaces).map((workspace) => (
                    <div key={workspace.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{workspace.name}</h4>
                        <div className="flex gap-2">
                          {workspace.isActive && (
                            <Badge variant="secondary">Active</Badge>
                          )}
                          <Badge variant="outline">
                            {workspace.repoFullName}
                          </Badge>
                          <Badge variant="outline">{workspace.branch}</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {workspace.description || "No description"}
                      </p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>
                          <strong>ID:</strong> <code>{workspace.id}</code>
                        </p>
                        <p>
                          <strong>Created:</strong>{" "}
                          {new Date(workspace.createdAt).toLocaleString()}
                        </p>
                        <p>
                          <strong>Updated:</strong>{" "}
                          {new Date(workspace.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveWorkspace(workspace.id)}
                          disabled={workspace.isActive}
                        >
                          {workspace.isActive ? "Active" : "Activate"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateWorkspace(workspace.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteWorkspace(workspace.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {Object.keys(workspaces).length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No workspaces created yet. Create your first workspace above
                  or connect GitHub to auto-create workspaces!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          {/* Recent Workspaces */}
          {recentWorkspaces.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Workspaces</CardTitle>
                <CardDescription>
                  Recently accessed workspaces (showing top 5)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentWorkspaces.map((workspace) => (
                    <div
                      key={workspace.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{workspace.name}</h4>
                          {workspace.isActive && (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {workspace.repoFullName} • {workspace.branch}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last accessed:{" "}
                          {new Date(workspace.lastAccessedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveWorkspace(workspace.id)}
                          disabled={workspace.isActive}
                        >
                          {workspace.isActive ? "Active" : "Activate"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateWorkspace(workspace.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteWorkspace(workspace.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
