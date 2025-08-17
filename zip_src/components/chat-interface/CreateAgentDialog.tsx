import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Bot, Zap, Settings, Wand2 } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import * as ChatApi from '@/api/chatApi';

interface CreateAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_TOOLS = [
  { id: 'web_search', name: 'Web Search', description: 'Search the web for information' },
  { id: 'scrape_url', name: 'Scrape URL', description: 'Extract content from a webpage' },
  { id: 'map_website', name: 'Map Website', description: 'Discover all URLs on a website' },
  { id: 'file_search', name: 'File Search', description: 'Search for files on your computer' },
  { id: 'code_interpreter', name: 'Code Interpreter', description: 'Run code and return the results' },
];

const AVAILABLE_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
];

const CreateAgentDialog: React.FC<CreateAgentDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [name, setName] = useState('New Agent');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant.');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [selectedTools, setSelectedTools] = useState<string[]>(['web_search', 'scrape_url']);
  const [temperature, setTemperature] = useState('0.7');
  const [isCreating, setIsCreating] = useState(false);
  const { createSession } = useChatStore();

  const handleToolToggle = (toolId: string) => {
    setSelectedTools(prev => 
      prev.includes(toolId)
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white dark:bg-[#1c1c1e] border-none shadow-xl rounded-2xl">
        <div className="flex flex-col items-center justify-center p-10 space-y-6 text-center">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-purple-600/30 to-blue-600/30 blur-xl animate-pulse" />
            <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-full">
              <Bot className="h-10 w-10 text-white" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-black dark:text-white">Agent Creation Coming Soon</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              We're building something special. The ability to create custom agents will be available in the next update.
            </p>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/40 px-4 py-2 rounded-full">
            <Wand2 className="h-4 w-4" />
            <span>Orchestra v2.0 - Summer 2025</span>
          </div>
          
          <Button
            variant="outline"
            onClick={onClose}
            className="mt-4 border-gray-200 dark:border-gray-800"
          >
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAgentDialog;