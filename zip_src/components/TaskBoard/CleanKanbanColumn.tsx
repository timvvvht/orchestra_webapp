import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Column, Task } from '@/types/kanban';
import CleanTaskCard from './CleanTaskCard';
import { useCleanKanbanStore } from '@/stores/cleanKanbanStore';
// UUID is now handled in the store
import { Plus } from 'lucide-react';

interface CleanKanbanColumnProps {
  column: Column;
  getPriorityColor: (priority?: 'low' | 'medium' | 'high') => string;
}

const CleanKanbanColumn: React.FC<CleanKanbanColumnProps> = ({ 
  column, 
  getPriorityColor
}) => {
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newTaskTitle, setNewTaskTitle] = React.useState('');
  const setSelectedTask = useCleanKanbanStore(state => state.setSelectedTask);
  
  // Make the column both sortable and droppable
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });
  
  // Make the column content a drop target
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });
  
  // Combine refs for the column
  const setColumnRef = (el: HTMLElement | null) => {
    setSortableRef(el);
  };
  
  // Create styles for the draggable element
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 0.1s ease-in-out',
  };
  
  // Handle add task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim()) {
      // Use the store directly to avoid state refresh issues
      useCleanKanbanStore.getState().addTask(column.id, { 
        title: newTaskTitle.trim()
      });
      setNewTaskTitle('');
      setShowAddForm(false);
    }
  };

  // Handle task click to open edit modal
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  return (
    <div 
      ref={setColumnRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`w-64 shrink-0 flex flex-col rounded-lg ${isOver ? 'bg-surface-2' : 'bg-surface-1'} transition-colors shadow-sm border border-border ${isDragging ? 'opacity-50 z-10' : ''}`}
    >
      {/* Column header */}
      <div className="p-3 font-medium border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{column.title}</span>
          <span className="bg-surface-3 px-1.5 py-0.5 rounded-full text-[10px]">
            {column.tasks.length}
          </span>
        </div>
      </div>
      
      {/* Column content - tasks */}
      <div 
        ref={setDroppableRef}
        className="flex-1 overflow-y-auto p-3 min-h-[100px] h-full relative"
        data-column-id={column.id}
      >
        {/* Show drop indicator when column is empty and being dragged over */}
        {column.tasks.length === 0 && isOver && (
          <div 
            className="h-16 border-2 border-dashed border-primary/50 rounded-lg flex items-center justify-center bg-primary/5 animate-pulse"
            data-column-id={column.id}
          >
            <span className="text-xs text-primary-foreground">Drop here</span>
          </div>
        )}
        
        <div className="space-y-3">
          {column.tasks.map((task) => (
            <div 
              key={task.id}
              onClick={() => handleTaskClick(task)}
              data-task-id={task.id}
            >
              <CleanTaskCard
                task={task}
                priorityColor={getPriorityColor(task.priority)}
              />
            </div>
          ))}
        </div>
        
        {/* Empty state when no tasks and not being dragged over */}
        {column.tasks.length === 0 && !isOver && (
          <div 
            className="h-16 border border-dashed border-border rounded-lg flex items-center justify-center text-xs text-muted-foreground"
            data-column-id={column.id}
          >
            <span>No tasks</span>
          </div>
        )}
      </div>
      
      {/* Add task form */}
      <div className="p-3 border-t border-border">
        {showAddForm ? (
          <form onSubmit={handleAddTask} className="space-y-2">
            <input
              autoFocus
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task title"
              className="w-full bg-surface-0 border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => {
                  setShowAddForm(false);
                  setNewTaskTitle('');
                }}
                className="px-2 py-1 text-xs rounded hover:bg-surface-2 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                Add
              </button>
            </div>
          </form>
        ) : (
          <button 
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-2 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <Plus className="h-3 w-3" />
            <span>Add Task</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default CleanKanbanColumn;