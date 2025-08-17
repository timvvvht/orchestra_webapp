import React, { useState } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';

interface SmoothTaskFormProps {
  columnId: string;
}

const SmoothTaskForm: React.FC<SmoothTaskFormProps> = ({ columnId }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  
  const addTask = useKanbanStore(state => state.addTask);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    addTask(columnId, {
      title: title.trim(),
      description: description.trim(),
      priority,
      columnId,
    });
    
    // Reset form
    setTitle('');
    setDescription('');
    setPriority('medium');
    setIsFormOpen(false);
  };
  
  if (!isFormOpen) {
    return (
      <button
        onClick={() => setIsFormOpen(true)}
        className="w-full p-2 text-sm text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-md transition-colors flex items-center justify-center gap-1"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14"></path>
          <path d="M5 12h14"></path>
        </svg>
        <span>Add Task</span>
      </button>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="p-3 bg-card rounded-lg border border-border shadow-sm">
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
        
        <div>
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px] resize-none"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Priority:</label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPriority('low')}
              className={`px-2 py-1 text-xs rounded-md ${priority === 'low' ? 'bg-blue-500/20 text-blue-500' : 'bg-muted text-muted-foreground'}`}
            >
              Low
            </button>
            <button
              type="button"
              onClick={() => setPriority('medium')}
              className={`px-2 py-1 text-xs rounded-md ${priority === 'medium' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-muted text-muted-foreground'}`}
            >
              Medium
            </button>
            <button
              type="button"
              onClick={() => setPriority('high')}
              className={`px-2 py-1 text-xs rounded-md ${priority === 'high' ? 'bg-red-500/20 text-red-500' : 'bg-muted text-muted-foreground'}`}
            >
              High
            </button>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsFormOpen(false)}
            className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 text-muted-foreground rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
          >
            Add Task
          </button>
        </div>
      </div>
    </form>
  );
};

export default SmoothTaskForm;