import React, { useState } from 'react';
import { useChatUI, useSimpleChatUI, useChatSessions } from '@/hooks/useChatUI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Plus, Trash2 } from 'lucide-react';
import type { ChatMessage } from '@/types/chatTypes';

/**
 * Example component demonstrating the full useChatUI hook
 * This shows all the features available in the unified hook
 */
export const FullChatUIExample: React.FC = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  
  const chat = useChatUI({
    autoInitialize: true,
    autoLoadMessages: true,
    enableCodingMode: true,
    defaultAgentConfigId: 'default-agent' // Replace with actual agent config ID
  });
  
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    try {
      await chat.sendMessage(inputMessage);
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  const handleCreateSession = async () => {
    try {
      const sessionId = await chat.createSession(undefined, newSessionName || undefined);
      chat.navigateToSession(sessionId);
      setNewSessionName('');
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };
  
  const handleCreateAndSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    try {
      const sessionId = await chat.createSessionAndSendMessage(
        inputMessage,
        undefined,
        newSessionName || undefined
      );
      chat.navigateToSession(sessionId);
      setInputMessage('');
      setNewSessionName('');
    } catch (error) {
      console.error('Failed to create session and send message:', error);
    }
  };
  
  if (!chat.isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Initializing chat...</span>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-80 border-r bg-gray-50 p-4">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Create New Session</h3>
            <div className="space-y-2">
              <Input
                placeholder="Session name (optional)"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={handleCreateSession} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Create
                </Button>
                <Button onClick={handleCreateAndSendMessage} size="sm" variant="outline">
                  Create & Send
                </Button>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Sessions ({chat.sessions.length})</h3>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {chat.sessions.map((session) => (
                  <Card
                    key={session.id}
                    className={`cursor-pointer transition-colors ${
                      session.id === chat.currentSessionId
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => chat.navigateToSession(session.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{session.name}</p>
                          <p className="text-sm text-gray-500">
                            {session.messageCount} messages
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            chat.deleteSession(session.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {chat.currentSession ? (
          <>
            {/* Header */}
            <div className="border-b p-4">
              <h2 className="font-semibold">{chat.currentSession.name}</h2>
              <p className="text-sm text-gray-500">
                {chat.messages.length} messages
                {chat.hasStreamingMessage && ' • AI is typing...'}
                {chat.hasThinkingMessage && ' • AI is thinking...'}
              </p>
            </div>
            
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {chat.messages.map((message) => (
                  <MessageComponent key={message.id} message={message} />
                ))}
                {chat.isLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading messages...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {/* Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={chat.hasStreamingMessage}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || chat.hasStreamingMessage}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">No Session Selected</h3>
              <p className="text-gray-500 mb-4">Create a new session or select an existing one</p>
              <Button onClick={() => chat.navigateToChat()}>
                Go to Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Example component demonstrating the simplified useSimpleChatUI hook
 * Perfect for landing pages or simple chat integrations
 */
export const SimpleChatUIExample: React.FC = () => {
  const [inputMessage, setInputMessage] = useState('');
  
  const chat = useSimpleChatUI('default-agent'); // Replace with actual agent config ID
  
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    try {
      if (chat.messages.length === 0) {
        // First message - create session and send
        await chat.createAndSendMessage(inputMessage);
      } else {
        // Subsequent messages - just send
        await chat.sendMessage(inputMessage);
      }
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  if (!chat.isReady) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading chat...</span>
      </div>
    );
  }
  
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Simple Chat</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Messages */}
          <ScrollArea className="h-96 border rounded p-4">
            <div className="space-y-4">
              {chat.messages.length === 0 ? (
                <div className="text-center text-gray-500">
                  Start a conversation by typing a message below
                </div>
              ) : (
                chat.messages.map((message) => (
                  <MessageComponent key={message.id} message={message} />
                ))
              )}
              {chat.isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">AI is responding...</span>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={chat.isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || chat.isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-center">
            <Button variant="outline" onClick={chat.goToChat}>
              Open Full Chat Interface
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Example component demonstrating the useChatSessions hook
 * Perfect for sidebar components or session management
 */
export const SessionsExample: React.FC = () => {
  const [newSessionName, setNewSessionName] = useState('');
  const sessions = useChatSessions();
  
  const handleCreateSession = async () => {
    try {
      const sessionId = await sessions.createSession(
        'default-agent', // Replace with actual agent config ID
        newSessionName || undefined
      );
      sessions.switchToSession(sessionId);
      setNewSessionName('');
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };
  
  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Chat Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Create new session */}
          <div className="space-y-2">
            <Input
              placeholder="New session name"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
            />
            <Button onClick={handleCreateSession} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Session
            </Button>
          </div>
          
          {/* Session list */}
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {sessions.sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-3 rounded border cursor-pointer transition-colors ${
                    session.id === sessions.currentSessionId
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => sessions.switchToSession(session.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{session.name}</p>
                      <p className="text-sm text-gray-500">
                        {session.messageCount} messages
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        sessions.deleteSession(session.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Simple message component for displaying chat messages
 */
const MessageComponent: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {/* Render text content */}
        {message.content
          .filter(part => part.type === 'text')
          .map((part, index) => (
            <div key={index}>
              {part.type === 'text' && part.text}
            </div>
          ))}
        
        {/* Show streaming indicator */}
        {message.isStreaming && (
          <div className="flex items-center mt-1">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            <span className="text-xs opacity-70">Typing...</span>
          </div>
        )}
        
        {/* Show thinking indicator */}
        {message.thinking && (
          <div className="flex items-center mt-1">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-current rounded-full animate-pulse" />
              <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
            <span className="text-xs opacity-70 ml-2">Thinking...</span>
          </div>
        )}
        
        {/* Show tool calls */}
        {message.content
          .filter(part => part.type === 'tool_use')
          .map((part, index) => (
            <div key={index} className="mt-2 p-2 bg-black/10 rounded text-xs">
              <div className="font-medium">🔧 {part.type === 'tool_use' && part.name}</div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default FullChatUIExample;
