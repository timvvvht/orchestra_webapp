import React, { useState } from 'react';
import { Task } from '@/types/kanban';
import { X } from 'lucide-react';

interface TaskEditModalProps {
  task: Task;
  onSave: (editedTask: Task) => void;
  onClose: () => void;
}

const TaskEditModal: React.FC<TaskEditModalProps> = ({ task, onSave, onClose }) => {
  const [editedTask, setEditedTask] = useState<Task>({ ...task });
  
  const handleChange = (field: keyof Task, value: any) => {
    setEditedTask(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedTask);
    onClose();
  };

  // Prevent clicks inside the modal from closing it
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-surface-1 rounded-lg w-full max-w-md shadow-xl"
        onClick={handleModalClick}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-medium">Edit Task</h2>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-surface-2"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={editedTask.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full p-2 border border-border rounded bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={editedTask.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full p-2 border border-border rounded bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary h-32 resize-none"
              placeholder="Add a more detailed description..."
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select
              value={editedTask.priority || 'medium'}
              onChange={(e) => handleChange('priority', e.target.value as 'low' | 'medium' | 'high')}
              className="w-full p-2 border border-border rounded bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Tags</label>
            <input
              type="text"
              value={editedTask.tags?.join(', ') || ''}
              onChange={(e) => handleChange('tags', e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
              className="w-full p-2 border border-border rounded bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Comma-separated tags"
            />
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border rounded hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskEditModal;