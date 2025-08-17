import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Bot, User, Check, CheckCheck, Sparkles, Copy, Book } from 'lucide-react';
import { ChatMessage as ChatMessageType, RichContentPart, TextPart, ToolUsePart, ToolResultPart } from '@/types/chatTypes';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { mockAgents } from '@/data/mockWhatsappData';
import CachedResourceImage from '@/components/CachedResourceImage';
import { MicroToast } from '@/components/ui/MicroToast';
import { saveMarkdownToVault, isTauriEnvironment } from '@/utils/vault';
import { getVaultTree } from '@/api/vaultTree';
import { suggestPath } from '@/api/pathSuggest';
import { useSessionStatusStore } from '@/stores/sessionStatusStore';


// Import the content part renderer components
import TextPartDisplay from './content-parts/TextPartDisplay';
import ToolInteractionDisplay from './content-parts/ToolInteractionDisplay';
// AggregatedToolDisplay removed - now handled by UnifiedTimelineRenderer

import { ChatRole } from '@/types/chatTypes';

interface ChatMessageProps {
  message: ChatMessageType;
  isLastMessage: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  isRefinedMode?: boolean;
}

const ChatMessageImpl: React.FC<ChatMessageProps> = ({ 
  message, 
  isLastMessage,
  isFirstInGroup = true,
  isLastInGroup = true,
  showAvatar = true,
  showTimestamp = true,
  isRefinedMode = false
}) => {
  // Find the agent for this message if it's from an agent
  const agent = message.role === ChatRole.Assistant ? mockAgents.find(a => a.id === 'default') : null;
  const [copied, setCopied] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isUser = message.role === ChatRole.User;
  
  // Prepare content for rendering - ONLY text parts
  const contentToRender: RichContentPart[] = [];
  
  // Early return for empty messages
  const hasNoContent = () => {
    // 1️⃣ Array content (expected type according to interface)
    if (Array.isArray(message.content)) {
      // Check if there are any non-empty text parts
      const textParts = message.content.filter(part => part.type === 'text') as TextPart[];
      const hasText = textParts.some(part => (part.text ?? '').trim().length > 0);
      
      // Check if there are any tool parts (including legacy fields)
      const hasTools = message.content.some(part => {
        if (part.type === 'tool_use' || part.type === 'tool_result') return true;
        // Legacy / alternate shapes coming from eventConversion or RowMapper
        if ('tool_use_id' in (part as any) || 'tool_use_id_for_output' in (part as any)) return true;
        return false;
      });
      
      // Message has no content if it has neither text nor tools
      return !hasText && !hasTools;
    }
    
    // 2️⃣ String content - handle this case with type assertion since our interface expects array
    // This is needed because legacy data might have string content
    if (typeof message.content === 'string') {
      return (message.content as string).trim().length === 0;
    }
    
    // 3️⃣ null / undefined / any other falsy cases
    if (!message.content) return true;
    
    return false;
  };
  
  if (hasNoContent() && !message.thinking) {
    console.log(`[ChatMessage] Skipping render of empty message ${message.id}`);
    return null;
  }
  
  // 🔧 EMERGENCY FIX: Restore tool rendering capability from archive
  const toolInteractions: {use: any, result?: any}[] = [];
  
  if (Array.isArray(message.content)) {
    // Group tool uses with their results (from archive logic)
    const toolUses = message.content.filter(part => part.type === 'tool_use');
    const toolResults = message.content.filter(part => part.type === 'tool_result');
    
    // console.log('🚨 [MSG-FLOW] 🔧 TOOL-FIX: Processing tools in ChatMessage:', {
    //   messageId: message.id,
    //   toolUsesCount: toolUses.length,
    //   toolResultsCount: toolResults.length,
    //   toolUses: toolUses.map(t => ({ id: (t as any).id, name: (t as any).name })),
    //   toolResults: toolResults.map(t => ({ tool_use_id: (t as any).tool_use_id }))
    // });
    
    // Match tool results with their corresponding tool uses
    toolUses.forEach(toolUse => {
      const matchingResult = toolResults.find(result => (result as any).tool_use_id === (toolUse as any).id);
      toolInteractions.push({
        use: toolUse,
        result: matchingResult
      });
    });
    
    // console.log('🚨 [MSG-FLOW] 🔧 TOOL-FIX: Created tool interactions:', {
    //   messageId: message.id,
    //   toolInteractionsCount: toolInteractions.length,
    //   interactions: toolInteractions.map(i => ({ 
    //     toolName: i.use.name, 
    //     hasResult: !!i.result 
    //   }))
    // });

    // Add text parts to contentToRender
    message.content
      .filter(part => part.type === 'text')
      .filter(part => {
        const textPart = part as TextPart;
        return textPart.text?.trim().length > 0; // Skip empty text
      })
      .forEach(part => contentToRender.push(part));
  } else if (typeof message.content === 'string') {
    contentToRender.push({ type: 'text', text: message.content });
  }
  
  // Extract text content from message for copying
  const getMessageText = () => {
    if (typeof message.content === 'string') {
      return message.content;
    }
    
    if (Array.isArray(message.content)) {
      return message.content
        .filter(part => part.type === 'text')
        .map(part => (part as TextPart).text)
        .join('\n');
    }
    
    return '';
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    const text = getMessageText();
    if (!text) return;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyStatus('success');
      
      // Reset states after 2 seconds
      setTimeout(() => {
        setCopied(false);
        setCopyStatus('idle');
      }, 2000);
    } catch (err) {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  // Utility to normalize error messages for better debugging
  const toErrorMessage = (e: unknown): string => {
    if (e instanceof Error) {
      return e.stack || e.message;
    }
    if (typeof e === 'string') {
      return e;
    }
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  };

  // Handle save to vault
  const handleSaveToVault = async () => {
    console.log('[SAVE] Starting save to vault operation');
    const text = getMessageText();
    console.log('[SAVE] Retrieved message text, length:', text?.length || 0);
    
    if (!text) {
      console.log('[SAVE] No text content to save, aborting');
      return;
    }

    if (saving) {
      console.log('[SAVE] Save already in progress, ignoring click');
      return;
    }
    
    setSaving(true);
    
    try {
      // Step 1: Get vault tree listing for path suggestion
      console.log('[SAVE] Step 1: getVaultTree start');
      const treeListing = await getVaultTree();
      console.log('[SAVE] Step 1: getVaultTree ok, length:', treeListing?.length || 0);
      
      // Step 2: Get AI-suggested path
      console.log('[SAVE] Step 2: suggestPath start');
      const { path: suggestedPath, reasoning } = await suggestPath(text, treeListing);
      console.log('[SAVE] Step 2: suggestPath ok', { suggestedPath, reasoning });
      
      // Step 3: Save to vault using suggested path
      console.log('[SAVE] Step 3: saveMarkdownToVault start');
      const { relative_path } = await saveMarkdownToVault(suggestedPath, text);
      console.log('[SAVE] Step 3: saveMarkdownToVault ok', { relative_path });
      
      // Use the vault-agnostic relative path directly
      setSavedPath(relative_path);
      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        setSavedPath(null);
      }, 3000); // Show for 3 seconds
    } catch (err) {
      console.error('[SAVE] FAILED:', toErrorMessage(err));
      setSaveStatus('error');
      setSavedPath(null);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } finally {
      setSaving(false);
    }
  };

  // Log streaming content changes
  useEffect(() => {
    // @ts-ignore - isStreaming might not be in the type yet
    if (message.isStreaming) {
      console.log(`[ChatMessage] Message ${message.id} streaming - content parts=${contentToRender.length}`);
    }
  // @ts-ignore - isStreaming might not be in the type yet
  }, [message.content, message.id, message.isStreaming, contentToRender.length]);



  // Thinking animation - Water ripple effect
  const ThinkingAnimation = () => (
    <div className="flex items-center justify-center py-3 px-1">
      <div className="relative">
        {/* Ripple waves */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border border-white/20"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: [0.8, 1.5, 2],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.6,
              ease: "easeOut",
            }}
            style={{
              width: 24,
              height: 24,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
        {/* Center dot */}
        <motion.div
          className="relative w-2 h-2 bg-white/60 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
    </div>
  );

  // Message status indicator - Minimal dots with session status and thinking animation
  const MessageStatus = () => {
    if (!isUser || !isLastInGroup) return null;
    
    // Get session status if message has sessionId
    const sessionId = message.sessionId;
    const sessionStatus = useSessionStatusStore(s => sessionId ? s.getStatus(sessionId) : 'idle');
    const isAwaiting = sessionStatus === 'awaiting';
    
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-end mt-1 mr-1"
      >
        <div className="flex items-center gap-1">
          {/* Session status indicator - Show thinking animation when awaiting */}
          {isLastMessage && isAwaiting ? (
            <div 
              className="scale-[0.4] origin-left ml-[-8px] mr-[-12px]"
              title="Thinking..."
            >
              <ThinkingAnimation />
            </div>
          ) : isLastMessage && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 30
              }}
              title="Idle"
              className="w-1.5 h-1.5 rounded-full bg-green-400 opacity-80"
            />
          )}
          
          {/* Message delivery status */}
          {message.delivered && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                message.read ? "bg-[#0077ED]" : "bg-white/30"
              )}
              title={message.read ? "Read" : "Delivered"}
            />
          )}
          {message.read && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.1 }}
              className="w-1.5 h-1.5 rounded-full bg-[#0077ED]"
              title="Read"
            />
          )}
        </div>
      </motion.div>
    );
  };

  // Water-inspired message styles with infinity flow
  const getMessageStyles = () => {
    const baseStyles = "relative inline-block max-w-[85%] min-w-0 break-words hyphens-auto overflow-wrap-anywhere";
    
    if (isUser) {
      return cn(
        baseStyles,
        // Gradient inspired by deep ocean water
        "bg-gradient-to-br from-[#0071E3] to-[#0077ED]",
        "text-white",
        "px-5 py-3.5",
        // Fluid rounded corners that flow like water
        "rounded-[20px]",
        // Subtle inner shadow for depth
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]",
        // Smooth edges for continuous flow
        isFirstInGroup && !isLastInGroup && "rounded-br-[8px]",
        !isFirstInGroup && isLastInGroup && "rounded-tr-[8px]",
        !isFirstInGroup && !isLastInGroup && "rounded-r-[8px]"
      );
    } else {
      return cn(
        baseStyles,
        // Glass-like water surface
        "bg-white/[0.03]",
        "backdrop-blur-2xl backdrop-saturate-200",
        // Subtle border like water tension
        "border border-white/[0.06]",
        "pl-5 pr-12 py-3.5", // Extra right padding for copy button
        // Flowing rounded corners
        "rounded-[20px]",
        // Soft shadow like water ripples
        "shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
        // Continuous flow edges
        isFirstInGroup && !isLastInGroup && "rounded-bl-[8px]",
        !isFirstInGroup && isLastInGroup && "rounded-tl-[8px]",
        !isFirstInGroup && !isLastInGroup && "rounded-l-[8px]"
      );
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5,
        ease: [0.19, 1, 0.22, 1], // Water-like easing
        opacity: { duration: 0.3 },
        scale: { duration: 0.4 }
      }}
      className={cn(
        "group w-full max-w-full min-w-0 break-words hyphens-auto",
        !isFirstInGroup && "mt-1.5",
        isLastMessage && message.thinking ? "opacity-80" : ""
      )}
    >
      <div className={cn(
        "flex items-start gap-3",
        isUser ? "justify-end" : "justify-start"
      )}>
        {/* Avatar - Minimal water-inspired design */}
        {!isUser && showAvatar && isFirstInGroup ? (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 260, 
              damping: 20,
              opacity: { duration: 0.3 }
            }}
            className="flex-shrink-0 mt-0.5"
          >
            <div className="relative">
              {/* Subtle water ripple effect */}
              <motion.div 
                className="absolute inset-0 rounded-full"
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(0, 119, 237, 0.2)",
                    "0 0 0 8px rgba(0, 119, 237, 0)",
                  ]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
              <div className={cn(
                "relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center",
                "bg-gradient-to-br from-white/10 to-white/5",
                "backdrop-blur-xl border border-white/10"
              )}>
                {agent && agent.avatarType === 'resource' ? (
                  <CachedResourceImage
                    path={agent.avatar}
                    alt={agent.name}
                    className="w-full h-full object-cover"
                    showPlaceholder={true}
                    onLoad={() => console.log(`[ChatMessage] Successfully loaded avatar image: ${agent.avatar}`)}
                    onError={(error) => console.error(`[ChatMessage] Failed to load avatar image: ${agent.avatar}`, error)}
                    fallbackUrl="/default_avatar.png"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#0077ED] to-[#0071E3]" />
                )}
              </div>
            </div>
          </motion.div>
        ) : !isUser ? (
          <div className="w-8 flex-shrink-0" />
        ) : null}

        <div className="flex-1 min-w-0 w-full max-w-full">
          <div className={cn(
            "flex flex-col w-full max-w-full",
            isUser ? "items-end" : "items-start"
          )}>
            {/* Only render the message bubble if there's text content or if it's thinking without tools */}
            {(contentToRender.length > 0 || (message.thinking && Array.isArray(message.content) && !message.content.some(part => part.type === 'tool_use'))) && (
              <div 
                className={cn(
                  getMessageStyles(),
                  "transform-gpu", // GPU acceleration for smooth animations
                  "group" // Add group class for hover states
                )}
              >
              {/* Action buttons – appear on hover */}
              {!message.thinking && (
                <>
                  {/* Save to vault button (desktop only) */}
                  {isTauriEnvironment() && !isUser && (
                    <div className="absolute top-1 right-8">
                      <button
                        onClick={handleSaveToVault}
                        disabled={saving}
                        title={saving ? "Saving..." : "Save to Vault"}
                        className={cn(
                          "p-1 transition-opacity duration-200",
                          saving 
                            ? "text-white/60 cursor-not-allowed opacity-100" 
                            : "text-white/40 hover:text-white opacity-0 group-hover:opacity-100"
                        )}
                      >
                        <Book className={cn("h-4 w-4", saving && "animate-pulse")} />
                      </button>
                      <MicroToast 
                        status={saveStatus} 
                        type="save" 
                        message={saveStatus === 'success' && savedPath ? `Saved → ${savedPath}` : undefined}
                        forceLeftAlign={true}
                      />
                    </div>
                  )}
                  
                  {/* Copy button */}
                  <div className="absolute top-1 right-1">
                    <button
                      onClick={handleCopy}
                      title="Copy"
                      className="p-1 text-white/40 hover:text-white
                                 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <MicroToast status={copyStatus} type="copy" />
                  </div>
                </>
              )}
              
              {/* Always render text content if present */}
              {contentToRender.length > 0 && (
                <div className="space-y-4">
                  {contentToRender.map((part, index) => {
                    const key = `${message.id}-part-${index}`;
                    
                    if (part.type === 'text') {
                      return <TextPartDisplay key={key} part={part as TextPart} />;
                    } else {
                      return <div key={key}>Unknown content type: {(part as any).type}</div>;
                    }
                  })}
                </div>
              )}
              
              {/* Show thinking animation only if no tools are present */}
              {message.thinking && Array.isArray(message.content) && 
                !message.content.some(part => part.type === 'tool_use') && (
                <ThinkingAnimation />
              )}
              
              {showTimestamp && isLastInGroup && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className={cn(
                    "text-[10px] mt-2.5 font-normal tracking-wide",
                    isUser ? "text-white/50 text-right" : "text-white/40 text-left"
                  )}
                >
                  {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'}) : 'Unknown time'}
                </motion.div>
              )}
              </div>
            )}
            
            {/* Legacy tool display removed - now handled by UnifiedTimelineRenderer */}
          </div>

          {/* Message status (session status + delivered/read) */}
          {isUser && <MessageStatus />}


        </div>

        {/* User avatar - Minimal water drop */}
        {isUser && showAvatar && isFirstInGroup ? (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 260, 
              damping: 20,
              opacity: { duration: 0.3 }
            }}
            className="flex-shrink-0 mt-0.5"
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center", 
              "bg-gradient-to-br from-[#0071E3] to-[#0077ED]",
              "shadow-[0_2px_8px_rgba(0,113,227,0.3)]"
            )}>
              <div className="w-3 h-3 rounded-full bg-white/20" />
            </div>
          </motion.div>
        ) : isUser ? (
          <div className="w-8 flex-shrink-0" />
        ) : null}
      </div>

      {/* 🔧 EMERGENCY FIX: Render tool interactions (from archive) - hidden in refined mode */}
      {toolInteractions.length > 0 && !isRefinedMode && (
        <div className="mt-3 space-y-2 w-full">
          {toolInteractions.map((interaction, index) => (
            <div
              key={`${message.id}-tool-${index}`}
              className="bg-white/5 border border-white/10 rounded-lg p-3"
            >
              <div className="text-sm text-white/80 font-medium mb-2">
                🔧 Tool: {interaction.use.name}
              </div>
              {interaction.use.input && (
                <div className="text-xs text-white/60 mb-2">
                  Input: {JSON.stringify(interaction.use.input, null, 2)}
                </div>
              )}
              {interaction.result && (
                <div className="text-xs text-white/60">
                  Result: {JSON.stringify(interaction.result.content, null, 2)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Debug source event - styled more subtly */}
      {message.debugSourceEvent && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "text-[10px] mt-1 text-white/20 font-mono",
            isUser ? "text-right pr-11" : "text-left pl-11"
          )}
        >
          Event: {message.debugSourceEvent.type}
          {message.debugSourceEvent.triggerEventId && ` • ${message.debugSourceEvent.triggerEventId.substring(0, 8)}`}
        </motion.div>
      )}
    </motion.div>
  );
};

// Memoized version with deep comparison for performance
const ChatMessage = React.memo(ChatMessageImpl, (prev, next) => {
  // Only re-render if essential props change
  return (
    prev.message.id === next.message.id &&
    prev.message.createdAt === next.message.createdAt &&
    JSON.stringify(prev.message.content) === JSON.stringify(next.message.content) &&
    prev.isLastMessage === next.isLastMessage &&
    prev.isFirstInGroup === next.isFirstInGroup &&
    prev.isLastInGroup === next.isLastInGroup &&
    prev.showAvatar === next.showAvatar &&
    prev.showTimestamp === next.showTimestamp &&
    !prev.message.isStreaming && !next.message.isStreaming
  );
});

export default ChatMessage;