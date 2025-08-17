import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { useKanbanStore } from "@/stores/kanbanStore";

interface TaskHeaderProps {
  title?: string;
  onNewTask?: () => void;
}

const TaskHeader: React.FC<TaskHeaderProps> = ({ title = "Task Board", onNewTask }) => {
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedColumn, setSelectedColumn] = useState("");
  const { columns, addTask } = useKanbanStore();

  const handleAddTask = () => {
    if (!newTaskTitle.trim() || !selectedColumn) return;

    addTask(selectedColumn, {
      title: newTaskTitle.trim(),
      priority: "medium",
    });

    // Reset form
    setNewTaskTitle("");
    setSelectedColumn("");
    setShowNewTaskForm(false);
  };

  return (
    <div className="flex flex-col px-2 pb-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button
          onClick={() => setShowNewTaskForm(!showNewTaskForm)}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted transition-colors"
        >
          {showNewTaskForm ? (
            <>
              <X className="h-3 w-3" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-3 w-3" />
              New Task
            </>
          )}
        </button>
      </div>

      {showNewTaskForm && (
        <div className="mt-2 p-3 border border-border rounded-md bg-muted/30">
          <div className="flex flex-col space-y-2">
            <input
              type="text"
              placeholder="Task title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-border rounded-md bg-background"
            />
            <select
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-border rounded-md bg-background"
            >
              <option value="">Select a column</option>
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.title}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddTask}
              disabled={!newTaskTitle.trim() || !selectedColumn}
              className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md disabled:opacity-50"
            >
              Add Task
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskHeader;