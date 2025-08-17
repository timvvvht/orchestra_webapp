import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import TaskHeader from "./TaskHeader";
import TaskColumn from "./TaskColumn";
import TaskCard from "./TaskCard";
import { useKanbanStore } from "@/stores/kanbanStore";
import { Column, Task } from "@/types/kanban";

interface TaskBoardProps {
  columns?: Column[];
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ columns = [] }) => {
  // Get state and actions from the kanban store
  const { 
    columns: boardColumns, 
    isLoading,
    loadBoard, 
    moveTask 
  } = useKanbanStore();
  
  // State for the active dragging task
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  
  // Load the board when the component mounts
  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getPriorityColor = (priority?: "low" | "medium" | "high") => {
    switch (priority) {
      case "high":
        return "border-l-red-500";
      case "medium":
        return "border-l-amber-500";
      case "low":
        return "border-l-blue-500";
      default:
        return "border-l-gray-500";
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;
    
    // Find the task being dragged
    for (const column of boardColumns) {
      const task = column.tasks.find(t => t.id === activeId);
      if (task) {
        setActiveTask(task);
        break;
      }
    }
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeColumnIndex = boardColumns.findIndex((col) => 
      col.tasks.some(task => task.id === activeId)
    );
    const overColumnIndex = boardColumns.findIndex((col) => 
      col.tasks.some(task => task.id === overId)
    );

    if (activeColumnIndex !== overColumnIndex) {
      // Find the source and destination column IDs
      const sourceColumnId = boardColumns[activeColumnIndex].id;
      const destinationColumnId = boardColumns[overColumnIndex].id;
      
      // Find the index of the task in the destination column
      const destinationIndex = boardColumns[overColumnIndex].tasks.findIndex(
        task => task.id === overId
      );
      
      // Use the store's moveTask action
      moveTask(activeId, sourceColumnId, destinationColumnId, destinationIndex);
    }
    
    // Reset the active task
    setActiveTask(null);
  };

  return (
    <div className="h-full overflow-hidden p-4">
      <TaskHeader title="Task Board" />
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid h-[calc(100%-2rem)] grid-cols-4 gap-4">
          {boardColumns.map((column) => (
            <SortableContext key={column.id} items={column.tasks.map(t => t.id)}>
              <TaskColumn
                column={column}
                getPriorityColor={getPriorityColor}
              />
            </SortableContext>
          ))}
        </div>
        
        {/* Drag overlay for the active task */}
        <DragOverlay zIndex={100}>
          {activeTask && (
            <div className="w-[calc(100%/4-1rem)] pointer-events-none">
              <TaskCard 
                task={activeTask} 
                priorityColor={getPriorityColor(activeTask.priority)}
                isDragging={true}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default TaskBoard;