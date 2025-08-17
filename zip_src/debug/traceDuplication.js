/**
 * Comprehensive duplication tracing script
 * Run this in browser console to trace exactly where duplicates are created
 */

function traceDuplication() {
  console.log('🔍 Tracing tool_interaction duplication...');
  
  // Override console.log to capture pairToolEvents logs
  const originalLog = console.log;
  const pairLogs = [];
  
  console.log = (...args) => {
    const message = args.join(' ');
    if (message.includes('[pairToolEvents]')) {
      pairLogs.push({
        timestamp: Date.now(),
        message: message,
        stack: new Error().stack
      });
    }
    originalLog.apply(console, args);
  };
  
  // Monitor for a few seconds to catch pairing operations
  setTimeout(() => {
    console.log = originalLog;
    
    console.log('\n📊 Pairing Operations Detected:');
    pairLogs.forEach((log, index) => {
      console.log(`${index + 1}. ${log.message}`);
      if (log.stack) {
        const relevantStack = log.stack.split('\n')
          .filter(line => line.includes('pairToolEvents') || line.includes('ChatMessage') || line.includes('Timeline'))
          .slice(0, 3);
        console.log('   Stack:', relevantStack.join('\n   '));
      }
    });
    
    if (pairLogs.length > 1) {
      console.warn(`⚠️ pairToolEvents called ${pairLogs.length} times - this could cause duplication!`);
    }
    
    // Now check the DOM for actual duplicates
    checkDOMDuplicates();
  }, 5000);
}

function checkDOMDuplicates() {
  console.log('\n🔍 Checking DOM for duplicate tool_interaction elements...');
  
  // Find all tool interaction elements
  const toolElements = document.querySelectorAll('[class*="tool"], [data-testid*="tool"]');
  const contentMap = new Map();
  
  toolElements.forEach((el, index) => {
    // Extract meaningful content
    const text = el.textContent?.trim() || '';
    const toolName = extractToolName(el);
    const toolId = extractToolId(el);
    
    if (toolName && text.length > 20) {
      const key = `${toolName}-${text.substring(0, 100)}`;
      
      if (!contentMap.has(key)) {
        contentMap.set(key, []);
      }
      
      contentMap.get(key).push({
        element: el,
        index,
        toolName,
        toolId,
        text: text.substring(0, 200),
        classes: el.className
      });
    }
  });
  
  // Find duplicates
  const duplicates = Array.from(contentMap.entries())
    .filter(([key, elements]) => elements.length > 1);
  
  console.log(`Found ${duplicates.length} duplicate content groups:`);
  
  duplicates.forEach(([key, elements], groupIndex) => {
    console.log(`\n❌ Duplicate Group ${groupIndex + 1}: ${key}`);
    elements.forEach((el, elIndex) => {
      console.log(`  ${elIndex + 1}. Tool: ${el.toolName}, ID: ${el.toolId}`);
      console.log(`     Classes: ${el.classes}`);
      console.log(`     Text: "${el.text}..."`);
      console.log(`     Element:`, el.element);
    });
  });
  
  return duplicates.length;
}

function extractToolName(element) {
  const text = element.textContent?.toLowerCase() || '';
  const classes = element.className.toLowerCase();
  
  // Common tool names to look for
  const toolNames = [
    'execute_in_runner_session',
    'str_replace_editor', 
    'read_files',
    'search_files',
    'think',
    'spawn_agent_sync',
    'agentic_web_search'
  ];
  
  for (const tool of toolNames) {
    if (text.includes(tool) || classes.includes(tool)) {
      return tool;
    }
  }
  
  // Try to extract from data attributes
  const toolAttr = element.getAttribute('data-tool-name') || 
                  element.querySelector('[data-tool-name]')?.getAttribute('data-tool-name');
  if (toolAttr) return toolAttr;
  
  return 'unknown';
}

function extractToolId(element) {
  return element.getAttribute('data-tool-id') ||
         element.getAttribute('data-testid') ||
         element.querySelector('[data-tool-id]')?.getAttribute('data-tool-id') ||
         'unknown';
}

function traceRenderingPaths() {
  console.log('🔍 Tracing rendering paths...');
  
  // Check which components are being used
  const timelineRenderers = document.querySelectorAll('[class*="timeline"]');
  const unifiedRenderers = document.querySelectorAll('[class*="unified"]');
  const toolInteractions = document.querySelectorAll('[class*="tool-interaction"]');
  
  console.log(`Timeline renderers: ${timelineRenderers.length}`);
  console.log(`Unified renderers: ${unifiedRenderers.length}`);
  console.log(`Tool interactions: ${toolInteractions.length}`);
  
  // Check for multiple rendering paths
  const refinedElements = document.querySelectorAll('[class*="refined"], [data-refined="true"]');
  const unrefinedElements = document.querySelectorAll('[class*="unrefined"], [data-refined="false"]');
  
  console.log(`Refined mode elements: ${refinedElements.length}`);
  console.log(`Unrefined mode elements: ${unrefinedElements.length}`);
  
  if (refinedElements.length > 0 && unrefinedElements.length > 0) {
    console.warn('⚠️ Both refined and unrefined elements detected - possible dual rendering!');
  }
}

function monitorRealTime() {
  console.log('🔄 Starting real-time duplication monitoring...');
  
  let lastToolCount = document.querySelectorAll('[class*="tool"]').length;
  let duplicateCount = 0;
  
  const interval = setInterval(() => {
    const currentToolCount = document.querySelectorAll('[class*="tool"]').length;
    
    if (currentToolCount !== lastToolCount) {
      console.log(`📊 Tool count changed: ${lastToolCount} → ${currentToolCount}`);
      lastToolCount = currentToolCount;
      
      // Check for new duplicates
      setTimeout(() => {
        const newDuplicates = checkDOMDuplicates();
        if (newDuplicates > duplicateCount) {
          console.warn(`⚠️ New duplicates detected! Total: ${newDuplicates}`);
          duplicateCount = newDuplicates;
        }
      }, 500);
    }
  }, 1000);
  
  // Stop monitoring after 30 seconds
  setTimeout(() => {
    clearInterval(interval);
    console.log('✅ Real-time monitoring stopped');
  }, 30000);
}

// Export functions to window
window.traceDuplication = traceDuplication;
window.checkDOMDuplicates = checkDOMDuplicates;
window.traceRenderingPaths = traceRenderingPaths;
window.monitorRealTime = monitorRealTime;

console.log('🔍 Duplication tracing tools loaded!');
console.log('Available functions:');
console.log('  - traceDuplication() - Trace pairing operations');
console.log('  - checkDOMDuplicates() - Check current DOM duplicates');
console.log('  - traceRenderingPaths() - Check rendering components');
console.log('  - monitorRealTime() - Monitor for 30 seconds');
console.log('\nRun traceDuplication() to start comprehensive analysis!');

// Auto-run a quick check
setTimeout(() => {
  console.log('\n🔍 Quick duplication check:');
  const duplicates = checkDOMDuplicates();
  if (duplicates === 0) {
    console.log('✅ No duplicates detected in initial check!');
  } else {
    console.warn(`⚠️ Found ${duplicates} duplicate groups in initial check`);
  }
}, 1000);