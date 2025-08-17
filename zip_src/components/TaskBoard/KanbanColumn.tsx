import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column, Task } from '@/types/kanban';
import TaskCard from './TaskCard';
import { useKanbanStore } from '@/stores/kanbanStore';
import { Plus, MoreVertical } from 'lucide-react';

interface KanbanColumnProps {
  column: Column;
  getPriorityColor: (priority?: 'low' | 'medium' | 'high') => string;
  isDragging?: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  column, 
  getPriorityColor,
  isDragging = false
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  const addTask = useKanbanStore(state => state.addTask);
  const updateColumn = useKanbanStore(state => state.updateColumn);
  const deleteColumn = useKanbanStore(state => state.deleteColumn);
  
  // Make the column sortable
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
  } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
    disabled: isEditingTitle,
  });
  
  // Make the column a drop target for tasks
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });
  
  // Use a single isOver state for the entire column
  const isAnyOver = isOver;
  
  // Debug column info
  console.log(`Column ${column.id} (${column.title}) initialized with droppable ID: ${column.id}`);
  
  // Log when a column is being dragged over
  React.useEffect(() => {
    if (isOver) {
      console.log('ud83dudfe0 COLUMN BEING DRAGGED OVER', {
        columnId: column.id,
        title: column.title,
        tasksCount: column.tasks.length,
        isEmpty: column.tasks.length === 0
      });
    }
  }, [isOver, column.id, column.title, column.tasks.length]);
  
  // Combine refs
  const setRefs = (el: HTMLElement | null) => {
    setSortableRef(el);
    // Note: We're NOT setting the droppable ref here, as it should be on the content div
    // setDroppableRef(el);
  };
  
  // Create styles for the draggable element
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  // Handle title edit
  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (title.trim() !== column.title) {
      updateColumn(column.id, { title: title.trim() });
    }
  };
  
  // Handle title key press
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setTitle(column.title);
      setIsEditingTitle(false);
    }
  };
  
  // Handle add task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim()) {
      addTask(column.id, { title: newTaskTitle.trim() });
      setNewTaskTitle('');
      setShowAddForm(false);
    }
  };
  
  // If column is being dragged, show a simplified version
  if (isDragging) {
    return (
      <div 
        ref={setRefs}
        style={style}
        className="w-80 h-full flex flex-col rounded-lg border-2 border-primary/50 bg-surface-1/80 opacity-70"
      >
        <div className="p-3 font-medium border-b border-border">
          {column.title}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={setRefs}
      style={style}
      className={`w-80 shrink-0 flex flex-col rounded-lg ${isAnyOver ? 'bg-surface-2' : 'bg-surface-1'} transition-colors shadow-sm border border-border`}
    >
      {/* Column header */}
      <div 
        {...attributes} 
        {...listeners}
        className="p-3 font-medium border-b border-border flex items-center justify-between cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="bg-surface-0 border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            <div onClick={() => setIsEditingTitle(true)} className="flex items-center gap-2">
              <span>{column.title}</span>
              <span className="bg-surface-3 text-xs px-1.5 py-0.5 rounded-full">
                {column.tasks.length}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center">
          <button 
            onClick={() => deleteColumn(column.id)}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-surface-2"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>
      
      {/* Column content - tasks */}
      <div 
        ref={setDroppableRef}
        className="flex-1 overflow-y-auto p-3 min-h-[200px] h-full relative"
        data-droppable-id={column.id}
        data-column-id={column.id}
      >
        {/* Show drop indicator when column is empty and being dragged over */}
        {column.tasks.length === 0 && isAnyOver && (
          <div 
            className="h-20 border-2 border-dashed border-primary/50 rounded-lg flex items-center justify-center bg-primary/5 animate-pulse"
            data-empty-column-drop-area="true"
            data-column-id={column.id}
          >
            <span className="text-xs text-primary-foreground">Drop here</span>
          </div>
        )}
        
        <div className="space-y-3">
          <SortableContext items={column.tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
            {column.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                priorityColor={getPriorityColor(task.priority)}
              />
            ))}
          </SortableContext>
        </div>
        
        {/* Empty state when no tasks and not being dragged over */}
        {column.tasks.length === 0 && !isAnyOver && (
          <div 
            className="h-20 border border-dashed border-border rounded-lg flex items-center justify-center text-xs text-muted-foreground"
            data-empty-column="true"
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
                className="text-xs px-2 py-1 rounded hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newTaskTitle.trim()}
                className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground py-1 rounded-md hover:bg-surface-2"
          >
            <Plus size={16} />
            <span>Add task</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;