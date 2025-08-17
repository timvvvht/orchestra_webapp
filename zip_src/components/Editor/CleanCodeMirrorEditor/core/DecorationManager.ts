/**
 * DecorationManager for handling CodeMirror decorations
 * 
 * This class is responsible for sorting and merging decorations from different extensions
 * to prevent the "Ranges must be added sorted" error and ensure proper rendering.
 */

import { EditorView, Decoration, DecorationSet, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

/**
 * Interface for a decoration with position and priority information
 */
export interface SortableDecoration {
  /** Start position in the document */
  from: number;
  /** End position in the document */
  to: number;
  /** The decoration object */
  decoration: Decoration;
  /** Priority of the decoration (higher values take precedence) */
  priority: number;
  /** Source extension ID */
  source: string;
}

/**
 * Manager for handling decorations from multiple extensions
 */
export class DecorationManager {
  private decorations: SortableDecoration[] = [];
  private view: EditorView | null = null;
  
  /**
   * Set the editor view
   * @param view The CodeMirror editor view
   */
  setView(view: EditorView): void {
    console.log('[DecorationManager] Setting view');
    this.view = view;
  }
  
  /**
   * Clear all decorations
   */
  clear(): void {
    this.decorations = [];
  }
  
  /**
   * Add a decoration to the manager
   * @param decoration The decoration to add
   */
  addDecoration(decoration: SortableDecoration): void {
    this.decorations.push(decoration);
  }
  
  /**
   * Add multiple decorations to the manager
   * @param decorations The decorations to add
   */
  addDecorations(decorations: SortableDecoration[]): void {
    this.decorations.push(...decorations);
  }
  
  /**
   * Remove decorations from a specific source
   * @param source The source extension ID
   */
  removeDecorationsFromSource(source: string): void {
    this.decorations = this.decorations.filter(d => d.source !== source);
  }
  
  /**
   * Build a sorted DecorationSet from all registered decorations
   * @returns A properly sorted DecorationSet
   */
  buildDecorationSet(): DecorationSet {
    try {
      // Make a copy of the decorations array to avoid modifying the original
      const decorationsCopy = [...this.decorations];
      
      // Log the raw decorations for debugging
      console.log(`[DecorationManager] Raw decorations count: ${decorationsCopy.length}`);
      if (decorationsCopy.length > 0) {
        console.log(`[DecorationManager] Sample raw decorations:`, 
          decorationsCopy.slice(0, 3).map(d => ({ 
            from: d.from, 
            to: d.to, 
            source: d.source, 
            priority: d.priority,
            type: d.decoration.spec.type || 'mark'
          })));
      }
      
      // Filter out invalid decorations
      const validDecorations = decorationsCopy.filter(d => {
        // Ensure from and to are valid numbers
        if (typeof d.from !== 'number' || typeof d.to !== 'number') {
          console.warn(`[DecorationManager] Invalid decoration position: from=${d.from}, to=${d.to}, source=${d.source}`);
          return false;
        }
        
        // Ensure from is less than or equal to to
        if (d.from > d.to) {
          console.warn(`[DecorationManager] Invalid decoration range: from=${d.from} > to=${d.to}, source=${d.source}`);
          return false;
        }
        
        return true;
      });
      
      // Log decoration count before sorting
      console.log(`[DecorationManager] Valid decorations: ${validDecorations.length} of ${decorationsCopy.length}`);
      
      // Sort decorations by position and then by priority
      const sortedDecorations = validDecorations.sort((a, b) => {
        // First sort by starting position
        if (a.from !== b.from) return a.from - b.from;
        
        // If starting positions are the same, line decorations should come before mark decorations
        const aIsLine = a.decoration.spec.type === "line";
        const bIsLine = b.decoration.spec.type === "line";
        if (aIsLine !== bIsLine) return aIsLine ? -1 : 1;
        
        // If both are the same type, sort by to position
        if (a.to !== b.to) return a.to - b.to;
        
        // If positions are the same, sort by priority (higher priority first)
        return b.priority - a.priority;
      });
      
      // Log sorted decorations for debugging
      console.log(`[DecorationManager] Sorted ${sortedDecorations.length} decorations`);
      if (sortedDecorations.length > 0) {
        console.log(`[DecorationManager] First few sorted decorations:`, 
          sortedDecorations.slice(0, 3).map(d => ({ 
            from: d.from, 
            to: d.to, 
            source: d.source, 
            priority: d.priority,
            type: d.decoration.spec.type || 'mark'
          })));
      }
      
      // Build the decoration set using the sorted decorations
      const builder = new RangeSetBuilder<Decoration>();
      
      // Track the last position to ensure we're adding in sorted order
      let lastFrom = -1;
      let addedCount = 0;
      let skippedCount = 0;
      
      for (const { from, to, decoration, source } of sortedDecorations) {
        // Double-check that we're adding in sorted order
        if (from < lastFrom) {
          console.error(`[DecorationManager] Decoration out of order: from=${from}, lastFrom=${lastFrom}, source=${source}`);
          // Skip this decoration to avoid the error
          skippedCount++;
          continue;
        }
        
        // Update lastFrom
        lastFrom = from;
        
        try {
          // Add the decoration
          builder.add(from, to, decoration);
          addedCount++;
        } catch (err) {
          console.error(`[DecorationManager] Error adding decoration: from=${from}, to=${to}, source=${source}`, err);
          skippedCount++;
        }
      }
      
      console.log(`[DecorationManager] Added ${addedCount} decorations, skipped ${skippedCount}`);
      
      return builder.finish();
    } catch (error) {
      console.error('[DecorationManager] Error building decoration set:', error);
      // Return an empty decoration set to avoid crashing
      return new RangeSetBuilder<Decoration>().finish();
    }
  }
  
  /**
   * Update decorations based on editor changes
   * @param update The ViewUpdate from CodeMirror
   */
  update(update: ViewUpdate): void {
    // If the document changed, we need to update positions of decorations
    if (update.docChanged) {
      // Map each decoration through the changes
      this.decorations = this.decorations.map(d => {
        const from = update.changes.mapPos(d.from);
        const to = update.changes.mapPos(d.to);
        return { ...d, from, to };
      });
    }
  }
  
  /**
   * Get statistics about the current decorations
   * @returns An object with decoration statistics
   */
  getStats(): { total: number; bySource: Record<string, number> } {
    const bySource: Record<string, number> = {};
    
    for (const d of this.decorations) {
      bySource[d.source] = (bySource[d.source] || 0) + 1;
    }
    
    return {
      total: this.decorations.length,
      bySource
    };
  }
  
  /**
   * Check for potential decoration conflicts
   * @returns An array of potential conflicts
   */
  checkForConflicts(): { source1: string; source2: string; position: number; count: number }[] {
    const conflicts: Record<string, { source1: string; source2: string; position: number; count: number }> = {};
    
    // Check for decorations from different sources that overlap
    for (let i = 0; i < this.decorations.length; i++) {
      for (let j = i + 1; j < this.decorations.length; j++) {
        const d1 = this.decorations[i];
        const d2 = this.decorations[j];
        
        // Skip if from same source
        if (d1.source === d2.source) continue;
        
        // Check for overlap
        if (Math.max(d1.from, d2.from) < Math.min(d1.to, d2.to)) {
          const key = [d1.source, d2.source].sort().join(':');
          const position = Math.max(d1.from, d2.from);
          
          if (!conflicts[key]) {
            conflicts[key] = {
              source1: d1.source,
              source2: d2.source,
              position,
              count: 1
            };
          } else {
            conflicts[key].count++;
          }
        }
      }
    }
    
    return Object.values(conflicts);
  }
}