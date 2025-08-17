/**
 * Interactive Table Extension for CodeMirror 6
 * 
 * Adds Obsidian-like interactive table editing capabilities:
 * - Tab navigation between cells
 * - Table formatting
 * - Table creation
 * - Row/column manipulation
 */

import { EditorView, ViewPlugin, ViewUpdate, KeyBinding, Command } from '@codemirror/view';
import { StateField, StateEffect, Extension, EditorState, Transaction, Range } from '@codemirror/state';
import { keymap } from '@codemirror/view';

// Regular expressions for table detection
const tableRowRegex = /^\s*\|?\s*(.+?)\s*\|?\s*$/;
const tableSeparatorRegex = /^\s*\|?\s*(:?-+:?\s*\|\s*)+(:?-+:?\s*)\|?\s*$/;
const cellSplitRegex = /\s*\|\s*/;

// Interface for table information
interface TableInfo {
  rows: TableRow[];
  startLine: number;
  endLine: number;
  hasHeaderRow: boolean;
  columnCount: number;
  columnAlignments: ColumnAlignment[];
}

interface TableRow {
  cells: string[];
  line: number;
  from: number;
  to: number;
  isHeaderSeparator: boolean;
}

interface TableCell {
  text: string;
  row: number;
  column: number;
  from: number;
  to: number;
}

type ColumnAlignment = 'left' | 'center' | 'right' | 'default';

// Effect to trigger table formatting
const formatTableEffect = StateEffect.define<{ from: number; to: number }>();

/**
 * Helper function to determine if the cursor is inside a table
 */
function cursorInTable(state: EditorState): { table: TableInfo; cell: TableCell } | null {
  const { doc } = state;
  const { from } = state.selection.main;
  const line = doc.lineAt(from);
  
  // Check if this line looks like a table row
  if (!tableRowRegex.test(line.text) || !line.text.includes('|')) {
    return null;
  }
  
  // Scan up to find the start of the table
  let startLine = line.number;
  while (startLine > 1) {
    const prevLine = doc.line(startLine - 1);
    if (!tableRowRegex.test(prevLine.text) || !prevLine.text.includes('|')) {
      break;
    }
    startLine--;
  }
  
  // Scan down to find the end of the table
  let endLine = line.number;
  while (endLine < doc.lines) {
    const nextLine = doc.line(endLine + 1);
    if (!tableRowRegex.test(nextLine.text) || !nextLine.text.includes('|')) {
      break;
    }
    endLine++;
  }
  
  // Parse the table
  const table = parseTable(doc, startLine, endLine);
  if (!table) return null;
  
  // Find the cell containing the cursor
  const rowIndex = line.number - startLine;
  if (rowIndex < 0 || rowIndex >= table.rows.length) return null;
  
  const row = table.rows[rowIndex];
  if (row.isHeaderSeparator) return null;
  
  // Calculate cell boundaries
  const cells: TableCell[] = [];
  const rowText = line.text;
  let cellStart = line.from;
  
  // Handle first cell (may or may not have a leading pipe)
  if (rowText.trimStart().startsWith('|')) {
    // Skip the leading pipe
    cellStart = line.from + rowText.indexOf('|') + 1;
  }
  
  // Process each cell
  for (let i = 0; i < row.cells.length; i++) {
    const cellText = row.cells[i];
    const cellEnd = rowText.indexOf('|', cellStart - line.from + 1);
    
    // If this is the last cell and there's no trailing pipe
    const end = cellEnd > 0 ? line.from + cellEnd : line.to;
    
    cells.push({
      text: cellText,
      row: rowIndex,
      column: i,
      from: cellStart,
      to: end
    });
    
    // Move to the next cell
    cellStart = end + 1;
  }
  
  // Find which cell contains the cursor
  const cell = cells.find(cell => from >= cell.from && from <= cell.to);
  if (!cell) return null;
  
  return { table, cell };
}

/**
 * Parse a table from the document
 */
