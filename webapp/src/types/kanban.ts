/**
 * Represents a task in the kanban board
 */
export interface Task {
    id: string;
    title: string;
    description?: string;
    columnId?: string; // The ID of the column this task belongs to
    assignedTo?: {
        id: string;
        name: string;
        color: string;
    };
    tags?: string[];
    priority?: 'low' | 'medium' | 'high';
    dueDate?: Date | string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

/**
 * Represents a column in the kanban board
 */
export interface Column {
    id: string;
    title: string;
    tasks: Task[];
}

/**
 * Represents the kanban board state
 */
export interface KanbanState {
    columns: Column[];
    isLoading: boolean;
    error: string | null;
    selectedTask: Task | null;

    // Actions
    loadBoard: () => Promise<void>;
    saveBoard: () => Promise<void>;
    addTask: (columnId: string, task: Omit<Task, 'id'>) => void;
    updateTask: (taskId: string, updates: Partial<Task>) => void;
    deleteTask: (taskId: string) => void;
    moveTask: (taskId: string, destinationColumnId: string, newIndex?: number) => void;
    moveTaskLegacy: (taskId: string, sourceColumnId: string, destinationColumnId: string, newIndex?: number) => void;
    addColumn: (column: Omit<Column, 'id'>) => void;
    updateColumn: (columnId: string, updates: Partial<Column>) => void;
    deleteColumn: (columnId: string) => void;
    moveColumn: (columnId: string, newIndex: number) => void;
    setSelectedTask: (task: Task | null) => void;

    // Getters
    getAllTasks: () => Task[];
}
