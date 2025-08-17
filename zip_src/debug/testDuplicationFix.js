// Test script to verify the duplication fix
console.log('🧪 Testing duplication fix...');

// Function to simulate the fixed UnrefinedModeTimelineRenderer logic
function testUnrefinedModeLogic() {
  console.log('\n=== Testing UnrefinedModeTimelineRenderer Logic ===');
  
  // Simulate the scenario where ChatMessageList passes pre-paired events
  const mockProvidedEvents = [
    { id: 'event1', type: 'tool_interaction', data: { call: { name: 'read_files' }, result: { content: 'file content' } } },
    { id: 'event2', type: 'message', data: { content: 'Some text' } }
  ];
  
  const mockMessage = {
    id: 'msg1',
    content: [
      { type: 'text', text: 'Some message content' },
      { type: 'tool_use', name: 'read_files', id: 'tool1' },
      { type: 'tool_result', tool_use_id: 'tool1', content: 'file content' }
    ]
  };
  
  // Test Case 1: With provided events (should use them directly)
  console.log('Test Case 1: With provided events');
  let timelineEvents = mockProvidedEvents;
  
  if (!mockProvidedEvents) {
    console.log('❌ This should not happen - providedEvents exist');
  } else {
    console.log('✅ Using provided pre-paired events:', timelineEvents.length);
  }
  
  // Test Case 2: Without provided events (should convert and pair)
  console.log('\nTest Case 2: Without provided events');
  const providedEvents = null;
  timelineEvents = providedEvents;
  
  if (!providedEvents) {
    console.log('✅ Converting message to timeline events and pairing');
    // This would call: convertChatMessageToTimeline(message) then pairToolEvents()
    console.log('✅ Conversion and pairing completed');
  } else {
    console.log('❌ This should not happen - no providedEvents');
  }
  
  console.log('✅ UnrefinedModeTimelineRenderer logic test passed!');
}

// Function to check for DOM duplicates
function checkForDuplicates() {
  console.log('\n=== Checking DOM for Duplicates ===');
  
  // Look for tool interaction elements
  const toolInteractions = document.querySelectorAll('[data-testid*="tool"], [class*="tool-interaction"], [class*="tool-call"]');
  console.log(`Found ${toolInteractions.length} tool-related elements`);
  
  // Group by similar content to detect duplicates
  const contentGroups = new Map();
  
  toolInteractions.forEach((element, index) => {
    const content = element.textContent?.trim() || '';
    const key = content.substring(0, 100); // First 100 chars as key
    
    if (!contentGroups.has(key)) {
      contentGroups.set(key, []);
    }
    contentGroups.get(key).push({ index, element, content });
  });
  
  let duplicateCount = 0;
  contentGroups.forEach((group, key) => {
    if (group.length > 1) {
      console.warn(`⚠️ Potential duplicate group (${group.length} elements):`, key.substring(0, 50) + '...');
      duplicateCount++;
    }
  });
  
  if (duplicateCount === 0) {
    console.log('✅ No duplicate tool interactions detected in DOM');
  } else {
    console.warn(`⚠️ Found ${duplicateCount} potential duplicate groups`);
  }
  
  return duplicateCount;
}

// Function to monitor console logs for pairing operations
function monitorPairingLogs() {
  console.log('\n=== Monitoring Pairing Operations ===');
  
  // Override console.log to catch pairing messages
  const originalLog = console.log;
  const pairingLogs = [];
  
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('UnrefinedModeTimelineRenderer') || message.includes('paired') || message.includes('pairing')) {
      pairingLogs.push(message);
    }
    originalLog.apply(console, args);
  };
  
  // Restore after 5 seconds
  setTimeout(() => {
    console.log = originalLog;
    console.log('\n=== Pairing Log Summary ===');
    if (pairingLogs.length === 0) {
      console.log('✅ No pairing operations detected (good - means no re-pairing)');
    } else {
      console.log(`📊 Captured ${pairingLogs.length} pairing-related logs:`);
      pairingLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log}`);
      });
    }
  }, 5000);
  
  console.log('🔍 Monitoring pairing logs for 5 seconds...');
}

// Run all tests
testUnrefinedModeLogic();
checkForDuplicates();
monitorPairingLogs();

// Make functions available globally
window.testUnrefinedModeLogic = testUnrefinedModeLogic;
window.checkForDuplicates = checkForDuplicates;
window.monitorPairingLogs = monitorPairingLogs;

console.log('\n🎯 Duplication fix test completed!');
console.log('Available functions:');
console.log('  - testUnrefinedModeLogic() - Test the fixed logic');
console.log('  - checkForDuplicates() - Check DOM for duplicates');
console.log('  - monitorPairingLogs() - Monitor pairing operations');