function parseTable(doc: Text, startLine: number, endLine: number): TableInfo | null {
  const rows: TableRow[] = [];
  let hasHeaderRow = false;
  let columnCount = 0;
  let columnAlignments: ColumnAlignment[] = [];
  
  for (let i = startLine; i <= endLine; i++) {
    const line = doc.line(i);
    const lineText = line.text;
    
    // Check if this is a separator row
    const isSeparator = tableSeparatorRegex.test(lineText);
    
    if (isSeparator) {
      hasHeaderRow = true;
      columnAlignments = getColumnAlignments(lineText);
    }
    
    // Split the row into cells
    const rowContent = lineText.trim().replace(/^\|\s*|\s*\|$/g, '');
    const cells = rowContent.split(cellSplitRegex);
    
    // Update the column count
    columnCount = Math.max(columnCount, cells.length);
    
    // Add the row
    rows.push({
      cells,
      line: i,
      from: line.from,
      to: line.to,
      isHeaderSeparator: isSeparator
    });
  }
  
  return {
    rows,
    startLine,
    endLine,
    hasHeaderRow,
    columnCount,
    columnAlignments
  };
}

/**
 * Helper function to determine column alignment from separator row
 */
function getColumnAlignments(separatorRow: string): ColumnAlignment[] {
  // Remove outer pipes and split by pipe
  const cells = separatorRow.trim().replace(/^\|\s*|\s*\|$/g, '').split(cellSplitRegex);
  
  return cells.map(cell => {
    const trimmed = cell.trim();
    if (trimmed.startsWith(':') && trimmed.endsWith(':')) {
      return 'center';
    } else if (trimmed.endsWith(':')) {
      return 'right';
    } else if (trimmed.startsWith(':')) {
      return 'left';
    } else {
      return 'default';
    }
  });
}

/**
 * Format a table to align columns nicely
 */
function formatTable(state: EditorState, table: TableInfo): Transaction | null {
  // Calculate the maximum width of each column
  const columnWidths: number[] = Array(table.columnCount).fill(0);
  
  for (const row of table.rows) {
    if (row.isHeaderSeparator) continue;
    
    for (let i = 0; i < row.cells.length; i++) {
      const cellText = row.cells[i].trim();
      columnWidths[i] = Math.max(columnWidths[i], cellText.length);
    }
  }
  
  // Generate the formatted table
  const formattedRows: string[] = [];
  
  for (const row of table.rows) {
    if (row.isHeaderSeparator) {
      // Format the separator row
      let separatorRow = '|';
      
      for (let i = 0; i < table.columnCount; i++) {
        const alignment = table.columnAlignments[i] || 'default';
        const width = columnWidths[i];
        
        if (alignment === 'center') {
          separatorRow += ` :${'-'.repeat(width)}: |`;
        } else if (alignment === 'right') {
          separatorRow += ` ${'-'.repeat(width)}: |`;
        } else if (alignment === 'left') {
          separatorRow += ` :${'-'.repeat(width)} |`;
        } else {
          separatorRow += ` ${'-'.repeat(width)} |`;
        }
      }
      
      formattedRows.push(separatorRow);
    } else {
      // Format a regular row
      let formattedRow = '|';
      
      for (let i = 0; i < table.columnCount; i++) {
        const cellText = i < row.cells.length ? row.cells[i].trim() : '';
        const alignment = table.columnAlignments[i] || 'default';
        const width = columnWidths[i];
        
        if (alignment === 'right') {
          formattedRow += ` ${' '.repeat(width - cellText.length)}${cellText} |`;
        } else if (alignment === 'center') {
          const leftPad = Math.floor((width - cellText.length) / 2);
          const rightPad = width - cellText.length - leftPad;
          formattedRow += ` ${' '.repeat(leftPad)}${cellText}${' '.repeat(rightPad)} |`;
        } else {
          formattedRow += ` ${cellText}${' '.repeat(width - cellText.length)} |`;
        }
      }
      
      formattedRows.push(formattedRow);
    }
  }
  
  // Create a transaction to replace the table
  const from = state.doc.line(table.startLine).from;
  const to = state.doc.line(table.endLine).to;
  const formatted = formattedRows.join('\n');
  
  return state.update({
    changes: { from, to, insert: formatted }
  });
}

