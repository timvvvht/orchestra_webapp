/**
 * Test script to verify proper data flow for tool_interaction events
 * Run this in browser console to check for data structure issues
 */

function testDataFlow() {
  console.log('🧪 Testing tool_interaction data flow...');
  
  // Check for malformed tool_interaction events in the DOM
  const toolElements = document.querySelectorAll('[data-testid*="tool"], [class*="tool"]');
  console.log(`Found ${toolElements.length} tool-related elements`);
  
  // Look for React error boundaries or error messages
  const errorElements = document.querySelectorAll('[class*="error"], [data-testid*="error"]');
  const errorMessages = Array.from(errorElements)
    .map(el => el.textContent)
    .filter(text => text && text.includes('interaction.data'));
  
  if (errorMessages.length > 0) {
    console.error('❌ Found interaction.data errors:', errorMessages);
    return false;
  }
  
  // Check console for warnings about malformed events
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => {
    const message = args.join(' ');
    if (message.includes('interaction.data') || message.includes('CombinedToolInteraction')) {
      warnings.push(message);
    }
    originalWarn.apply(console, args);
  };
  
  // Trigger a re-render by scrolling (if there are streaming events)
  window.scrollBy(0, 1);
  window.scrollBy(0, -1);
  
  setTimeout(() => {
    console.warn = originalWarn;
    
    if (warnings.length > 0) {
      console.error('❌ Found data flow warnings:', warnings);
      return false;
    }
    
    console.log('✅ No data flow errors detected');
    return true;
  }, 1000);
}

function checkToolInteractionStructure() {
  console.log('🔍 Checking tool_interaction event structure...');
  
  // Try to access React DevTools data (if available)
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('React DevTools available - use it to inspect component props');
  }
  
  // Look for tool interaction components in the DOM
  const toolInteractionElements = document.querySelectorAll('[class*="tool-interaction"], [data-testid*="tool-interaction"]');
  console.log(`Found ${toolInteractionElements.length} tool interaction elements`);
  
  // Check for any elements that might indicate missing data
  const emptyElements = Array.from(toolInteractionElements).filter(el => {
    const text = el.textContent?.trim();
    return !text || text.length < 10;
  });
  
  if (emptyElements.length > 0) {
    console.warn(`⚠️ Found ${emptyElements.length} potentially empty tool interaction elements`);
    emptyElements.forEach((el, i) => {
      console.log(`Empty element ${i + 1}:`, el);
    });
  }
  
  return emptyElements.length === 0;
}

function monitorDataFlow(duration = 15000) {
  console.log(`🔄 Monitoring data flow for ${duration}ms...`);
  
  let errorCount = 0;
  let warningCount = 0;
  
  // Override console methods to catch errors
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('interaction.data') || message.includes('Cannot destructure')) {
      errorCount++;
      console.log(`❌ Data flow error ${errorCount}:`, message);
    }
    originalError.apply(console, args);
  };
  
  console.warn = (...args) => {
    const message = args.join(' ');
    if (message.includes('interaction.data') || message.includes('CombinedToolInteraction')) {
      warningCount++;
      console.log(`⚠️ Data flow warning ${warningCount}:`, message);
    }
    originalWarn.apply(console, args);
  };
  
  // Monitor for new tool elements
  let lastToolCount = document.querySelectorAll('[class*="tool"]').length;
  
  const interval = setInterval(() => {
    const currentToolCount = document.querySelectorAll('[class*="tool"]').length;
    if (currentToolCount !== lastToolCount) {
      console.log(`📊 Tool element count changed: ${lastToolCount} → ${currentToolCount}`);
      lastToolCount = currentToolCount;
      
      // Check for new errors after changes
      setTimeout(() => {
        testDataFlow();
        checkToolInteractionStructure();
      }, 500);
    }
  }, 1000);
  
  setTimeout(() => {
    clearInterval(interval);
    console.error = originalError;
    console.warn = originalWarn;
    
    console.log(`\n📈 Monitoring summary:`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`  Warnings: ${warningCount}`);
    
    if (errorCount === 0 && warningCount === 0) {
      console.log('  🎉 Data flow appears to be working correctly!');
    } else {
      console.log('  ⚠️ Issues detected - check the logs above');
    }
  }, duration);
}

// Export to window
window.testDataFlow = testDataFlow;
window.checkToolInteractionStructure = checkToolInteractionStructure;
window.monitorDataFlow = monitorDataFlow;

console.log('🧪 Data flow test tools loaded!');
console.log('Available functions:');
console.log('  - testDataFlow() - Check for current errors');
console.log('  - checkToolInteractionStructure() - Verify DOM structure');
console.log('  - monitorDataFlow(15000) - Monitor for 15 seconds');