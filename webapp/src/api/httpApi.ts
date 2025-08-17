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
  const { headers = {}, body, params } = options;
  // Logging request start
  console.log(`[httpApi] ${method} ${url}`, { params, body, headers });
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
    };

    if (body && method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(fullUrl, fetchOptions);
    const rawBody = await response.clone().text();
    let data: T;
    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.clone().json();
      } else {
        data = rawBody as any;
      }
    } catch (e) {
      data = rawBody as any;
    }
    if (!response.ok) {
      console.error(
        `[httpApi] HTTP ${response.status} error for ${method} ${url}:`,
        rawBody
      );
      throw new Error(`HTTP ${response.status}: ${rawBody}`);
    }
    // Logging request success
    console.log(`[httpApi] Success ${method} ${url}`, {
      status: response.status,
      data,
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
    console.error(`[httpApi] Error in ${method} ${url}:`, err);
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
