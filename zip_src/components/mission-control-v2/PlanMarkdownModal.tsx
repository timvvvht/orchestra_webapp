import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface PlanMarkdownModalProps {
  planMarkdown: string;
  sessionTitle: string;
  onClose: () => void;
}

const PlanMarkdownModal: React.FC<PlanMarkdownModalProps> = ({
  planMarkdown,
  sessionTitle,
  onClose
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Focus close button on open
  useEffect(() => {
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur flex items-center justify-center z-50">
      <div 
        className="bg-gray-900 border border-white/20 rounded-lg max-w-4xl max-h-[80vh] w-full mx-4 flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-medium text-white/90">{sessionTitle} - Plan</h2>
          <button 
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/10 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap">{planMarkdown}</pre>
        </div>
      </div>
    </div>
  );
};

export default PlanMarkdownModal;