import React, { useState, useEffect } from 'react';

interface TESEndpoint {
  name: string;
  path: string;
  method: 'GET' | 'POST';
  description: string;
}

interface TESResponse {
  endpoint: string;
  status: number;
  statusText: string;
  data?: any;
  error?: string;
  timestamp: string;
  duration: number;
}

interface TESMonitorProps {
  isVisible: boolean;
}

export const TESMonitor: React.FC<TESMonitorProps> = ({ isVisible }) => {
  const [tesUrl, setTesUrl] = useState('http://127.0.0.1:12345');
  const [responses, setResponses] = useState<TESResponse[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<TESResponse | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // TES endpoints based on the LocalToolOrchestrator
  const endpoints: TESEndpoint[] = [
    {
      name: 'Health Check',
      path: '/health',
      method: 'GET',
      description: 'Performs a basic health check of the service'
    },
    {
      name: 'Service Info',
      path: '/tes-info',
      method: 'GET',
      description: 'Returns service information, such as the version'
    },
    {
      name: 'Available Tools',
      path: '/tes-tools',
      method: 'GET',
      description: 'Lists all available tools that can be executed'
    },
    {
      name: 'Execute Job',
      path: '/execute_job',
      method: 'POST',
      description: 'Execute a tool job (used by LocalToolOrchestrator)'
    }
  ];

  const testEndpoint = async (endpoint: TESEndpoint) => {
    const fullUrl = `${tesUrl}${endpoint.path}`;
    const loadingKey = `${endpoint.method}:${endpoint.path}`;
    setIsLoading(loadingKey);

    const startTime = Date.now();
    
    try {
      const response = await fetch(fullUrl, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
        // For POST requests, we could add a test payload here
        ...(endpoint.method === 'POST' && {
          body: JSON.stringify({
            // Test job instruction - this is just for testing connectivity
            job_id: 'test-' + Date.now(),
            tool_name: 'test_tool',
            args: { test: true }
          })
        })
      });

      const endTime = Date.now();
      let data;
      
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : null;
      } catch {
        data = 'Non-JSON response';
      }

      const tesResponse: TESResponse = {
        endpoint: `${endpoint.method} ${endpoint.path}`,
        status: response.status,
        statusText: response.statusText,
        data,
        timestamp: new Date().toLocaleTimeString(),
        duration: endTime - startTime
      };

      setResponses(prev => [...prev.slice(-499), tesResponse]); // Keep last 500 responses
      setSelectedResponse(tesResponse);

    } catch (error) {
      const endTime = Date.now();
      const tesResponse: TESResponse = {
        endpoint: `${endpoint.method} ${endpoint.path}`,
        status: 0,
        statusText: 'Network Error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toLocaleTimeString(),
        duration: endTime - startTime
      };

      setResponses(prev => [...prev.slice(-499), tesResponse]);
      setSelectedResponse(tesResponse);
    } finally {
      setIsLoading(null);
    }
  };

  const getStatusColor = (status: number) => {
    if (status === 0) return '#dc3545'; // Network error
    if (status >= 200 && status < 300) return '#28a745'; // Success
    if (status >= 300 && status < 400) return '#ffc107'; // Redirect
    if (status >= 400) return '#dc3545'; // Error
    return '#666';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.95)',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      color: '#fff',
      fontFamily: 'Monaco, Consolas, monospace',
      fontSize: '12px'
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 15px',
        background: '#2d2d2d',
        borderBottom: '1px solid #444',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <h3 style={{ margin: 0, color: '#fff' }}>🔧 TES Monitor</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ color: '#ccc', fontSize: '11px' }}>TES URL:</label>
          <input
            type="text"
            value={tesUrl}
            onChange={(e) => setTesUrl(e.target.value)}
            style={{
              background: '#1a1a1a',
              border: '1px solid #444',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: '3px',
              fontSize: '11px',
              width: '200px'
            }}
            placeholder="http://127.0.0.1:12345"
          />
        </div>
        <button
          onClick={() => setResponses([])}
          style={{
            background: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Clear
        </button>
        <div style={{ marginLeft: 'auto', color: '#888' }}>
          {responses.length} tests
        </div>
      </div>

      {/* Endpoint Testing Panel */}
      <div style={{
        background: '#1e1e1e',
        borderBottom: '1px solid #444',
        padding: '15px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '13px' }}>Test TES Endpoints</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
          {endpoints.map((endpoint) => {
            const loadingKey = `${endpoint.method}:${endpoint.path}`;
            const isEndpointLoading = isLoading === loadingKey;
            
            return (
              <div key={endpoint.path} style={{
                background: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '4px',
                padding: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                  <span style={{
                    background: endpoint.method === 'GET' ? '#28a745' : '#007bff',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '2px',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}>
                    {endpoint.method}
                  </span>
                  <code style={{ color: '#ffc107', fontSize: '11px' }}>{endpoint.path}</code>
                </div>
                <div style={{ color: '#ccc', fontSize: '10px', marginBottom: '8px' }}>
                  {endpoint.description}
                </div>
                <button
                  onClick={() => testEndpoint(endpoint)}
                  disabled={isEndpointLoading}
                  style={{
                    background: isEndpointLoading ? '#666' : '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '3px',
                    cursor: isEndpointLoading ? 'not-allowed' : 'pointer',
                    fontSize: '11px',
                    width: '100%'
                  }}
                >
                  {isEndpointLoading ? 'Testing...' : `Test ${endpoint.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Response List */}
        <div style={{
          width: '50%',
          borderRight: '1px solid #444',
          overflow: 'auto',
          background: '#1a1a1a'
        }}>
          {responses.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              No tests run yet. Click a test button above to start.
            </div>
          ) : (
            responses.map((response, index) => (
              <div
                key={index}
                onClick={() => setSelectedResponse(response)}
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #333',
                  cursor: 'pointer',
                  background: selectedResponse === response ? '#333' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseEnter={(e) => {
                  if (selectedResponse !== response) {
                    e.currentTarget.style.background = '#2a2a2a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedResponse !== response) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{
                  color: getStatusColor(response.status),
                  fontWeight: 'bold',
                  minWidth: '40px'
                }}>
                  {response.status || 'ERR'}
                </span>
                <span style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {response.endpoint}
                </span>
                <span style={{ color: '#888', fontSize: '10px' }}>
                  {response.duration}ms
                </span>
                <span style={{ color: '#666', fontSize: '10px' }}>
                  {response.timestamp}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Response Details */}
        <div style={{
          width: '50%',
          overflow: 'auto',
          background: '#1e1e1e',
          padding: '15px'
        }}>
          {selectedResponse ? (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Response Details</h4>
                <div style={{ background: '#2a2a2a', padding: '10px', borderRadius: '3px' }}>
                  <div><strong>Endpoint:</strong> {selectedResponse.endpoint}</div>
                  <div><strong>Status:</strong> <span style={{ color: getStatusColor(selectedResponse.status) }}>
                    {selectedResponse.status} {selectedResponse.statusText}
                  </span></div>
                  <div><strong>Duration:</strong> {selectedResponse.duration}ms</div>
                  <div><strong>Time:</strong> {selectedResponse.timestamp}</div>
                </div>
              </div>

              {selectedResponse.data && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Response Data</h4>
                  <div style={{ background: '#2a2a2a', padding: '10px', borderRadius: '3px', position: 'relative' }}>
                    <button
                      onClick={() => copyToClipboard(
                        typeof selectedResponse.data === 'string' 
                          ? selectedResponse.data 
                          : JSON.stringify(selectedResponse.data, null, 2)
                      )}
                      style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        padding: '2px 6px',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '10px'
                      }}
                    >
                      📋
                    </button>
                    <pre style={{ margin: 0, fontSize: '11px', whiteSpace: 'pre-wrap', paddingRight: '40px' }}>
                      {typeof selectedResponse.data === 'string' 
                        ? selectedResponse.data 
                        : JSON.stringify(selectedResponse.data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedResponse.error && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#dc3545' }}>Error</h4>
                  <div style={{ background: '#2a2a2a', padding: '10px', borderRadius: '3px', color: '#dc3545' }}>
                    {selectedResponse.error}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>
              Run a test to view response details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};