import React, { useState } from 'react';
import { getGitLog, CommitEntry } from '@/utils/gitLogApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, GitBranch, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const GitLogPage: React.FC = () => {
  const [path, setPath] = useState('');
  const [limit, setLimit] = useState(50);
  const [commits, setCommits] = useState<CommitEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchGitLog = async () => {
    if (!path.trim()) {
      setError('Please enter a repository path');
      return;
    }

    setLoading(true);
    setError(null);
    setCommits([]);

    try {
      const result = await getGitLog({ projectRoot: path.trim(), limit });
      setCommits(result);
      
      if (result.length === 0) {
        setError('No commits found in this repository');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch git log');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const truncateSha = (sha: string) => {
    return sha.length > 7 ? `${sha.substring(0, 7)}...` : sha;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <GitBranch className="h-8 w-8" />
          Git Log Viewer
        </h1>
        <p className="text-muted-foreground">
          View commit history for any Git repository
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Repository Settings</CardTitle>
          <CardDescription>
            Enter the path to a Git repository and optionally set a commit limit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="path">Repository Path</Label>
              <Input
                id="path"
                placeholder="/path/to/repository"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="limit">Commit Limit (optional)</Label>
              <Input
                id="limit"
                type="number"
                min="1"
                max="1000"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <Button 
                onClick={handleFetchGitLog} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Fetch Git Log'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {commits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Commit History</CardTitle>
            <CardDescription>
              Showing {commits.length} commit{commits.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">SHA</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="flex-1">Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commits.map((commit, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        <code className="bg-muted px-2 py-1 rounded">
                          {truncateSha(commit.sha)}
                        </code>
                      </TableCell>
                      <TableCell>{commit.author}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(commit.date)}
                      </TableCell>
                      <TableCell className="flex-1">{commit.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GitLogPage;