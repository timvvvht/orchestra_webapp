import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { KanbanState, Column, Task } from '@/types/kanban';
// Import the real API to maintain previously saved data
import { getKanbanBoard, saveKanbanBoard } from '@/api/kanbanApi';

/**
 * Default columns for the kanban board
 */
const defaultColumns: Column[] = [
    {
        id: 'planned',
        title: 'Planned',
        tasks: [
            {
                id: 't1',
                title: 'Research recent papers on multi-agent systems',
                tags: ['research', 'high-priority'],
                priority: 'high',
                columnId: 'planned',
                description: 'Find and analyze papers published in the last 2 years about multi-agent collaboration systems.'
            },
            {
                id: 't2',
                title: 'Outline literature review structure',
                priority: 'medium',
                columnId: 'planned',
                description: 'Create a structured outline for the literature review section.'
            }
        ]
    },
    {
        id: 'doing',
        title: 'Doing',
        tasks: [
            {
                id: 't3',
                title: 'Analyze collaboration patterns in agent teams',
                assignedTo: { id: '1', name: 'Crawler', color: 'bg-gradient-to-br from-purple-500 to-indigo-600' },
                priority: 'high',
                columnId: 'doing',
                description: 'Identify common patterns of collaboration in multi-agent systems from literature.'
            },
            {
                id: 't4',
                title: 'Summarize findings from paper #23',
                assignedTo: { id: '2', name: 'Summarizer', color: 'bg-gradient-to-br from-blue-500 to-cyan-600' },
                tags: ['summarize'],
                priority: 'medium',
                columnId: 'doing',
                description: 'Create a concise summary of the key findings and methodologies from paper #23.'
            }
        ]
    },
    {
        id: 'review',
        title: 'Review',
        tasks: [
            {
                id: 't5',
                title: 'Evaluate summary quality of agent outputs',
                assignedTo: { id: '3', name: 'Critic', color: 'bg-gradient-to-br from-pink-500 to-rose-600' },
                tags: ['quality-check'],
                priority: 'medium',
                columnId: 'review',
                description: 'Review the quality, accuracy, and completeness of summaries produced by other agents.'
            }
        ]
    },
    {
        id: 'done',
        title: 'Done',
        tasks: [
            {
                id: 't6',
                title: 'Initial project setup and agent configuration',
                tags: ['setup'],
                priority: 'high',
                columnId: 'done',
                description: 'Configure the initial project structure and set up the agent team with appropriate roles.'
            },
            {
                id: 't7',
                title: 'Define research scope and objectives',
                tags: ['planning'],
                priority: 'high',
                columnId: 'done',
                description: 'Clearly define the scope, objectives, and expected outcomes for the research project.'
            }
        ]
    }
];

/**
 * Create the clean kanban store with simplified implementation
 */
