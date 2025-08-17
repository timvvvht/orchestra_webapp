/**
 * Test script to verify the unrefined mode duplication fix
 * Run this in browser console after the fix is applied
 */

function testUnrefinedFix() {
  console.log('🧪 Testing unrefined mode duplication fix...');
  
  // Count tool elements by type
  const toolCalls = document.querySelectorAll('[class*="tool-call"], [data-testid*="tool-call"]');
  const toolResults = document.querySelectorAll('[class*="tool-result"], [data-testid*="tool-result"]');
  const toolInteractions = document.querySelectorAll('[class*="tool-interaction"], [data-testid*="tool-interaction"]');
  const thinkBlocks = document.querySelectorAll('[class*="think"], [data-testid*="think"]');
  
  console.log('📊 Tool element counts:');
  console.log(`  Tool calls: ${toolCalls.length}`);
  console.log(`  Tool results: ${toolResults.length}`);
  console.log(`  Tool interactions: ${toolInteractions.length}`);
  console.log(`  Think blocks: ${thinkBlocks.length}`);
  
  // Check for duplicate content
  const contentMap = new Map();
  const allToolElements = [
    ...Array.from(toolCalls),
    ...Array.from(toolResults),
    ...Array.from(toolInteractions),
    ...Array.from(thinkBlocks)
  ];
  
  allToolElements.forEach((el, index) => {
    const content = el.textContent?.substring(0, 100).trim() || '';
    if (content.length > 10) { // Only check meaningful content
      if (!contentMap.has(content)) {
        contentMap.set(content, []);
      }
      contentMap.get(content).push({
        element: el,
        index,
        type: el.className.includes('think') ? 'think' : 
              el.className.includes('tool-call') ? 'tool-call' :
              el.className.includes('tool-result') ? 'tool-result' : 'other'
      });
    }
  });
  
  // Find duplicates
  const duplicates = Array.from(contentMap.entries())
    .filter(([content, elements]) => elements.length > 1);
  
  console.log(`\n🔍 Duplicate analysis:`);
  console.log(`  Total unique content pieces: ${contentMap.size}`);
  console.log(`  Duplicate content pieces: ${duplicates.length}`);
  
  if (duplicates.length > 0) {
    console.log('\n❌ Found duplicates:');
    duplicates.forEach(([content, elements], index) => {
      console.log(`\n  Duplicate ${index + 1}:`);
      console.log(`    Content: "${content.substring(0, 50)}..."`);
      console.log(`    Elements (${elements.length}):`);
      elements.forEach((el, elIndex) => {
        console.log(`      ${elIndex + 1}. Type: ${el.type}, Classes: ${el.element.className}`);
      });
    });
    return false;
  } else {
    console.log('\n✅ No duplicates found!');
    return true;
  }
}

function checkThinkToolPairing() {
  console.log('🧠 Checking think tool pairing...');
  
  // Look for think-related elements
  const thinkElements = document.querySelectorAll('[class*="think"], [data-testid*="think"]');
  const thinkCalls = Array.from(thinkElements).filter(el => 
    el.textContent?.includes('tool_call') || el.className.includes('call')
  );
  const thinkResults = Array.from(thinkElements).filter(el => 
    el.textContent?.includes('tool_result') || el.className.includes('result')
  );
  
  console.log(`  Think calls: ${thinkCalls.length}`);
  console.log(`  Think results: ${thinkResults.length}`);
  
  // Check if think calls and results are properly paired
  if (thinkCalls.length > 0 && thinkResults.length > 0) {
    console.log('  ⚠️ Found separate think calls and results - this might indicate improper pairing');
    return false;
  } else {
    console.log('  ✅ Think tools appear to be properly handled');
    return true;
  }
}

function monitorUnrefinedMode(duration = 15000) {
  console.log(`🔄 Monitoring unrefined mode for ${duration}ms...`);
  
  let checkCount = 0;
  const results = [];
  
  const interval = setInterval(() => {
    checkCount++;
    const isFixed = testUnrefinedFix();
    const thinkPaired = checkThinkToolPairing();
    
    results.push({
      check: checkCount,
      timestamp: new Date().toISOString(),
      isFixed,
      thinkPaired
    });
    
    if (!isFixed || !thinkPaired) {
      console.warn(`⚠️ Check ${checkCount}: Issues detected`);
    } else {
      console.log(`✅ Check ${checkCount}: All good`);
    }
  }, 1000);
  
  setTimeout(() => {
    clearInterval(interval);
    console.log(`\n📈 Monitoring summary (${checkCount} checks):`);
    const fixedCount = results.filter(r => r.isFixed).length;
    const pairedCount = results.filter(r => r.thinkPaired).length;
    
    console.log(`  Fixed: ${fixedCount}/${checkCount} (${Math.round(fixedCount/checkCount*100)}%)`);
    console.log(`  Think paired: ${pairedCount}/${checkCount} (${Math.round(pairedCount/checkCount*100)}%)`);
    
    if (fixedCount === checkCount && pairedCount === checkCount) {
      console.log('  🎉 Fix appears to be working consistently!');
    } else {
      console.log('  ⚠️ Issues still detected - may need further investigation');
    }
  }, duration);
}

// Export to window
window.testUnrefinedFix = testUnrefinedFix;
window.checkThinkToolPairing = checkThinkToolPairing;
window.monitorUnrefinedMode = monitorUnrefinedMode;

console.log('🧪 Unrefined mode fix test tools loaded!');
console.log('Available functions:');
console.log('  - testUnrefinedFix() - Check for duplicates');
console.log('  - checkThinkToolPairing() - Check think tool handling');
console.log('  - monitorUnrefinedMode(15000) - Monitor for 15 seconds');