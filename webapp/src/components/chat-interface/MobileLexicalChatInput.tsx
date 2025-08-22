import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Send,
  X,
  Clock,
  StopCircle,
  ChevronDown,
  Sparkles,
  Image,
  Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEnqueueMessage } from "@/hooks/useEnqueueMessage";
import { useCurrentSessionId } from "@/hooks/useCurrentSessionId";
import { cancelConversation } from "@/utils/cancelConversation";
import { LexicalPillEditor } from "@/components/chat-interface/LexicalPillEditor";
import { FancyFileSelector } from "@/components/ui/fancy-file-selector";
import { useFileSearch } from "@/hooks/useFileSearch";
import { useChatUI } from "@/context/ChatUIContext";
import { useSelections } from "@/context/SelectionContext";
import { useAgentConfigs } from "@/hooks/useAgentConfigs";
import { useSlashCommands } from "@/hooks/useSlashCommands";
import type { SearchMatch } from "@/lib/tauri/fileSelector";
import "./LexicalChatInput.css";
import { SelectedAgentChip } from "@/components/chat-interface/SelectedAgentChip";

type Base64URLString = string;

interface LexicalChatInputProps {
  onSubmit: (message: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  isTyping?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  codePathOverride?: string;
  onImageUpload?: (file: File) => void;
  images?: string[];
  onRemoveImage?: (base64: string) => void;
}

export function LexicalChatInput({
  onSubmit,
  onKeyDown,
  isTyping = false,
  isLoading = false,
  disabled = false,
  placeholder = "Message",
  codePathOverride,
  onImageUpload,
  images = [],
  onRemoveImage,
}: LexicalChatInputProps) {
  // Get sessionId from URL params or context (for Mission Control)
  const { sessionId } = useCurrentSessionId();

  // Get chat UI context for current session's working directory
  const chatUI = useChatUI();
  const currentSession = chatUI.currentSession;
  const codePath =
    codePathOverride?.trim() || currentSession?.agent_cwd || undefined;

  // Get selections context for model override
  const selections = useSelections();
  const { agentConfigsArray } = useAgentConfigs();
  const { all: allSlashCommands, filter: filterSlashCommands } =
    useSlashCommands();
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState<string>("");
  const [slashItems, setSlashItems] = useState<
    Array<{
      command: string;
      agent_config_name: string;
      description?: string | null;
    }>
  >([]);
  const [slashIndex, setSlashIndex] = useState<number>(0);
  const MIN_SLASH_LEN = 1;
  const [selectedSlashCommand, setSelectedSlashCommand] = useState<{
    command: string;
    agent_config_name: string;
    description?: string | null;
  } | null>(null);

  const [localImages, setLocalImages] = useState<Base64URLString[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const displayImages = images.length > 0 ? images : localImages;

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      console.error("Invalid file type. Please select an image.");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error("File too large. Please select an image under 10MB.");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        if (onImageUpload) {
          // Let parent handle the upload
          onImageUpload(file);
        } else {
          // Handle locally
          setLocalImages((prev) => [...prev, base64]);
        }
        setShowAttachmentOptions(false);
      };
      reader.onerror = () => console.error("Failed to read file");
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  };

