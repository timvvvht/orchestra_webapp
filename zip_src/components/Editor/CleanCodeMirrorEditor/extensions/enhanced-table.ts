/**
 * Enhanced Table Extension for CodeMirror 6
 * Provides Obsidian-like table rendering in the editor
 */

import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { RangeSetBuilder, Extension } from '@codemirror/state';
// import { text } from 'stream/consumers'; // Unused import
// import { transform } from 'framer-motion'; // Unused import

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

type ColumnAlignment = 'left' | 'center' | 'right' | 'default';

// Regular expressions for table detection
// This regex matches any line that contains pipes and looks like a table row
// More flexible - allows tables without trailing pipes
const tableRowRegex = /^\s*\|.*$/;
// This regex matches separator rows like | --- | --- | or |:---:|:---:| or |---|---|
// More flexible - allows separators without trailing pipes
const tableSeparatorRegex = /^\s*\|[-:\s\|]*[-:]\s*$/;

// Log the regex patterns for debugging
// console.log(`[TableDetection] Using row regex: ${tableRowRegex}`);
// console.log(`[TableDetection] Using separator regex: ${tableSeparatorRegex}`);
const cellSplitRegex = /\s*\|\s*/;

// Helper function to determine column alignment from separator row
function getColumnAlignments(separatorRow: string): ColumnAlignment[] {
    // Remove outer pipes and split by pipe
    const cells = separatorRow
        .trim()
        .replace(/^\|\s*|\s*\|$/g, '')
        .split(cellSplitRegex);

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
 * Widget for rendering a table cell with proper styling
 */
class TableCellWidget extends WidgetType {
    constructor(
        readonly content: string,
        readonly isHeader: boolean,
        readonly alignment: ColumnAlignment,
        readonly isFirstCell: boolean,
        readonly isLastCell: boolean
    ) {
        super();
    }

    eq(other: TableCellWidget): boolean {
        return (
            this.content === other.content &&
            this.isHeader === other.isHeader &&
            this.alignment === other.alignment &&
            this.isFirstCell === other.isFirstCell &&
            this.isLastCell === other.isLastCell
        );
    }

    toDOM(): HTMLElement {
        const cell = document.createElement('span');
        cell.className = `cm-table-cell${this.isHeader ? ' cm-table-header-cell' : ''}${this.isFirstCell ? ' cm-table-first-cell' : ''}${
            this.isLastCell ? ' cm-table-last-cell' : ''
        } cm-table-align-${this.alignment}`;

        cell.textContent = this.content;
        return cell;
    }
}

/**
 * Widget for rendering table separator row
 */
class TableSeparatorWidget extends WidgetType {
    constructor(readonly columnCount: number, readonly alignments: ColumnAlignment[]) {
        super();
    }

    eq(other: TableSeparatorWidget): boolean {
        return this.columnCount === other.columnCount && JSON.stringify(this.alignments) === JSON.stringify(other.alignments);
    }

    toDOM(): HTMLElement {
        const separator = document.createElement('div');
        separator.className = 'cm-table-separator';

        // Create visual separator with alignment indicators
        for (let i = 0; i < this.columnCount; i++) {
            const alignment = this.alignments[i] || 'default';
            const cell = document.createElement('span');
            cell.className = `cm-table-separator-cell cm-table-align-${alignment}`;

            // Add alignment indicator
            if (alignment === 'center') {
                cell.textContent = ':───:';
            } else if (alignment === 'right') {
                cell.textContent = '───:';
            } else if (alignment === 'left') {
                cell.textContent = ':───';
            } else {
                cell.textContent = '───';
            }

            separator.appendChild(cell);
        }

        return separator;
    }
}

/**
 * Plugin that detects and enhances Markdown tables
 */
const enhancedTablePlugin = ViewPlugin.fromClass(
    class {
        tables: TableInfo[] = [];
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.tables = this.scanTables(view);
            this.decorations = this.buildDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged) {
                this.tables = this.scanTables(update.view);
                this.decorations = this.buildDecorations(update.view);
            }
        }

        // Scan the document for Markdown tables
        scanTables(view: EditorView): TableInfo[] {
            const tables: TableInfo[] = [];
            const { state } = view;
            const { doc } = state;

            let currentTable: TableInfo | null = null;
            let lastLineWasTable = false;

            // console.log(`[TableDetection] Scanning document with ${doc.lines} lines for tables`);

            for (let i = 1; i <= doc.lines; i++) {
                const line = doc.line(i);
                const lineText = line.text;

                // Check if this line is a table separator
                const isSeparator = tableSeparatorRegex.test(lineText);

                // Check if this line is a table row
                // A table row must match the regex and not be inside a code block
                // We've simplified the regex to require pipes at both start and end
                const isTableRow = tableRowRegex.test(lineText) && !lineText.includes('```');

                // For debugging, show the regex test result separately
                const regexTest = tableRowRegex.test(lineText);
                const separatorTest = tableSeparatorRegex.test(lineText);
                const hasPipe = lineText.includes('|');
                const notInCodeBlock = !lineText.includes('```');
                // console.log(`[TableDetection] Line ${i} regex components: regexTest=${regexTest}, separatorTest=${separatorTest}, hasPipe=${hasPipe}, notInCodeBlock=${notInCodeBlock}`);

                // Log each line's detection status
                // console.log(`[TableDetection] Line ${i}: "${lineText.substring(0, 40)}${lineText.length > 40 ? '...' : ''}" - isSeparator: ${isSeparator}, isTableRow: ${isTableRow}`);

                if (isTableRow || isSeparator) {
                    // If we're not already tracking a table, start a new one
                    if (!currentTable) {
                        currentTable = {
                            rows: [],
                            startLine: i,
                            endLine: i,
                            hasHeaderRow: false,
                            columnCount: 0,
                            columnAlignments: []
                        };
                        console.log(`[TableDetection] Started new table at line ${i}`);
                    }

                    // Update the end line of the current table
                    currentTable.endLine = i;

                    // Process the row
                    if (isSeparator) {
                        // This is a separator row, extract column alignments
                        currentTable.columnAlignments = getColumnAlignments(lineText);
                        currentTable.hasHeaderRow = true; // If we have a separator, we have a header

                        // Add the separator row
                        const cells = lineText
                            .trim()
                            .replace(/^\|\s*|\s*\|$/g, '')
                            .split(cellSplitRegex);
                        currentTable.columnCount = Math.max(currentTable.columnCount, cells.length);

                        currentTable.rows.push({
                            cells,
                            line: i,
                            from: line.from,
                            to: line.to,
                            isHeaderSeparator: true
                        });
                    } else {
                        // This is a regular table row
                        // Split the row into cells
                        const rowContent = lineText.trim().replace(/^\|\s*|\s*\|$/g, '');
                        const cells = rowContent.split(cellSplitRegex);

                        // Update the column count
                        currentTable.columnCount = Math.max(currentTable.columnCount, cells.length);

                        // Add the row
                        currentTable.rows.push({
                            cells,
                            line: i,
                            from: line.from,
                            to: line.to,
                            isHeaderSeparator: false
                        });
                    }

                    lastLineWasTable = true;
                } else {
                    // This line is not part of a table
                    if (currentTable) {
                        // Finalize the current table
                        tables.push(currentTable);
                        // console.log(`[TableDetection] Finalized table from line ${currentTable.startLine} to ${currentTable.endLine} with ${currentTable.rows.length} rows and ${currentTable.columnCount} columns`);
                        currentTable = null;
                    }

                    lastLineWasTable = false;
                }
            }

            // Don't forget to add the last table if we were tracking one
            if (currentTable) {
                tables.push(currentTable);
                // console.log(`[TableDetection] Finalized last table from line ${currentTable.startLine} to ${currentTable.endLine} with ${currentTable.rows.length} rows and ${currentTable.columnCount} columns`);
            }

            // console.log(`[TableDetection] Found ${tables.length} tables in total`);

            return tables;
        }

        // Build decorations for the tables
        buildDecorations(view: EditorView): DecorationSet {
            const builder = new RangeSetBuilder<Decoration>();

            // Process each table
            for (const table of this.tables) {
                // Add a table container class to each table row
                for (const row of table.rows) {
                    // Skip separator rows as we'll replace them with our custom widget
                    if (row.isHeaderSeparator) {
                        // Replace the separator row with our custom widget
                        builder.add(
                            row.from,
                            row.to,
                            Decoration.replace({
                                widget: new TableSeparatorWidget(table.columnCount, table.columnAlignments)
                            })
                        );
                        continue;
                    }

                    // Add a table row class
                    builder.add(
                        row.from,
                        row.from,
                        Decoration.line({
                            class: `cm-table-row${table.hasHeaderRow && row.line === table.startLine ? ' cm-table-header-row' : ''}`
                        })
                    );

                    // Process each cell in the row
                    let cellStart = row.from;
                    const rowText = view.state.doc.sliceString(row.from, row.to);

                    // Split the row text into cells
                    const rawCells = rowText.trim().split('|');
                    const cells = rawCells.filter(cell => cell.trim() !== '');

                    // Calculate positions of each cell
                    let positions: { start: number; end: number }[] = [];
                    let pos = row.from;

                    // Handle first cell (may or may not have a leading pipe)
                    if (rowText.trimStart().startsWith('|')) {
                        // Skip the leading pipe
                        pos = rowText.indexOf('|', pos) + 1;
                    }

                    // Process each cell
                    for (let i = 0; i < cells.length; i++) {
                        const cellText = cells[i];
                        const start = pos;
                        pos = rowText.indexOf('|', pos);

                        // If this is the last cell and there's no trailing pipe
                        if (pos === -1 && i === cells.length - 1) {
                            pos = row.to;
                        }

                        const end = pos > 0 ? pos : row.to;
                        positions.push({ start, end });

                        // Move past the pipe for the next cell
                        if (pos > 0) {
                            pos += 1;
                        }
                    }

                    // Add decorations for each cell
                    for (let i = 0; i < cells.length; i++) {
                        if (i < positions.length) {
                            const { start, end } = positions[i];
                            const isHeader = table.hasHeaderRow && row.line === table.startLine;
                            const alignment = table.columnAlignments[i] || 'default';

                            // Replace the cell with our custom widget
                            builder.add(
                                start,
                                end,
                                Decoration.replace({
                                    widget: new TableCellWidget(cells[i].trim(), isHeader, alignment, i === 0, i === cells.length - 1)
                                })
                            );
                        }
                    }
                }
            }

            return builder.finish();
        }
    },
    {
        decorations: v => v.decorations
    }
);

