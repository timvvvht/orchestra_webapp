/**
 * Plan parsing utilities for extracting structured data from tool results
 */

export interface ParsedPlanResult {
  completed_task?: string;
  todo_id?: string;
  next_todos?: Array<{ id: string; description: string }>;
  version?: number;
}

/**
 * Parses plan-related data from tool_result content text.
 * Handles the YAML-like format returned by plan_mark_todo and similar tools.
 * 
 * @param text - The raw text content from tool_result
 * @returns Parsed plan data or empty object if parsing fails
 */
export function parsePlanResult(text: string): ParsedPlanResult {
  if (!text || typeof text !== 'string') {
    return {};
  }

  const result: ParsedPlanResult = {};

  try {
    // Extract completed_task
    const completedTaskMatch = text.match(/completed_task:\s*(.+?)(?:\n|$)/);
    if (completedTaskMatch) {
      result.completed_task = completedTaskMatch[1].trim();
    }

    // Extract todo_id
    const todoIdMatch = text.match(/todo_id:\s*([^\s\n]+)/);
    if (todoIdMatch) {
      result.todo_id = todoIdMatch[1].trim();
    }

    // Extract version
    const versionMatch = text.match(/version:\s*(\d+)/);
    if (versionMatch) {
      result.version = parseInt(versionMatch[1], 10);
    }

    // Extract next_todos array - this is more complex as it's a JSON array
    const nextTodosMatch = text.match(/next_todos:\s*(\[[\s\S]*?\])/);
    if (nextTodosMatch) {
      try {
        // Clean up the JSON string - replace single quotes with double quotes
        const jsonStr = nextTodosMatch[1]
          .replace(/'/g, '"')
          .replace(/(\w+):/g, '"$1":'); // Quote unquoted keys
        
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          result.next_todos = parsed.map((todo: any) => ({
            id: String(todo.id || ''),
            description: String(todo.description || '')
          }));
        }
      } catch {
        // If JSON parsing fails, try to extract manually
        const todosText = nextTodosMatch[1];
        const todoMatches = todosText.match(/'id':\s*'([^']+)'[^}]*'description':\s*'([^']+)'/g);
        if (todoMatches) {
          result.next_todos = todoMatches.map(match => {
            const idMatch = match.match(/'id':\s*'([^']+)'/);
            const descMatch = match.match(/'description':\s*'([^']+)'/);
            return {
              id: idMatch ? idMatch[1] : '',
              description: descMatch ? descMatch[1] : ''
            };
          });
        }
      }
    }

  } catch (error) {
    console.warn('Failed to parse plan result:', error);
    return {};
  }

  return result;
}