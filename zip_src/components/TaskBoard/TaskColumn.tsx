import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TaskCard from "./TaskCard";
import { useKanbanStore } from "@/stores/kanbanStore";

interface Assignee {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  assignedTo?: Assignee;
  tags?: string[];
  priority?: "low" | "medium" | "high";
  description?: string;
}

interface TaskColumnProps {
  column: {
    id: string;
    title: string;
    tasks: Task[];
  };
  getPriorityColor: (priority?: "low" | "medium" | "high") => string;
  withDnD?: boolean; // Add this prop to make it optional
}

const TaskColumn: React.FC<TaskColumnProps> = ({
  column,
  getPriorityColor,
  withDnD = true, // Default to true to maintain current behavior
}) => {
  return (
    <div className="flex flex-col rounded-xl bg-muted/30 overflow-hidden relative z-10">  {/* Added z-index for proper stacking */}
      <h3 className="border-b border-border px-4 py-2 text-xs font-semibold text-muted-foreground">
        {column.title} ({column.tasks.length})
      </h3>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {column.tasks.map((task) => (
          <SortableTaskCard
            key={task.id}
            task={task}
            priorityColor={getPriorityColor(task.priority)}
          />
        ))}
        <button className="w-full rounded-lg border border-dashed border-border bg-transparent p-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors">
          + Add Task
        </button>
      </div>
    </div>
  );
};

const SortableTaskCard = ({ task, priorityColor }: { task: Task; priorityColor: string }) => {
  const { deleteTask } = useKanbanStore();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: transform ? 50 : 'auto', // Apply higher z-index when being dragged
  };

  const handleDeleteTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask(task.id);
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard 
        task={task} 
        priorityColor={priorityColor} 
        onDelete={handleDeleteTask}
      />
    </div>
  );
};

export default TaskColumn;