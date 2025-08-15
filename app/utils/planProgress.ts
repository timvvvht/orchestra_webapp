import { PlanProgress, PlanItem } from '@/types/plans';

// Simple interface for test compatibility
export interface SimplePlanProgress {
  total: number;
  completed: number;
  percentage: number;
}

/**
 * Analyze a plan's markdown content and provide structured progress information.
 * 
 * @param markdownContent The markdown content of the plan
 * @returns SimplePlanProgress object with basic completion metrics for test compatibility
 */
export function analyzePlanProgress(markdownContent: string): SimplePlanProgress {
  console.log(`[analyzePlanProgress] Analyzing markdown content (length: ${markdownContent.length} chars)`);
  
  const lines = markdownContent.split('\n');
  const items: PlanItem[] = [];
  
  // Regex patterns for checkbox items
  const checkedPattern = /^(\s*)-\s*\[x\]\s*(.+?)(?:\s*<!--\s*id:([a-f0-9]+)\s*-->.*)?$/i;
  const uncheckedPattern = /^(\s*)-\s*\[\s*\]\s*(.+?)(?:\s*<!--\s*id:([a-f0-9]+)\s*-->.*)?$/i;
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // Check for checked items
    const checkedMatch = line.match(checkedPattern);
    if (checkedMatch) {
      const [, indent, text, todoId] = checkedMatch;
      // Clean text by removing comment part
      const cleanText = text.replace(/\s*<!--.*?-->/, '').trim();
      items.push({
        id: todoId,
        text: cleanText,
        checked: true,
        line_number: lineNumber,
        indent_level: indent.length,
        raw_line: line
      });
      return;
    }
    
    // Check for unchecked items
    const uncheckedMatch = line.match(uncheckedPattern);
    if (uncheckedMatch) {
      const [, indent, text, todoId] = uncheckedMatch;
      // Clean text by removing comment part
      const cleanText = text.replace(/\s*<!--.*?-->/, '').trim();
      items.push({
        id: todoId,
        text: cleanText,
        checked: false,
        line_number: lineNumber,
        indent_level: indent.length,
        raw_line: line
      });
    }
  });
  
  // Calculate progress metrics
  const total = items.length;
  const completed = items.filter(item => item.checked).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100 * 100) / 100 : 0; // Round to 2 decimal places
  
  const result: SimplePlanProgress = {
    total,
    completed,
    percentage
  };
  
  console.log(`[analyzePlanProgress] Analysis complete: ${total} total items, ${completed} completed, ${percentage}% complete`);
  return result;
}

/**
 * Analyze a plan's markdown content and provide full structured progress information.
 * 
 * @param markdownContent The markdown content of the plan
 * @returns PlanProgress object with completion metrics and items
 */
