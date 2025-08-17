import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useKanbanStore } from '@/stores/kanbanStore';

const SimpleTaskHeader: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedColumn, setSelectedColumn] = useState('');
  
  const columns = useKanbanStore(state => state.columns || []);
  const addTask = useKanbanStore(state => state.addTask);
  const tasksCount = useKanbanStore(state => 
    state.columns?.reduce((acc, col) => acc + col.tasks.length, 0) || 0
  );
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !selectedColumn) return;
    
    addTask(selectedColumn, {
      title: title.trim(),
      description: description.trim(),
      priority,
      columnId: selectedColumn,
    });
    
    // Reset form
    setTitle('');
    setDescription('');
    setPriority('medium');
    setSelectedColumn('');
    setShowForm(false);
  };
  
  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-lg font-semibold">Task Board</h2>
          <p className="text-sm text-muted-foreground">{tasksCount} tasks in {columns.length} columns</p>
        </div>
        
        <button
          onClick={() => setShowForm(!showForm)}
          className={`
            flex items-center gap-1 rounded-md px-3 py-1.5 text-sm
            ${showForm ? 
              'bg-muted hover:bg-muted/80 text-muted-foreground' : 
              'bg-primary hover:bg-primary/90 text-primary-foreground'}
            transition-colors
          `}
        >
          {showForm ? (
            <>
              <X className="h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              New Task
            </>
          )}
        </button>
      </div>
      
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface-1 rounded-lg border border-border p-4">
          <div className="grid gap-4 mb-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">Title</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                placeholder="Task title"
                required
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background min-h-[80px] resize-none"
                placeholder="Task description (optional)"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="column" className="block text-sm font-medium mb-1">Column</label>
                <select
                  id="column"
                  value={selectedColumn}
                  onChange={(e) => setSelectedColumn(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                  required
                >
                  <option value="">Select a column</option>
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="priority" className="block text-sm font-medium mb-1">Priority</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority('low')}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-md ${priority === 'low' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' : 'bg-surface-2 text-muted-foreground'}`}
                  >
                    Low
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('medium')}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-md ${priority === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' : 'bg-surface-2 text-muted-foreground'}`}
                  >
                    Medium
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('high')}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-md ${priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' : 'bg-surface-2 text-muted-foreground'}`}
                  >
                    High
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!title.trim() || !selectedColumn}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Add Task
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SimpleTaskHeader;