  const removeImage = (base64: string) => {
    if (onRemoveImage) {
      onRemoveImage(base64);
    } else {
      setLocalImages((prev) => prev.filter((img) => img !== base64));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        handleImageUpload(file);
      }
    });
  };

  // Queue functionality
  const { enqueue, queuedCount, list, remove } = useEnqueueMessage(
    sessionId || ""
  );

  // ✅ PERFORMANCE FIX: Move input state into this component to prevent parent re-renders
  const [inputMessage, setInputMessage] = useState("");
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);

  // Queue mode state - becomes TRUE when user clicks queue toggle while assistant busy
  const [queueMode, setQueueMode] = useState(false);
  const [showQueueList, setShowQueueList] = useState(false);

  // File selector state (mirror NewDraftModal approach)
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

  // Model selector state
  const [showModelSelector, setShowModelSelector] = useState(false);

  // File search hook - scoped to current session's working directory
  const { results: fileResults, isLoading: isSearchingFiles } = useFileSearch(
    fileSearchQuery,
    {
      debounceMs: 200,
      limit: 15,
      minQueryLength: 0,
      codePath: codePath?.trim() || undefined,
    }
  );

  // Auto-reset queue-mode when assistant is no longer busy
  useEffect(() => {
    if (!isTyping) setQueueMode(false);
  }, [isTyping]);

  // Close model selector when clicking outside
  useEffect(() => {
    if (!showModelSelector) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest("[data-model-selector]")) {
        setShowModelSelector(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showModelSelector]);

  // Check if editor has content (more than just whitespace)
  const hasContent = inputMessage.trim().length > 0;

  // Check if editor is expanded (has newlines or is long)
  const isEditorExpanded =
    inputMessage.includes("\n") || inputMessage.length > 50;

  // SUBMIT: always "send immediately"
  const handleSubmit = useCallback(() => {
    if (!hasContent) return;
    let message = inputMessage.trim();
    // If a special agent was selected via slash, prepend explicit slash for backend routing
    if (selectedSlashCommand?.command) {
      message = `${selectedSlashCommand.command} ${message}`.trim();
    }
    setInputMessage(""); // Clear input immediately
    onSubmit(message); // Pass message to parent
    if (selectedSlashCommand) setSelectedSlashCommand(null); // Clear ephemeral selection
  }, [hasContent, inputMessage, onSubmit, selectedSlashCommand]);

  // QUEUE action – used in queueMode or explicit button
  const queueDraft = useCallback(() => {
    if (!hasContent) return;
    enqueue(inputMessage.trim());
    setInputMessage("");
    console.log("📥 [Queue] Enqueued message for session:", sessionId);
  }, [hasContent, inputMessage, enqueue, sessionId]);

  // CANCEL conversation handler
  const handleCancelConversation = async () => {
    console.log(`cancel convo clicked`);
    if (!sessionId) {
      console.warn(
        "🚫 [LexicalChatInput] No session ID available for cancellation"
      );
      return;
    }

    try {
      console.log(
        "🚫 [LexicalChatInput] User clicked cancel button, calling utility function..."
      );
      await cancelConversation(sessionId);
      console.log(
        "🚫 [LexicalChatInput] ✅ Conversation cancelled successfully!"
      );
    } catch (error) {
      console.error(
        "🚫 [LexicalChatInput] ❌ Failed to cancel conversation:",
        error
      );
      // You could show a toast notification here if you have one
    }
  };

  // File selector handlers (mirror NewDraftModal approach)
  const handleFileSelect = useCallback(
    (file: SearchMatch) => {
      // Insert the file reference as a markdown link with absolute path
      const fileReference = `[@${file.display}](@file:${file.full_path})`;

      // For Lexical editor, we'll append to the current content
      // The Lexical editor will handle parsing the markdown into pills
      const newContent =
        inputMessage + (inputMessage.trim() ? " " : "") + fileReference;
      setInputMessage(newContent);

      setShowFileSelector(false);
      setFileSearchQuery("");
      setSelectedFileIndex(0);
    },
    [inputMessage]
  );

  // Slash token detection (last whitespace-delimited token starting with '/')
  const computeSlashContext = useCallback((value: string) => {
    const parts = value.split(/\s+/);
    const last = parts[parts.length - 1] || "";
    if (last.startsWith("/")) return last;
    return "";
  }, []);

  // Update slash suggestions only when the token actually changes
  useEffect(() => {
    const token = computeSlashContext(inputMessage);

    // Only update if the token has actually changed
    if (token !== slashQuery) {
      console.log(
        `🔄 [SlashEffect] Token changed: "${slashQuery}" → "${token}"`
      );
      if (token && token.length > MIN_SLASH_LEN) {
        const items = filterSlashCommands(token);
        setSlashItems(items);
        setSlashIndex(0); // Reset index only when token changes
        console.log(
          `📋 [SlashEffect] Filtered items: ${items.length}, reset index to 0`
        );
        setSlashQuery(token);
        setShowSlashMenu(items.length > 0);
        // Close file selector when slash menu opens
        if (items.length > 0) setShowFileSelector(false);
      } else if (token === "/") {
        setSlashItems(allSlashCommands);
        setSlashIndex(0); // Reset index only when token changes
        console.log(
          `📋 [SlashEffect] All commands: ${allSlashCommands.length}, reset index to 0`
        );
        setSlashQuery(token);
        setShowSlashMenu(allSlashCommands.length > 0);
        // Close file selector when slash menu opens
        if (allSlashCommands.length > 0) setShowFileSelector(false);
      } else {
        console.log(`❌ [SlashEffect] Closing slash menu, token: "${token}"`);
        setShowSlashMenu(false);
        setSlashItems([]);
        setSlashQuery("");
        setSlashIndex(0);
      }
    } else {
      console.log(
        `⏭️ [SlashEffect] Token unchanged: "${token}", skipping update`
      );
    }
  }, [
    inputMessage,
    filterSlashCommands,
    allSlashCommands,
    computeSlashContext,
    slashQuery,
  ]);

  const applySlashSelection = useCallback(
    (sel: {
      command: string;
      agent_config_name: string;
      description?: string | null;
    }) => {
      // Persist UI agent selection
      selections.setSelectedAgentConfigId(sel.agent_config_name);
      setSelectedSlashCommand(sel);
      // Replace the current slash token with the chosen command and a trailing space
      // For tagging-like UX, remove the slash token entirely from editor input (keep editor clean)
      const val = inputMessage;
      const idx = val.lastIndexOf(slashQuery);
      if (idx >= 0) {
        const next = val.slice(0, idx) + val.slice(idx + slashQuery.length);
        setInputMessage(next);
      }
      setShowSlashMenu(false);
    },
    [inputMessage, selections, slashQuery]
  );

  const handleFileSelectorClose = useCallback(() => {
    setShowFileSelector(false);
    setFileSearchQuery("");
    setSelectedFileIndex(0);
  }, []);

  // Handle content changes from Lexical editor
  const handleContentChange = useCallback((newValue: string) => {
    setInputMessage(newValue);
  }, []);

  // Model selection logic
  const availableModels = [
    { id: "auto", name: "Auto", description: "Use session default" },
    { id: "gpt-5", name: "GPT-5", description: "OpenAI GPT-5" },
    {
      id: "claude-sonnet-4-20250514",
      name: "Claude 4 Sonnet",
      description: "Anthropic Claude 4 Sonnet",
    },
    {
      id: "claude-opus-4-1-20250805",
      name: "Claude 4.1 Opus",
      description: "Anthropic Claude 4.1 Opus",
    },
    // { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Anthropic Claude 3.5 Haiku' },
  ];

  // Get current effective model for display
  const currentEffectiveModel =
    selections.effectiveModelId || currentSession?.model_id || "auto";
  const currentModelDisplay =
    availableModels.find((m) => m.id === currentEffectiveModel)?.name || "Auto";

  const handleModelSelect = useCallback(
    (modelId: string) => {
      if (modelId === "auto") {
        selections.setSelectedModelId(null); // Clear override, use session default
      } else {
        selections.setSelectedModelId(modelId);
      }
      setShowModelSelector(false);
    },
    [selections]
  );

  // Handle keyboard shortcuts
  const handleEditorKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ignore during IME composition
      if ((e as any).nativeEvent?.isComposing) return;

      // Handle slash menu navigation when open
      if (showSlashMenu) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          e.stopPropagation();
          setSlashIndex((prev) => {
            const next = Math.min(prev + 1, Math.max(0, slashItems.length - 1));
            console.log(
              `🔽 [SlashNav] ArrowDown: ${prev} → ${next} (items: ${slashItems.length})`
            );
            return next;
          });
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          e.stopPropagation();
          setSlashIndex((prev) => {
            const next = Math.max(prev - 1, 0);
            console.log(
              `🔼 [SlashNav] ArrowUp: ${prev} → ${next} (items: ${slashItems.length})`
            );
            return next;
          });
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          const sel = slashItems[slashIndex];
          if (sel) {
            applySlashSelection(sel);
          }
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          setShowSlashMenu(false);
          return;
        }
        // other keys will continue typing; the effect above will refilter
      }
      // Ctrl/Cmd + K to open file selector
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowFileSelector(true);
        return;
      }

      // Handle file selector navigation when open
      if (showFileSelector) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          e.stopPropagation();
          setSelectedFileIndex((prev) =>
            Math.min(prev + 1, fileResults.length - 1)
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          e.stopPropagation();
          setSelectedFileIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "Enter") {
          // Enter selects the currently highlighted file (microinteraction)
          e.preventDefault();
          e.stopPropagation();
          if (fileResults.length > 0) {
            handleFileSelect(fileResults[selectedFileIndex]);
          }
        } else if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          handleFileSelectorClose();
        }
        return;
      }

      // Handle model selector
      if (showModelSelector && e.key === "Escape") {
        e.preventDefault();
        setShowModelSelector(false);
        return;
      }

      // Normal input handling — Enter to send
      // SAFETY: Never send when any overlay/selection is active
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        // 1) Slash menu takes priority: Enter selects highlighted command (no send)
        if (showSlashMenu) {
          if (slashItems[slashIndex])
            applySlashSelection(slashItems[slashIndex]);
          return;
        }

        // 2) File selector overlay active: Enter handled by selector logic only (no send)
        if (showFileSelector) {
          return;
        }

        // 3) Agent chip present should NOT block send
        // If a chip exists, handleSubmit will prepend its /cmd automatically.

        // 4) Otherwise: proceed with queue/send behavior
        if (queueMode) {
          queueDraft();
        } else {
          handleSubmit();
        }
        return;
      }

      // Call parent onKeyDown if provided
      onKeyDown?.(e);
    },
    [
      queueMode,
      queueDraft,
      handleSubmit,
      onKeyDown,
      showFileSelector,
      fileResults,
      selectedFileIndex,
      handleFileSelect,
      handleFileSelectorClose,
      showSlashMenu,
      slashItems,
      slashIndex,
      applySlashSelection,
    ]
  );

  return (
    <div className="relative z-20">
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none" />
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="absolute bottom-0 left-0 right-0 px-6 md:px-12 py-6"
      >
        <div className="relative max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl" />
          <div
            className={cn(
              "relative bg-white/[0.12] backdrop-blur-2xl rounded-2xl border p-1.5 shadow-2xl transition-colors",
              isDragOver ? "border-blue-400 bg-blue-500/10" : "border-white/20"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drag Overlay */}
            {isDragOver && (
              <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm rounded-2xl border-2 border-dashed border-blue-400 flex items-center justify-center z-10">
                <div className="text-center">
                  <Image className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-blue-400 font-medium">Drop images here</p>
                </div>
              </div>
            )}
            {/* Selected Agent (Tag-like chip) */}
            {selectedSlashCommand && (
              <div className="px-3 pt-2 pb-1">
                <SelectedAgentChip
                  label={(
                    selectedSlashCommand.agent_config_name || ""
                  ).toString()}
                  command={selectedSlashCommand.command}
                  onClear={() => setSelectedSlashCommand(null)}
                  size="sm"
                />
              </div>
            )}

            {/* Uploaded Images */}
            {displayImages.length > 0 && (
              <div className="px-3 pt-2 pb-1">
                <div className="flex flex-wrap gap-2">
                  {displayImages.map((base64, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={base64}
                        alt={`Upload ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-lg border border-white/20"
                      />
                      <button
                        onClick={() => removeImage(base64)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lexical Editor Container */}
            <div
              className={cn(
                "relative min-h-12 pr-24",
                queueMode && "ring-2 ring-violet-500/50 rounded-xl"
              )}
              onKeyDown={handleEditorKeyDown}
            >
              <LexicalPillEditor
                value={inputMessage}
                onChange={handleContentChange}
                codePath={codePath!}
                placeholder={
                  isTyping || isLoading ? "AI is thinking..." : placeholder
                }
                className="lexical-chat-input"
                disabled={isTyping || isLoading || disabled}
              />

              {/* Slash Commands Palette */}
              <AnimatePresence>
                {showSlashMenu && slashItems.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute left-4 bottom-12 w-[320px] max-w-[90vw] z-50 bg-black/95 border border-white/15 rounded-xl shadow-2xl overflow-hidden"
                    role="listbox"
                  >
                    <div className="px-3 py-2 text-xs text-white/40 border-b border-white/10">
                      {slashQuery === "/"
                        ? "All commands"
                        : `Commands matching “${slashQuery}”`}
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {slashItems.map((item, idx) => (
                        <button
                          key={item.command}
                          role="option"
                          aria-selected={idx === slashIndex}
                          className={cn(
                            "w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors",
                            idx === slashIndex
                              ? "bg-white/10 text-white"
                              : "text-white/80 hover:bg-white/5"
                          )}
                          onMouseEnter={() => setSlashIndex(idx)}
                          onClick={() => applySlashSelection(item)}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{item.command}</span>
                            <span className="text-xs text-white/40">
                              {item.agent_config_name}
                            </span>
                          </div>
                          {item.description && (
                            <span className="text-xs text-white/40 ml-3">
                              {item.description}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="px-3 py-2 text-[11px] text-white/35 border-t border-white/10">
                      ↑/↓ to navigate • Enter to choose • Esc to close
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input actions - Evenly spaced with flexbox */}
            <div
              className={cn(
                "absolute right-2 flex items-center justify-between gap-2",
                isEditorExpanded ? "bottom-2" : "top-1/2 -translate-y-1/2"
              )}
            >
              {/* Model Selector */}
              <div className="relative" data-model-selector>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowModelSelector(!showModelSelector)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-xs"
                >
                  <Sparkles className="h-3 w-3 text-white/60" />
                  <span className="text-white/70 font-medium">
                    {currentModelDisplay}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 text-white/40 transition-transform",
                      showModelSelector && "rotate-180"
                    )}
                  />
                </motion.button>

                {/* Model Dropdown */}
                <AnimatePresence>
                  {showModelSelector && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                      className="absolute bottom-full left-0 mb-2 w-64 bg-black/95 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl overflow-hidden z-50"
                    >
                      <div className="p-2">
                        <div className="text-xs text-white/40 px-3 py-2 font-medium">
                          Select Model
                        </div>
                        {availableModels.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => handleModelSelect(model.id)}
                            className={cn(
                              "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between",
                              currentEffectiveModel === model.id
                                ? "bg-white/10 text-white"
                                : "text-white/70 hover:bg-white/5 hover:text-white/90"
                            )}
                          >
                            <div>
                              <div className="font-medium">{model.name}</div>
                              <div className="text-xs text-white/40">
                                {model.description}
                              </div>
                            </div>
                            {currentEffectiveModel === model.id && (
                              <div className="w-2 h-2 rounded-full bg-blue-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Image Upload / Cancel Button - Same position */}
              {isLoading || isTyping ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCancelConversation}
                  className="relative p-2 rounded-xl bg-red-600 hover:bg-red-500 transition-all shadow-lg cursor-pointer"
                  title="Stop generation"
                >
                  <StopCircle className="h-4 w-4 text-white" />
                </motion.button>
              ) : (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="image-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (onImageUpload) {
                          onImageUpload(file);
                        } else {
                          handleImageUpload(file);
                        }
                      }
                      e.target.value = "";
                    }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() =>
                      document.getElementById("image-upload")?.click()
                    }
                    className="relative group p-2 cursor-pointer"
                    title="Upload Image"
                  >
                    <div className="absolute inset-0 bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Image className="relative h-4 w-4 text-white/40 group-hover:text-white/60" />
                  </motion.button>
                </>
              )}

              {/* Submit Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={!hasContent || isLoading || disabled}
                      onClick={queueMode ? queueDraft : handleSubmit}
                      className={cn(
                        "relative p-2 rounded-xl transition-all",
                        hasContent && !isLoading && !disabled
                          ? queueMode
                            ? "bg-violet-600 shadow-lg"
                            : "bg-[#007AFF] shadow-lg"
                          : "bg-white/10"
                      )}
                      title={queueMode ? "Queue draft (Enter)" : "Send (Enter)"}
                    >
                      {queueMode ? (
                        <Clock
                          className={cn(
                            "h-4 w-4 transition-colors",
                            hasContent && !isLoading && !disabled
                              ? "text-white"
                              : "text-white/30"
                          )}
                        />
                      ) : (
                        <Send
                          className={cn(
                            "h-4 w-4 transition-colors",
                            hasContent && !isLoading && !disabled
                              ? "text-white"
                              : "text-white/30"
                          )}
                        />
                      )}
                    </motion.button>
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* File Selector Overlay */}
        {showFileSelector && (
          <div className="absolute inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl"
              onClick={handleFileSelectorClose}
            />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <FancyFileSelector
                isOpen={showFileSelector}
                query={fileSearchQuery}
                onQueryChange={setFileSearchQuery}
                results={fileResults}
                selectedIndex={selectedFileIndex}
                onFileSelect={handleFileSelect}
                onClose={handleFileSelectorClose}
                isSearching={isSearchingFiles}
                className="w-[500px] max-w-[90vw]"
              />
            </div>
          </div>
        )}

        {/* QUEUE LIST POPOVER */}
        <AnimatePresence>
          {showQueueList && queuedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute bottom-20 right-0 w-80 max-w-[90vw] bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 p-4 shadow-2xl z-50"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white">
                  Queued Messages ({queuedCount})
                </h3>
                <button
                  onClick={() => setShowQueueList(false)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 text-white/60" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {list().map((message, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="flex-1 text-sm text-white/80 break-words">
                      {message.length > 100
                        ? `${message.slice(0, 100)}...`
                        : message}
                    </div>
                    <button
                      onClick={() => remove(index)}
                      className="flex-shrink-0 p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                      title="Remove from queue"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/60">
                Messages will be sent automatically when the assistant finishes
                responding
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
