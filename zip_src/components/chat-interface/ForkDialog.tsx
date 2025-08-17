import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface ForkDialogProps {
  open: boolean;
  onClose: () => void;
  onFork: (name: string, displayTitle: string) => void;
  initialName?: string;
}

const ForkDialog: React.FC<ForkDialogProps> = ({ 
  open, 
  onClose, 
  onFork, 
  initialName = 'Forked Conversation' 
}) => {
  const [name, setName] = useState(initialName);
  const [displayTitle, setDisplayTitle] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialName);
      setDisplayTitle(''); // Reset display title when dialog opens
    }
  }, [open, initialName]);

  const handleSubmit = () => {
    onFork(name.trim() || initialName, displayTitle.trim()); // Ensure name is not empty
    onClose();
  };

  // Handle Enter key press in input fields
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-background/90 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle>Fork Conversation</DialogTitle>
          <DialogDescription>
            Create a new branch of this conversation from the selected message.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="fork-name" className="text-right">
              Name
            </Label>
            <Input 
              id="fork-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              onKeyDown={handleKeyDown}
              className="col-span-3"
              placeholder="New conversation name"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="fork-display-title" className="text-right">
              Display Title
            </Label>
            <Input 
              id="fork-display-title" 
              value={displayTitle} 
              onChange={(e) => setDisplayTitle(e.target.value)} 
              onKeyDown={handleKeyDown}
              className="col-span-3"
              placeholder="Optional descriptive title (e.g., \'Exploring alternative X\')"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit}>Create Fork</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ForkDialog;
