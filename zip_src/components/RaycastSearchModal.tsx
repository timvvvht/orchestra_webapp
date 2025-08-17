import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useRaycastSearch } from '../hooks/useRaycastSearch';
import { forceReindexMarkdownFiles } from '../api';
import { useSearchModal } from '../hooks/useSearchModal';
import { useFileNavigation } from '@/hooks/useFileNavigation';
import { 
  Search, 
  FileText, 
  Clock, 
  Sparkles, 
  ArrowRight,
  Command,
  CornerDownLeft,
  Hash,
  Calendar,
  User,
  Folder,
  RefreshCw,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RaycastSearchModalProps {
  handleFileSelect: (path: string) => void;
}

// Intelligent categorization of search results
type ResultCategory = 'recent' | 'frequent' | 'relevant' | 'suggested';

interface CategorizedResult {
  category: ResultCategory;
  items: any[];
}

const RaycastSearchModal: React.FC<RaycastSearchModalProps> = ({ handleFileSelect }) => {
  const { close: closeModal } = useSearchModal();
  const { navigateToFile, isNavigating } = useFileNavigation();
  
  const {
    query,
    setQuery,
    results,
    highlighted,
    selectCurrent
  } = useRaycastSearch(handleFileSelect);

  const inputRef = useRef<HTMLInputElement>(null);
  const [isReindexing, setIsReindexing] = useState(false);
  const [showCommandHints, setShowCommandHints] = useState(false);

  // Track user's search patterns for intelligent suggestions
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentSearches');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    // Focus with a slight delay for smooth transition
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Intelligent result categorization
  const categorizedResults = useMemo(() => {
    if (!query && recentSearches.length > 0) {
      // Show smart suggestions when no query
      return {
        suggestions: recentSearches.slice(0, 3),
        results: []
      };
    }
    
    // Categorize results based on relevance, recency, and frequency
    const categorized: CategorizedResult[] = [];
    
    if (results.length > 0) {
      // For now, just show all results as "relevant"
      // In a real implementation, you'd analyze user behavior
      categorized.push({
        category: 'relevant',
        items: results
      });
    }
    
    return { suggestions: [], results: categorized };
  }, [query, results, recentSearches]);

  const handleReindex = async () => {
    setIsReindexing(true);
    try {
      await forceReindexMarkdownFiles();
      // Subtle success feedback
      setTimeout(() => setIsReindexing(false), 2000);
    } catch (error) {
      console.error('Failed to reindex:', error);
      setIsReindexing(false);
    }
  };

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    // Save to recent searches
    if (searchQuery.trim()) {
      const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    }
  };

  // Command detection for advanced features
  const isCommand = query.startsWith('>');
  const commandHint = isCommand ? 'Type to filter commands...' : null;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 z-50 flex items-start justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={closeModal}
      >
        {/* Backdrop with mystical depth */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        
        {/* Search Modal */}
        <motion.div
          className="relative w-full max-w-2xl mt-[10vh]"
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          onClick={e => e.stopPropagation()}
        >
          <div className="overflow-hidden rounded-orchestra-2xl bg-glass-light backdrop-blur-xl shadow-2xl border border-white/20">
            {/* Gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
            
            {/* Search Header */}
            <div className="relative z-10">
              {/* Input Container */}
              <div className="flex items-center gap-4 px-6 py-5 border-b border-white/10">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5">
                  <Search className="w-5 h-5 text-white/70" />
                </div>
                
                <input
                  ref={inputRef}
                  className="flex-1 bg-transparent text-lg font-medium text-white placeholder:text-white/25 focus:outline-none"
                  placeholder={commandHint || "Search files, or type '>' for commands..."}
                  value={query}
                  onChange={e => handleSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      selectCurrent();
                    }
                  }}
                  spellCheck={false}
                />
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {query && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-2 rounded-lg hover:bg-white/5 text-white/60 transition-colors"
                      onClick={() => setQuery('')}
                    >
                      <span className="text-xs">Clear</span>
                    </motion.button>
                  )}
                  
                  <motion.button
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      isReindexing 
                        ? "bg-white/10 text-white/90" 
                        : "hover:bg-white/5 text-white/60"
                    )}
                    onClick={handleReindex}
                    whileTap={{ scale: 0.95 }}
                    animate={isReindexing ? { rotate: 360 } : {}}
                    transition={isReindexing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              {/* Quick Actions Bar */}
              {!query && (
                <motion.div 
                  className="flex items-center gap-2 px-6 py-3 border-b border-white/10 bg-white/[0.02]"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <span className="text-xs text-white/40 mr-2">Quick:</span>
                  {[
                    { icon: Clock, label: 'Recent', action: () => {} },
                    { icon: Sparkles, label: 'Favorites', action: () => {} },
                    { icon: Hash, label: 'Tags', action: () => {} },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white/90 transition-colors"
                      onClick={item.action}
                    >
                      <item.icon className="w-3.5 h-3.5" />
                      {item.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Results Container */}
            <div className="max-h-[50vh] overflow-y-auto search-results-scroll">
              {/* Smart Suggestions */}
              {!query && categorizedResults.suggestions.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-white/70" />
                    <span className="text-xs font-medium text-white/60">Recent Searches</span>
                  </div>
                  <div className="space-y-1">
                    {categorizedResults.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                        onClick={() => handleSearch(suggestion)}
                      >
                        <Clock className="w-4 h-4 text-white/40" />
                        <span className="text-sm text-white/80">{suggestion}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results */}
              {results.length > 0 && (
                <div className="p-2">
                  {results.map((result, idx) => (
                    <motion.button
                      key={`${result.path}-${idx}`}
                      className={cn(
                        "w-full flex items-start gap-4 px-4 py-3 rounded-xl transition-all",
                        idx === highlighted 
                          ? "bg-white/10 text-white shadow-lg shadow-white/5" 
                          : "hover:bg-white/5",
                        isNavigating && "opacity-50 cursor-wait"
                      )}
                      disabled={isNavigating}
                      onClick={async () => {
                        console.log('[RaycastSearchModal] Navigating to search result:', result.path);
                        closeModal();
                        await navigateToFile(result.path, { validateExists: true });
                      }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                    >
                      {/* Icon */}
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0",
                        idx === highlighted ? "bg-white/20" : "bg-white/5"
                      )}>
                        <FileText className={cn(
                          "w-5 h-5",
                          idx === highlighted ? "text-white" : "text-white/60"
                        )} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 text-left">
                        <div className={cn(
                          "font-medium",
                          idx === highlighted ? "text-white" : "text-white/90"
                        )}>
                          {result.title || result.path.split('/').pop()}
                        </div>
                        <div className={cn(
                          "text-sm mt-0.5",
                          idx === highlighted ? "text-white/70" : "text-white/50"
                        )}>
                          {result.path.replace(/^.*\//, '')}
                        </div>
                        {result.snippet && result.snippet !== '...' && (
                          <div 
                            className={cn(
                              "text-xs mt-1 line-clamp-2",
                              idx === highlighted ? "text-white/60" : "text-white/40"
                            )}
                            dangerouslySetInnerHTML={{ __html: result.snippet }}
                          />
                        )}
                      </div>

                      {/* Action Hint */}
                      {idx === highlighted && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {query && results.length === 0 && (
                <motion.div 
                  className="flex flex-col items-center justify-center py-16 px-8"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-white/30" />
                  </div>
                  <p className="text-white/70 text-sm">No results for "{query}"</p>
                  <p className="text-white/40 text-xs mt-1">Try a different search term</p>
                </motion.div>
              )}

              {/* Initial State */}
              {!query && results.length === 0 && categorizedResults.suggestions.length === 0 && (
                <motion.div 
                  className="flex flex-col items-center justify-center py-16 px-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-white/70" />
                  </div>
                  <p className="text-white font-medium">Start typing to search</p>
                  <p className="text-white/60 text-sm mt-1">Press <kbd className="px-1.5 py-0.5 text-xs bg-white/10 rounded text-white/80">&gt;</kbd> for commands</p>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            {(results.length > 0 || showCommandHints) && (
              <motion.div 
                className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-white/[0.02]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-4 text-xs text-white/50">
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/20 text-white/80">↑↓</kbd>
                    <span>Navigate</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/20 text-white/80">⏎</kbd>
                    <span>Open</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/20 text-white/80">esc</kbd>
                    <span>Close</span>
                  </div>
                </div>
                
                {results.length > 0 && (
                  <div className="text-xs text-white/50">
                    {highlighted + 1} of {results.length}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RaycastSearchModal;
