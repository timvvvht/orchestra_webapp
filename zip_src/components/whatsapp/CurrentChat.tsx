import React, { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Paperclip, Send, Mic, Image, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MessageBubble from '@/components/chat/MessageBubble';
import AgentProfileDialog from './AgentProfileDialog';
import { mockAgents, mockMessages } from '@/data/mockWhatsappData';

interface CurrentChatProps {
  agentId: string | null;
  isLeftPanelCollapsed?: boolean;
}

const CurrentChat: React.FC<CurrentChatProps> = ({ agentId, isLeftPanelCollapsed }) => {
  const [inputMessage, setInputMessage] = React.useState('');
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [messages, setMessages] = React.useState(agentId ? mockMessages[agentId] : []);
  const [isTyping, setIsTyping] = React.useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update messages when agent changes
  useEffect(() => {
    if (agentId) {
      setMessages(mockMessages[agentId]);
    }
  }, [agentId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const currentAgent = agentId ? mockAgents.find(agent => agent.id === agentId) : null;

  if (!agentId || !currentAgent) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-full bg-surface-1 flex items-center justify-center">
            <Smile className="h-8 w-8 text-muted-foreground" />
          </div>
          <p>Select an agent to start chatting</p>
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!inputMessage.trim()) return;
    
    const newMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: inputMessage,
      createdAt: Date.now(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate agent typing
    setTimeout(() => {
      const agentMessage = {
        id: `agent-${Date.now()}`,
        role: 'agent' as const,
        content: 'Let me process that request...',
        createdAt: Date.now(),
        thinking: true,
      };
      setMessages(prev => [...prev, agentMessage]);

      // Simulate agent response
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => prev.map(msg => 
          msg.id === agentMessage.id 
            ? {
                ...msg,
                thinking: false,
                content: `I understand your request about "${inputMessage}". How else can I help?`,
              }
            : msg
        ));
      }, 2000);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      {/* Header */}
      <div 
        className="px-4 py-3 border-b border-border cursor-pointer hover:bg-surface-1/70 transition-colors"
        onClick={() => setIsProfileOpen(true)}
      >
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden ring-1 ring-border">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-50 to-brand-100 opacity-30" />
            <div className="absolute inset-0 flex items-center justify-center text-xl">
              {currentAgent.avatar}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background"></div>
          </div>
          <div>
            <h2 className="font-medium text-foreground">{currentAgent.name}</h2>
            <p className="text-xs text-muted-foreground">
              {isTyping ? 'typing...' : 'Active now'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-6" ref={scrollAreaRef}>
        <div className="flex flex-col space-y-6">
          {messages.map((message, i) => (
            <MessageBubble
              key={message.id}
              message={message}
              isLastMessage={i === messages.length - 1}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-3 border-t border-border bg-surface-1">
        <div className="flex items-center gap-2 w-full">
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-full text-muted-foreground hover:bg-surface-2"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-full text-muted-foreground hover:bg-surface-2"
            >
              <Image className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="relative flex-1">
            <Input 
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message" 
              className="h-10 pl-4 pr-10 py-2 rounded-full bg-surface-2 border-none text-foreground placeholder:text-muted-foreground focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-ring/30"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-muted-foreground hover:bg-surface-3"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </div>
          
          {inputMessage.trim() ? (
            <Button 
              size="icon" 
              className="h-10 w-10 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground shadow-sm"
              onClick={handleSubmit}
            >
              <Send className="h-5 w-5" />
            </Button>
          ) : (
            <Button 
              size="icon" 
              className="h-10 w-10 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground shadow-sm"
            >
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      <AgentProfileDialog 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        agent={currentAgent}
      />
    </div>
  );
};

export default CurrentChat;
