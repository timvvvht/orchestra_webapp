import { Column } from '@/types/kanban';

// In-memory storage for the kanban board data
let kanbanBoardData: Column[] = [];

/**
 * Get the kanban board data from in-memory storage
 * 
 * @returns A promise that resolves to the kanban board data
 */
export async function getKanbanBoard(): Promise<Column[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Return a deep copy of the data to prevent unintended mutations
  return JSON.parse(JSON.stringify(kanbanBoardData));
}

/**
 * Save the kanban board data to in-memory storage
 * 
 * @param boardData The kanban board data to save
 * @returns A promise that resolves when the operation is complete
 */
export async function saveKanbanBoard(boardData: Column[]): Promise<void> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Store a deep copy of the data to prevent unintended mutations
  kanbanBoardData = JSON.parse(JSON.stringify(boardData));
}