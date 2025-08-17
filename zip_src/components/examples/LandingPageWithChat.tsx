import React, { useState } from 'react';
import { useSimpleChatUI } from '@/hooks/useChatUI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, MessageCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { ChatMessage } from '@/types/chatTypes';

/**
 * Example landing page with integrated chat functionality
 * Shows how to add chat to any existing page using the simplified hook
 */
export const LandingPageWithChat: React.FC = () => {
  const [ischatOpen, setIsChatOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  
  // Use the simplified chat hook with a default agent
  const chat = useSimpleChatUI('default-agent'); // Replace with your agent config ID
  
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
  
  const handleQuickStart = async (message: string) => {
    try {
      await chat.createAndSendMessage(message);
      setIsChatOpen(true);
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to Orchestra
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Your AI-powered assistant for coding, research, and productivity.
            Start a conversation to see what we can build together.
          </p>
          
          {/* Quick Start Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Button
              size="lg"
              onClick={() => handleQuickStart('Help me write a Python script')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              🐍 Write Python Code
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleQuickStart('Explain how React hooks work')}
            >
              ⚙️ Learn React
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleQuickStart('Help me debug this error')}
            >
              🔍 Debug Code
            </Button>
          </div>
          
          {/* Chat Toggle Button */}
          <Dialog open={ischatOpen} onOpenChange={setIsChatOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                <MessageCircle className="h-5 w-5 mr-2" />
                Start Chatting
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-2xl h-[600px] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Chat with Orchestra AI</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsChatOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DialogTitle>
              </DialogHeader>
              
              <ChatInterface
                chat={chat}
                inputMessage={inputMessage}
                setInputMessage={setInputMessage}
                onSendMessage={handleSendMessage}
                onOpenFullChat={() => {
                  chat.goToChat();
                  setIsChatOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <FeatureCard
            icon="🤖"
            title="AI Assistant"
            description="Get help with coding, writing, research, and problem-solving from our advanced AI."
          />
          <FeatureCard
            icon="💻"
            title="Code Generation"
            description="Generate, debug, and optimize code in multiple programming languages."
          />
          <FeatureCard
            icon="🚀"
            title="Productivity Tools"
            description="Streamline your workflow with intelligent automation and assistance."
          />
        </div>
        
        {/* Chat Preview */}
        {chat.messages.length > 0 && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Conversation</span>
                <Button
                  variant="outline"
                  onClick={() => setIsChatOpen(true)}
                >
                  Continue Chat
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {chat.messages.slice(-3).map((message) => (
                  <MessagePreview key={message.id} message={message} />
                ))}
                {chat.isLoading && (
                  <div className="flex items-center text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    AI is responding...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Floating Chat Button */}
      {!ischatOpen && (
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
          onClick={() => setIsChatOpen(true)}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};

/**
 * Chat interface component for the dialog
 */
interface ChatInterfaceProps {
  chat: ReturnType<typeof useSimpleChatUI>;
  inputMessage: string;
  setInputMessage: (message: string) => void;
  onSendMessage: () => void;
  onOpenFullChat: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  chat,
  inputMessage,
  setInputMessage,
  onSendMessage,
  onOpenFullChat
}) => {
  if (!chat.isReady) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-gray-500">Initializing chat...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4 border rounded mb-4">
        <div className="space-y-4">
          {chat.messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Start a conversation with Orchestra AI</p>
              <p className="text-sm mt-2">Ask questions, get help with code, or explore ideas</p>
            </div>
          ) : (
            chat.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          {chat.isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-gray-500">AI is thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Input */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
            disabled={chat.isLoading}
            className="flex-1"
          />
          <Button
            onClick={onSendMessage}
            disabled={!inputMessage.trim() || chat.isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>{chat.messages.length} messages</span>
          <Button variant="link" size="sm" onClick={onOpenFullChat}>
            Open full chat interface →
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Feature card component
 */
interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => (
  <Card className="text-center hover:shadow-lg transition-shadow">
    <CardContent className="p-6">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </CardContent>
  </Card>
);

/**
 * Message preview component for the landing page
 */
const MessagePreview: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {message.content
          .filter(part => part.type === 'text')
          .map((part, index) => (
            <div key={index} className="line-clamp-3">
              {part.type === 'text' && part.text}
            </div>
          ))}
      </div>
    </div>
  );
};

/**
 * Full message bubble component for the chat interface
 */
const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {/* Text content */}
        {message.content
          .filter(part => part.type === 'text')
          .map((part, index) => (
            <div key={index} className="whitespace-pre-wrap">
              {part.type === 'text' && part.text}
            </div>
          ))}
        
        {/* Tool calls */}
        {message.content
          .filter(part => part.type === 'tool_use')
          .map((part, index) => (
            <div key={index} className="mt-2 p-2 bg-black/10 rounded text-sm">
              <div className="font-medium flex items-center">
                🔧 {part.type === 'tool_use' && part.name}
              </div>
            </div>
          ))}
        
        {/* Streaming indicator */}
        {message.isStreaming && (
          <div className="flex items-center mt-2">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            <span className="text-xs opacity-70">Typing...</span>
          </div>
        )}
        
        {/* Thinking indicator */}
        {message.thinking && (
          <div className="flex items-center mt-2">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-current rounded-full animate-pulse" />
              <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
            <span className="text-xs opacity-70 ml-2">Thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPageWithChat;
