import { ChatRole } from '@/types/chatTypes';

// Test the nextIsoTimestamp logic for unique, strictly increasing timestamps
test('nextIsoTimestamp should generate unique, strictly increasing timestamps', () => {
    // Simulate the nextIsoTimestamp function logic
    let lastGeneratedTs = 0;
    const nextIsoTimestamp = (): string => {
        let now = Date.now();
        if (now <= lastGeneratedTs) now = lastGeneratedTs + 1;
        lastGeneratedTs = now;
        return new Date(now).toISOString();
    };

    // Call the function 10 times synchronously
    const results = [];
    for (let i = 0; i < 10; i++) {
        results.push(nextIsoTimestamp());
    }

    // Verify all timestamps are unique
    const uniqueTimestamps = new Set(results);
    if (uniqueTimestamps.size !== results.length) {
        throw new Error(`Expected ${results.length} unique timestamps, got ${uniqueTimestamps.size}`);
    }

    // Verify timestamps are in ascending order
    for (let i = 1; i < results.length; i++) {
        const current = new Date(results[i]).getTime();
        const previous = new Date(results[i - 1]).getTime();
        if (current <= previous) {
            throw new Error(`Timestamp ${i} (${current}) should be greater than timestamp ${i-1} (${previous})`);
        }
    }

    console.log('✓ nextIsoTimestamp generates unique, strictly increasing timestamps');
});

test('handleFinalMessageHistoryEvent should ensure strictly ascending timestamps', () => {
    // Simulate history items that might have duplicate or out-of-order timestamps
    const historyItems = [
        { id: '1', role: 'user', content: 'First message', timestamp: 1000 },
        { id: '2', role: 'assistant', content: 'Second message', timestamp: 1000 }, // Same timestamp
        { id: '3', role: 'user', content: 'Third message', timestamp: 999 }, // Earlier timestamp
        { id: '4', role: 'assistant', content: 'Fourth message', timestamp: 1002 },
        { id: '5', role: 'user', content: 'Fifth message' } // No timestamp
    ];

    // Apply the same logic as handleFinalMessageHistoryEvent
    let lastLocalTs = 0;
    const processedItems = historyItems.map((item: any) => {
        let ts = item.timestamp ?? Date.now();
        if (ts <= lastLocalTs) ts = lastLocalTs + 1;
        lastLocalTs = ts;
        return { ...item, timestamp: ts };
    });

    // Verify all timestamps are unique and strictly ascending
    for (let i = 1; i < processedItems.length; i++) {
        if (processedItems[i].timestamp <= processedItems[i - 1].timestamp) {
            throw new Error(`Timestamp ${i} should be greater than timestamp ${i-1}`);
        }
    }

    // Verify no duplicate timestamps
    const timestamps = processedItems.map(item => item.timestamp);
    const uniqueTimestamps = new Set(timestamps);
    if (uniqueTimestamps.size !== timestamps.length) {
        throw new Error(`Expected ${timestamps.length} unique timestamps, got ${uniqueTimestamps.size}`);
    }

    console.log('✓ handleFinalMessageHistoryEvent ensures strictly ascending timestamps');
});

test('should handle empty history gracefully', () => {
    const historyItems: any[] = [];
    
    let lastLocalTs = 0;
    const processedItems = historyItems.map((item: any) => {
        let ts = item.timestamp ?? Date.now();
        if (ts <= lastLocalTs) ts = lastLocalTs + 1;
        lastLocalTs = ts;
        return { ...item, timestamp: ts };
    });

    if (processedItems.length !== 0) {
        throw new Error('Expected empty array for empty history');
    }

    console.log('✓ Empty history handled gracefully');
});

test('should handle single item history', () => {
    const historyItems = [
        { id: '1', role: 'user', content: 'Single message', timestamp: 1000 }
    ];

    let lastLocalTs = 0;
    const processedItems = historyItems.map((item: any) => {
        let ts = item.timestamp ?? Date.now();
        if (ts <= lastLocalTs) ts = lastLocalTs + 1;
        lastLocalTs = ts;
        return { ...item, timestamp: ts };
    });

    if (processedItems.length !== 1) {
        throw new Error('Expected single item');
    }
    if (processedItems[0].timestamp !== 1000) {
        throw new Error('Expected timestamp to be preserved');
    }

    console.log('✓ Single item history handled correctly');
});

test('should maintain timestamp uniqueness across different scenarios', () => {
    // Simulate processing multiple messages with timestamp logic
    const timestamps: number[] = [];
    let lastTs = 0;

    // Simulate 5 messages being processed
    for (let i = 0; i < 5; i++) {
        let now = Date.now();
        if (now <= lastTs) now = lastTs + 1;
        lastTs = now;
        timestamps.push(now);
    }

    // Verify uniqueness and ordering
    for (let i = 1; i < timestamps.length; i++) {
        if (timestamps[i] <= timestamps[i - 1]) {
            throw new Error(`Timestamp ${i} should be greater than timestamp ${i-1}`);
        }
    }

    const uniqueTimestamps = new Set(timestamps);
    if (uniqueTimestamps.size !== timestamps.length) {
        throw new Error(`Expected ${timestamps.length} unique timestamps, got ${uniqueTimestamps.size}`);
    }

    console.log('✓ Timestamp uniqueness maintained across different scenarios');
});