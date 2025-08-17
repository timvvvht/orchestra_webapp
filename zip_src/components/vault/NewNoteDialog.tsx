import React, { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { Plus, Folder, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createNewFile } from '@/api/fileApi';
import { sanitizeMarkdownFileName } from '@/utils/filename';
import { useSettingsStore } from '@/stores/settingsStore';

interface NewNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDirectory?: string;
  onCreate: (absolutePath: string) => void;
}

const NewNoteDialog: React.FC<NewNoteDialogProps> = ({
  isOpen,
  onClose,
  defaultDirectory,
  onCreate,
}) => {
  const [fileName, setFileName] = useState('');
  const [selectedDirectory, setSelectedDirectory] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const vaultPath = useSettingsStore((state) => state.settings.vault.path);

  // Initialize directory when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDirectory(defaultDirectory || vaultPath || '');
      setFileName('');
      setValidationError(null);
    }
  }, [isOpen, defaultDirectory, vaultPath]);

  // Validate filename as user types
  useEffect(() => {
    if (!fileName.trim()) {
      setValidationError(null);
      return;
    }

    const result = sanitizeMarkdownFileName(fileName);
    if (!result.ok) {
      setValidationError(result.error || 'Invalid filename');
    } else {
      setValidationError(null);
    }
  }, [fileName]);

  const handleDirectoryChange = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Directory for New Note',
        defaultPath: selectedDirectory || vaultPath,
      });

      if (selected && !Array.isArray(selected)) {
        // Validate that selected directory is within vault
        if (vaultPath && !selected.startsWith(vaultPath)) {
          toast.error('Invalid directory', {
            description: 'Selected directory must be within your vault.',
          });
          return;
        }
        setSelectedDirectory(selected);
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      toast.error('Failed to select directory', {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleCreate = async () => {
    if (!fileName.trim()) {
      setValidationError('Filename cannot be empty');
      return;
    }

    if (!selectedDirectory) {
      toast.error('No directory selected', {
        description: 'Please select a directory for your new note.',
      });
      return;
    }

    // Sanitize filename
    const sanitizeResult = sanitizeMarkdownFileName(fileName);
    if (!sanitizeResult.ok) {
      setValidationError(sanitizeResult.error || 'Invalid filename');
      return;
    }

    const sanitizedFileName = sanitizeResult.name!;

    try {
      setIsCreating(true);
      
      // Create the file
      const result = await createNewFile(selectedDirectory, sanitizedFileName);
      
      if (result.success) {
        // Construct absolute path
        const absolutePath = `${selectedDirectory}/${sanitizedFileName}`.replace(/\/+/g, '/');
        
        toast.success('Note created successfully', {
          description: `Created "${sanitizedFileName}" in your vault.`,
        });
        
        // Call onCreate with the absolute path
        onCreate(absolutePath);
        onClose();
      } else {
        // Handle creation failure
        if (result.message.toLowerCase().includes('exist')) {
          setValidationError('A file with this name already exists');
        } else {
          toast.error('Failed to create note', {
            description: result.message,
          });
        }
      }
    } catch (error) {
      console.error('Error creating file:', error);
      toast.error('Failed to create note', {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !validationError && fileName.trim()) {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const getDisplayDirectory = () => {
    if (!selectedDirectory) return 'No directory selected';
    if (!vaultPath) return selectedDirectory;
    
    // Show relative path from vault root
    if (selectedDirectory === vaultPath) {
      return '/ (vault root)';
    } else if (selectedDirectory.startsWith(vaultPath)) {
      return selectedDirectory.substring(vaultPath.length).replace(/^\/+/, '/');
    }
    return selectedDirectory;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create New Note
          </DialogTitle>
          <DialogDescription>
            Create a new markdown note in your vault.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File name input */}
          <div className="space-y-2">
            <label htmlFor="filename" className="text-sm font-medium">
              Note Name
            </label>
            <Input
              id="filename"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="My New Note"
              className={validationError ? 'border-red-500' : ''}
              autoFocus
            />
            {validationError && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                {validationError}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              .md extension will be added automatically
            </p>
          </div>

          {/* Directory selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Directory</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm">
                {getDisplayDirectory()}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDirectoryChange}
                className="shrink-0"
              >
                <Folder className="w-4 h-4 mr-1" />
                Change
              </Button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!fileName.trim() || !!validationError || isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Note'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewNoteDialog;