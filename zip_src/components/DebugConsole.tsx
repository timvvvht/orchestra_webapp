import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NetworkMonitor } from './NetworkMonitor';
import { TESMonitor } from './TESMonitor';

interface LogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  args: any[];
  id: number;
}

interface DebugConsoleProps {
  onToggle?: (isOpen: boolean) => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({ onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'network' | 'tes'>('logs');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const logIdCounter = useRef(0);
  
  const MAX_LOG_LENGTH = 200; // Characters before truncation

  // Safe JSON stringify that handles cyclic structures
  const safeStringify = (obj: any, maxDepth = 3): string => {
    const seen = new WeakSet();
    
    const replacer = (key: string, value: any, depth = 0): any => {
      // Handle primitive types
      if (value === null || typeof value !== 'object') {
        return value;
      }
      
      // Handle circular references
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      
      // Handle max depth
      if (depth >= maxDepth) {
        return '[Max Depth Reached]';
      }
      
      seen.add(value);
      
      // Handle special object types
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
      }
      
      if (value instanceof Date) {
        return value.toISOString();
      }
      
      if (value instanceof RegExp) {
        return value.toString();
      }
      
      // Handle DOM elements
      if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) {
        return `[HTMLElement: ${value.tagName}${value.id ? '#' + value.id : ''}${value.className ? '.' + value.className.split(' ').join('.') : ''}]`;
      }
      
      // Handle React elements
      if (value.$$typeof) {
        return '[React Element]';
      }
      
      // Handle functions
      if (typeof value === 'function') {
        return `[Function: ${value.name || 'anonymous'}]`;
      }
      
      // Handle arrays
      if (Array.isArray(value)) {
        return value.map((item, index) => replacer(String(index), item, depth + 1));
      }
      
      // Handle plain objects
      const result: any = {};
      for (const [k, v] of Object.entries(value)) {
        try {
          result[k] = replacer(k, v, depth + 1);
        } catch (error) {
          result[k] = '[Serialization Error]';
        }
      }
      
      return result;
    };
    
    try {
      return JSON.stringify(replacer('', obj), null, 2);
    } catch (error) {
      return `[Serialization Failed: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
  };

  useEffect(() => {
    // Capture console logs
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    const addLog = (level: LogEntry['level'], args: any[]) => {
      const message = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          return safeStringify(arg);
        }
        return String(arg);
      }).join(' ');
      
      setLogs(prev => [...prev.slice(-4999), { // Keep last 5000 logs
        id: ++logIdCounter.current,
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
        args
      }]);
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args);
    };

    console.info = (...args) => {
      originalInfo(...args);
      addLog('info', args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      console.info = originalInfo;
    };
  }, []);

  // Keyboard shortcut handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+Shift+D (Mac) or Ctrl+Shift+D (Windows/Linux) to toggle console
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        event.stopPropagation();
        setIsOpen(prev => {
          const newState = !prev;
          // Focus search input when opening
          if (newState) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
          }
          // Notify parent component about toggle
          onToggle?.(newState);
          return newState;
        });
      }
      
      // Escape to close console
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        event.stopPropagation();
        setIsOpen(false);
        onToggle?.(false);
      }
      
      // Cmd+F or Ctrl+F to focus search when console is open
      if (isOpen && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        event.stopPropagation();
        searchInputRef.current?.focus();
      }
      
      // Tab switching shortcuts (Cmd+1 for logs, Cmd+2 for network)
      if (isOpen && (event.metaKey || event.ctrlKey) && event.key === '1') {
        event.preventDefault();
        event.stopPropagation();
        setActiveTab('logs');
      }
      
      if (isOpen && (event.metaKey || event.ctrlKey) && event.key === '2') {
        event.preventDefault();
        event.stopPropagation();
        setActiveTab('network');
      }
      
      if (isOpen && (event.metaKey || event.ctrlKey) && event.key === '3') {
        event.preventDefault();
        event.stopPropagation();
        setActiveTab('tes');
      }
    };

    // Use capture phase to ensure we get the event first
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  

  // Filter logs based on search term and level
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = searchTerm === '' || 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.timestamp.includes(searchTerm);
      
      const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
      
      return matchesSearch && matchesLevel;
    });
  }, [logs, searchTerm, levelFilter]);

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return '#ff6b6b';
      case 'warn': return '#ffd93d';
      case 'info': return '#74c0fc';
      default: return '#ffffff';
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const copyAllLogs = () => {
    const allLogsText = filteredLogs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');
    copyToClipboard(allLogsText);
  };

  const copyFilteredLogs = () => {
    const filteredLogsText = filteredLogs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');
    copyToClipboard(filteredLogsText);
  };

  const toggleLogExpansion = (logId: number) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const isLogExpanded = (logId: number) => expandedLogs.has(logId);
  
  const shouldTruncateLog = (message: string) => message.length > MAX_LOG_LENGTH;
  
  const getTruncatedMessage = (message: string) => {
    if (message.length <= MAX_LOG_LENGTH) return message;
    return message.substring(0, MAX_LOG_LENGTH) + '...';
  };

  if (!isOpen) {
    return null; // No visual button - keyboard shortcut only (⌘⇧D)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.9)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: '#1a1a1a',
        color: 'white',
        padding: '10px 20px',
        borderBottom: '1px solid #333'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h3 style={{ margin: 0 }}>🐛 Debug Console</h3>
            
            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '5px' }}>
              <button
                onClick={() => setActiveTab('logs')}
                style={{
                  background: activeTab === 'logs' ? '#007bff' : '#444',
                  color: 'white',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: activeTab === 'logs' ? 'bold' : 'normal'
                }}
                title="Switch to logs (⌘1)"
              >
                📝 Logs ({filteredLogs.length}/{logs.length})
              </button>
              <button
                onClick={() => setActiveTab('network')}
                style={{
                  background: activeTab === 'network' ? '#007bff' : '#444',
                  color: 'white',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: activeTab === 'network' ? 'bold' : 'normal'
                }}
                title="Switch to network (⌘2)"
              >
                🌐 Network
              </button>
              <button
                onClick={() => setActiveTab('tes')}
                style={{
                  background: activeTab === 'tes' ? '#007bff' : '#444',
                  color: 'white',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: activeTab === 'tes' ? 'bold' : 'normal'
                }}
                title="Switch to TES (⌘3)"
              >
                🔧 TES
              </button>
            </div>
          </div>
          <div>
            <button
              onClick={copyFilteredLogs}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '4px',
                marginRight: '5px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
              title="Copy filtered logs to clipboard"
            >
              📋 Copy
            </button>
            <button
              onClick={() => setLogs([])}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '4px',
                marginRight: '5px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🗑️ Clear
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                onToggle?.(false);
              }}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>
        
        {/* Search and Filter Bar - Only for Logs Tab */}
        {activeTab === 'logs' && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search logs... (⌘F)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '6px 10px',
              border: '1px solid #444',
              borderRadius: '4px',
              background: '#2a2a2a',
              color: 'white',
              fontSize: '12px'
            }}
          />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #444',
              borderRadius: '4px',
              background: '#2a2a2a',
              color: 'white',
              fontSize: '12px'
            }}
          >
            <option value="all">All Levels</option>
            <option value="log">Log</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </select>
          
          </div>
        )}
      </div>

      {/* Content Area */}
      {activeTab === 'logs' ? (
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '10px',
          fontFamily: 'monospace',
          fontSize: '12px',
          background: '#000'
        }}>
        {filteredLogs.length === 0 ? (
          <div style={{ color: '#666', textAlign: 'center', marginTop: '50px' }}>
            {logs.length === 0 ? 'No logs yet. Try performing some actions...' : 'No logs match your search criteria.'}
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = isLogExpanded(log.id);
            const shouldTruncate = shouldTruncateLog(log.message);
            const displayMessage = shouldTruncate && !isExpanded 
              ? getTruncatedMessage(log.message) 
              : log.message;

            return (
              <div
                key={log.id}
                style={{
                  marginBottom: '4px',
                  padding: '4px 8px',
                  borderRadius: '2px',
                  background: 'rgba(255,255,255,0.05)',
                  borderLeft: `3px solid ${getLogColor(log.level)}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: shouldTruncate ? '4px' : '0' }}>
                    <span style={{ color: '#888' }}>
                      [{log.timestamp}]
                    </span>
                    <span style={{ 
                      color: getLogColor(log.level), 
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      fontSize: '10px'
                    }}>
                      {log.level}
                    </span>
                    {shouldTruncate && (
                      <button
                        onClick={() => toggleLogExpansion(log.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #444',
                          color: '#888',
                          padding: '1px 4px',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          fontSize: '9px',
                          opacity: 0.7
                        }}
                        title={isExpanded ? 'Collapse log' : 'Expand log'}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    )}
                  </div>
                  <div style={{ 
                    color: '#fff',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.4'
                  }}>
                    {displayMessage}
                  </div>
                  {shouldTruncate && !isExpanded && (
                    <div style={{ 
                      color: '#666', 
                      fontSize: '10px', 
                      marginTop: '2px',
                      fontStyle: 'italic'
                    }}>
                      {log.message.length - MAX_LOG_LENGTH} more characters... (click ▶ to expand)
                    </div>
                  )}
                </div>
                <button
                  onClick={() => copyToClipboard(`[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #444',
                    color: '#888',
                    padding: '2px 6px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    opacity: 0.7,
                    alignSelf: 'flex-start'
                  }}
                  title="Copy this log entry"
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                >
                  📋
                </button>
              </div>
            );
          })
        )}
          
        </div>
      ) : activeTab === 'network' ? (
        <div style={{ flex: 1, position: 'relative' }}>
          <NetworkMonitor isVisible={true} />
        </div>
      ) : (
        <div style={{ flex: 1, position: 'relative' }}>
          <TESMonitor isVisible={true} />
        </div>
      )}

      {/* Footer */}
      <div style={{
        background: '#1a1a1a',
        color: '#666',
        padding: '8px 20px',
        fontSize: '11px',
        borderTop: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>
          {activeTab === 'logs' 
            ? '💡 Tip: Try Google OAuth to see authentication logs in real-time'
            : activeTab === 'network'
            ? '🌐 Network requests are intercepted and logged automatically'
            : '🔧 Test TES endpoints to verify local tool service connectivity'
          }
        </span>
        <span>Shortcuts: ⌘⇧D (toggle) • ⌘1 (logs) • ⌘2 (network) • ⌘3 (tes) • ESC (close)</span>
      </div>
    </div>
  );
};