// 🚀 QUICK DUPLICATION CHECK - One-liner for browser console
// Just copy and paste this single line:

(() => {
  console.log('🔍 Quick duplication check...');
  
  // Get all text content and look for tool patterns
  const text = document.body.textContent || '';
  const tools = ['execute_in_runner_session', 'str_replace_editor', 'read_files', 'search_files', 'think', 'spawn_agent_sync'];
  
  console.log('🔧 Tool mention counts:');
  const results = {};
  tools.forEach(tool => {
    const count = (text.match(new RegExp(tool, 'g')) || []).length;
    results[tool] = count;
    console.log(`   ${tool}: ${count}`);
    if (count > 3) console.warn(`   ⚠️ ${tool} appears ${count} times - possible duplication!`);
  });
  
  // Check for duplicate elements by content
  const elements = Array.from(document.querySelectorAll('pre, [class*="tool"], [class*="interaction"]'));
  const contentMap = new Map();
  
  elements.forEach(el => {
    const content = el.textContent?.trim().substring(0, 100);
    if (content && content.length > 20) {
      contentMap.set(content, (contentMap.get(content) || 0) + 1);
    }
  });
  
  const duplicates = Array.from(contentMap.entries()).filter(([content, count]) => count > 1);
  
  console.log(`\n📊 Element analysis:`);
  console.log(`   Total elements: ${elements.length}`);
  console.log(`   Duplicate content blocks: ${duplicates.length}`);
  
  if (duplicates.length > 0) {
    console.warn('❌ Duplicate content found:');
    duplicates.forEach(([content, count]) => {
      console.warn(`   "${content.substring(0, 50)}..." appears ${count} times`);
    });
  } else {
    console.log('✅ No duplicate content blocks detected!');
  }
  
  const hasDuplicates = duplicates.length > 0 || Object.values(results).some(count => count > 3);
  
  if (hasDuplicates) {
    console.warn('\n⚠️ POTENTIAL DUPLICATION DETECTED');
  } else {
    console.log('\n🎉 NO DUPLICATION DETECTED - FIX IS WORKING!');
  }
  
  return { toolCounts: results, duplicateBlocks: duplicates.length, hasDuplicates };
})();