import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useKanbanStore } from '@/stores/kanbanStore';

interface SimpleTaskFormProps {
  columnId: string;
}

const SimpleTaskForm: React.FC<SimpleTaskFormProps> = ({ columnId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  
  const addTask = useKanbanStore(state => state.addTask);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    addTask(columnId, {
      title: title.trim(),
      priority,
      columnId,
    });
    
    // Reset form
    setTitle('');
    setPriority('medium');
    setIsOpen(false);
  };
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-1 p-2 text-sm text-muted-foreground hover:text-foreground bg-surface-2 hover:bg-surface-3 rounded-md transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>Add Task</span>
      </button>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="p-3 bg-surface-2 rounded-lg border border-border shadow-sm">
      <div className="space-y-3">
        <div>
          <input
            type="text"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Priority:</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPriority('low')}
              className={`px-2 py-1 text-xs rounded-md ${priority === 'low' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' : 'bg-surface-3 text-muted-foreground'}`}
            >
              Low
            </button>
            <button
              type="button"
              onClick={() => setPriority('medium')}
              className={`px-2 py-1 text-xs rounded-md ${priority === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' : 'bg-surface-3 text-muted-foreground'}`}
            >
              Medium
            </button>
            <button
              type="button"
              onClick={() => setPriority('high')}
              className={`px-2 py-1 text-xs rounded-md ${priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' : 'bg-surface-3 text-muted-foreground'}`}
            >
              High
            </button>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-3 py-1 text-xs bg-surface-2 hover:bg-surface-3 text-muted-foreground rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="px-3 py-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </form>
  );
};

export default SimpleTaskForm;