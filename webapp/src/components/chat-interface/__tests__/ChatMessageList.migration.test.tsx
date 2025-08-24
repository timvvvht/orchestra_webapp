// webapp/src/components/chat-interface/__tests__/ChatMessageList.migration.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ChatMessageList from '../ChatMessageList';

describe('ChatMessageList migration', () => {
  it('renders basic messages', () => {
    const now = Date.now();
    const messages = [
      { id: 'u1', sessionId: 's1', role: 'user', content: [{ type: 'text', text: 'Hello' }], createdAt: now - 1000 },
      { id: 'a1', sessionId: 's1', role: 'assistant', content: [{ type: 'text', text: 'Hi there' }], createdAt: now },
    ];
    const merged = [{ date: new Date(now), messages }];

    const { getByText } = render(
      <ChatMessageList
        messages={messages as any}
        mergedMessageGroups={merged as any}
        refinedMode={false}
        isDesktop={true}
        handleFork={() => {}}
        formatMessageDate={(d) => d.toDateString()}
        shouldGroupMessages={() => false}
        isOptimizedFinalAssistantMessage={() => false}
        getOptimizedFileOperationsForResponse={() => []}
        shouldUseUnifiedRendering={() => false}
        renderUnifiedTimelineEvent={() => <div />}
      />
    );

    expect(getByText('Hello')).toBeTruthy();
    expect(getByText('Hi there')).toBeTruthy();
  });
});