export function analyzePlanProgressDetailed(markdownContent: string): PlanProgress {
  // Create a simple hash for content correlation
  const contentHash = markdownContent.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0).toString(16);
  
  console.log(`[PlanProgress] START analysis - length: ${markdownContent.length} chars, hash: ${contentHash}`);
  
  // Show first few lines for context
  const previewLines = markdownContent.split('\n').slice(0, 3);
  console.log(`[PlanProgress] Content preview:`, previewLines.map(line => `"${line.substring(0, 80)}"`));
  
  const lines = markdownContent.split('\n');
  const items: PlanItem[] = [];
  
  // Regex patterns for checkbox items
  const checkedPattern = /^(\s*)-\s*\[x\]\s*(.+?)(?:\s*<!--\s*id:([a-f0-9]+)\s*-->.*)?$/i;
  const uncheckedPattern = /^(\s*)-\s*\[\s*\]\s*(.+?)(?:\s*<!--\s*id:([a-f0-9]+)\s*-->.*)?$/i;
  
  console.log(`[PlanProgress] Scanning ${lines.length} lines for checkbox items...`);
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // Check for checked items
    const checkedMatch = line.match(checkedPattern);
    if (checkedMatch) {
      const [, indent, text, todoId] = checkedMatch;
      // Clean text by removing comment part
      const cleanText = text.replace(/\s*<!--.*?-->/, '').trim();
      const item = {
        id: todoId,
        text: cleanText,
        checked: true,
        line_number: lineNumber,
        indent_level: indent.length,
        raw_line: line
      };
      items.push(item);
      console.log(`[PlanProgress] Line ${lineNumber}: CHECKED - id:${todoId || 'none'} text:"${cleanText.substring(0, 50)}${cleanText.length > 50 ? '...' : ''}"`);
      return;
    }
    
    // Check for unchecked items
    const uncheckedMatch = line.match(uncheckedPattern);
    if (uncheckedMatch) {
      const [, indent, text, todoId] = uncheckedMatch;
      // Clean text by removing comment part
      const cleanText = text.replace(/\s*<!--.*?-->/, '').trim();
      const item = {
        id: todoId,
        text: cleanText,
        checked: false,
        line_number: lineNumber,
        indent_level: indent.length,
        raw_line: line
      };
      items.push(item);
      console.log(`[PlanProgress] Line ${lineNumber}: UNCHECKED - id:${todoId || 'none'} text:"${cleanText.substring(0, 50)}${cleanText.length > 50 ? '...' : ''}"`);
    }
  });
  
  // Check for duplicate IDs
  const idsWithValues = items.filter(item => item.id).map(item => item.id);
  const duplicateIds = idsWithValues.filter((id, index) => idsWithValues.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    console.warn(`[PlanProgress] DUPLICATE todo IDs detected:`, [...new Set(duplicateIds)]);
  }
  
  // Calculate progress metrics
  const total = items.length;
  const checked = items.filter(item => item.checked).length;
  const unchecked = total - checked;
  const percent = total > 0 ? Math.round((checked / total) * 100 * 100) / 100 : 0; // Round to 2 decimal places
  
  console.log(`[PlanProgress] METRICS - total: ${total}, checked: ${checked}, unchecked: ${unchecked}, percent: ${percent}%`);
  
  // Create progress bar (10 characters)
  const filledBlocks = Math.floor(percent / 10);
  const bar = '█'.repeat(filledBlocks) + '░'.repeat(10 - filledBlocks);
  
  // Determine status
  let status: 'complete' | 'in_progress' | 'not_started';
  if (percent === 100) {
    status = 'complete';
  } else if (percent > 0) {
    status = 'in_progress';
  } else {
    status = 'not_started';
  }
  
  console.log(`[PlanProgress] STATUS - ${status}, bar: "${bar}"`);
  
  const result: PlanProgress = {
    total,
    checked,
    completed: checked,  // alias for UI compatibility - remove after migration
    unchecked,
    percent,
    bar,
    status,
    items
  };
  
  // Show items summary
  const checkedItems = items.filter(item => item.checked);
  const uncheckedItems = items.filter(item => !item.checked);
  
  console.log(`[PlanProgress] CHECKED ITEMS (${checkedItems.length}):`);
  checkedItems.forEach(item => {
    console.log(`  ✓ Line ${item.line_number}: ${item.text.substring(0, 60)}${item.text.length > 60 ? '...' : ''} ${item.id ? `(id:${item.id})` : ''}`);
  });
  
  console.log(`[PlanProgress] UNCHECKED ITEMS (${uncheckedItems.length}):`);
  uncheckedItems.forEach(item => {
    console.log(`  ☐ Line ${item.line_number}: ${item.text.substring(0, 60)}${item.text.length > 60 ? '...' : ''} ${item.id ? `(id:${item.id})` : ''}`);
  });
  
  console.log(`[PlanProgress] COMPLETE - hash: ${contentHash}, result:`, {
    total: result.total,
    checked: result.checked,
    percent: result.percent,
    status: result.status
  });
  
  return result;
}

/**
 * Get a short summary string for plan progress
 */
export function getPlanProgressSummary(progress: PlanProgress): string {
  return `${progress.checked}/${progress.total} (${progress.percent}%)`;
}

/**
 * Get status color class for plan progress based on percentage
 */
export function getPlanStatusColor(percentage: number): string {
  // Clamp percentage to 0-100 range
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  
  if (clampedPercentage >= 75) {
    return 'bg-green-500';
  } else if (clampedPercentage >= 50) {
    return 'bg-yellow-500';
  } else {
    return 'bg-red-500';
  }
}

/**
 * Get status color class for plan progress based on PlanProgress object
 */
export function getPlanStatusColorFromProgress(progress: PlanProgress): string {
  switch (progress.status) {
    case 'complete':
      return 'text-green-400';
    case 'in_progress':
      return 'text-blue-400';
    case 'not_started':
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
}