/**
 * Debug script for unrefined mode tool duplication
 * Run this in browser console to analyze the issue
 */

function debugUnrefinedDuplication() {
  console.log('🔍 Debugging unrefined mode tool duplication...');
  
  // Find all tool-related elements
  const toolElements = document.querySelectorAll('[class*="tool"], [data-testid*="tool"]');
  console.log(`Found ${toolElements.length} tool elements`);
  
  // Group by tool ID or content
  const toolGroups = new Map();
  
  toolElements.forEach((el, index) => {
    const toolId = el.getAttribute('data-tool-id') || 
                  el.getAttribute('data-testid') ||
                  el.querySelector('[data-tool-id]')?.getAttribute('data-tool-id');
    
    const content = el.textContent?.substring(0, 100) || '';
    const key = toolId || content;
    
    if (!toolGroups.has(key)) {
      toolGroups.set(key, []);
    }
    toolGroups.get(key).push({
      element: el,
      index,
      classes: el.className,
      content: content
    });
  });
  
  // Find duplicates
  const duplicates = Array.from(toolGroups.entries())
    .filter(([key, elements]) => elements.length > 1);
  
  console.log(`Found ${duplicates.length} potential duplicate groups:`);
  
  duplicates.forEach(([key, elements], groupIndex) => {
    console.log(`\nGroup ${groupIndex + 1} (${elements.length} elements):`);
    console.log(`Key: ${key}`);
    elements.forEach((el, elIndex) => {
      console.log(`  Element ${elIndex + 1}:`, {
        classes: el.classes,
        content: el.content.substring(0, 50) + '...',
        element: el.element
      });
    });
  });
  
  // Check for TimelineRenderer components
  const timelineElements = document.querySelectorAll('[class*="timeline"]');
  console.log(`\nFound ${timelineElements.length} timeline-related elements`);
  
  // Check for refined mode indicators
  const refinedElements = document.querySelectorAll('[class*="refined"], [data-refined]');
  console.log(`Found ${refinedElements.length} refined mode indicators`);
  
  return {
    totalToolElements: toolElements.length,
    duplicateGroups: duplicates.length,
    timelineElements: timelineElements.length,
    duplicates: duplicates
  };
}

// Check for event data duplication
function checkEventDataDuplication() {
  console.log('🔍 Checking for event data duplication...');
  
  // Try to access React component state (this is a heuristic)
  const reactElements = document.querySelectorAll('[data-reactroot], [data-react-component]');
  console.log(`Found ${reactElements.length} React elements`);
  
  // Look for event store or message data in window
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('React DevTools detected - use React DevTools to inspect component state');
  }
  
  // Check for duplicate tool IDs in DOM
  const toolIds = [];
  document.querySelectorAll('[data-tool-id]').forEach(el => {
    toolIds.push(el.getAttribute('data-tool-id'));
  });
  
  const duplicateIds = toolIds.filter((id, index) => toolIds.indexOf(id) !== index);
  console.log(`Found ${duplicateIds.length} duplicate tool IDs:`, [...new Set(duplicateIds)]);
  
  return duplicateIds;
}

// Monitor for new duplicates
function monitorDuplication(duration = 10000) {
  console.log(`🔄 Monitoring for duplication for ${duration}ms...`);
  
  let checkCount = 0;
  const interval = setInterval(() => {
    checkCount++;
    const result = debugUnrefinedDuplication();
    
    if (result.duplicateGroups > 0) {
      console.warn(`⚠️ Check ${checkCount}: Found ${result.duplicateGroups} duplicate groups`);
    } else {
      console.log(`✅ Check ${checkCount}: No duplicates found`);
    }
  }, 1000);
  
  setTimeout(() => {
    clearInterval(interval);
    console.log(`✅ Monitoring complete after ${checkCount} checks`);
  }, duration);
}

// Export to window
window.debugUnrefinedDuplication = debugUnrefinedDuplication;
window.checkEventDataDuplication = checkEventDataDuplication;
window.monitorDuplication = monitorDuplication;

console.log('🛠️ Unrefined mode duplication debug tools loaded!');
console.log('Available functions:');
console.log('  - debugUnrefinedDuplication()');
console.log('  - checkEventDataDuplication()');
console.log('  - monitorDuplication(10000)');