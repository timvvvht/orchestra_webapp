// 🔍 SIMPLE DUPLICATION CHECK
// Copy and paste this entire script into your browser console

console.log('🔍 Loading duplication checker...');

// Simple function to check for duplicate tool interactions
function checkDuplicates() {
  console.log('\n=== 🔍 CHECKING FOR DUPLICATES ===');
  
  // Find all elements that might contain tool interactions
  const selectors = [
    '[class*="tool"]',
    '[data-testid*="tool"]', 
    '[class*="interaction"]',
    'pre', // Code blocks often contain tool output
    '.bg-gray-50', // Common background for tool results
    '.border', // Tool containers often have borders
  ];
  
  const allElements = [];
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => allElements.push(el));
  });
  
  console.log(`📊 Found ${allElements.length} potential tool-related elements`);
  
  if (allElements.length === 0) {
    console.log('ℹ️ No tool elements found. Make sure you have some tool interactions visible on the page.');
    return 0;
  }
  
  // Group by content to find duplicates
  const contentGroups = new Map();
  
  allElements.forEach((element, index) => {
    const text = element.textContent?.trim() || '';
    
    // Skip very short text (likely not tool content)
    if (text.length < 20) return;
    
    // Create a signature from the first 100 characters
    const signature = text.substring(0, 100).replace(/\s+/g, ' ');
    
    if (!contentGroups.has(signature)) {
      contentGroups.set(signature, []);
    }
    
    contentGroups.get(signature).push({
      element,
      index,
      fullText: text,
      classes: element.className,
      tagName: element.tagName
    });
  });
  
  // Find groups with duplicates
  const duplicateGroups = Array.from(contentGroups.entries())
    .filter(([signature, elements]) => elements.length > 1);
  
  console.log(`\n📋 Analysis Results:`);
  console.log(`   Total elements analyzed: ${allElements.length}`);
  console.log(`   Unique content groups: ${contentGroups.size}`);
  console.log(`   Duplicate groups found: ${duplicateGroups.length}`);
  
  if (duplicateGroups.length === 0) {
    console.log('\n✅ NO DUPLICATES FOUND! 🎉');
    return 0;
  }
  
  console.log('\n❌ DUPLICATES DETECTED:');
  duplicateGroups.forEach(([signature, elements], groupIndex) => {
    console.log(`\n🔄 Duplicate Group ${groupIndex + 1} (${elements.length} copies):`);
    console.log(`   Content preview: "${signature}..."`);
    
    elements.forEach((item, itemIndex) => {
      console.log(`   ${itemIndex + 1}. <${item.tagName.toLowerCase()}> class="${item.classes}"`);
      console.log(`      Full text (first 200 chars): "${item.fullText.substring(0, 200)}..."`);
      console.log(`      Element:`, item.element);
    });
  });
  
  return duplicateGroups.length;
}

// Function to specifically look for tool interaction patterns
function checkToolInteractions() {
  console.log('\n=== 🔧 CHECKING TOOL INTERACTIONS ===');
  
  // Look for common tool patterns in the text content
  const toolPatterns = [
    /execute_in_runner_session/g,
    /str_replace_editor/g,
    /read_files/g,
    /search_files/g,
    /think/g,
    /spawn_agent_sync/g,
    /agentic_web_search/g
  ];
  
  const bodyText = document.body.textContent || '';
  const toolMatches = new Map();
  
  toolPatterns.forEach(pattern => {
    const matches = bodyText.match(pattern) || [];
    if (matches.length > 0) {
      const toolName = pattern.source;
      toolMatches.set(toolName, matches.length);
    }
  });
  
  console.log('🔧 Tool mentions found:');
  toolMatches.forEach((count, tool) => {
    console.log(`   ${tool}: ${count} mentions`);
    if (count > 2) {
      console.warn(`   ⚠️ ${tool} appears ${count} times - check for duplicates!`);
    }
  });
  
  return toolMatches;
}

// Function to check console for pairing logs
function checkConsoleHistory() {
  console.log('\n=== 📜 CONSOLE HISTORY CHECK ===');
  console.log('ℹ️ Look in your browser console history for these patterns:');
  console.log('   - "[UnrefinedModeTimelineRenderer] Using provided pre-paired events"');
  console.log('   - "[UnrefinedModeTimelineRenderer] Converted and paired message events"');
  console.log('   - Multiple pairing operations for the same message');
  console.log('\n💡 If you see multiple pairing logs for the same content, that indicates duplication.');
}

// Main function to run all checks
function runAllChecks() {
  console.log('🚀 Running comprehensive duplication check...');
  
  const duplicateCount = checkDuplicates();
  const toolMatches = checkToolInteractions();
  checkConsoleHistory();
  
  console.log('\n=== 📊 SUMMARY ===');
  if (duplicateCount === 0) {
    console.log('✅ No duplicate content detected!');
  } else {
    console.warn(`❌ Found ${duplicateCount} duplicate groups`);
  }
  
  const suspiciousTools = Array.from(toolMatches.entries())
    .filter(([tool, count]) => count > 2);
  
  if (suspiciousTools.length > 0) {
    console.warn('⚠️ Tools with high mention counts (possible duplicates):');
    suspiciousTools.forEach(([tool, count]) => {
      console.warn(`   ${tool}: ${count} mentions`);
    });
  }
  
  return {
    duplicateGroups: duplicateCount,
    toolMentions: Object.fromEntries(toolMatches),
    hasSuspiciousActivity: duplicateCount > 0 || suspiciousTools.length > 0
  };
}

// Make functions available globally
window.checkDuplicates = checkDuplicates;
window.checkToolInteractions = checkToolInteractions;
window.runAllChecks = runAllChecks;

console.log('\n🎯 Duplication checker loaded!');
console.log('Available functions:');
console.log('  checkDuplicates() - Check for duplicate content');
console.log('  checkToolInteractions() - Check tool mention counts');
console.log('  runAllChecks() - Run comprehensive analysis');
console.log('\n💡 Run runAllChecks() to start!');

// Auto-run a quick check
setTimeout(() => {
  console.log('\n🔍 Auto-running quick check...');
  const result = runAllChecks();
  
  if (!result.hasSuspiciousActivity) {
    console.log('\n🎉 GREAT NEWS! No obvious duplication detected!');
    console.log('✅ The fix appears to be working correctly.');
  } else {
    console.log('\n⚠️ Some issues detected - see details above.');
  }
}, 500);