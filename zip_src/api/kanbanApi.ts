import { invoke } from '@tauri-apps/api/core';
import { Column, Task } from '@/types/kanban';

/**
 * Get the kanban board data from the backend
 * 
 * @returns A promise that resolves to the kanban board data
 */
export async function getKanbanBoard(): Promise<Column[]> {
  try {
    const result = await invoke<string>('get_kanban_board');
    
    if (!result) {
      // If no board data exists yet, return an empty array
      return [];
    }
    
    return JSON.parse(result);
  } catch (error) {
    console.error('Error getting kanban board:', error);
    return [];
  }
}

/**
 * Save the kanban board data to the backend
 * 
 * @param boardData The kanban board data to save
 * @returns A promise that resolves when the operation is complete
 */
export async function saveKanbanBoard(boardData: Column[]): Promise<void> {
  try {
    await invoke('save_kanban_board', { boardData });
  } catch (error) {
    console.error('Error saving kanban board:', error);
    throw new Error(`Failed to save kanban board: ${error}`);
  }
}