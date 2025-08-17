import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/core';
import { postEditText, DEFAULT_EDIT_CONFIG } from '@/services/acsEdit';

interface MagicWandBubbleProps {
  editor: Editor;
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
}

type BubbleState = 'idle' | 'editing' | 'loading' | 'review';

interface DiffPreviewProps {
  original: string;
  modified: string;
  onAccept: () => void;
  onReject: () => void;
}

const InlineDiff: React.FC<DiffPreviewProps> = ({ original, modified, onAccept, onReject }) => {
  return (
    <div className="magic-wand-diff">
      <div className="diff-container">
        <div className="diff-side original">
          <div className="diff-label">Original</div>
          <div className="diff-content">{original}</div>
        </div>
        <div className="diff-side modified">
          <div className="diff-label">Modified</div>
          <div className="diff-content">{modified}</div>
        </div>
      </div>
      <div className="diff-actions">
        <button className="diff-button accept" onClick={onAccept}>
          Accept
        </button>
        <button className="diff-button reject" onClick={onReject}>
          Reject
        </button>
      </div>
    </div>
  );
};

const MagicWandBubble: React.FC<MagicWandBubbleProps> = ({
  editor,
  isVisible,
  position,
  onClose,
}) => {
  const [state, setState] = useState<BubbleState>('idle');
  const [instructions, setInstructions] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [modifiedText, setModifiedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  
  // Use default configuration since context is not available in Tiptap extensions
  // The MagicWand bubble is rendered outside the normal React component tree
  const effectiveAgentConfigId = DEFAULT_EDIT_CONFIG.agent_config_name;
  const effectiveModelId = DEFAULT_EDIT_CONFIG.model_id;

  // Focus textarea when entering editing state
  useEffect(() => {
    if (state === 'editing' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [state]);

  // Close bubble when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose]);

  const handleMagicWandClick = () => {
    if (state === 'idle') {
      // Capture the selected text
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);
      setOriginalText(selectedText);
      setState('editing');
    } else {
      // Close the popover
      setState('idle');
      setInstructions('');
      setError(null);
    }
  };

  const handleRunAI = async () => {
    if (!instructions.trim()) {
      setError('Please enter instructions for the AI edit');
      return;
    }

    setState('loading');
    setError(null);

    try {
      // Get the full document context
      const fullDocumentText = editor.getText();
      
      // Create a comprehensive prompt with context
      const prompt = `DOCUMENT CONTEXT:
${fullDocumentText}

SELECTED TEXT TO EDIT:
${originalText}

USER'S EDITING INSTRUCTIONS:
${instructions.trim()}

TASK: Edit only the selected text according to the user's instructions. Consider the full document context for coherence, but ONLY RETURN THE UPDATED VERSION OF THE SELECTED TEXT. Do not include any explanations, markdown formatting, or additional text - just return the edited content that should replace the selection.`;

      const request = {
        text: prompt,
        agent_config_name: effectiveAgentConfigId,
        model_id: effectiveModelId,
      };

      console.log('🪄 [MagicWand] Sending request to ACS:', request);
      
      const response = await postEditText(request);
      setModifiedText(response.edited_text);
      setState('review');
    } catch (err) {
      console.error('AI edit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process AI edit');
      setState('editing');
    }
  };

  const handleAccept = () => {
    // Replace the selected text with the modified text
    const { from, to } = editor.state.selection;
    editor.chain().focus().deleteRange({ from, to }).insertContent(modifiedText).run();
    
    // Reset state and close
    setState('idle');
    setInstructions('');
    setOriginalText('');
    setModifiedText('');
    setError(null);
    onClose();
  };

  const handleReject = () => {
    // Reset to editing state
    setState('editing');
    setModifiedText('');
    setError(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleRunAI();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={bubbleRef}
      className="magic-wand-bubble"
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 1000,
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="magic-wand-main">
        <button
          className={`magic-wand-icon ${state !== 'idle' ? 'active' : ''}`}
          onClick={handleMagicWandClick}
          title="AI Magic Wand"
        >
          🪄
        </button>

        {state === 'editing' && (
          <div className="magic-wand-popover">
            <div className="popover-header">
              <span>AI Edit Instructions</span>
            </div>
            <textarea
              ref={textareaRef}
              className="instructions-textarea"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Describe how you want to modify the selected text..."
              rows={3}
            />
            {error && (
              <div className="error-message">{error}</div>
            )}
            <div className="popover-actions">
              <button
                className="run-ai-button"
                onClick={handleRunAI}
                disabled={!instructions.trim()}
              >
                Run AI
              </button>
              <button
                className="cancel-button"
                onClick={() => setState('idle')}
              >
                Cancel
              </button>
            </div>
            <div className="keyboard-hint">
              Press Cmd/Ctrl+Enter to run, Esc to cancel
            </div>
          </div>
        )}

        {state === 'loading' && (
          <div className="magic-wand-popover">
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <span>AI is processing your request...</span>
            </div>
          </div>
        )}

        {state === 'review' && (
          <div className="magic-wand-popover review">
            <div className="popover-header">
              <span>Review AI Changes</span>
            </div>
            <InlineDiff
              original={originalText}
              modified={modifiedText}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MagicWandBubble;