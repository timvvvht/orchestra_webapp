import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column } from '@/types/kanban';
import SortableTaskCard from './SortableTaskCard';
import SimpleTaskForm from './SimpleTaskForm';

interface SimpleTaskColumnProps {
  column: Column;
  getPriorityColor: (priority?: 'low' | 'medium' | 'high') => string;
}

const SimpleTaskColumn: React.FC<SimpleTaskColumnProps> = ({
  column,
  getPriorityColor
}) => {
  // Make the entire column a drop target
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      data-column-id={column.id}
      className={`flex flex-col rounded-xl ${isOver ? 'bg-surface-2' : 'bg-surface-1'} overflow-visible transition-colors h-full`}
    >
      {/* Column header */}
      <h3 className="border-b border-border px-4 py-2 text-xs font-semibold text-muted-foreground flex justify-between items-center">
        <span>{column.title}</span>
        <span className="bg-surface-3 px-1.5 py-0.5 rounded-full text-[10px]">
          {column.tasks.length}
        </span>
      </h3>

      {/* Column content - tasks */}
      <div className="flex-1 overflow-visible p-3 min-h-[200px]">
        {/* Show drop indicator when column is empty and being dragged over */}

        <div className="space-y-3">


          <SortableContext items={column.tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
            {column.tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                priorityColor={getPriorityColor(task.priority)}
              />
            ))}
          </SortableContext>
        </div>

        {/* Empty state when no tasks and not being dragged over */}
        {column.tasks.length === 0 && !isOver && (
          <div className="h-20 border border-dashed border-border rounded-lg flex items-center justify-center text-xs text-muted-foreground">
            <span>Drop tasks here</span>
          </div>
        )}

        {/* Add task form */}
        <div className="mt-4">
          <SimpleTaskForm columnId={column.id} />
        </div>
      </div>
    </div>
  );
};

export default SimpleTaskColumn;