// app/api/httpApi.ts
// Standard HTTP API client for the webapp

import {
  ApiRequestOptions,
  HTTPBaseReturnType,
  HttpMethod,
} from "@/types/http";

async function _request<T = unknown>(
  method: HttpMethod,
  url: string,
  options: ApiRequestOptions = {}
): Promise<HTTPBaseReturnType<T>> {
  const requestId = `http_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const { headers = {}, body, params, credentials } = options;
  
  console.log(`🌐 [httpApi] [${requestId}] Starting ${method} request to ${url}`);
  console.log(`🌐 [httpApi] [${requestId}] Headers:`, headers);
  console.log(`🌐 [httpApi] [${requestId}] Body:`, body ? JSON.stringify(body, null, 2) : 'No body');
  console.log(`🌐 [httpApi] [${requestId}] Params:`, params);
  console.log(`🌐 [httpApi] [${requestId}] Credentials:`, credentials || 'default (omit)');
  try {
    // Build query string for GET requests
    let fullUrl = url;
    if (params && Object.keys(params).length > 0) {
      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params).map(([k, v]) => [k, String(v)])
        )
      ).toString();
      fullUrl += (url.includes("?") ? "&" : "?") + query;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      credentials: credentials, // Forward credentials option to fetch
    };

    if (body && method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    console.log(`🚀 [httpApi] [${requestId}] Sending fetch request to: ${fullUrl}`);
    const fetchStartTime = Date.now();
    
    const response = await fetch(fullUrl, fetchOptions);
    const fetchDuration = Date.now() - fetchStartTime;
    
    console.log(`📥 [httpApi] [${requestId}] Response received in ${fetchDuration}ms:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url
    });
    
    const rawBody = await response.clone().text();
    console.log(`📥 [httpApi] [${requestId}] Raw response body length: ${rawBody.length}`);
    
    let data: T;
    try {
      const contentType = response.headers.get("content-type");
      console.log(`📥 [httpApi] [${requestId}] Content-Type: ${contentType}`);
      
      if (contentType && contentType.includes("application/json")) {
        console.log(`🔄 [httpApi] [${requestId}] Parsing JSON response...`);
        data = await response.clone().json();
        console.log(`✅ [httpApi] [${requestId}] JSON parsed successfully`);
      } else {
        console.log(`🔄 [httpApi] [${requestId}] Using raw text response`);
        data = rawBody as any;
      }
    } catch (e) {
      console.error(`❌ [httpApi] [${requestId}] Failed to parse response:`, e);
      data = rawBody as any;
    }
    if (!response.ok) {
      console.error(`❌ [httpApi] [${requestId}] HTTP ${response.status} error for ${method} ${url}:`, {
        status: response.status,
        statusText: response.statusText,
        rawBody: rawBody.substring(0, 500) + (rawBody.length > 500 ? '...' : ''),
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`HTTP ${response.status}: ${rawBody}`);
    }
    
    console.log(`✅ [httpApi] [${requestId}] Request successful:`, {
      method,
      url,
      status: response.status,
      dataType: typeof data,
      dataSize: JSON.stringify(data).length
    });
    return {
      status: response.status,
      statusText: response.statusText,
      data,
      rawBody,
      headers: Object.fromEntries(response.headers.entries()),
      url: response.url,
      ok: response.ok,
    };
  } catch (err) {
    console.error(`💥 [httpApi] [${requestId}] Request failed:`, {
      method,
      url,
      error: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : undefined
    });
    throw err;
  }
}

export async function httpGet<T = unknown>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<HTTPBaseReturnType<T> | undefined> {
  try {
    return await _request<T>("GET", url, options);
  } catch (err) {
    console.error(`[httpApi] GET error for ${url}:`, err);
    return undefined;
  }
}
export async function httpPost<T = unknown>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<HTTPBaseReturnType<T> | undefined> {
  try {
    return await _request<T>("POST", url, options);
  } catch (err) {
    console.error(`[httpApi] POST error for ${url}:`, err);
    return undefined;
  }
}
export async function httpPut<T = unknown>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<HTTPBaseReturnType<T> | undefined> {
  try {
    return await _request<T>("PUT", url, options);
  } catch (err) {
    console.error(`[httpApi] PUT error for ${url}:`, err);
    return undefined;
  }
}
export async function httpPatch<T = unknown>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<HTTPBaseReturnType<T> | undefined> {
  try {
    return await _request<T>("PATCH", url, options);
  } catch (err) {
    console.error(`[httpApi] PATCH error for ${url}:`, err);
    return undefined;
  }
}
export async function httpDelete<T = unknown>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<HTTPBaseReturnType<T> | undefined> {
  try {
    return await _request<T>("DELETE", url, options);
  } catch (err) {
    console.error(`[httpApi] DELETE error for ${url}:`, err);
    return undefined;
  }
}

export const httpApi = {
  GET: httpGet,
  POST: httpPost,
  PUT: httpPut,
  PATCH: httpPatch,
  DELETE: httpDelete,
};

// Example usage:
// const data = await httpApi.GET("/api/user");
// const created = await httpApi.POST("/api/item", { body: { name: "foo" } });
