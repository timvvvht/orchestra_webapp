import React from 'react';
import { ChevronDown } from 'lucide-react';

interface Props { 
  onClick: () => void; 
}

const FloatingFab: React.FC<Props> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-4 py-2
               bg-black/80 backdrop-blur-xl border border-white/10 hover:border-white/20
               rounded-full shadow-lg text-sm text-white/70 hover:text-white transition-all"
  >
    <ChevronDown className="h-4 w-4" />
    <span>Jump to bottom</span>
  </button>
);

export default FloatingFab;