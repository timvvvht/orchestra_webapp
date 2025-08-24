import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface TestResult {
  command: string;
  status: 'success' | 'error' | 'pending';
  result?: any;
  error?: string;
  duration?: number;
}

interface CommandTest {
  name: string;
  command: string;
  args?: Record<string, any>;
  description: string;
  category: string;
}

const TauriDebugOverlay: React.FC = () => {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Comprehensive list of Tauri commands organized by category
  const commandTests: CommandTest[] = [
    // Basic Commands
    { name: 'Greet', command: 'greet', args: { name: 'Orchestra Debug' }, description: 'Basic greeting command', category: 'basic' },
    { name: 'No-op', command: 'noop', description: 'No-operation benchmark command', category: 'basic' },
    
    // File Operations
    { name: 'File Exists', command: 'file_exists', args: { path: '/tmp' }, description: 'Check if file/directory exists', category: 'file' },
    { name: 'Read File', command: 'read_file', args: { path: '/etc/hosts' }, description: 'Read file content', category: 'file' },
    
    // Settings & Preferences
    { name: 'Get All Prefs', command: 'get_all_prefs', description: 'Get all user preferences', category: 'settings' },
    { name: 'Get Default Vault Path', command: 'get_default_vault_path', description: 'Get default vault directory', category: 'settings' },
    
    // Vault & Indexing
    { name: 'Get Vault Path', command: 'get_vault_path', description: 'Get current vault path', category: 'vault' },
    { name: 'Get Indexing Progress', command: 'get_indexing_progress', description: 'Get search index progress', category: 'vault' },
    { name: 'Get Index Doc Count', command: 'get_search_index_doc_count', description: 'Get indexed document count', category: 'vault' },
    
    // Agent Configuration
    { name: 'Get All Agent Configs', command: 'get_all_agent_configs', description: 'Get all agent configurations', category: 'agent' },
    { name: 'Get Tool Definitions', command: 'get_all_available_tool_definitions', description: 'Get available tool definitions', category: 'agent' },
    
    // Backend Communication
    { name: 'Send Message Stateless', command: 'send_message_stateless', args: { message: 'ping', agent_config_id: 'test' }, description: 'Test stateless message sending', category: 'backend' },
    
    // Assets & Resources
    { name: 'Resource File Exists', command: 'resource_file_exists', args: { path: 'icons/icon.png' }, description: 'Check if resource file exists', category: 'assets' },
    
    // Test Commands
    { name: 'Start Test Session', command: 'start_new_test_session', description: 'Start new test session', category: 'test' },
  ];

  const categories = ['all', ...Array.from(new Set(commandTests.map(t => t.category)))];

  const filteredTests = selectedCategory === 'all' 
    ? commandTests 
    : commandTests.filter(t => t.category === selectedCategory);

  const runSingleTest = async (test: CommandTest) => {
    const testKey = test.command;
    
    setResults(prev => ({
      ...prev,
      [testKey]: { command: test.command, status: 'pending' }
    }));

    const startTime = Date.now();
    
    try {
      const result = await invoke(test.command, test.args || {});
      const duration = Date.now() - startTime;
      
      setResults(prev => ({
        ...prev,
        [testKey]: {
          command: test.command,
          status: 'success',
          result: result,
          duration
        }
      }));
    } catch (err: any) {
      const duration = Date.now() - startTime;
      
      setResults(prev => ({
        ...prev,
        [testKey]: {
          command: test.command,
          status: 'error',
          error: err?.message || String(err),
          duration
        }
      }));
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setResults({});
    
    // Run tests sequentially to avoid overwhelming the backend
    for (const test of filteredTests) {
      await runSingleTest(test);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setIsRunning(false);
  };

  const clearResults = () => {
    setResults({});
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏳';
      default: return '⚪';
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '#82fa78';
      case 'error': return '#FF5A64';
      case 'pending': return '#FFA500';
      default: return '#888';
    }
  };

  const successCount = Object.values(results).filter(r => r.status === 'success').length;
  const errorCount = Object.values(results).filter(r => r.status === 'error').length;
  const totalTests = Object.keys(results).length;

  return (
    <div style={{
      position: 'fixed', 
      top: 24, 
      right: 24, 
      zIndex: 9999, 
      background: 'rgba(20,20,30,0.98)', 
      color: 'white', 
      padding: 20, 
      borderRadius: 12, 
      minWidth: 480,
      maxWidth: 600,
      maxHeight: '80vh',
      overflow: 'auto',
      boxShadow: '0 8px 48px rgba(0,0,0,0.6)', 
      fontSize: 14,
      fontFamily: 'monospace'
    }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ color: '#82fa78', fontWeight: 700, fontSize: 18, margin: 0 }}>
          🦀 Tauri Backend Connectivity Test
        </h2>
        <p style={{ opacity: 0.75, margin: '8px 0 0 0', fontSize: 13 }}>
          Comprehensive test of all Rust commands from lib.rs
        </p>
      </div>

      {/* Controls */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            background: '#333', 
            color: 'white', 
            border: '1px solid #555', 
            borderRadius: 4, 
            padding: '4px 8px',
            fontSize: 12
          }}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
        
        <button 
          onClick={runAllTests} 
          disabled={isRunning}
          style={{
            padding: '6px 12px', 
            background: isRunning ? '#555' : '#7E32EE', 
            color: 'white', 
            border: 'none', 
            borderRadius: 4, 
            fontWeight: 500, 
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontSize: 12
          }}
        >
          {isRunning ? 'Running...' : `Test ${filteredTests.length} Commands`}
        </button>
        
        <button 
          onClick={clearResults}
          style={{
            padding: '6px 12px', 
            background: '#666', 
            color: 'white', 
            border: 'none', 
            borderRadius: 4, 
            fontWeight: 500, 
            cursor: 'pointer',
            fontSize: 12
          }}
        >
          Clear
        </button>
      </div>

      {/* Summary */}
      {totalTests > 0 && (
        <div style={{ 
          marginBottom: 16, 
          padding: 12, 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: 6,
          fontSize: 13
        }}>
          <strong>Results: </strong>
          <span style={{ color: '#82fa78' }}>✅ {successCount}</span>
          {' • '}
          <span style={{ color: '#FF5A64' }}>❌ {errorCount}</span>
          {' • '}
          <span style={{ color: '#888' }}>Total: {totalTests}</span>
        </div>
      )}

      {/* Test Results */}
      <div style={{ maxHeight: '400px', overflow: 'auto' }}>
        {filteredTests.map((test) => {
          const result = results[test.command];
          const hasResult = !!result;
          
          return (
            <div 
              key={test.command}
              style={{
                marginBottom: 12,
                padding: 12,
                background: hasResult ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                borderRadius: 6,
                border: `1px solid ${hasResult ? getStatusColor(result.status) + '40' : '#333'}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>
                    {hasResult ? getStatusIcon(result.status) : '⚪'}
                  </span>
                  <strong style={{ color: hasResult ? getStatusColor(result.status) : '#fff' }}>
                    {test.name}
                  </strong>
                  <code style={{ 
                    background: 'rgba(255,255,255,0.1)', 
                    padding: '2px 6px', 
                    borderRadius: 3,
                    fontSize: 11,
                    color: '#ccc'
                  }}>
                    {test.command}
                  </code>
                </div>
                
                <button
                  onClick={() => runSingleTest(test)}
                  disabled={result?.status === 'pending'}
                  style={{
                    padding: '2px 8px',
                    background: '#444',
                    color: 'white',
                    border: 'none',
                    borderRadius: 3,
                    fontSize: 10,
                    cursor: 'pointer'
                  }}
                >
                  Test
                </button>
              </div>
              
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>
                {test.description}
              </div>
              
              {test.args && (
                <div style={{ fontSize: 10, color: '#888', marginBottom: 6 }}>
                  Args: {JSON.stringify(test.args)}
                </div>
              )}
              
              {result && (
                <div style={{ marginTop: 8 }}>
                  {result.duration && (
                    <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>
                      Duration: {result.duration}ms
                    </div>
                  )}
                  
                  {result.status === 'success' && result.result !== undefined && (
                    <div style={{ 
                      background: 'rgba(130, 250, 120, 0.1)', 
                      padding: 8, 
                      borderRadius: 4,
                      fontSize: 11,
                      wordBreak: 'break-all',
                      maxHeight: '100px',
                      overflow: 'auto'
                    }}>
                      <strong style={{ color: '#82fa78' }}>Result:</strong><br />
                      {typeof result.result === 'object' 
                        ? JSON.stringify(result.result, null, 2)
                        : String(result.result)
                      }
                    </div>
                  )}
                  
                  {result.status === 'error' && (
                    <div style={{ 
                      background: 'rgba(255, 90, 100, 0.1)', 
                      padding: 8, 
                      borderRadius: 4,
                      fontSize: 11,
                      wordBreak: 'break-all'
                    }}>
                      <strong style={{ color: '#FF5A64' }}>Error:</strong><br />
                      {result.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TauriDebugOverlay;
