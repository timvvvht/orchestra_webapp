import React, { useState, ErrorBoundary } from 'react';

// Note: These imports would need to be adjusted based on actual file locations
// import ChatMainCanonicalLegacy from '../../chat/ChatMainCanonicalLegacy';
// import ScrollTestComponent from '../../chat/ScrollTestComponent';

interface ChatPanelProps {
  selectedSession: string | null;
  onSessionClose?: () => void;
}

// Error Boundary Component
class ChatErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chat panel error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="chat-error">
          <h3>Chat Error</h3>
          <p>Something went wrong with the chat panel.</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Right panel component that displays chat interface for selected session.
 * Includes error boundary, scroll test toggle, and session management.
 * 
 * @param selectedSession - Currently selected session ID
 * @param onSessionClose - Callback when session is closed
 */
const ChatPanel: React.FC<ChatPanelProps> = ({
  selectedSession,
  onSessionClose,
}) => {
  const [showScrollTest, setShowScrollTest] = useState(false);

  if (!selectedSession) {
    return (
      <div className="chat-panel-empty">
        <div className="empty-message">
          <h3>No Session Selected</h3>
          <p>Select an agent from the list to view the conversation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-panel">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="session-info">
          <h3>Session: {selectedSession}</h3>
        </div>
        
        <div className="chat-controls">
          {/* Debug/Test Toggle */}
          <button
            className={`scroll-test-toggle ${showScrollTest ? 'active' : ''}`}
            onClick={() => setShowScrollTest(!showScrollTest)}
            title="Toggle scroll test"
          >
            Test
          </button>
          
          {/* Close Button */}
          {onSessionClose && (
            <button
              className="close-session"
              onClick={onSessionClose}
              title="Close session"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Chat Content */}
      <div className="chat-content">
        <ChatErrorBoundary>
          {showScrollTest ? (
            <div className="scroll-test-container">
              {/* ScrollTestComponent would be rendered here */}
              <div className="scroll-test-placeholder">
                <p>Scroll Test Component</p>
                <p>Session: {selectedSession}</p>
              </div>
            </div>
          ) : (
            <div className="chat-main-container">
              {/* ChatMainCanonicalLegacy would be rendered here */}
              <div className="chat-main-placeholder">
                <p>Chat Main Component</p>
                <p>Session: {selectedSession}</p>
                <div className="message-placeholder">
                  <div className="message">Welcome to the chat session!</div>
                  <div className="message">Session ID: {selectedSession}</div>
                </div>
              </div>
            </div>
          )}
        </ChatErrorBoundary>
      </div>
    </div>
  );
};

export default ChatPanel;