/**
 * Navigate to the next/previous cell in a table
 */
function navigateTableCell(view: EditorView, dir: 'next' | 'prev' | 'up' | 'down'): boolean {
  const state = view.state;
  const result = cursorInTable(state);
  if (!result) return false;
  
  const { table, cell } = result;
  let targetRow = cell.row;
  let targetCol = cell.column;
  
  if (dir === 'next') {
    targetCol++;
    if (targetCol >= table.columnCount) {
      targetCol = 0;
      targetRow++;
      
      // Skip separator row if present
      if (targetRow < table.rows.length && table.rows[targetRow].isHeaderSeparator) {
        targetRow++;
      }
    }
  } else if (dir === 'prev') {
    targetCol--;
    if (targetCol < 0) {
      targetCol = table.columnCount - 1;
      targetRow--;
      
      // Skip separator row if present
      if (targetRow >= 0 && table.rows[targetRow].isHeaderSeparator) {
        targetRow--;
      }
    }
  } else if (dir === 'up') {
    targetRow--;
    
    // Skip separator row if present
    if (targetRow >= 0 && table.rows[targetRow].isHeaderSeparator) {
      targetRow--;
    }
  } else if (dir === 'down') {
    targetRow++;
    
    // Skip separator row if present
    if (targetRow < table.rows.length && table.rows[targetRow].isHeaderSeparator) {
      targetRow++;
    }
  }
  
  // Check if the target position is valid
  if (targetRow < 0 || targetRow >= table.rows.length) return false;
  if (table.rows[targetRow].isHeaderSeparator) return false;
  if (targetCol < 0 || targetCol >= table.columnCount) return false;
  
  // Find the target cell's position
  const targetLine = state.doc.line(table.startLine + targetRow);
  const targetRowText = targetLine.text;
  let cellStart = targetLine.from;
  
  // Handle first cell (may or may not have a leading pipe)
  if (targetRowText.trimStart().startsWith('|')) {
    // Skip the leading pipe
    cellStart = targetLine.from + targetRowText.indexOf('|') + 1;
  }
  
  // Navigate to the target column
  for (let i = 0; i < targetCol; i++) {
    const nextPipe = targetRowText.indexOf('|', cellStart - targetLine.from + 1);
    if (nextPipe < 0) break;
    cellStart = targetLine.from + nextPipe + 1;
  }
  
  // Find the end of the cell
  const cellEnd = targetRowText.indexOf('|', cellStart - targetLine.from + 1);
  const to = cellEnd > 0 ? targetLine.from + cellEnd : targetLine.to;
  
  // Move the cursor to the target cell
  view.dispatch({
    selection: { anchor: cellStart, head: cellStart }
  });
  
  return true;
}

/**
 * Insert a new row in a table
 */
function insertTableRow(view: EditorView, position: 'above' | 'below'): boolean {
  const state = view.state;
  const result = cursorInTable(state);
  if (!result) return false;
  
  const { table, cell } = result;
  let targetRow = cell.row;
  
  // Adjust target row based on position
  if (position === 'below') {
    targetRow++;
    
    // If we're inserting after a header row, we need to skip the separator
    if (targetRow === 1 && table.hasHeaderRow) {
      targetRow++;
    }
  }
  
  // Create a new row with empty cells
  const emptyCells = Array(table.columnCount).fill('');
  const newRow = `| ${emptyCells.join(' | ')} |`;
  
  // Calculate the insertion position
  const insertPos = targetRow < table.rows.length 
    ? state.doc.line(table.startLine + targetRow).from 
    : state.doc.line(table.endLine).to;
  
  // Create a transaction to insert the new row
  view.dispatch({
    changes: { from: insertPos, insert: `\n${newRow}` }
  });
  
  return true;
}

/**
 * Insert a new column in a table
 */
