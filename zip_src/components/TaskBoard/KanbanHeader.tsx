import React, { useState } from 'react';
import { useKanbanStore } from '@/stores/kanbanStore';
import { Plus } from 'lucide-react';

const KanbanHeader: React.FC = () => {
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  
  const addColumn = useKanbanStore(state => state.addColumn);
  
  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (newColumnTitle.trim()) {
      addColumn({ title: newColumnTitle.trim(), tasks: [] });
      setNewColumnTitle('');
      setShowAddColumn(false);
    }
  };
  
  return (
    <div className="border-b border-border p-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold">Kanban Board</h1>
      
      <div className="flex items-center gap-2">
        {showAddColumn ? (
          <form onSubmit={handleAddColumn} className="flex items-center gap-2">
            <input
              autoFocus
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              placeholder="Column title"
              className="bg-surface-0 border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => {
                setShowAddColumn(false);
                setNewColumnTitle('');
              }}
              className="text-sm px-2 py-1 rounded hover:bg-surface-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newColumnTitle.trim()}
              className="text-sm px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Add
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowAddColumn(true)}
            className="flex items-center gap-1 text-sm bg-primary text-primary-foreground px-3 py-1 rounded hover:bg-primary/90"
          >
            <Plus size={16} />
            <span>Add Column</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default KanbanHeader;