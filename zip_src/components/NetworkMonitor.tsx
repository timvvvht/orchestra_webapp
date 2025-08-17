import React, { useState, useEffect, useRef } from 'react';

interface NetworkRequest {
  id: number;
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  timestamp: string;
  duration?: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  error?: string;
  type: 'fetch' | 'xhr';
}

interface NetworkMonitorProps {
  isVisible: boolean;
}

export const NetworkMonitor: React.FC<NetworkMonitorProps> = ({ isVisible }) => {
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<NetworkRequest | null>(null);
  const [filter, setFilter] = useState('');
  const requestIdCounter = useRef(0);
  
  // Request panel state
  const [isRequestPanelOpen, setIsRequestPanelOpen] = useState(false);
  const [requestUrl, setRequestUrl] = useState('');
  const [requestMethod, setRequestMethod] = useState('GET');
  const [requestHeaders, setRequestHeaders] = useState<Array<{key: string, value: string}>>([{key: '', value: ''}]);
  const [requestBody, setRequestBody] = useState('');

  useEffect(() => {
    if (!isVisible) return;

    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const requestId = ++requestIdCounter.current;
      const startTime = Date.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      const options = args[1] || {};
      
      const request: NetworkRequest = {
        id: requestId,
        url,
        method: options.method || 'GET',
        timestamp: new Date().toLocaleTimeString(),
        requestHeaders: options.headers as Record<string, string>,
        requestBody: options.body,
        type: 'fetch'
      };

      setRequests(prev => [...prev.slice(-999), request]); // Keep last 1000 requests

      try {
        const response = await originalFetch(...args);
        const endTime = Date.now();
        
        // Clone response to read body without consuming it
        const responseClone = response.clone();
        let responseBody;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            responseBody = await responseClone.json();
          } else {
            responseBody = await responseClone.text();
          }
        } catch {
          responseBody = '[Unable to parse response body]';
        }

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        setRequests(prev => prev.map(req => 
          req.id === requestId 
            ? {
                ...req,
                status: response.status,
                statusText: response.statusText,
                duration: endTime - startTime,
                responseHeaders,
                responseBody
              }
            : req
        ));

        return response;
      } catch (error) {
        const endTime = Date.now();
        setRequests(prev => prev.map(req => 
          req.id === requestId 
            ? {
                ...req,
                error: error instanceof Error ? error.message : 'Network error',
                duration: endTime - startTime
              }
            : req
        ));
        throw error;
      }
    };

    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args) {
      const requestId = ++requestIdCounter.current;
      const startTime = Date.now();
      
      (this as any)._networkMonitor = {
        id: requestId,
        url: url.toString(),
        method,
        startTime,
        timestamp: new Date().toLocaleTimeString()
      };

      return originalXHROpen.call(this, method, url, ...args);
    };

    XMLHttpRequest.prototype.send = function(body?: any) {
      const monitor = (this as any)._networkMonitor;
      if (monitor) {
        const request: NetworkRequest = {
          id: monitor.id,
          url: monitor.url,
          method: monitor.method,
          timestamp: monitor.timestamp,
          requestBody: body,
          type: 'xhr'
        };

        setRequests(prev => [...prev.slice(-999), request]);

        this.addEventListener('loadend', () => {
          const endTime = Date.now();
          setRequests(prev => prev.map(req => 
            req.id === monitor.id 
              ? {
                  ...req,
                  status: this.status,
                  statusText: this.statusText,
                  duration: endTime - monitor.startTime,
                  responseBody: this.responseText,
                  error: this.status === 0 ? 'Network error' : undefined
                }
              : req
          ));
        });
      }

      return originalXHRSend.call(this, body);
    };

    // Cleanup function
    return () => {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;
    };
  }, [isVisible]);

  const filteredRequests = requests.filter(req => 
    req.url.toLowerCase().includes(filter.toLowerCase()) ||
    req.method.toLowerCase().includes(filter.toLowerCase())
  );

  const getStatusColor = (status?: number) => {
    if (!status) return '#666';
    if (status >= 200 && status < 300) return '#28a745';
    if (status >= 300 && status < 400) return '#ffc107';
    if (status >= 400) return '#dc3545';
    return '#666';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const addHeaderRow = () => {
    setRequestHeaders([...requestHeaders, {key: '', value: ''}]);
  };

  const removeHeaderRow = (index: number) => {
    setRequestHeaders(requestHeaders.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...requestHeaders];
    newHeaders[index][field] = value;
    setRequestHeaders(newHeaders);
  };

  const sendManualRequest = async () => {
    if (!requestUrl.trim()) {
      alert('Please enter a URL');
      return;
    }

    const requestId = ++requestIdCounter.current;
    const startTime = Date.now();
    
    // Build headers object
    const headers: Record<string, string> = {};
    requestHeaders.forEach(header => {
      if (header.key.trim() && header.value.trim()) {
        headers[header.key.trim()] = header.value.trim();
      }
    });

    // Create request object
    const request: NetworkRequest = {
      id: requestId,
      url: requestUrl,
      method: requestMethod,
      timestamp: new Date().toLocaleTimeString(),
      requestHeaders: headers,
      requestBody: requestBody || undefined,
      type: 'fetch'
    };

    setRequests(prev => [...prev.slice(-999), request]);

    try {
      const fetchOptions: RequestInit = {
        method: requestMethod,
        headers: headers
      };

      if (requestBody && ['POST', 'PUT', 'PATCH'].includes(requestMethod)) {
        fetchOptions.body = requestBody;
      }

      const response = await fetch(requestUrl, fetchOptions);
      const endTime = Date.now();
      
      // Clone response to read body without consuming it
      const responseClone = response.clone();
      let responseBody;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          responseBody = await responseClone.json();
        } else {
          responseBody = await responseClone.text();
        }
      } catch {
        responseBody = '[Unable to parse response body]';
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      setRequests(prev => prev.map(req => 
        req.id === requestId 
          ? {
              ...req,
              status: response.status,
              statusText: response.statusText,
              duration: endTime - startTime,
              responseHeaders,
              responseBody
            }
          : req
      ));

      // Auto-select the new request
      setSelectedRequest({
        ...request,
        status: response.status,
        statusText: response.statusText,
        duration: endTime - startTime,
        responseHeaders,
        responseBody
      });

    } catch (error) {
      const endTime = Date.now();
      const errorRequest = {
        ...request,
        error: error instanceof Error ? error.message : 'Network error',
        duration: endTime - startTime
      };
      
      setRequests(prev => prev.map(req => 
        req.id === requestId ? errorRequest : req
      ));
      
      setSelectedRequest(errorRequest);
    }
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
        <h3 style={{ margin: 0, color: '#fff' }}>🌐 Network Monitor</h3>
        <button
          onClick={() => setIsRequestPanelOpen(!isRequestPanelOpen)}
          style={{
            background: isRequestPanelOpen ? '#28a745' : '#007bff',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {isRequestPanelOpen ? '▼ Hide Request Panel' : '▶ Send Request'}
        </button>
        <input
          type="text"
          placeholder="Filter requests..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            background: '#1a1a1a',
            border: '1px solid #444',
            color: '#fff',
            padding: '5px 10px',
            borderRadius: '3px',
            fontSize: '12px',
            width: '200px'
          }}
        />
        <button
          onClick={() => setRequests([])}
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
          {filteredRequests.length} requests
        </div>
      </div>

      {/* Request Panel */}
      {isRequestPanelOpen && (
        <div style={{
          background: '#1e1e1e',
          borderBottom: '1px solid #444',
          padding: '15px'
        }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
            <select
              value={requestMethod}
              onChange={(e) => setRequestMethod(e.target.value)}
              style={{
                background: '#2a2a2a',
                border: '1px solid #444',
                color: '#fff',
                padding: '5px 8px',
                borderRadius: '3px',
                fontSize: '12px',
                minWidth: '80px'
              }}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
              <option value="HEAD">HEAD</option>
              <option value="OPTIONS">OPTIONS</option>
            </select>
            <input
              type="text"
              placeholder="Enter URL (e.g., https://api.example.com/endpoint)"
              value={requestUrl}
              onChange={(e) => setRequestUrl(e.target.value)}
              style={{
                background: '#2a2a2a',
                border: '1px solid #444',
                color: '#fff',
                padding: '5px 10px',
                borderRadius: '3px',
                fontSize: '12px',
                flex: 1
              }}
            />
            <button
              onClick={sendManualRequest}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '5px 15px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              Send
            </button>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            {/* Headers Section */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, color: '#fff', fontSize: '12px' }}>Headers</h4>
                <button
                  onClick={addHeaderRow}
                  style={{
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '2px 6px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                >
                  + Add
                </button>
              </div>
              <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                {requestHeaders.map((header, index) => (
                  <div key={index} style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                    <input
                      type="text"
                      placeholder="Header name"
                      value={header.key}
                      onChange={(e) => updateHeader(index, 'key', e.target.value)}
                      style={{
                        background: '#2a2a2a',
                        border: '1px solid #444',
                        color: '#fff',
                        padding: '3px 6px',
                        borderRadius: '2px',
                        fontSize: '11px',
                        flex: 1
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Header value"
                      value={header.value}
                      onChange={(e) => updateHeader(index, 'value', e.target.value)}
                      style={{
                        background: '#2a2a2a',
                        border: '1px solid #444',
                        color: '#fff',
                        padding: '3px 6px',
                        borderRadius: '2px',
                        fontSize: '11px',
                        flex: 1
                      }}
                    />
                    {requestHeaders.length > 1 && (
                      <button
                        onClick={() => removeHeaderRow(index)}
                        style={{
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '3px 6px',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          fontSize: '10px'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Body Section */}
            {['POST', 'PUT', 'PATCH'].includes(requestMethod) && (
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '12px' }}>Request Body</h4>
                <textarea
                  placeholder="Enter request body (JSON, text, etc.)"
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  style={{
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    color: '#fff',
                    padding: '8px',
                    borderRadius: '3px',
                    fontSize: '11px',
                    width: '100%',
                    height: '120px',
                    resize: 'vertical',
                    fontFamily: 'Monaco, Consolas, monospace'
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Request List */}
        <div style={{
          width: '50%',
          borderRight: '1px solid #444',
          overflow: 'auto',
          background: '#1a1a1a'
        }}>
          {filteredRequests.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              No network requests yet...
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div
                key={request.id}
                onClick={() => setSelectedRequest(request)}
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #333',
                  cursor: 'pointer',
                  background: selectedRequest?.id === request.id ? '#333' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseEnter={(e) => {
                  if (selectedRequest?.id !== request.id) {
                    e.currentTarget.style.background = '#2a2a2a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedRequest?.id !== request.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{
                  color: getStatusColor(request.status),
                  fontWeight: 'bold',
                  minWidth: '40px'
                }}>
                  {request.status || (request.error ? 'ERR' : '...')}
                </span>
                <span style={{
                  color: '#007bff',
                  fontWeight: 'bold',
                  minWidth: '50px'
                }}>
                  {request.method}
                </span>
                <span style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {request.url}
                </span>
                <span style={{ color: '#888', fontSize: '10px' }}>
                  {request.duration ? `${request.duration}ms` : ''}
                </span>
                <span style={{ color: '#666', fontSize: '10px' }}>
                  {request.timestamp}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Request Details */}
        <div style={{
          width: '50%',
          overflow: 'auto',
          background: '#1e1e1e',
          padding: '15px'
        }}>
          {selectedRequest ? (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Request Details</h4>
                <div style={{ background: '#2a2a2a', padding: '10px', borderRadius: '3px' }}>
                  <div><strong>URL:</strong> {selectedRequest.url}</div>
                  <div><strong>Method:</strong> {selectedRequest.method}</div>
                  <div><strong>Status:</strong> <span style={{ color: getStatusColor(selectedRequest.status) }}>
                    {selectedRequest.status} {selectedRequest.statusText}
                  </span></div>
                  <div><strong>Duration:</strong> {selectedRequest.duration}ms</div>
                  <div><strong>Time:</strong> {selectedRequest.timestamp}</div>
                  <div><strong>Type:</strong> {selectedRequest.type}</div>
                </div>
              </div>

              {selectedRequest.requestHeaders && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Request Headers</h4>
                  <div style={{ background: '#2a2a2a', padding: '10px', borderRadius: '3px' }}>
                    <pre style={{ margin: 0, fontSize: '11px', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(selectedRequest.requestHeaders, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedRequest.requestBody && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Request Body</h4>
                  <div style={{ background: '#2a2a2a', padding: '10px', borderRadius: '3px' }}>
                    <pre style={{ margin: 0, fontSize: '11px', whiteSpace: 'pre-wrap' }}>
                      {typeof selectedRequest.requestBody === 'string' 
                        ? selectedRequest.requestBody 
                        : JSON.stringify(selectedRequest.requestBody, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedRequest.responseHeaders && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Response Headers</h4>
                  <div style={{ background: '#2a2a2a', padding: '10px', borderRadius: '3px' }}>
                    <pre style={{ margin: 0, fontSize: '11px', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(selectedRequest.responseHeaders, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedRequest.responseBody && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Response Body</h4>
                  <div style={{ background: '#2a2a2a', padding: '10px', borderRadius: '3px', position: 'relative' }}>
                    <button
                      onClick={() => copyToClipboard(
                        typeof selectedRequest.responseBody === 'string' 
                          ? selectedRequest.responseBody 
                          : JSON.stringify(selectedRequest.responseBody, null, 2)
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
                      {typeof selectedRequest.responseBody === 'string' 
                        ? selectedRequest.responseBody 
                        : JSON.stringify(selectedRequest.responseBody, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedRequest.error && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#dc3545' }}>Error</h4>
                  <div style={{ background: '#2a2a2a', padding: '10px', borderRadius: '3px', color: '#dc3545' }}>
                    {selectedRequest.error}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>
              Select a request to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};