function insertTableColumn(view: EditorView, position: 'left' | 'right'): boolean {
  const state = view.state;
  const result = cursorInTable(state);
  if (!result) return false;
  
  const { table, cell } = result;
  let targetCol = cell.column;
  
  // Adjust target column based on position
  if (position === 'right') {
    targetCol++;
  }
  
  // Create a transaction to insert a new column in each row
  const changes: Range<Text>[] = [];
  
  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i];
    const line = state.doc.line(table.startLine + i);
    const lineText = line.text;
    
    // Find the position to insert the new column
    let insertPos = line.from;
    let pipeCount = 0;
    
    // Handle first cell (may or may not have a leading pipe)
    if (lineText.trimStart().startsWith('|')) {
      insertPos = line.from + lineText.indexOf('|') + 1;
      pipeCount++;
    }
    
    // Navigate to the target column
    for (let j = 0; j < targetCol; j++) {
      const nextPipe = lineText.indexOf('|', insertPos - line.from + 1);
      if (nextPipe < 0) break;
      insertPos = line.from + nextPipe + 1;
      pipeCount++;
    }
    
    // Create the new cell content
    let newCell;
    
    if (row.isHeaderSeparator) {
      // For separator row, insert a properly formatted separator cell
      newCell = ' --- ';
    } else {
      // For regular rows, insert an empty cell
      newCell = '  ';
    }
    
    // If we're at the end of the row and there's no trailing pipe, add one
    if (insertPos >= line.to && !lineText.trimEnd().endsWith('|')) {
      newCell = `| ${newCell}`;
    }
    
    // Add the change
    changes.push({ from: insertPos, insert: `${newCell}|` });
  }
  
  // Apply all changes
  view.dispatch({ changes });
  
  // Format the table after inserting the column
  setTimeout(() => {
    const newState = view.state;
    const newResult = cursorInTable(newState);
    if (newResult) {
      const formatTx = formatTable(newState, newResult.table);
      if (formatTx) view.dispatch(formatTx);
    }
  }, 10);
  
  return true;
}

/**
 * Delete a row from a table
 */
function deleteTableRow(view: EditorView): boolean {
  const state = view.state;
  const result = cursorInTable(state);
  if (!result) return false;
  
  const { table, cell } = result;
  
  // Don't delete if it's the only row (excluding separator)
  const nonSeparatorRows = table.rows.filter(row => !row.isHeaderSeparator);
  if (nonSeparatorRows.length <= 1) return false;
  
  // Don't delete the separator row directly
  if (table.rows[cell.row].isHeaderSeparator) return false;
  
  // Calculate the range to delete
  const line = state.doc.line(table.startLine + cell.row);
  const from = line.from;
  const to = line.to + 1; // Include the newline
  
  // Create a transaction to delete the row
  view.dispatch({
    changes: { from, to }
  });
  
  return true;
}

/**
 * Delete a column from a table
 */
function deleteTableColumn(view: EditorView): boolean {
  const state = view.state;
  const result = cursorInTable(state);
  if (!result) return false;
  
  const { table, cell } = result;
  
  // Don't delete if it's the only column
  if (table.columnCount <= 1) return false;
  
  // Create a transaction to delete the column in each row
  const changes: Range<Text>[] = [];
  
  for (let i = 0; i < table.rows.length; i++) {
    const line = state.doc.line(table.startLine + i);
    const lineText = line.text;
    
    // Find the cell boundaries
    let cellStart = line.from;
    let pipeCount = 0;
    
    // Handle first cell (may or may not have a leading pipe)
    if (lineText.trimStart().startsWith('|')) {
      cellStart = line.from + lineText.indexOf('|') + 1;
      pipeCount++;
    }
    
    // Navigate to the target column
    for (let j = 0; j < cell.column; j++) {
      const nextPipe = lineText.indexOf('|', cellStart - line.from + 1);
      if (nextPipe < 0) break;
      cellStart = line.from + nextPipe + 1;
      pipeCount++;
    }
    
    // Find the end of the cell
    const cellEnd = lineText.indexOf('|', cellStart - line.from + 1);
    const to = cellEnd > 0 ? line.from + cellEnd + 1 : line.to;
    
    // Add the change to delete this cell
    changes.push({ from: cellStart - 1, to }); // Include the preceding pipe
  }
  
  // Apply all changes
  view.dispatch({ changes });
  
  // Format the table after deleting the column
  setTimeout(() => {
    const newState = view.state;
    const newResult = cursorInTable(newState);
    if (newResult) {
      const formatTx = formatTable(newState, newResult.table);
      if (formatTx) view.dispatch(formatTx);
    }
  }, 10);
  
  return true;
}

/**
 * Create a new table at the cursor position
 */
function createTable(view: EditorView, rows: number = 3, cols: number = 3): boolean {
  const { state } = view;
  const { selection } = state;
  const pos = selection.main.from;
  
  // Create the table content
  const headerCells = Array(cols).fill('Header');
  const headerRow = `| ${headerCells.join(' | ')} |`;
  
  const separatorCells = Array(cols).fill('------');
  const separatorRow = `| ${separatorCells.join(' | ')} |`;
  
  const contentRows = [];
  for (let i = 0; i < rows - 1; i++) {
    const cells = Array(cols).fill('Cell');
    contentRows.push(`| ${cells.join(' | ')} |`);
  }
  
  const tableContent = [
    headerRow,
    separatorRow,
    ...contentRows
  ].join('\n');
  
  // Insert the table
  view.dispatch({
    changes: { from: pos, insert: tableContent }
  });
  
  return true;
}

/**
 * Format the table at the cursor position
 */
function formatTableCommand(view: EditorView): boolean {
  const state = view.state;
  const result = cursorInTable(state);
  if (!result) return false;
  
  const formatTx = formatTable(state, result.table);
  if (formatTx) view.dispatch(formatTx);
  
  return true;
}

/**
 * Create a state field to track tables and handle formatting
 */
const tableStateField = StateField.define<TableInfo[]>({
  create(state) {
    return [];
  },
  update(tables, tr) {
    if (tr.docChanged) {
      // We could scan for tables here, but for performance reasons,
      // we'll only do it on demand when a table-related command is executed
      return tables;
    }
    return tables;
  }
});

/**
 * Define keyboard shortcuts for table navigation and editing
 */
const tableKeymap: KeyBinding[] = [
  { key: 'Tab', run: view => navigateTableCell(view, 'next') },
  { key: 'Shift-Tab', run: view => navigateTableCell(view, 'prev') },
  { key: 'ArrowUp', run: view => navigateTableCell(view, 'up') },
  { key: 'ArrowDown', run: view => navigateTableCell(view, 'down') },
  { key: 'Mod-Enter', run: view => insertTableRow(view, 'below') },
  { key: 'Shift-Enter', run: view => insertTableRow(view, 'above') },
  { key: 'Mod-Shift-ArrowRight', run: view => insertTableColumn(view, 'right') },
  { key: 'Mod-Shift-ArrowLeft', run: view => insertTableColumn(view, 'left') },
  { key: 'Mod-Shift-Backspace', run: view => deleteTableRow(view) },
  { key: 'Mod-Shift-Delete', run: view => deleteTableColumn(view) },
  { key: 'Mod-Shift-f', run: view => formatTableCommand(view) },
];

/**
 * Create the interactive table extension
 */
export function createInteractiveTableExtension(): Extension[] {
  return [
    tableStateField,
    keymap.of(tableKeymap),
    EditorView.domEventHandlers({
      // Add double-click handler for table cells to enter edit mode
      dblclick: (event, view) => {
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos === null) return false;
        
        const state = view.state;
        const result = cursorInTable(state);
        if (!result) return false;
        
        // Select the entire cell content
        const { cell } = result;
        view.dispatch({
          selection: { anchor: cell.from, head: cell.to }
        });
        
        return true;
      }
    }),
  ];
}

/**
 * Command to insert a new table
 */
export function insertTable(view: EditorView, rows: number = 3, cols: number = 3): boolean {
  return createTable(view, rows, cols);
}

/**
 * Command to format the current table
 */
export function formatCurrentTable(view: EditorView): boolean {
  return formatTableCommand(view);
}