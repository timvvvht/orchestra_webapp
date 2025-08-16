/**
 * JSON-RPC 2.0 Client Utility
 * 
 * Provides utilities for making JSON-RPC requests over HTTP to MCP servers.
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface JsonRpcRequest {
  jsonrpc: string;
  id: string;
  method: string;
  params: any;
}

export interface JsonRpcResponse {
  jsonrpc: string;
  id: string;
  result?: any;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Build a JSON-RPC 2.0 request object
 */
export function buildJsonRpcRequest(method: string, params: any): JsonRpcRequest {
  return {
    jsonrpc: "2.0",
    id: `${method}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    method,
    params
  };
}

/**
 * Make a JSON-RPC 2.0 request over HTTP POST
 */
export async function postJsonRpc(
  url: string, 
  method: string, 
  params: any, 
  headers?: Record<string, string>
): Promise<any> {
  const requestBody = buildJsonRpcRequest(method, params);
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  const finalHeaders = { ...defaultHeaders, ...headers };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: finalHeaders,
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }
    
    const responseData: JsonRpcResponse = await response.json();
    
    // Validate JSON-RPC response format
    if (responseData.jsonrpc !== "2.0") {
      throw new Error(`Invalid JSON-RPC response: missing or invalid jsonrpc field`);
    }
    
    if (responseData.id !== requestBody.id) {
      throw new Error(`JSON-RPC ID mismatch: expected ${requestBody.id}, got ${responseData.id}`);
    }
    
    // Check for JSON-RPC errors
    if (responseData.error) {
      throw new Error(`JSON-RPC error ${responseData.error.code}: ${responseData.error.message}`);
    }
    
    return responseData.result;
    
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`JSON-RPC request failed: ${String(error)}`);
  }
}