export const useCleanKanbanStore = create<KanbanState>((set, get) => ({
    // Initial state
    columns: [],
    isLoading: false,
    error: null,
    selectedTask: null,

    // Get all tasks from all columns as a flat array
    getAllTasks: () => {
        const { columns } = get();
        return columns.flatMap(column => column.tasks);
    },

    // Load the board from the backend
    loadBoard: async () => {
        set({ isLoading: true, error: null });

        try {
            const columns = await getKanbanBoard();

            // If no board data exists yet, use the default columns
            if (columns.length === 0) {
                set({ columns: defaultColumns, isLoading: false });
            } else {
                set({ columns, isLoading: false });
            }
        } catch (error) {
            console.error('Error loading kanban board:', error);
            set({
                error: `Failed to load kanban board: ${error}`,
                isLoading: false,
                columns: defaultColumns // Use default columns on error
            });
        }
    },

    // Save the board to the backend
    saveBoard: async () => {
        set({ isLoading: true, error: null });

        try {
            const { columns } = get();
            await saveKanbanBoard(columns);
            set({ isLoading: false });
        } catch (error) {
            console.error('Error saving kanban board:', error);
            set({
                error: `Failed to save kanban board: ${error}`,
                isLoading: false
            });
        }
    },

    // Add a new task to a column
    addTask: (columnId, task) => {
        const newTask: Task = {
            ...task,
            id: uuidv4(),
            columnId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        set(state => {
            const newColumns = state.columns.map(column => {
                if (column.id === columnId) {
                    return {
                        ...column,
                        tasks: [...column.tasks, newTask]
                    };
                }
                return column;
            });

            return { columns: newColumns };
        });

        // Save the board after adding a task - with a slight delay to prevent UI flicker
        setTimeout(() => {
            get().saveBoard();
        }, 100);
    },

    // Update an existing task
    updateTask: (taskId, updates) => {
        set(state => {
            const newColumns = state.columns.map(column => {
                const taskIndex = column.tasks.findIndex(task => task.id === taskId);
                if (taskIndex === -1) return column;

                const updatedTasks = [...column.tasks];
                updatedTasks[taskIndex] = {
                    ...updatedTasks[taskIndex],
                    ...updates,
                    updatedAt: new Date().toISOString()
                };

                return {
                    ...column,
                    tasks: updatedTasks
                };
            });

            return { columns: newColumns };
        });

        // Save the board after updating a task
        get().saveBoard();
    },

    // Delete a task
    deleteTask: taskId => {
        set(state => {
            const newColumns = state.columns.map(column => ({
                ...column,
                tasks: column.tasks.filter(task => task.id !== taskId)
            }));

            return { columns: newColumns };
        });

        // Save the board after deleting a task
        get().saveBoard();
    },

    // Move a task from one column to another - simplified implementation
    moveTask: (taskId, destinationColumnId, newIndex) => {
        set(state => {
            // Create a new array of columns to return
            const newColumns = [...state.columns];
            
            // Find the task in any column
            let sourceColumnId = null;
            let taskToMove = null;
            let sourceTaskIndex = -1;
            
            // Find the source column and task
            for (const column of newColumns) {
                const taskIndex = column.tasks.findIndex(task => task.id === taskId);
                if (taskIndex !== -1) {
                    sourceColumnId = column.id;
                    taskToMove = { ...column.tasks[taskIndex] };
                    sourceTaskIndex = taskIndex;
                    break;
                }
            }
            
            // If we didn't find the task, do nothing
            if (!sourceColumnId || !taskToMove) {
                return state;
            }
            
            // Find the source and destination column indexes
            const sourceColumnIndex = newColumns.findIndex(col => col.id === sourceColumnId);
            const destColumnIndex = newColumns.findIndex(col => col.id === destinationColumnId);
            
            if (sourceColumnIndex === -1 || destColumnIndex === -1) {
                return state; // Invalid column IDs
            }
            
            // Create a copy of the task with updated columnId
            const updatedTask = {
                ...taskToMove,
                columnId: destinationColumnId,
                updatedAt: new Date().toISOString()
            };
            
            // Remove from source column
            newColumns[sourceColumnIndex] = {
                ...newColumns[sourceColumnIndex],
                tasks: newColumns[sourceColumnIndex].tasks.filter(task => task.id !== taskId)
            };
            
            // Add to destination column
            const destTasks = [...newColumns[destColumnIndex].tasks];
            
            // Insert at the specified index or append
            if (typeof newIndex === 'number') {
                destTasks.splice(newIndex, 0, updatedTask);
            } else {
                destTasks.push(updatedTask);
            }
            
            newColumns[destColumnIndex] = {
                ...newColumns[destColumnIndex],
                tasks: destTasks
            };
            
            return { columns: newColumns };
        });

        // Save the board after moving a task - with a slight delay to prevent UI flicker
        setTimeout(() => {
            get().saveBoard();
        }, 100);
    },

    // Legacy move task method (for compatibility)
    moveTaskLegacy: (taskId, sourceColumnId, destinationColumnId, newIndex) => {
        // Call the new moveTask method instead
        get().moveTask(taskId, destinationColumnId, newIndex);
    },

    // Add a new column
    addColumn: column => {
        const newColumn: Column = {
            ...column,
            id: uuidv4(),
            tasks: []
        };

        set(state => ({
            columns: [...state.columns, newColumn]
        }));

        // Save the board after adding a column - with a slight delay to prevent UI flicker
        setTimeout(() => {
            get().saveBoard();
        }, 100);
    },

    // Update an existing column
    updateColumn: (columnId, updates) => {
        set(state => {
            const columnIndex = state.columns.findIndex(col => col.id === columnId);

            if (columnIndex === -1) {
                return state;
            }

            const newColumns = [...state.columns];
            newColumns[columnIndex] = {
                ...newColumns[columnIndex],
                ...updates
            };

            return { columns: newColumns };
        });

        // Save the board after updating a column
        get().saveBoard();
    },

    // Delete a column
    deleteColumn: columnId => {
        set(state => ({
            columns: state.columns.filter(col => col.id !== columnId)
        }));

        // Save the board after deleting a column
        get().saveBoard();
    },

    // Move a column to a new position
    moveColumn: (columnId, newIndex) => {
        set(state => {
            const columnIndex = state.columns.findIndex(col => col.id === columnId);

            if (columnIndex === -1 || newIndex < 0 || newIndex >= state.columns.length) {
                return state;
            }

            const newColumns = [...state.columns];
            const [movedColumn] = newColumns.splice(columnIndex, 1);
            newColumns.splice(newIndex, 0, movedColumn);

            return { columns: newColumns };
        });

        // Save the board after moving a column - with a slight delay to prevent UI flicker
        setTimeout(() => {
            get().saveBoard();
        }, 100);
    },
    
    // Set the selected task for editing
    setSelectedTask: (task) => {
        set({ selectedTask: task });
    }
}));