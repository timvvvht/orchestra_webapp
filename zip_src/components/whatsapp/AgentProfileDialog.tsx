
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Copy, Edit, GitFork, X, MessageSquare, Bot, Zap, Settings } from 'lucide-react';
import CachedResourceImage from '@/components/CachedResourceImage';

interface AgentProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agent: {
    id: string;
    name: string;
    avatar: string;
    specialty?: string;
    model?: string;
    tools?: string[];
  };
}

const AgentProfileDialog: React.FC<AgentProfileDialogProps> = ({
  isOpen,
  onClose,
  agent,
}) => {
  const handleCloneAgent = () => {
    console.log('Cloning agent:', agent.id);
  };

  const handleModifyAgent = () => {
    console.log('Modifying agent:', agent.id);
  };

  const handleForkAgent = () => {
    console.log('Forking agent:', agent.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white dark:bg-[#1c1c1e] border-none shadow-xl rounded-2xl">
        <DialogHeader className="p-6 pb-4 relative border-b border-black/5 dark:border-white/5">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-4 h-8 w-8 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black/70 dark:text-white/70"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-black/5 dark:ring-white/10">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-950 opacity-30" />
              {agent.avatar.endsWith('.png') ? (
                <CachedResourceImage 
                  path={agent.avatar} 
                  alt={agent.name} 
                  className="absolute inset-0 w-full h-full object-cover"
                  fallbackUrl="/default_avatar.png"
                  showPlaceholder={true}
                  onLoad={() => console.log(`AgentProfileDialog: Successfully loaded avatar image: ${agent.avatar}`)}
                  onError={(error) => console.error(`AgentProfileDialog: Failed to load avatar image: ${agent.avatar}`, error)}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-3xl">
                  {agent.avatar}
                </div>
              )}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold text-black dark:text-white mb-1">
                {agent.name}
              </DialogTitle>
              <p className="text-sm text-black/60 dark:text-white/60">
                {agent.specialty || 'General Assistant'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <Button 
              variant="ghost" 
              className="flex flex-col items-center gap-1 h-auto py-3 bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] text-black dark:text-white rounded-xl transition-colors"
              onClick={handleCloneAgent}
            >
              <Copy className="h-5 w-5 text-blue-500 mb-1" />
              <span className="text-xs font-medium">Clone</span>
            </Button>
            <Button 
              variant="ghost" 
              className="flex flex-col items-center gap-1 h-auto py-3 bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] text-black dark:text-white rounded-xl transition-colors"
              onClick={handleModifyAgent}
            >
              <Edit className="h-5 w-5 text-amber-500 mb-1" />
              <span className="text-xs font-medium">Modify</span>
            </Button>
            <Button 
              variant="ghost" 
              className="flex flex-col items-center gap-1 h-auto py-3 bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] text-black dark:text-white rounded-xl transition-colors"
              onClick={handleForkAgent}
            >
              <GitFork className="h-5 w-5 text-purple-500 mb-1" />
              <span className="text-xs font-medium">Fork</span>
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[400px]">
          <div className="px-6 py-4 space-y-6">
            {/* Info Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-black/40 dark:text-white/40" />
                <h3 className="text-sm font-medium text-black/80 dark:text-white/80">Agent Info</h3>
              </div>
              
              <div className="space-y-3">
                <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.02] p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
                  <p className="text-xs text-black/40 dark:text-white/40 mb-1">Model</p>
                  <p className="text-sm text-black dark:text-white font-medium">{agent.model || 'GPT-4'}</p>
                </div>
                
                <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.02] p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
                  <p className="text-xs text-black/40 dark:text-white/40 mb-2">Tools</p>
                  <div className="flex flex-wrap gap-2">
                    {agent.tools?.map((tool) => (
                      <span 
                        key={tool}
                        className="px-2.5 py-1 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 dark:hover:bg-blue-500/30 transition-colors"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Settings Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-black/40 dark:text-white/40" />
                <h3 className="text-sm font-medium text-black/80 dark:text-white/80">Settings</h3>
              </div>
              
              <div className="space-y-3">
                <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.02] p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
                  <p className="text-xs text-black/40 dark:text-white/40 mb-1">Temperature</p>
                  <p className="text-sm text-black dark:text-white font-medium">0.7</p>
                </div>
                
                <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.02] p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
                  <p className="text-xs text-black/40 dark:text-white/40 mb-1">Context Window</p>
                  <p className="text-sm text-black dark:text-white font-medium">16K tokens</p>
                </div>
              </div>
            </div>
            
            {/* Stats Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-black/40 dark:text-white/40" />
                <h3 className="text-sm font-medium text-black/80 dark:text-white/80">Stats</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.02] p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
                  <p className="text-xs text-black/40 dark:text-white/40 mb-1">Messages</p>
                  <p className="text-sm text-black dark:text-white font-medium">128</p>
                </div>
                
                <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.02] p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
                  <p className="text-xs text-black/40 dark:text-white/40 mb-1">Created</p>
                  <p className="text-sm text-black dark:text-white font-medium">2 days ago</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AgentProfileDialog;