/**
 * Create the enhanced table extension
 */
export function createEnhancedTableExtension(): Extension[] {
    return [
        enhancedTablePlugin,
        EditorView.baseTheme({
            // 🎯 Obsidian-Style Table Rows - Using our CSS variables
            '.cm-line.cm-table-row': {
                display: 'flex',
                flexDirection: 'row',
                borderBottom: '1px solid var(--table-border)',
                padding: '6px 0',
                fontFamily: 'Cascadia Code, Fira Code, SF Mono, Monaco, Inconsolata, Roboto Mono, monospace',
                fontSize: '0.9em',
                transition: 'background-color 0.15s ease',
                position: 'relative',
                background: 'transparent'
            },

            // Row hover effect
            '.cm-line.cm-table-row:hover': {
                background: 'var(--table-row-hover) !important'
            },

            // Alternating row backgrounds
            '.cm-line.cm-table-row:nth-child(even)': {
                background: 'var(--table-row-even)'
            },

            '.cm-line.cm-table-row:nth-child(odd)': {
                background: 'var(--table-row-odd)'
            },

            // Header row - Distinguished styling
            '.cm-line.cm-table-header-row': {
                fontWeight: '600',
                borderBottom: '1px solid var(--table-border)',
                background: 'var(--table-header-bg) !important',
                color: 'var(--table-header-text)'
            },

            // Table cells - Clean and spacious
            '.cm-table-cell': {
                flex: '1',
                padding: '6px 12px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                borderRight: '1px solid var(--table-border)',
                minWidth: '4em',
                position: 'relative',
                transition: 'outline 0.15s ease',
                textAlign: 'left',
                verticalAlign: 'top'
            },

            // Cell hover effect
            '.cm-table-cell:hover': {
                outline: '1px solid var(--table-cell-hover)',
                outlineOffset: '-1px'
            },

            // Last cell in a row
            '.cm-table-last-cell': {
                borderRight: 'none'
            },

            // Header cells
            '.cm-table-header-cell': {
                fontWeight: '600',
                color: 'var(--table-header-text)',
                background: 'var(--table-header-bg)'
            },

            // Header cells don't need hover outline
            '.cm-table-header-cell:hover': {
                outline: 'none !important'
            },

            // Separator row - Minimal design
            '.cm-table-separator': {
                display: 'flex',
                flexDirection: 'row',
                height: '1px',
                background: 'var(--table-border)',
                margin: '2px 0',
                padding: '0',
                opacity: '0.7'
            },

            // Separator cells - Hidden but functional
            '.cm-table-separator-cell': {
                flex: '1',
                height: '1px',
                overflow: 'hidden',
                opacity: '0'
            },

            // Cell alignment
            '.cm-table-align-left': {
                textAlign: 'left'
            },
            '.cm-table-align-center': {
                textAlign: 'center'
            },
            '.cm-table-align-right': {
                textAlign: 'right'
            },
            '.cm-table-align-default': {
                textAlign: 'left'
            }
        })
    ];
}
