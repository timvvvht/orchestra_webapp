/**
 * Verification script for the tool call/result duplication fix
 * 
 * This script provides browser console functions to verify that the
 * skipToolRendering prop is working correctly and tool duplication is resolved.
 */

interface DuplicationCheckResult {
  totalToolElements: number;
  uniqueToolIds: Set<string>;
  duplicateToolIds: string[];
  duplicateCount: number;
  isFixed: boolean;
  details: {
    toolCallElements: number;
    toolResultElements: number;
    toolInteractionElements: number;
    thinkElements: number;
  };
}

/**
 * Comprehensive check for tool call/result duplication
 */
function checkToolDuplication(): DuplicationCheckResult {
  console.log('🔍 Checking for tool call/result duplication...');
  
  // Find all tool-related elements with more robust selectors
  const toolSelectors = [
    '[data-testid*="tool"]',
    '[class*="tool-call"]',
    '[class*="tool-result"]', 
    '[class*="tool-interaction"]',
    '[class*="think-block"]',
    '.bg-blue-50', // Common tool call styling
    '.bg-green-50', // Common tool result styling
    '.bg-gray-50' // Common think block styling
  ];
  
  const allToolElements: Element[] = [];
  const toolIds: string[] = [];
  
  // Collect all tool elements
  toolSelectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // Check if this element actually contains tool content
        const text = el.textContent?.toLowerCase() || '';
        if (text.includes('tool') || text.includes('think') || text.includes('function') || 
            el.getAttribute('data-tool-id') || el.getAttribute('data-testid')?.includes('tool')) {
          allToolElements.push(el);
          
          // Extract tool ID from various possible attributes
          const toolId = el.getAttribute('data-tool-id') || 
                        el.getAttribute('data-testid') ||
                        el.getAttribute('id') ||
                        el.querySelector('[data-tool-id]')?.getAttribute('data-tool-id') ||
                        `element-${allToolElements.length}`;
          toolIds.push(toolId);
        }
      });
    } catch (e) {
      console.warn(`Selector ${selector} failed:`, e);
    }
  });
  
  // Count specific types
  const details = {
    toolCallElements: document.querySelectorAll('[class*="tool-call"], [data-testid*="tool-call"]').length,
    toolResultElements: document.querySelectorAll('[class*="tool-result"], [data-testid*="tool-result"]').length,
    toolInteractionElements: document.querySelectorAll('[class*="tool-interaction"], [data-testid*="tool-interaction"]').length,
    thinkElements: document.querySelectorAll('[class*="think"], [data-testid*="think"]').length
  };
  
  // Find duplicates
  const toolIdCounts = new Map<string, number>();
  toolIds.forEach(id => {
    toolIdCounts.set(id, (toolIdCounts.get(id) || 0) + 1);
  });
  
  const duplicateToolIds = Array.from(toolIdCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([id, _]) => id);
  
  const uniqueToolIds = new Set(toolIds);
  const duplicateCount = toolIds.length - uniqueToolIds.size;
  
  const result: DuplicationCheckResult = {
    totalToolElements: allToolElements.length,
    uniqueToolIds,
    duplicateToolIds,
    duplicateCount,
    isFixed: duplicateCount === 0,
    details
  };
  
  // Log results
  console.log('📊 Duplication Check Results:');
  console.log(`  Total tool elements found: ${result.totalToolElements}`);
  console.log(`  Unique tool IDs: ${result.uniqueToolIds.size}`);
  console.log(`  Duplicate count: ${result.duplicateCount}`);
  console.log(`  Fix status: ${result.isFixed ? '✅ FIXED' : '❌ STILL DUPLICATED'}`);
  console.log('  Details:', result.details);
  
  if (result.duplicateToolIds.length > 0) {
    console.log('  Duplicate tool IDs:', result.duplicateToolIds);
  }
  
  return result;
}

/**
 * Check if skipToolRendering prop is being passed correctly
 */
function checkSkipToolRenderingProp(): void {
  console.log('🔍 Checking skipToolRendering prop usage...');
  
  // Look for TimelineRenderer components in React DevTools
  // This is a heuristic check since we can't directly inspect React props from console
  const timelineElements = document.querySelectorAll('[class*="timeline"], [data-component*="timeline"]');
  
  console.log(`Found ${timelineElements.length} potential timeline elements`);
  
  // Check for refined mode indicators
  const refinedModeElements = document.querySelectorAll('[class*="refined"], [data-refined="true"]');
  console.log(`Found ${refinedModeElements.length} refined mode indicators`);
  
  // Check for final message indicators
  const finalMessageElements = document.querySelectorAll('[class*="final"], [data-final="true"], [class*="last-message"]');
  console.log(`Found ${finalMessageElements.length} final message indicators`);
  
  console.log('💡 To fully verify skipToolRendering prop, use React DevTools to inspect TimelineRenderer components');
}

/**
 * Monitor for new tool elements being added (useful for SSE)
 */
function monitorToolElements(duration: number = 10000): void {
  console.log(`🔄 Monitoring tool elements for ${duration}ms...`);
  
  let initialCount = checkToolDuplication().totalToolElements;
  let checkCount = 0;
  
  const interval = setInterval(() => {
    checkCount++;
    const currentResult = checkToolDuplication();
    
    if (currentResult.totalToolElements !== initialCount) {
      console.log(`📈 Tool element count changed: ${initialCount} → ${currentResult.totalToolElements}`);
      initialCount = currentResult.totalToolElements;
    }
    
    if (!currentResult.isFixed) {
      console.warn('⚠️ Duplication detected during monitoring!');
    }
  }, 1000);
  
  setTimeout(() => {
    clearInterval(interval);
    console.log(`✅ Monitoring complete after ${checkCount} checks`);
  }, duration);
}

/**
 * Export functions to window for browser console access
 */
if (typeof window !== 'undefined') {
  (window as any).verifyDuplicationFix = {
    checkToolDuplication,
    checkSkipToolRenderingProp,
    monitorToolElements,
    
    // Quick check function
    quickCheck: () => {
      const result = checkToolDuplication();
      return result.isFixed ? '✅ No duplicates found!' : `❌ Found ${result.duplicateCount} duplicates`;
    }
  };
  
  console.log('🛠️ Duplication fix verification tools loaded!');
  console.log('Available functions:');
  console.log('  - window.verifyDuplicationFix.quickCheck()');
  console.log('  - window.verifyDuplicationFix.checkToolDuplication()');
  console.log('  - window.verifyDuplicationFix.checkSkipToolRenderingProp()');
  console.log('  - window.verifyDuplicationFix.monitorToolElements(10000)');
}

export {
  checkToolDuplication,
  checkSkipToolRenderingProp,
  monitorToolElements,
  type DuplicationCheckResult
};