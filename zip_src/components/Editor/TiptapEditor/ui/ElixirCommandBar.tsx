import React, { useState, useRef, useEffect } from "react";
import { Editor } from "@tiptap/core";
import { postEditText, DEFAULT_EDIT_CONFIG } from "@/services/acsEdit";

interface ElixirCommandBarProps {
  editor: Editor;
  isVisible: boolean;
  onClose: () => void;
}

type CommandBarState = "idle" | "loading" | "success" | "error";

const ElixirCommandBar: React.FC<ElixirCommandBarProps> = ({
  editor,
  isVisible,
  onClose,
}) => {
  const [state, setState] = useState<CommandBarState>("idle");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Use default configuration since context is not available in Tiptap extensions
  const effectiveAgentConfigId = DEFAULT_EDIT_CONFIG.agent_config_name;
  const effectiveModelId = DEFAULT_EDIT_CONFIG.model_id;

  // Focus input when becoming visible
  useEffect(() => {
    if (isVisible && state === "idle" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible, state]);

  // Close bar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isVisible, onClose]);

  const handleSubmit = async () => {
    if (!instructions.trim()) {
      setError("Please enter instructions for the AI edit");
      return;
    }

    setState("loading");
    setError(null);

    try {
      // Get the selected text
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);

      // Get the full document context
      const fullDocumentText = editor.getText();

      // Create a comprehensive prompt with context
      const prompt = `DOCUMENT CONTEXT:
${fullDocumentText}

SELECTED TEXT TO EDIT:
${selectedText}

USER'S EDITING INSTRUCTIONS:
${instructions.trim()}

TASK: Edit only the selected text according to the user's instructions. Consider the full document context for coherence, but ONLY RETURN THE UPDATED VERSION OF THE SELECTED TEXT. Do not include any explanations, markdown formatting, or additional text - just return the edited content that should replace the selection.`;

      const request = {
        text: prompt,
        agent_config_name: effectiveAgentConfigId,
        model_id: effectiveModelId,
      };

      console.log("🧪 [ElixirCommandBar] Sending request to ACS:", request);

      const response = await postEditText(request);

      // Replace the selected text with the AI response
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent(response.edited_text)
        .run();

      setState("success");

      // Close after a brief success indication
      setTimeout(() => {
        setInstructions("");
        setState("idle");
        onClose();
      }, 500);
    } catch (err) {
      console.error("AI edit error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to process AI edit"
      );
      setState("error");

      // Reset to idle after showing error
      setTimeout(() => {
        setState("idle");
      }, 2000);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
    } else if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const renderContent = () => {
    switch (state) {
      case "loading":
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/70">Processing</span>
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1 h-1 rounded-full bg-blue-400/60 animate-elixir-thinking-dot"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        );

      case "success":
        return (
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="text-sm">✓ Applied</span>
          </div>
        );

      case "error":
        return (
          <div className="flex items-center gap-2 text-red-400">
            <span className="text-sm">✗ {error || "Error"}</span>
          </div>
        );

      default:
        return (
          <div className="flex items-center gap-3 w-full">
            <div className="text-blue-400/80 text-sm">➤</div>
            <input
              ref={inputRef}
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your edit..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-white/90 placeholder-white/40"
            />
            <div className="text-xs text-white/30">↵</div>
          </div>
        );
    }
  };

  console.log("🧪 [ElixirCommandBar] Render called:", {
    isVisible,
    state,
  });

  return (
    <div
      className={`
        elixir-sidebar 
        flex flex-col 
        pt-4 px-4 
        pointer-events-none
        transition-transform duration-300 ease-out
        ${isVisible ? "translate-x-0" : "translate-x-full"}
      `}
    >
      {/* Glass pill container */}
      <div ref={barRef} className="relative pointer-events-auto">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none rounded-full" />

        {/* Main pill */}
        <div
          className="
          relative z-10
          bg-white/[0.03] 
          backdrop-blur-xl 
          border border-white/10 
          rounded-full 
          px-4 py-2 
          flex items-center 
          gap-2 
          transition-all duration-200 
          hover:scale-105 
          hover:bg-white/[0.05]
          min-w-[280px]
          pointer-events-auto
        "
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ElixirCommandBar;
